import { interval, makeQuestion } from './theory';
import { emptyProgress, pairKey } from './progress';
import type { Level, NotePair, Progress, Quality } from './types';

export type Question = ReturnType<typeof makeQuestion>;
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
  revealed: boolean;
  hint: boolean;
  started: number;
  pausedAt: number | null;
  results: AnswerResult[];
}
export interface PracticeState {
  level: Level;
  progress: Progress;
  backup: Progress | null;
  session: Session;
}
export type PracticeAction =
  | { type: 'degree'; value: number }
  | { type: 'quality'; value: Quality }
  | { type: 'hint' }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'submit'; now: number }
  | { type: 'next'; now: number }
  | { type: 'session'; level: Level; session: Session }
  | { type: 'reset'; session: Session }
  | { type: 'restore'; session: Session };

export function createSession(
  level: Level,
  mistakes: NotePair[],
  now = performance.now(),
): Session {
  let queue: Question[];
  if (level === 'review') {
    const shuffled = [...mistakes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    queue = shuffled.slice(0, 10).map((pair) => ({ ...pair, result: interval(pair.a, pair.b) }));
  } else {
    queue = [];
    const seen = new Set<string>();
    while (queue.length < 10) {
      const q = makeQuestion(level);
      if (!seen.has(pairKey(q))) {
        seen.add(pairKey(q));
        queue.push(q);
      }
    }
  }
  return {
    index: 0,
    queue,
    degree: null,
    quality: null,
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
    case 'degree':
      return answering && action.value >= 1 && action.value <= 8
        ? { ...state, session: { ...s, degree: action.value } }
        : state;
    case 'quality':
      return answering ? { ...state, session: { ...s, quality: action.value } } : state;
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
      if (!answering || !s.degree || !s.quality) return state;
      const q = s.queue[s.index];
      const correct = s.degree === q.result.degree && s.quality === q.result.quality;
      const time = Math.max(0, action.now - s.started);
      const key = pairKey(q);
      const mistakes =
        correct && !s.hint
          ? state.progress.mistakes.filter((p) => pairKey(p) !== key)
          : !correct && !state.progress.mistakes.some((p) => pairKey(p) === key)
            ? [...state.progress.mistakes, { a: q.a, b: q.b }]
            : state.progress.mistakes;
      return {
        ...state,
        session: { ...s, revealed: true, results: [...s.results, { correct, time, hint: s.hint }] },
        progress: {
          total: state.progress.total + 1,
          correct: state.progress.correct + Number(correct),
          time: state.progress.time + time,
          history: [{ a: q.a, b: q.b, correct }, ...state.progress.history].slice(0, 30),
          mistakes,
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
              revealed: false,
              hint: false,
              pausedAt: null,
              started: action.now,
            },
          }
        : state;
    case 'session':
      return { ...state, level: action.level, session: action.session };
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
