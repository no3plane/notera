import { LETTERS, midi, name } from '../lib/theory';
import { notation, notationLabel } from '../lib/notation';
import type { Note, NoteFormat } from '../lib/types';

export function NoteSymbol({ note, format }: { note: Note; format: Exclude<NoteFormat, 'piano'> }) {
  const delta = note.octave - 4;
  return (
    <b className={`note-symbol note-symbol-${format}`} aria-label={notationLabel(note, format)}>
      {format !== 'name' && delta > 0 && (
        <span className="octave-dots octave-above" aria-hidden="true">
          {'•'.repeat(delta)}
        </span>
      )}
      <span aria-hidden="true">{notation(note, format)}</span>
      {format === 'name' ? (
        <sub aria-hidden="true">{note.octave}</sub>
      ) : delta < 0 ? (
        <span className="octave-dots octave-below" aria-hidden="true">
          {'•'.repeat(-delta)}
        </span>
      ) : null}
    </b>
  );
}

// Read-only keyboard for the current question's pitch.
export function NoteKeyboard({ note }: { note: Note }) {
  const octave = Math.floor(midi(note) / 12) - 1;
  const base = (octave + 1) * 12;
  const keys = LETTERS.flatMap((letter, index) => {
    const pitch = midi({ letter, acc: 0, octave });
    const list = [{ pitch, x: index * 44 + 1, width: 42, black: false }];
    if (['C', 'D', 'F', 'G', 'A'].includes(letter)) {
      list.push({ pitch: pitch + 1, x: (index + 1) * 44 - 13, width: 26, black: true });
    }
    return list;
  }).sort((a, b) => Number(a.black) - Number(b.black));
  const highlightedKey = keys.find((key) => key.pitch === midi(note));
  const label = highlightedKey
    ? `${highlightedKey.black ? '黑' : '白'}键，从左起第 ${keys.filter((key) => key.black === highlightedKey.black && key.x <= highlightedKey.x).length} 个高亮`
    : '';
  return (
    <div className="note-keyboard">
      <svg
        viewBox="0 0 308 148"
        role="img"
        aria-label={`钢琴键盘，C${octave} 至 B${octave}，${label}`}
      >
        {keys.map((key) => {
          const active = key.pitch === midi(note);
          return (
            <g
              key={key.pitch}
              className={`note-key ${key.black ? 'is-black' : ''} ${active ? 'is-selected' : ''}`}
            >
              <rect x={key.x} y="1" width={key.width} height={key.black ? 82 : 126} rx="4" />
              {active && <circle cx={key.x + key.width / 2} cy={key.black ? 66 : 106} r="4" />}
              {key.pitch === base && (
                <text x="22" y="144" textAnchor="middle">
                  C{octave}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function NoteDisplay({
  note,
  format,
  showSpelling = false,
}: {
  note: Note;
  format: NoteFormat;
  showSpelling?: boolean;
}) {
  return format === 'piano' ? (
    <div className="keyboard-note">
      <NoteKeyboard note={note} />
      {showSpelling && note.acc !== 0 && (
        <small className="spelling-note">按 {name(note)} 的拼写判断</small>
      )}
    </div>
  ) : (
    <NoteSymbol note={note} format={format} />
  );
}
