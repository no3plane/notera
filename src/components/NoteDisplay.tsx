import { LETTERS, fromMidi, midi, name } from '../lib/theory';
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

// A compact octave with no answer labels. Read-only versions are SVGs so
// they do not add inactive controls to keyboard navigation.
export function NoteKeyboard({
  note,
  selected,
  correct,
  onPick,
  disabled = false,
  naturalOnly = false,
  flat = false,
}: {
  note: Note;
  selected?: number | null;
  correct?: number;
  onPick?: (note: Note) => void;
  disabled?: boolean;
  naturalOnly?: boolean;
  flat?: boolean;
}) {
  const octave = onPick ? note.octave : Math.floor(midi(note) / 12) - 1;
  const base = (octave + 1) * 12;
  const highlight = onPick ? selected : midi(note);
  const keys = LETTERS.flatMap((letter, index) => {
    const white = { letter, acc: 0, octave };
    const list = [{ note: white, x: index * 44 + 1, width: 42, black: false }];
    if (['C', 'D', 'F', 'G', 'A'].includes(letter)) {
      list.push({
        note: fromMidi(midi(white) + 1, flat),
        x: (index + 1) * 44 - 13,
        width: 26,
        black: true,
      });
    }
    return list;
  }).sort((a, b) => Number(a.black) - Number(b.black));
  const keyLabel = (key: (typeof keys)[number]) =>
    `${key.black ? '黑' : '白'}键，从左起第 ${key.black ? keys.filter((k) => k.black && k.x <= key.x).length : LETTERS.indexOf(key.note.letter) + 1} 个`;
  const highlightedKey = keys.find((key) => midi(key.note) === highlight);
  return (
    <div className={`note-keyboard ${onPick ? 'note-keyboard-input' : ''}`}>
      <svg
        viewBox="0 0 308 148"
        role={onPick ? 'group' : 'img'}
        aria-label={
          onPick
            ? '选择对应琴键'
            : `钢琴键盘，C${octave} 至 B${octave}，${highlightedKey ? keyLabel(highlightedKey) : ''}高亮`
        }
      >
        {keys.map((key) => {
          const pitch = midi(key.note);
          const active = pitch === highlight;
          const right = pitch === correct;
          const unavailable = disabled || (naturalOnly && key.black);
          const label = keyLabel(key);
          return (
            <g
              key={pitch}
              className={`note-key ${key.black ? 'is-black' : ''} ${active ? 'is-selected' : ''} ${right ? 'is-correct' : ''} ${active && correct !== undefined && !right ? 'is-wrong' : ''}`}
              role={onPick ? 'button' : undefined}
              tabIndex={onPick && !unavailable ? 0 : undefined}
              aria-label={
                onPick
                  ? `${label}${active ? '，已选择' : ''}${right ? '，正确答案' : ''}`
                  : undefined
              }
              aria-pressed={onPick ? active : undefined}
              aria-disabled={onPick ? unavailable : undefined}
              onClick={onPick && !unavailable ? () => onPick(key.note) : undefined}
              onKeyDown={
                onPick && !unavailable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onPick(key.note);
                      }
                    }
                  : undefined
              }
              data-pitch={onPick ? pitch : undefined}
            >
              <rect x={key.x} y="1" width={key.width} height={key.black ? 82 : 126} rx="4" />
              {(active || right) && (
                <circle cx={key.x + key.width / 2} cy={key.black ? 66 : 106} r="4" />
              )}
              {!key.black && pitch === base && (
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
