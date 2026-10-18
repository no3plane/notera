export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
export interface Note {
  letter: Letter;
  acc: number;
  octave: number;
}
export type NoteFormat = 'name' | 'numbered' | 'solfege' | 'piano';
export type Level = 'basic' | 'mixed' | 'review';
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
  fretboardMemory?: import('./fretboardMemory').MemoryProgress;
  fretboard?: import('./fretboard').FretboardProgress;
  exerciseMistakes?: string[];
  exerciseHistory?: { id: string; correct: boolean }[];
  byKind?: Partial<
    Record<
      import('./exercises').StoredExerciseKind,
      { total: number; correct: number; time: number }
    >
  >;
}
