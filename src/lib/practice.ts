import { interval, makeQuestion } from './theory';
import { emptyProgress, pairKey } from './progress';
import type { Level, NotePair, Progress, Quality } from './types';
import { exercisesFor, findExercise, shuffle, takeExercise } from './exercises';
import type { Exercise, ExerciseKind, Mode } from './exercises';
import { validMemoryAttempt } from './fretboardMemory';
import type { MemoryAttempt, RootString } from './fretboardMemory';
import { progressKey, validFretAttempt } from './fretboard';
import type { FretAttempt } from './fretboard';
import { validStringAttempt } from './stringIntervals';
import type { StringAttempt } from './stringIntervals';
import { validSameNoteAttempt } from './sameNote';
import type { SameNoteAttempt, SameNoteStage } from './sameNote';

export type Question = ReturnType<typeof makeQuestion> & { exercise?: Exercise };
export function questionKey(q: Question) {
  return q.exercise?.id ?? pairKey(q);
}
export function exerciseQuestion(exercise: Exercise, level: Level = 'mixed'): Question {
  const fallback = { letter: 'C' as const, acc: 0, octave: 4 };
  const a = exercise.notes[0] ?? fallback,
    b = exercise.notes[1] ?? a;
  const choices =
    level !== 'basic'
      ? exercise.choices
      : exercise.kind === 'build-note'
        ? exercise.choices.filter((choice) => /^[A-G]$/.test(choice))
        : exercise.choices;
  return { a, b, result: interval(a, b), exercise: { ...exercise, choices } };
}
export function kindStats(progress: Progress, kind: ExerciseKind) {
  if (progress.byKind?.[kind]) return progress.byKind[kind]!;
  // Existing records all belonged to interval identification.
  return kind === 'interval'
    ? { total: progress.total, correct: progress.correct, time: progress.time }
    : { total: 0, correct: 0, time: 0 };
}
export interface AnswerResult {
  correct: boolean;
  time: number;
  hint: boolean;
}
export interface Session {
  index: number;
  queue: Question[];
  degree: number | null;
  quality: Quality | null;
  selected?: string[];
  revealed: boolean;
  hint: boolean;
  started: number;
  pausedAt: number | null;
  results: AnswerResult[];
}
export interface PracticeState {
  level: Level;
  mode?: Mode;
  progress: Progress;
  backup: Progress | null;
  session: Session;
}
export type PracticeAction =
  | { type: 'same-note-result'; attempt: SameNoteAttempt }
  | { type: 'same-note-reveal'; stage: SameNoteStage; id: string }
  | { type: 'degree'; value: number }
  | { type: 'quality'; value: Quality }
  | { type: 'choice'; value: string }
  | { type: 'memory-result'; root: RootString; attempt: MemoryAttempt }
  | { type: 'fret-result'; attempt: FretAttempt }
  | { type: 'string-result'; attempt: StringAttempt }
  | { type: 'hint' }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'submit'; now: number }
  | { type: 'next'; now: number }
  | { type: 'session'; level: Level; session: Session; mode?: Mode }
  | { type: 'reset'; session: Session }
  | { type: 'restore'; session: Session };

export function createSession(
  level: Level,
  mistakes: NotePair[],
  now = performance.now(),
  mode: Mode = 'interval',
  exerciseMistakes: string[] = [],
): Session {
  let queue: Question[];
  if (mode === 'fretboard' || mode === 'guitar-chords') {
    queue = []; // Interactive guitar modes own their sessions and records.
  } else if (level === 'review') {
    const shuffled = [...mistakes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    queue = shuffle([
      ...(mode === 'interval'
        ? shuffled.map((pair) => ({ ...pair, result: interval(pair.a, pair.b) }))
        : []),
      ...exerciseMistakes.flatMap((id) => {
        const exercise = findExercise(id);
        return exercise && exercise.kind === mode ? [exerciseQuestion(exercise)] : [];
      }),
    ]).slice(0, 10);
  } else {
    queue = [];
    const seen = new Set<string>();
    const pool = shuffle(exercisesFor(mode, level));
    while (queue.length < 10) {
      // There are seven forward prompts. Cover each before repeating to fill ten turns.
      if (mode === 'chord-tones-forward' && !pool.length) {
        pool.push(...shuffle(exercisesFor(mode, level)));
        seen.clear();
        if (pool.at(-1)?.id === queue.at(-1)?.exercise?.id) {
          [pool[0], pool[pool.length - 1]] = [pool[pool.length - 1], pool[0]];
        }
      }
      const exercise = takeExercise(pool, queue.length);
      const q =
        mode === 'interval'
          ? makeQuestion(level)
          : exercise
            ? exerciseQuestion(exercise, level)
            : null;
      if (!q) break;
      if (!seen.has(questionKey(q))) {
        seen.add(questionKey(q));
        queue.push(q);
      }
    }
  }
  return {
    index: 0,
    queue,
    degree: null,
    quality: null,
    selected: [],
    revealed: false,
    hint: false,
    started: now,
    pausedAt: null,
    results: [],
  };
}
export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  const s = state.session;
  const answering = s.index < s.queue.length && !s.revealed;
  switch (action.type) {
    case 'same-note-result': {
      if (!validSameNoteAttempt(action.attempt)) return state;
      const history = state.progress.sameNote?.[action.attempt.stage] ?? [];
      if (history.some((a) => a.id === action.attempt.id)) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          sameNote: {
            ...state.progress.sameNote,
            [action.attempt.stage]: [action.attempt, ...history].slice(0, 100),
          },
        },
      };
    }
    case 'same-note-reveal': {
      const history = state.progress.sameNote?.[action.stage];
      if (!history?.some((a) => a.id === action.id && !a.correct && !a.shownAnswer)) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          sameNote: {
            ...state.progress.sameNote,
            [action.stage]: history.map((a) =>
              a.id === action.id ? { ...a, shownAnswer: true } : a,
            ),
          },
        },
      };
    }
    case 'string-result': {
      if (!validStringAttempt(action.attempt)) return state;
      const history = state.progress.stringIntervals ?? [];
      if (history.some((a) => a.id === action.attempt.id)) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          stringIntervals: [action.attempt, ...history].slice(0, 100),
        },
      };
    }
    case 'fret-result': {
      if (!validFretAttempt(action.attempt)) return state;
      const fretboard = state.progress.fretboard ?? {};
      const key = progressKey(action.attempt.mode, action.attempt.level);
      const history = fretboard[key] ?? [];
      if (history.some((a) => a.id === action.attempt.id)) return state;
      return {
        ...state,
        progress: {
          ...state.progress,
          fretboard: {
            ...fretboard,
            [key]: [action.attempt, ...history].slice(0, 100),
          },
        },
      };
    }
    case 'memory-result': {
      if (!validMemoryAttempt(action.attempt, action.root)) return state;
      const memory = state.progress.fretboardMemory ?? {};
      return {
        ...state,
        progress: {
          ...state.progress,
          fretboardMemory: {
            ...memory,
            [action.root]: [action.attempt, ...(memory[action.root] ?? [])].slice(0, 60),
          },
        },
      };
    }
    case 'degree':
      return answering && action.value >= 1 && action.value <= 8
        ? { ...state, session: { ...s, degree: action.value } }
        : state;
    case 'quality':
      return answering ? { ...state, session: { ...s, quality: action.value } } : state;
    case 'choice': {
      const exercise = s.queue[s.index]?.exercise;
      if (!answering || !exercise || !exercise.choices.includes(action.value)) return state;
      const selected = s.selected ?? [];
      const next =
        exercise.answer.length === 1
          ? [action.value]
          : selected.includes(action.value)
            ? selected.filter((v) => v !== action.value)
            : selected.length < exercise.answer.length
              ? [...selected, action.value]
              : selected;
      return { ...state, session: { ...s, selected: next } };
    }
    case 'pause':
      return answering && s.pausedAt === null
        ? { ...state, session: { ...s, pausedAt: action.now } }
        : state;
    case 'resume':
      return s.pausedAt !== null
        ? {
            ...state,
            session: { ...s, started: s.started + action.now - s.pausedAt, pausedAt: null },
          }
        : state;
    case 'hint':
      return answering ? { ...state, session: { ...s, hint: true } } : state;
    case 'submit': {
      if (!answering) return state;
      const q = s.queue[s.index];
      const exercise = q.exercise;
      if (exercise ? s.selected?.length !== exercise.answer.length : !s.degree || !s.quality)
        return state;
      const correct = exercise
        ? exercise.answer.every((v) => s.selected?.includes(v))
        : s.degree === q.result.degree && s.quality === q.result.quality;
      const time = Math.max(0, (s.pausedAt ?? action.now) - s.started);
      const key = pairKey(q);
      const mistakes = exercise
        ? state.progress.mistakes
        : correct && !s.hint
          ? state.progress.mistakes.filter((p) => pairKey(p) !== key)
          : !correct && !state.progress.mistakes.some((p) => pairKey(p) === key)
            ? [...state.progress.mistakes, { a: q.a, b: q.b }]
            : state.progress.mistakes;
      const exerciseMistakes = [...(state.progress.exerciseMistakes ?? [])];
      if (exercise) {
        if (correct && !s.hint) {
          const index = exerciseMistakes.indexOf(exercise.id);
          if (index >= 0) exerciseMistakes.splice(index, 1);
        } else if (!correct && !exerciseMistakes.includes(exercise.id))
          exerciseMistakes.push(exercise.id);
      }
      const kind = exercise?.kind ?? 'interval';
      const previous = kindStats(state.progress, kind);
      const byKind = state.progress.byKind ?? { interval: kindStats(state.progress, 'interval') };
      return {
        ...state,
        session: { ...s, revealed: true, results: [...s.results, { correct, time, hint: s.hint }] },
        progress: {
          ...state.progress,
          total: state.progress.total + 1,
          correct: state.progress.correct + Number(correct),
          time: state.progress.time + time,
          history: exercise
            ? state.progress.history
            : [{ a: q.a, b: q.b, correct }, ...state.progress.history].slice(0, 30),
          mistakes,
          byKind: {
            ...byKind,
            [kind]: {
              total: previous.total + 1,
              correct: previous.correct + Number(correct),
              time: previous.time + time,
            },
          },
          exerciseMistakes,
          exerciseHistory: exercise
            ? [{ id: exercise.id, correct }, ...(state.progress.exerciseHistory ?? [])].slice(0, 30)
            : state.progress.exerciseHistory,
        },
      };
    }
    case 'next':
      return s.revealed
        ? {
            ...state,
            session: {
              ...s,
              index: s.index + 1,
              degree: null,
              quality: null,
              selected: [],
              revealed: false,
              hint: false,
              pausedAt: null,
              started: action.now,
            },
          }
        : state;
    case 'session':
      return {
        ...state,
        level: action.level,
        mode: action.mode ?? state.mode,
        session: action.session,
      };
    case 'reset':
      return {
        ...state,
        backup: state.progress,
        progress: emptyProgress(),
        session: action.session,
      };
    case 'restore':
      return state.backup ? { ...state, progress: state.backup, session: action.session } : state;
  }
}
