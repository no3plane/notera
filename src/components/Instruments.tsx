import { useId } from 'react';
import type { ReactNode } from 'react';
import { LETTERS, fromMidi, interval, midi, name } from '../lib/theory';
import type { Note, NotePair } from '../lib/types';

interface Props extends NotePair {
  flat: boolean;
  onPick: (pitch: number) => void;
}
function PitchPoint({
  pitch,
  label,
  onPick,
  children,
}: {
  pitch: number;
  label: string;
  onPick: Props['onPick'];
  children: ReactNode;
}) {
  return (
    <g
      className="fret-note"
      data-midi={pitch}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onPick(pitch)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(pitch);
        }
      }}
    >
      {children}
    </g>
  );
}
export function Guitar({ a: root, b: target, flat, onPick }: Props) {
  const id = useId(),
    wood = `${id}-wood`,
    grain = `${id}-grain`;
  const opens = [64, 59, 55, 50, 45, 40],
    labels = ['E', 'B', 'G', 'D', 'A', 'E'];
  const x = (f: number) => (f === 0 ? 49 : 70 + (f - 0.5) * 46),
    y = (s: number) => 46 + s * 28;
  const coords = (note: Note) =>
    opens.flatMap((m, s) =>
      Array.from({ length: 13 }, (_, f) => ({ pitch: m + f, x: x(f), y: y(s) })).filter(
        (p) => p.pitch === midi(note),
      ),
    );
  const rootCoords = coords(root),
    targetCoords = coords(target);
  const a = rootCoords.find((p) => p.y >= y(3)) || rootCoords[0],
    b = targetCoords.find((p) => p.y >= y(3)) || targetCoords[0];
  return (
    <div className="guitar-viewport">
      <svg
        className="guitar"
        viewBox="0 0 660 240"
        role="group"
        aria-label="可交互的吉他指板，第1弦在上，第6弦在下"
      >
        <defs>
          <linearGradient id={wood} x2="0" y2="1">
            <stop stopColor="#34453b" />
            <stop offset="1" stopColor="#293b31" />
          </linearGradient>
          <pattern id={grain} width="170" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 2q45 4 85 0t85 0" stroke="#bdc6a6" strokeOpacity=".035" fill="none" />
          </pattern>
        </defs>
        <rect x="67" y="28" width="559" height="181" rx="3" fill={`url(#${wood})`} />
        <rect x="67" y="28" width="559" height="181" fill={`url(#${grain})`} />
        <rect x="66" y="28" width="5" height="181" rx="1" fill="#d9d9c5" />
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}>
            <line
              x1={70 + (i + 1) * 46}
              x2={70 + (i + 1) * 46}
              y1="28"
              y2="209"
              stroke="#86917e"
              strokeWidth="2"
            />
            <line
              x1={72 + (i + 1) * 46}
              x2={72 + (i + 1) * 46}
              y1="28"
              y2="209"
              stroke="#182e21"
              strokeOpacity=".7"
            />
          </g>
        ))}
        {[3, 5, 7, 9, 12].map((f) =>
          f === 12 ? (
            <g key={f}>
              <circle cx={x(f)} cy="88" r="4" fill="#82937c" opacity=".5" />
              <circle cx={x(f)} cy="165" r="4" fill="#82937c" opacity=".5" />
            </g>
          ) : (
            <circle key={f} cx={x(f)} cy="116" r="4" fill="#82937c" opacity=".5" />
          ),
        )}
        {opens.map((_, s) => (
          <g key={s}>
            <text x="17" y={y(s) + 4} fontSize="11" fill="#9aa48c">
              {labels[s]}
            </text>
            <text x="29" y={y(s) + 4} fontSize="7" fill="#b0b8a3">
              {s + 1}
            </text>
            <line
              x1="44"
              x2="634"
              y1={y(s)}
              y2={y(s)}
              stroke="#e5e6d2"
              strokeOpacity={0.42 + s * 0.075}
              strokeWidth={0.6 + s * 0.3}
            />
          </g>
        ))}
        {a && b && (
          <path
            d={`M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 25} ${b.x} ${b.y}`}
            fill="none"
            stroke="#cbdca5"
            strokeWidth="1.5"
            strokeDasharray="4 5"
            opacity=".7"
          />
        )}
        {opens.flatMap((m, s) =>
          Array.from({ length: 13 }, (_, f) => {
            const pitch = m + f,
              note = fromMidi(pitch, flat),
              selA = pitch === midi(root),
              selB = pitch === midi(target),
              selected = selA || selB;
            return (
              <PitchPoint
                key={`${s}-${f}`}
                pitch={pitch}
                onPick={onPick}
                label={`第 ${s + 1} 弦第 ${f} 品，${name(note)}`}
              >
                <title>
                  {s + 1} 弦 {f} 品 · {name(note)}
                </title>
                <circle
                  cx={x(f)}
                  cy={y(s)}
                  r={selected ? 14 : 12}
                  fill={selA ? '#518365' : selB ? '#d1e399' : 'transparent'}
                  stroke={selected ? (selB ? '#dae9b3' : '#84ac78') : 'transparent'}
                  strokeWidth="1.5"
                />
                <text
                  x={x(f)}
                  y={y(s) + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={selA ? '#fff' : selB ? '#3f5931' : 'transparent'}
                  pointerEvents="none"
                >
                  {selected ? name(selA ? root : target, false) : ''}
                </text>
              </PitchPoint>
            );
          }),
        )}
        {Array.from({ length: 13 }, (_, f) => (
          <text key={f} x={x(f)} y="231" textAnchor="middle" fontSize="9" fill="#a2aa93">
            {f}
          </text>
        ))}
        {(!a || !b) && (
          <text x="340" y="15" textAnchor="middle" fontSize="9" fill="#9e987b">
            部分音超出此 12 品指板，切换琴键或阶梯查看。
          </text>
        )}
      </svg>
    </div>
  );
}
export function Piano({ a, b, flat, onPick }: Props) {
  const start = Math.min(midi(a), midi(b)),
    octave = Math.floor(start / 12) - 1,
    base = (octave + 1) * 12;
  const whiteNotes: Note[] = Array.from(
    { length: Math.max(15, Math.ceil((Math.max(midi(a), midi(b)) - base + 1) / 12) * 7 + 1) },
    (_, i) => ({ letter: LETTERS[i % 7], acc: 0, octave: octave + Math.floor(i / 7) }),
  );
  const classFor = (m: number) =>
    m === midi(a) ? 'selected-a' : m === midi(b) ? 'selected-b' : '';
  return (
    <div className="piano-viewport">
      <div
        className="piano-shell"
        style={{ minWidth: whiteNotes.length * 20 }}
        role="group"
        aria-label="可交互钢琴键盘"
      >
        <span className="piano-label">
          {name(whiteNotes[0])} — {name(whiteNotes.at(-1)!)}
        </span>
        {whiteNotes.map((n) => (
          <button
            key={midi(n)}
            className={`white-key ${classFor(midi(n))}`}
            data-midi={midi(n)}
            aria-label={`琴键 ${name(n)}`}
            onClick={() => onPick(midi(n))}
          >
            {n.letter === 'C' || classFor(midi(n)) ? name(n) : ''}
          </button>
        ))}
        {whiteNotes.slice(0, -1).map(
          (n, i) =>
            ['C', 'D', 'F', 'G', 'A'].includes(n.letter) && (
              <button
                key={midi(n) + 1}
                className={`black-key ${classFor(midi(n) + 1)}`}
                style={{
                  width: `${78 / whiteNotes.length}%`,
                  left: `${((i + 1) * 100) / whiteNotes.length - 39 / whiteNotes.length}%`,
                }}
                data-midi={midi(n) + 1}
                aria-label={`琴键 ${name(fromMidi(midi(n) + 1, flat))}`}
                onClick={() => onPick(midi(n) + 1)}
              >
                {classFor(midi(n) + 1) ? name(midi(n) + 1 === midi(a) ? a : b, false) : ''}
              </button>
            ),
        )}
      </div>
    </div>
  );
}
export function SemitoneStairs({ a, b, flat, onPick }: Props) {
  const r = interval(a, b),
    start = Math.min(midi(a), midi(b)),
    end = Math.max(midi(a), midi(b)),
    count = end - start,
    scale = Math.max(count, 1);
  const x = (i: number) => 43 + (i * 566) / scale,
    y = (i: number) => 168 - (i * 120) / scale;
  return (
    <svg viewBox="0 0 660 215" className="distance-svg" role="group" aria-label="半音距离阶梯">
      <path d="M43 183H623" stroke="#e7ecde" />
      {Array.from({ length: count + 1 }, (_, i) => {
        const m = start + i,
          isA = m === midi(a),
          isB = m === midi(b);
        return (
          <g key={m}>
            {i < count && (
              <path
                d={`M${x(i)} ${y(i)}h${566 / scale}v${-120 / scale}`}
                stroke="#c8d5b5"
                strokeWidth="2"
                fill="none"
              />
            )}
            <PitchPoint pitch={m} label={`半音阶梯 ${name(fromMidi(m, flat))}`} onPick={onPick}>
              <circle
                cx={x(i)}
                cy={y(i)}
                r={isA || isB ? 14 : 6}
                fill={isA ? '#397454' : isB ? '#d1e399' : '#d6dfc8'}
              />
              <text
                x={x(i)}
                y={y(i) + (isA || isB ? 4 : -14)}
                textAnchor="middle"
                fontSize={isA || isB ? 10 : 8}
                style={{ fill: isA ? 'white' : '#758969' }}
              >
                {isA ? name(a, false) : isB ? name(b, false) : name(fromMidi(m, flat), false)}
              </text>
            </PitchPoint>
            <text x={x(i)} y="200" textAnchor="middle" fontSize="9">
              {i}
            </text>
          </g>
        );
      })}
      <text x="580" y="29" textAnchor="end" fontSize="12">
        {r.semitones} 个半音 · {r.title}
      </text>
    </svg>
  );
}
