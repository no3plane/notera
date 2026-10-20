import { describe, expect, it } from 'vitest';
import {
  createStringRound,
  readStringProgress,
  STRING_INTERVAL_CHOICES,
  STRING_INTERVAL_DEGREES,
  STRING_PAIRS,
  stringInterval,
  stringStats,
  validStringAttempt,
} from '../src/lib/stringIntervals';
import type { StringAttempt } from '../src/lib/stringIntervals';
import { createSession, practiceReducer } from '../src/lib/practice';
import type { PracticeState } from '../src/lib/practice';
import { emptyProgress, readProgress, writeProgress } from '../src/lib/progress';

const a: StringAttempt = {
  from: 6,
  to: 1,
  id: 'first',
  rule: 'pitch-class',
  answer: '纯一度',
  correct: true,
  time: 1250,
  date: 100,
};
describe('string intervals in standard tuning', () => {
  it('always counts upward from the starting note for all thirty directed pairs', () => {
    const pairs: [number, number, string, number, string][] = [
      [6, 5, '纯四度', 5, '纯五度'],
      [6, 4, '小七度', 10, '大二度'],
      [6, 3, '小三度', 3, '大六度'],
      [6, 2, '纯五度', 7, '纯四度'],
      [6, 1, '纯一度', 0, '纯一度'],
      [5, 4, '纯四度', 5, '纯五度'],
      [5, 3, '小七度', 10, '大二度'],
      [5, 2, '大二度', 2, '小七度'],
      [5, 1, '纯五度', 7, '纯四度'],
      [4, 3, '纯四度', 5, '纯五度'],
      [4, 2, '大六度', 9, '小三度'],
      [4, 1, '大二度', 2, '小七度'],
      [3, 2, '大三度', 4, '小六度'],
      [3, 1, '大六度', 9, '小三度'],
      [2, 1, '纯四度', 5, '纯五度'],
    ];
    for (const [from, to, title, semitones, reverseTitle] of pairs) {
      expect(stringInterval({ from, to })).toMatchObject({ title, semitones, descending: false });
      expect(stringInterval({ from: to, to: from })).toMatchObject({
        title: reverseTitle,
        semitones: (12 - semitones) % 12,
        descending: false,
      });
    }
    expect(STRING_PAIRS).toHaveLength(30);
    expect(STRING_INTERVAL_CHOICES).toHaveLength(9);
    expect(STRING_INTERVAL_DEGREES.map((option) => option.degree)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('retains legacy scores without regrading them under the new note-name rule', () => {
    const { rule: _rule, ...base } = a;
    const legacy = { ...base, answer: '纯十五度' };
    const legacyWrong = { ...base, id: 'legacy-wrong', to: 3, answer: '小三度', correct: false };
    const simple: StringAttempt = {
      ...base,
      id: 'simple',
      from: 2,
      to: 4,
      rule: 'simple',
      answer: '大六度',
    };
    expect(validStringAttempt(legacy)).toBe(true);
    expect(validStringAttempt(legacyWrong)).toBe(true);
    expect(validStringAttempt({ ...legacy, rule: 'simple' })).toBe(false);
    expect(validStringAttempt({ ...legacyWrong, rule: 'simple', correct: true })).toBe(true);
    expect(validStringAttempt(simple)).toBe(true);
    expect(validStringAttempt({ ...simple, rule: 'pitch-class' })).toBe(false);
    expect(validStringAttempt({ ...simple, rule: 'pitch-class', answer: '小三度' })).toBe(true);
    expect(readStringProgress([legacy, legacyWrong, simple, a])).toEqual([
      legacy,
      legacyWrong,
      simple,
      a,
    ]);
    const progress = { ...emptyProgress(), stringIntervals: [legacy, legacyWrong, simple, a] };
    writeProgress(progress);
    expect(readProgress()).toEqual(progress);
  });
  it('balances direction in each round, varies pairs and covers every directed pair', () => {
    const seen = new Set<string>();
    let seed = 42;
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 100; i++) {
      const round = createStringRound(random);
      expect(round).toHaveLength(10);
      expect(round.filter((q) => q.from > q.to)).toHaveLength(5);
      expect(new Set(round.map((q) => [q.from, q.to].sort().join(':'))).size).toBe(10);
      for (const q of round) seen.add(`${q.from}:${q.to}`);
    }
    expect(seen.size).toBe(30);
  });
  it('validates and caps independent records, survives other exercise submissions and round-trips storage', () => {
    const state: PracticeState = {
      mode: 'interval',
      level: 'basic',
      progress: emptyProgress(),
      backup: null,
      session: createSession('basic', [], 0),
    };
    const scored = practiceReducer(state, { type: 'string-result', attempt: a });
    expect(practiceReducer(scored, { type: 'string-result', attempt: a })).toBe(scored);
    expect(scored.progress.total).toBe(0);
    const selected = {
      ...scored,
      session: { ...scored.session, degree: 4, quality: '纯' as const },
    };
    const other = practiceReducer(selected, { type: 'submit', now: 2000 });
    expect(other.progress.stringIntervals).toEqual([a]);
    writeProgress(other.progress);
    expect(readProgress()).toEqual(other.progress);
    expect(
      readStringProgress([
        a,
        null,
        { ...a, correct: false },
        { ...a, from: 0 },
        { ...a, answer: '纯八度' },
        { ...a, to: 6 },
        { ...a, time: -1 },
      ]),
    ).toEqual([a]);
    expect(readStringProgress(Array(130).fill(a))).toHaveLength(100);
    const wrong = { ...a, id: 'wrong', answer: '纯四度', correct: false, time: 10000 };
    expect(validStringAttempt(wrong)).toBe(true);
    // Split selectors also allow incorrect quality/degree combinations.
    expect(validStringAttempt({ ...a, answer: '增一度', correct: false })).toBe(true);
    expect(validStringAttempt({ ...a, answer: '纯三度', correct: false })).toBe(true);
    expect(stringStats([a, wrong])).toEqual({ total: 2, correct: 1, meanTime: 1250 });
  });
});
