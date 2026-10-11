import { LETTERS } from '../lib/theory';
import type { Note, NoteKey } from '../lib/types';

export function NotePicker({
  note,
  noteKey,
  active,
  onChange,
}: {
  note: Note;
  noteKey: NoteKey;
  active: boolean;
  onChange: (note: Note) => void;
}) {
  const label = noteKey === 'a' ? '起始音' : '目标音';
  return (
    <div className={`note-input ${active ? 'active' : ''}`}>
      <label htmlFor={`${noteKey}-letter`}>{label}</label>
      <div className="note-main">
        <select
          id={`${noteKey}-letter`}
          aria-label={`${label}音名`}
          value={note.letter}
          onChange={(e) => onChange({ ...note, letter: e.target.value as Note['letter'] })}
        >
          {LETTERS.map((letter) => (
            <option key={letter}>{letter}</option>
          ))}
        </select>
        <select
          className="acc"
          aria-label={`${label}升降号`}
          value={note.acc}
          onChange={(e) => onChange({ ...note, acc: Number(e.target.value) })}
        >
          {[-1, 0, 1].map((acc) => (
            <option key={acc} value={acc}>
              {acc === 0 ? '♮' : acc === 1 ? '♯' : '♭'}
            </option>
          ))}
        </select>
      </div>
      <select
        className="octave-select"
        aria-label={`${label}八度`}
        value={note.octave}
        onChange={(e) => onChange({ ...note, octave: Number(e.target.value) })}
      >
        {[1, 2, 3, 4, 5, 6].map((octave) => (
          <option key={octave} value={octave}>
            第 {octave} 组 · {octave}
          </option>
        ))}
      </select>
    </div>
  );
}
