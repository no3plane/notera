import { describe, expect, it } from 'vitest';
import {
  cellKey,
  evaluateMemory,
  hiddenStrings,
  isAnchor,
  MEMORY_SHAPES,
  memoryStats,
  readMemoryProgress,
} from '../src/lib/fretboardMemory';
import type { MemoryAttempt, MemoryDraft } from '../src/lib/fretboardMemory';
import { createSession, practiceReducer } from '../src/lib/practice';
import type { PracticeState } from '../src/lib/practice';
import { emptyProgress, readProgress, writeProgress } from '../src/lib/progress';

const openMidi = [64, 59, 55, 50, 45, 40];
const scale = [0, 2, 4, 5, 7, 9, 11];
function complete(root: 5 | 6): MemoryDraft {
  return Object.fromEntries(
    MEMORY_SHAPES[root].points
      .filter((p) => !isAnchor(root, p.string, p.offset))
      .map((p) => [cellKey(p.string, p.offset), p.degree]),
  );
}
const failure: MemoryAttempt = {
  stage: 'recall',
  hiddenCount: 1,
  firstPass: true,
  correct: false,
  errors: [{ string: 2, offset: 0, type: 'missing' }],
  date: 100,
};

describe('the two photographed diagrams', () => {
  it('keeps the separate extents, original blanks and far-right fourth, with correct tuning', () => {
    expect(MEMORY_SHAPES[6].offsets).toEqual([-1, 0, 1, 2]);
    expect(MEMORY_SHAPES[5].offsets).toEqual([-1, 0, 1, 2, 3]);
    expect(MEMORY_SHAPES[5].points).toContainEqual({ string: 2, offset: 3, degree: 4 });
    expect(MEMORY_SHAPES[6].points.some((p) => p.string === 6 && p.offset === -1)).toBe(false);
    for (const root of [6, 5] as const) {
      expect(MEMORY_SHAPES[root].points).toHaveLength(16);
      for (const point of MEMORY_SHAPES[root].points) {
        const distance =
          (((openMidi[point.string - 1] - openMidi[root - 1] + point.offset) % 12) + 12) % 12;
        expect(distance).toBe(scale[point.degree - 1]);
      }
      expect(evaluateMemory(root, 'recall', 1, complete(root))).toMatchObject({
        correct: true,
        errors: [],
        correctCount: 15,
        targetCount: 15,
      });
    }
  });
  it('checks wrong, missing and extra notes without mutating the submitted work', () => {
    const draft = complete(6);
    draft['1:-1'] = 3; // should be 7
    delete draft['2:0']; // 5 is missing
    draft['6:-1'] = 7; // the source leaves this cell empty
    const before = { ...draft };
    expect(evaluateMemory(6, 'recall', 1, draft)).toMatchObject({
      correct: false,
      correctCount: 13,
      errors: [
        { string: 1, offset: -1, type: 'wrong' },
        { string: 2, offset: 0, type: 'missing' },
        { string: 6, offset: -1, type: 'extra' },
      ],
    });
    expect(draft).toEqual(before);
  });
  it('scaffolds only the hidden strings and always leaves the anchor fixed', () => {
    expect(hiddenStrings(6, 2)).toEqual([6, 5]);
    expect(hiddenStrings(5, 2)).toEqual([5, 4]);
    expect(evaluateMemory(6, 'rows', 1, {})).toMatchObject({
      targetCount: 1,
      errors: [{ string: 6, offset: 2, type: 'missing' }],
    });
    expect(evaluateMemory(6, 'rows', 1, { '6:2': 2 }).correct).toBe(true);
    expect(evaluateMemory(5, 'rows', 1, {}).targetCount).toBe(2);
  });
});

describe('memory progress', () => {
  it('keeps roots, first attempts and retries distinct', () => {
    const retry = { ...failure, firstPass: false, correct: true, errors: [] };
    expect(memoryStats([retry, failure])).toMatchObject({ first: 1, firstCorrect: 0, recalls: 2 });
    expect(memoryStats([retry, failure]).stringErrors[1]).toBe(1);
    const state: PracticeState = {
      level: 'basic',
      mode: 'fretboard',
      progress: emptyProgress(),
      backup: null,
      session: createSession('basic', [], 0, 'fretboard'),
    };
    let next = practiceReducer(state, { type: 'memory-result', root: 6, attempt: failure });
    next = practiceReducer(next, { type: 'memory-result', root: 6, attempt: retry });
    expect(next.progress.total).toBe(0); // old single-note statistics have a different denominator
    expect(next.progress.fretboardMemory?.[5]).toBeUndefined();
    expect(next.progress.fretboardMemory?.[6]).toHaveLength(2);
    writeProgress(next.progress);
    expect(readProgress()).toEqual(next.progress);
    const reset = practiceReducer(next, { type: 'reset', session: state.session });
    expect(reset.progress.fretboardMemory).toBeUndefined();
    const restored = practiceReducer(reset, { type: 'restore', session: state.session });
    expect(restored.progress).toEqual(next.progress);
  });
  it('validates saved memory records and bounds retained history', () => {
    expect(
      readMemoryProgress({ 6: [null, { ...failure, hiddenCount: 99 }, failure], 5: 'bad' }),
    ).toEqual({ 6: [failure] });
    expect(readMemoryProgress({ 6: Array(80).fill(failure) })?.[6]).toHaveLength(60);
  });
});
