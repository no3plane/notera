import { describe, expect, it } from 'vitest';
import { createSession, practiceReducer } from '../src/lib/practice';
import type { PracticeState, Session } from '../src/lib/practice';
import {
  BACKUP_KEY,
  PROGRESS_KEY,
  emptyProgress,
  pairKey,
  readProgress,
  writeProgress,
} from '../src/lib/progress';
import { interval } from '../src/lib/theory';
import type { NotePair, Quality } from '../src/lib/types';

const pair: NotePair = {
  a: { letter: 'C', acc: 0, octave: 3 },
  b: { letter: 'G', acc: 1, octave: 3 },
};
const question = { ...pair, result: interval(pair.a, pair.b) };
function initial(): PracticeState {
  const session: Session = { ...createSession('basic', [], 100), queue: [question] };
  return { level: 'basic', progress: emptyProgress(), backup: null, session };
}
function answer(state: PracticeState, degree: number, quality: Quality, now = 2100) {
  let next = practiceReducer(state, { type: 'degree', value: degree });
  next = practiceReducer(next, { type: 'quality', value: quality });
  return practiceReducer(next, { type: 'submit', now });
}
describe('practice state transitions', () => {
  it('generates ten distinct questions and only queues saved mistakes in review', () => {
    for (const level of ['basic', 'mixed'] as const) {
      const session = createSession(level, []);
      expect(session.queue).toHaveLength(10);
      expect(new Set(session.queue.map(pairKey)).size).toBe(10);
    }
    expect(createSession('review', [pair]).queue).toHaveLength(1);
    expect(createSession('review', []).queue).toHaveLength(0);
  });
  it('rejects incomplete answers and scores a submitted answer exactly once', () => {
    const state = initial();
    expect(practiceReducer(state, { type: 'submit', now: 2000 })).toBe(state);
    const scored = answer(state, 5, '增');
    expect(scored.progress).toMatchObject({ total: 1, correct: 1, time: 2000 });
    expect(practiceReducer(scored, { type: 'submit', now: 3000 })).toBe(scored);
    expect(practiceReducer(scored, { type: 'degree', value: 6 })).toBe(scored);
  });
  it('saves an incorrect pair and retains it after a hinted correct answer', () => {
    const wrong = answer(initial(), 5, '纯');
    expect(wrong.progress.mistakes).toEqual([pair]);
    let review = { ...wrong, session: createSession('review', wrong.progress.mistakes, 100) };
    review = practiceReducer(review, { type: 'hint' });
    const hinted = answer(review, 5, '增');
    expect(hinted.progress.mistakes).toEqual([pair]);
    const independent = answer(
      { ...hinted, session: createSession('review', hinted.progress.mistakes, 100) },
      5,
      '增',
    );
    expect(independent.progress.mistakes).toEqual([]);
    expect(independent.session.queue).toHaveLength(1);
  });
  it('resets answer state on the next question and completes a one-question review', () => {
    const scored = answer(initial(), 5, '增');
    const next = practiceReducer(scored, { type: 'next', now: 3000 });
    expect(next.session).toMatchObject({
      index: 1,
      degree: null,
      quality: null,
      hint: false,
      revealed: false,
    });
    expect(next.session.results).toHaveLength(1);
    expect(practiceReducer(next, { type: 'next', now: 4000 })).toBe(next);
  });
  it('excludes time spent outside the practice page from answer timing', () => {
    let state = practiceReducer(initial(), { type: 'pause', now: 1100 });
    state = practiceReducer(state, { type: 'resume', now: 11100 });
    const scored = answer(state, 5, '增', 12100);
    expect(scored.progress.time).toBe(2000);
  });
  it('keeps a restorable backup when resetting progress', () => {
    const scored = answer(initial(), 5, '增');
    const reset = practiceReducer(scored, { type: 'reset', session: createSession('basic', []) });
    expect(reset.progress.total).toBe(0);
    expect(reset.backup).toEqual(scored.progress);
    const restored = practiceReducer(reset, {
      type: 'restore',
      session: createSession('basic', []),
    });
    expect(restored.progress).toEqual(scored.progress);
  });
});
describe('legacy record compatibility', () => {
  it('reads the existing local storage format without changing its key', () => {
    const old = {
      total: 2,
      correct: 1,
      time: 5200,
      history: [{ ...pair, correct: false }],
      mistakes: [pair],
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(old));
    expect(readProgress()).toEqual(old);
    expect(writeProgress(old, BACKUP_KEY)).toBe(true);
    expect(readProgress(BACKUP_KEY)).toEqual(old);
  });
  it('ignores invalid records safely', () => {
    localStorage.setItem(PROGRESS_KEY, '{invalid');
    expect(readProgress()).toBeNull();
    localStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ total: 0, correct: 8, time: 0, history: [], mistakes: [] }),
    );
    expect(readProgress()).toBeNull();
  });
});
