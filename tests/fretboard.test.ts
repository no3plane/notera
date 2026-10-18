import { describe, expect, it } from 'vitest';
import {
  createFretRound,
  degreeAt,
  DEGREES,
  samePoint,
  fretStats,
  readFretProgress,
  validFretAttempt,
} from '../src/lib/fretboard';
import type { FretAttempt } from '../src/lib/fretboard';
import { createSession, practiceReducer } from '../src/lib/practice';
import type { PracticeState } from '../src/lib/practice';
import { emptyProgress, readProgress, writeProgress } from '../src/lib/progress';
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function attempt(): FretAttempt {
  const q = createFretRound('locate', 'natural', rng(4))[0];
  return {
    ...q,
    id: 'first',
    level: 'natural',
    answer: q.target,
    correct: true,
    time: 1234,
    date: 100,
  };
}
describe('reference-based fretboard questions', () => {
  it('uses standard tuning and unambiguous chromatic degree names', () => {
    expect(degreeAt(0, { string: 1, fret: 1 })).toBe('4'); // F over C
    expect(degreeAt(0, { string: 2, fret: 1 })).toBe('1'); // C over C
    expect(degreeAt(0, { string: 3, fret: 1 })).toBe('♭6'); // G# over C
    expect(degreeAt(0, { string: 6, fret: 6 })).toBe('♭7'); // Bb over C
    expect(DEGREES).toHaveLength(12);
  });
  it('generates full rounds in both difficulties, with valid cross-string targets and a stable key', () => {
    for (let seed = 0; seed < 60; seed++)
      for (const mode of ['recognize', 'locate'] as const)
        for (const level of ['natural', 'chromatic'] as const) {
          const questions = createFretRound(mode, level, rng(seed));
          expect(questions).toHaveLength(10);
          expect(new Set(questions.map((q) => `${q.startFret}:${q.tonic}`)).size).toBe(1);
          for (const [i, q] of questions.entries()) {
            expect(degreeAt(q.tonic, q.reference)).toBe(q.reference.degree);
            expect(degreeAt(q.tonic, q.target)).toBe(q.target.degree);
            expect(samePoint(q.reference, q.target)).toBe(false);
            if (level === 'natural') expect(/^[1-7]$/.test(q.target.degree)).toBe(true);
            if (mode === 'recognize') expect(q.reference.degree).toBe('1');
            else {
              expect(q.target.string).not.toBe(q.reference.string);
              expect(q.target.degree).not.toBe(q.reference.degree);
              if (i === 0) expect(q.reference.degree).not.toBe('1');
              else expect(q.reference).toEqual(questions[i - 1].target);
            }
          }
          if (mode === 'recognize')
            expect(new Set(questions.map((q) => `${q.target.string}:${q.target.fret}`)).size).toBe(
              10,
            );
        }
  });
  it('chooses a unique location on the requested string and varies the window and reference', () => {
    const starts = new Set<number>(),
      references = new Set<string>();
    for (let seed = 0; seed < 25; seed++) {
      for (const q of createFretRound('locate', 'chromatic', rng(seed * 100000))) {
        const matches = Array.from({ length: 5 }, (_, i) => ({
          string: q.target.string,
          fret: q.startFret + i,
        })).filter((point) => degreeAt(q.tonic, point) === q.target.degree);
        expect(matches).toEqual([{ string: q.target.string, fret: q.target.fret }]);
        starts.add(q.startFret);
        references.add(`${q.reference.string}:${q.reference.fret}`);
      }
    }
    expect(starts.size).toBeGreaterThan(1);
    expect(references.size).toBeGreaterThan(10);
  });
});
describe('fretboard progress', () => {
  it('validates, deduplicates and round-trips scores independently from legacy records', () => {
    const a = attempt();
    expect(validFretAttempt(a)).toBe(true);
    const state: PracticeState = {
      level: 'basic',
      mode: 'fretboard',
      progress: { ...emptyProgress(), total: 7, correct: 6, time: 9000 },
      backup: null,
      session: createSession('basic', [], 0, 'fretboard'),
    };
    const scored = practiceReducer(state, { type: 'fret-result', attempt: a });
    expect(practiceReducer(scored, { type: 'fret-result', attempt: a })).toBe(scored);
    expect(scored.progress.total).toBe(7);
    writeProgress(scored.progress);
    expect(readProgress()).toEqual(scored.progress);
    expect(readFretProgress({ 'locate:natural': [a, null, { ...a, correct: false }] })).toEqual({
      'locate:natural': [a],
    });
    expect(
      readFretProgress({ 'locate:natural': Array(130).fill(a) })?.['locate:natural'],
    ).toHaveLength(100);
    const wrong = {
      ...a,
      id: 'wrong',
      answer: {
        string: a.target.string,
        fret: a.target.fret === a.startFret ? a.startFret + 1 : a.startFret,
      },
      correct: false,
      time: 10,
    };
    expect(validFretAttempt(wrong)).toBe(true);
    expect(fretStats([a, wrong])).toMatchObject({ total: 2, correct: 1, meanTime: 1234 });
  });
});
