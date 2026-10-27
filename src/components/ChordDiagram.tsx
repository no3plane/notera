import { rootPosition } from '../lib/guitarChords';
import type { ChordVoicing, GuitarChord } from '../lib/guitarChords';

export function ChordDiagram({
  chord,
  voicing,
  compact = false,
}: {
  chord: GuitarChord;
  voicing: ChordVoicing;
  compact?: boolean;
}) {
  const pressed = voicing.frets.filter((f): f is number => f !== null && f > 0);
  const start = Math.min(...pressed) <= 1 ? 1 : Math.min(...pressed);
  const rootIndex = 6 - voicing.rootString;
  const x = (i: number) => 46 + i * 28;
  const y = (fret: number) => 60 + (fret - start + 0.5) * 33;
  const description = voicing.frets
    .map((f, i) => `第 ${6 - i} 弦${f === null ? '不弹' : f === 0 ? '空弦' : `第 ${f} 品`}`)
    .join('，');
  return (
    <figure className="chord-diagram">
      <svg viewBox="0 0 232 238" role="img" aria-label={`${chord.symbol} 指法：${description}`}>
        <title>
          {chord.symbol} · {rootPosition(voicing)}
        </title>
        {[0, 1, 2, 3, 4].map((fret) => (
          <line
            key={`f${fret}`}
            x1="46"
            x2="186"
            y1={60 + fret * 33}
            y2={60 + fret * 33}
            className={start === 1 && fret === 0 ? 'chord-nut' : 'chord-wire'}
          />
        ))}
        {[0, 1, 2, 3].map((fret) => (
          <text
            key={`n${fret}`}
            x="24"
            y={y(start + fret) + 4}
            textAnchor="middle"
            className="chord-axis"
          >
            {start + fret}
          </text>
        ))}
        {voicing.frets.map((fret, i) => (
          <g key={i}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1="60"
              y2="192"
              className="chord-wire"
              style={{ strokeWidth: 1.8 - i * 0.2 }}
            />
            <text x={x(i)} y="218" textAnchor="middle" className="chord-axis">
              {6 - i}
            </text>
            {fret === null ? (
              <text x={x(i)} y="44" textAnchor="middle" className="chord-axis">
                ×
              </text>
            ) : fret === 0 ? (
              <circle
                cx={x(i)}
                cy="39"
                r="6"
                className={i === rootIndex ? 'chord-open chord-root-open' : 'chord-open'}
              />
            ) : null}
          </g>
        ))}
        {voicing.barre && (
          <line
            x1={x(voicing.barre.from)}
            x2={x(voicing.barre.to)}
            y1={y(voicing.barre.fret)}
            y2={y(voicing.barre.fret)}
            className="chord-barre"
          />
        )}
        {voicing.frets.map(
          (fret, i) =>
            fret !== null &&
            fret > 0 && (
              <g key={`dot${i}`}>
                <circle
                  cx={x(i)}
                  cy={y(fret)}
                  r="10"
                  className={i === rootIndex ? 'chord-dot chord-root' : 'chord-dot'}
                />
                <text x={x(i)} y={y(fret) + 4} textAnchor="middle" className="chord-finger">
                  {voicing.fingers[i]}
                </text>
              </g>
            ),
        )}
      </svg>
      {compact ? (
        <figcaption>绿色为根音 · 数字为手指 · × 不弹 / ○ 空弦</figcaption>
      ) : (
        <figcaption>
          从左到右：6 → 1 弦 · 绿色为根音
          <br />
          数字为手指 · 1 食指 / 2 中指 / 3 无名指 / 4 小指
          <br />○ 空弦 · × 不弹 · 粗线为横按
        </figcaption>
      )}
    </figure>
  );
}
