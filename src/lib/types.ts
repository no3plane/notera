export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export interface Note {
  letter: Letter;
  acc: number;
  octave: number;
}
export type Page = 'explore' | 'practice' | 'learn';
export type Level = 'basic' | 'mixed' | 'review';
export type InstrumentView = 'guitar' | 'piano' | 'steps';
export type NoteKey = 'a' | 'b';
export type Quality = '纯' | '大' | '小' | '增' | '减';
export interface NotePair {
  a: Note;
  b: Note;
}
export interface HistoryEntry extends NotePair {
  correct: boolean;
}
export interface Progress {
  total: number;
  correct: number;
  time: number;
  history: HistoryEntry[];
  mistakes: NotePair[];
}
export interface Exploration extends NotePair {
  view: InstrumentView;
  active: NoteKey;
  flat: boolean;
}
