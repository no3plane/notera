import { LETTERS, name } from './theory';
import type { Note, NoteFormat } from './types';

export const NOTE_FORMATS: { value: NoteFormat; label: string }[] = [
  { value: 'name', label: '音名' },
  { value: 'numbered', label: '简谱' },
  { value: 'solfege', label: '唱名' },
  { value: 'piano', label: '钢琴键盘' },
];
const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
export const FORMAT_KEY = 'notera-note-format-v1';

export function readNoteFormat(): NoteFormat {
  try {
    const saved = localStorage.getItem(FORMAT_KEY);
    return NOTE_FORMATS.find((f) => f.value === saved)?.value ?? 'name';
  } catch {
    return 'name';
  }
}

// C4 is the undotted 1 / Do. Preserve the written letter and accidental,
// rather than collapsing enharmonic notes to the same pitch class.
export function notation(note: Note, format: 'name' | 'numbered' | 'solfege') {
  if (format === 'name') return name(note, false);
  const index = LETTERS.indexOf(note.letter);
  const accidental = name(note, false).slice(1);
  return accidental + (format === 'numbered' ? String(index + 1) : SOLFEGE[index]);
}

export function notationLabel(note: Note, format: 'name' | 'numbered' | 'solfege') {
  const text = notation(note, format);
  if (format === 'name') return `${text}${note.octave}`;
  const delta = note.octave - 4;
  return `${text}，${delta === 0 ? '中音' : `${delta > 0 ? '高' : '低'} ${Math.abs(delta)} 个八度`}`;
}
