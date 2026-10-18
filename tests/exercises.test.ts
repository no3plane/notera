import { describe, expect, it } from 'vitest';
import { CHORDS, exerciseBank, findExercise, KINDS, transpose } from '../src/lib/exercises';
import {
  createSession,
  exerciseQuestion,
  kindStats,
  practiceReducer,
  questionKey,
} from '../src/lib/practice';
import type { PracticeState } from '../src/lib/practice';
import { emptyProgress, readProgress, writeProgress } from '../src/lib/progress';
import { interval, midi, name } from '../src/lib/theory';

function initial(id: string): PracticeState {
  return {
    level: 'basic',
    mode: findExercise(id)!.kind,
    progress: emptyProgress(),
    backup: null,
    session: { ...createSession('basic', [], 100), queue: [exerciseQuestion(findExercise(id)!)] },
  };
}
function submit(state: PracticeState, choices: string[]) {
  for (const value of choices) state = practiceReducer(state, { type: 'choice', value });
  return practiceReducer(state, { type: 'submit', now: 2100 });
}

describe('question content', () => {
  it('transposes with spelling, direction and octave intact', () => {
    expect(name(transpose({ letter: 'B', acc: 0, octave: 4 }, 3, 4, 1))).toBe('D♯5');
    expect(name(transpose({ letter: 'C', acc: 0, octave: 4 }, 3, 4, -1))).toBe('A♭3');
    expect(name(transpose({ letter: 'C', acc: 0, octave: 4 }, 5, 6, 1))).toBe('G♭4');
    for (const e of exerciseBank().filter((e) => e.kind === 'build-note')) {
      const [, , degree, semitones, direction] = e.id.split(':');
      expect(Math.abs(midi(e.notes[1]) - midi(e.notes[0]))).toBe(Number(semitones));
      expect(interval(e.notes[0], e.notes[1]).degree).toBe(Number(degree));
      expect(Math.sign(midi(e.notes[1]) - midi(e.notes[0]))).toBe(
        Number(semitones) === 0 ? 0 : Number(direction),
      );
      expect(e.answer).toEqual([name(e.notes[1], false)]);
    }
  });
  it('uses diatonic triads and chord-relative formulas, including diminished B', () => {
    expect(CHORDS.map((c) => c.symbol)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(findExercise('tones:Am:false')?.answer).toEqual(['A', 'C', 'E']);
    expect(findExercise('tones:Bdim:false')?.answer).toEqual(['B', 'D', 'F']);
    expect(findExercise('degree:Dm:true')?.answer).toEqual(['ii']);
    expect(findExercise('degree:Bdim:false')?.answer).toEqual(['Bdim']);
  });
  it('builds ten distinct questions of only the selected kind', () => {
    for (const mode of KINDS.filter((kind) => kind !== 'fretboard')) {
      for (const level of ['basic', 'mixed'] as const) {
        const session = createSession(level, [], 100, mode);
        expect(session.queue).toHaveLength(10);
        expect(new Set(session.queue.map(questionKey)).size).toBe(10);
        expect(session.queue.every((q) => (q.exercise?.kind ?? 'interval') === mode)).toBe(true);
      }
    }
    expect(createSession('basic', [], 0, 'fretboard').queue).toEqual([]);
  });
});

describe('multi-type progress and review', () => {
  it('requires exactly three distinct tones, accepts any order, and scores only once', () => {
    let state = initial('tones:Am:false');
    state = practiceReducer(state, { type: 'choice', value: 'A' });
    expect(practiceReducer(state, { type: 'submit', now: 2100 })).toBe(state);
    state = submit(state, ['E', 'C']);
    expect(state.progress).toMatchObject({ total: 1, correct: 1, time: 2000 });
    expect(kindStats(state.progress, 'chord-tones').correct).toBe(1);
    expect(kindStats(state.progress, 'interval').total).toBe(0);
    expect(practiceReducer(state, { type: 'submit', now: 3000 })).toBe(state);
  });
  it('reviews only matching saved mistakes and removes one only after an unhinted correct answer', () => {
    const wrong = submit(initial('tones:Am:false'), ['D', 'F', 'A']);
    const id = 'tones:Am:false';
    expect(wrong.progress.exerciseMistakes).toEqual([id]);
    expect(createSession('review', [], 100, 'fretboard', [id]).queue).toHaveLength(0);
    const session = createSession('review', [], 100, 'chord-tones', [id]);
    let review = { ...wrong, session };
    review = practiceReducer(review, { type: 'hint' });
    review = submit(review, ['E', 'A', 'C']);
    expect(review.progress.exerciseMistakes).toEqual([id]);
    review = submit({ ...review, session }, ['A', 'C', 'E']);
    expect(review.progress.exerciseMistakes).toEqual([]);
  });
  it('preserves legacy interval totals after the first new-type answer and round-trips new records', () => {
    const state = initial('degree:C:false');
    state.progress = {
      ...emptyProgress(),
      total: 9,
      correct: 7,
      time: 12000,
      byKind: {
        interval: { total: 7, correct: 6, time: 9000 },
        strings: { total: 2, correct: 1, time: 3000 },
      },
      exerciseMistakes: ['strings:1:2:actual'],
      exerciseHistory: [{ id: 'strings:1:2:actual', correct: false }],
    };
    const scored = submit(state, ['C']);
    expect(kindStats(scored.progress, 'interval')).toEqual({ total: 7, correct: 6, time: 9000 });
    expect(kindStats(scored.progress, 'chord-degree')).toEqual({
      total: 1,
      correct: 1,
      time: 2000,
    });
    expect(scored.progress.total).toBe(10);
    writeProgress(scored.progress);
    expect(readProgress()).toEqual(scored.progress);
    expect(KINDS).not.toContain('strings');
    expect(exerciseBank().some((e) => e.id.startsWith('strings:'))).toBe(false);
    for (const mode of KINDS) {
      expect(
        createSession('review', [], 100, mode, scored.progress.exerciseMistakes).queue,
      ).toHaveLength(0);
    }
    const reset = practiceReducer(scored, { type: 'reset', session: createSession('basic', []) });
    const restored = practiceReducer(reset, {
      type: 'restore',
      session: createSession('basic', []),
    });
    expect(restored.progress).toEqual(scored.progress);
  });
});
