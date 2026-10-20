import { describe, expect, it } from 'vitest';
import {
  createSameNoteRound,
  SAME_NOTE_STAGES,
  readSameNoteProgress,
  sameNoteDemo,
  sameNoteExplanation,
  sameNoteName,
  sameNotePitch,
  sameNoteShapes,
  sameNoteStats,
  validSameNoteAttempt,
} from '../src/lib/sameNote';
import type { SameNoteAttempt } from '../src/lib/sameNote';
import { createSession, practiceReducer } from '../src/lib/practice';
import type { PracticeState } from '../src/lib/practice';
import { emptyProgress, readProgress, writeProgress } from '../src/lib/progress';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function attempt(): SameNoteAttempt {
  const q = sameNoteDemo('basic');
  return {
    ...q,
    id: 'one',
    stage: 'basic',
    answer: q.target,
    correct: true,
    hint: false,
    shownAnswer: false,
    time: 1200,
    date: 1,
  };
}
describe('same-note shapes and questions', () => {
  it('uses actual standard tuning for both directions including B-string compensation and two octaves', () => {
    expect(sameNoteName({ string: 6, fret: 5 })).toBe('A');
    expect(sameNoteName({ string: 4, fret: 7 })).toBe('A');
    expect(sameNoteName({ string: 2, fret: 8 })).toBe('G');
    expect(sameNoteName({ string: 3, fret: 5 })).toBe('C');
    expect(sameNoteName({ string: 1, fret: 6 })).toBe('A♯');
    for (const stage of SAME_NOTE_STAGES) {
      const q = sameNoteDemo(stage);
      expect(sameNotePitch(q.target) - sameNotePitch(q.reference)).toBe(
        stage === 'mixed' ? 24 : 12,
      );
    }
    const q = sameNoteDemo('offset');
    expect(sameNoteExplanation({ ...q, reference: q.target, target: q.reference })).toContain(
      '降低 12 个半音',
    );
    expect(sameNoteExplanation(q)).toContain('G、B 弦');
  });
  it('balances directions and shapes, avoids duplicate positions and keeps the sole answer visible for every stage', () => {
    const windows = new Set<number>(),
      notes = new Set<string>();
    for (let seed = 0; seed < 60; seed++)
      for (const stage of SAME_NOTE_STAGES) {
        const round = createSameNoteRound(stage, rng(seed));
        expect(round).toHaveLength(10);
        expect(round.filter((q) => q.reference.string > q.target.string)).toHaveLength(5);
        expect(
          new Set(round.map((q) => `${q.reference.string}:${q.reference.fret}:${q.target.string}`))
            .size,
        ).toBe(10);
        const pairs = new Set(round.map((q) => `${q.reference.string}:${q.target.string}`));
        for (const shape of sameNoteShapes(stage)) {
          expect(pairs.has(`${shape.from}:${shape.to}`)).toBe(true);
          expect(pairs.has(`${shape.to}:${shape.from}`)).toBe(true);
        }
        for (const q of round) {
          expect(sameNoteName(q.reference)).toBe(sameNoteName(q.target));
          expect(q.reference.fret).toBeGreaterThanOrEqual(q.startFret);
          expect(q.reference.fret).toBeLessThan(q.startFret + 5);
          const answers = Array.from({ length: 5 }, (_, i) => ({
            string: q.target.string,
            fret: q.startFret + i,
          })).filter((p) => sameNoteName(p) === sameNoteName(q.reference));
          expect(answers).toEqual([q.target]);
          expect(validSameNoteAttempt({ ...attempt(), ...q, stage, answer: q.target })).toBe(true);
          windows.add(q.startFret);
          notes.add(sameNoteName(q.reference));
        }
      }
    expect(windows.size).toBe(8);
    expect(notes.size).toBe(12);
    // Even a degenerate random source cannot cause retries to loop forever.
    for (const stage of SAME_NOTE_STAGES)
      expect(createSameNoteRound(stage, () => 0)).toHaveLength(10);
  });
});
describe('same-note records', () => {
  it('counts independent first answers separately from hints and wrong answers', () => {
    const a = attempt();
    const wrong = {
      ...a,
      id: 'wrong',
      answer: { ...a.target, fret: a.target.fret - 1 },
      correct: false,
      shownAnswer: true,
      time: 9000,
    };
    const hinted = { ...a, id: 'hinted', hint: true, time: 5000 };
    expect(sameNoteStats([a, wrong, hinted])).toMatchObject({
      total: 3,
      independent: 1,
      hints: 1,
      wrong: 1,
      meanTime: 1200,
    });
    for (const invalid of [
      null,
      { ...a, correct: false },
      { ...a, time: -1 },
      { ...a, shownAnswer: true },
      { ...a, answer: { string: 5, fret: 7 } },
      { ...a, stage: 'invalid' },
      { ...a, target: { string: 2, fret: 8 } },
    ])
      expect(validSameNoteAttempt(invalid)).toBe(false);
    expect(readSameNoteProgress({ basic: [a, a, wrong, hinted, null], offset: [a] })).toEqual({
      basic: [a, wrong, hinted],
      offset: [],
    });
    expect(
      readSameNoteProgress({
        basic: Array.from({ length: 120 }, (_, i) => ({ ...a, id: String(i) })),
      })?.basic,
    ).toHaveLength(100);
  });
  it('deduplicates scores, updates reveal without scoring again and preserves records across storage/reset/restore', () => {
    const a = { ...attempt(), correct: false, answer: { string: 4, fret: 6 } };
    const state: PracticeState = {
      level: 'basic',
      mode: 'fretboard',
      progress: { ...emptyProgress(), total: 7, correct: 6, time: 10 },
      backup: null,
      session: createSession('basic', [], 0, 'fretboard'),
    };
    let scored = practiceReducer(state, { type: 'same-note-result', attempt: a });
    expect(practiceReducer(scored, { type: 'same-note-result', attempt: a })).toBe(scored);
    scored = practiceReducer(scored, { type: 'same-note-reveal', stage: 'basic', id: a.id });
    expect(scored.progress.sameNote?.basic).toEqual([{ ...a, shownAnswer: true }]);
    expect(scored.progress.total).toBe(7);
    writeProgress(scored.progress);
    expect(readProgress()).toEqual(scored.progress);
    const reset = practiceReducer(scored, { type: 'reset', session: state.session });
    expect(reset.progress.sameNote).toBeUndefined();
    expect(practiceReducer(reset, { type: 'restore', session: state.session }).progress).toEqual(
      scored.progress,
    );
  });
});
