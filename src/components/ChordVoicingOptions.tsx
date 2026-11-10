import { ChordDiagram } from './ChordDiagram';
import { rootPosition, voicingsFor } from '../lib/guitarChords';
import type { ChordVoicing, GuitarChord } from '../lib/guitarChords';

export function ChordVoicingOptions({
  chord,
  chosen,
  onPlay,
}: {
  chord: GuitarChord;
  chosen: ChordVoicing;
  onPlay: (voicing: ChordVoicing) => void;
}) {
  return (
    <div
      className="guitar-voicing-options"
      role="group"
      aria-label={`${chord.symbol} 的第五、六弦根音按法`}
    >
      {voicingsFor(chord).map((voicing) => {
        const selected =
          chosen.rootString === voicing.rootString && chosen.rootFret === voicing.rootFret;
        return (
          <div
            key={`${voicing.rootString}-${voicing.rootFret}`}
            className="guitar-voicing-option"
            role="group"
            aria-label={`${chord.symbol} · ${rootPosition(voicing)}`}
          >
            <p className="guitar-voicing-position">{rootPosition(voicing)}</p>
            <span className={selected ? 'guitar-voicing-label is-chosen' : 'guitar-voicing-label'}>
              {selected ? '本组选用' : '其他按法'}
            </span>
            <ChordDiagram chord={chord} voicing={voicing} compact />
            <button
              className="guitar-text-button guitar-listen"
              aria-label={`聆听 ${chord.symbol} ${rootPosition(voicing)}的构成音`}
              onClick={() => onPlay(voicing)}
            >
              听构成音
            </button>
          </div>
        );
      })}
      <p className="guitar-options-legend">
        根音范围：空弦至第 12 品<br />
        下排从 6 → 1 弦标出音级 · R 为根音
        <br />
        圆点内数字为指法 · × 不弹 / ○ 空弦 · 粗线为横按
      </p>
    </div>
  );
}
