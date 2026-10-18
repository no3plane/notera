import { LETTERS, name } from './theory';
import type { HistoryEntry, Note, NotePair, Progress } from './types';
import { findExercise, KINDS } from './exercises';
import type { StoredExerciseKind } from './exercises';
import { readMemoryProgress } from './fretboardMemory';
import { readFretProgress } from './fretboard';

// Retain saved results for the retired exercise without making it playable.
const STORED_KINDS: StoredExerciseKind[] = [...KINDS, 'strings'];
function isSavedExerciseId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return (
    Boolean(findExercise(id)) ||
    /^strings:([1-6]):([1-6]):(actual|upward)$/.test(id) ||
    /^fret:[56]:[1-6]:(-1|0|1|2)$/.test(id)
  );
}

export const PROGRESS_KEY = 'notera-progress-v1';
export const BACKUP_KEY = 'notera-progress-backup';
export const emptyProgress = (): Progress => ({
  total: 0,
  correct: 0,
  time: 0,
  history: [],
  mistakes: [],
});
export const pairKey = (pair: NotePair) => `${name(pair.a)}|${name(pair.b)}`;

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== 'object') return false;
  const n = value as Note;
  return (
    LETTERS.includes(n.letter) &&
    Number.isInteger(n.acc) &&
    n.acc >= -2 &&
    n.acc <= 2 &&
    Number.isInteger(n.octave) &&
    n.octave >= 0 &&
    n.octave <= 9
  );
}
function isPair(value: unknown): value is NotePair {
  if (!value || typeof value !== 'object') return false;
  const pair = value as NotePair;
  return isNote(pair.a) && isNote(pair.b);
}
export function readProgress(key = PROGRESS_KEY): Progress | null {
  try {
    const p: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    if (!p || typeof p !== 'object') return null;
    const data = p as Progress;
    if (
      !Number.isInteger(data.total) ||
      data.total < 0 ||
      !Number.isInteger(data.correct) ||
      data.correct < 0 ||
      data.correct > data.total ||
      !Number.isFinite(data.time) ||
      data.time < 0 ||
      !Array.isArray(data.history) ||
      !Array.isArray(data.mistakes)
    )
      return null;
    return {
      total: data.total,
      correct: data.correct,
      time: data.time,
      history: data.history
        .filter(
          (h): h is HistoryEntry => isPair(h) && typeof (h as HistoryEntry).correct === 'boolean',
        )
        .slice(0, 30),
      mistakes: data.mistakes.filter(isPair),
      ...(data.fretboard ? { fretboard: readFretProgress(data.fretboard) } : {}),
      ...(data.fretboardMemory
        ? { fretboardMemory: readMemoryProgress(data.fretboardMemory) }
        : {}),
      ...(Array.isArray(data.exerciseMistakes)
        ? {
            exerciseMistakes: [...new Set(data.exerciseMistakes.filter(isSavedExerciseId))],
          }
        : {}),
      ...(Array.isArray(data.exerciseHistory)
        ? {
            exerciseHistory: data.exerciseHistory
              .filter((h) => h && isSavedExerciseId(h.id) && typeof h.correct === 'boolean')
              .slice(0, 30),
          }
        : {}),
      ...(data.byKind && typeof data.byKind === 'object'
        ? {
            byKind: Object.fromEntries(
              STORED_KINDS.flatMap((kind) => {
                const stats = data.byKind?.[kind];
                return stats &&
                  Number.isInteger(stats.total) &&
                  stats.total >= 0 &&
                  Number.isInteger(stats.correct) &&
                  stats.correct >= 0 &&
                  stats.correct <= stats.total &&
                  Number.isFinite(stats.time) &&
                  stats.time >= 0
                  ? [[kind, stats]]
                  : [];
              }),
            ),
          }
        : {}),
    };
  } catch {
    return null;
  }
}
export function writeProgress(progress: Progress, key = PROGRESS_KEY): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
