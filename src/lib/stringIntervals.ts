import { interval, midi, name } from './theory';
import { intervalTitle } from './exercises';
import type { Note, Quality } from './types';

// Indexed by string number minus one; retain original octaves to validate old records.
const OPEN_NOTES: Note[] = [
  { letter: 'E', acc: 0, octave: 4 },
  { letter: 'B', acc: 0, octave: 3 },
  { letter: 'G', acc: 0, octave: 3 },
  { letter: 'D', acc: 0, octave: 3 },
  { letter: 'A', acc: 0, octave: 2 },
  { letter: 'E', acc: 0, octave: 2 },
];
export interface StringQuestion {
  from: number;
  to: number;
}
export interface StringAttempt extends StringQuestion {
  // Missing on original records; 'simple' retained physical up/down direction.
  rule?: 'simple' | 'pitch-class';
  id: string;
  answer: string;
  correct: boolean;
  time: number;
  date: number;
}
export function stringInterval(q: StringQuestion) {
  const a = { ...OPEN_NOTES[q.from - 1], octave: 4 };
  const b = { ...OPEN_NOTES[q.to - 1], octave: 4 };
  // Always count upward from the reference, regardless of the target string's height.
  if (midi(b) < midi(a)) b.octave++;
  const result = interval(a, b);
  return {
    ...result,
    title: intervalTitle(result),
    notes: `${name(a, false)} → ${name(b, false)}`,
  };
}
function savedAnswer(q: StringQuestion, rule: StringAttempt['rule']) {
  if (rule === 'pitch-class') return stringInterval(q).title;
  const result = interval(OPEN_NOTES[q.from - 1], OPEN_NOTES[q.to - 1]);
  return intervalTitle(
    rule === 'simple' ? { ...result, degree: ((result.degree - 1) % 7) + 1 } : result,
  );
}
export const STRING_PAIRS: StringQuestion[] = Array.from({ length: 6 }, (_, i) =>
  Array.from({ length: 6 }, (_, j) => ({ from: i + 1, to: j + 1 })),
)
  .flat()
  .filter((q) => q.from !== q.to);
export const STRING_INTERVAL_CHOICES = [
  ...new Map(
    STRING_PAIRS.map((q) => {
      const result = stringInterval(q);
      return [result.title, result.degree] as const;
    }),
  ).entries(),
]
  .sort((a, b) => a[1] - b[1])
  .map(([title]) => title);
export const STRING_INTERVAL_QUALITIES: Quality[] = ['纯', '大', '小', '增', '减'];
export const STRING_INTERVAL_DEGREES = [
  ...new Map(
    STRING_PAIRS.map((q) => {
      const result = stringInterval(q);
      return [result.degree, result.title.slice(1, -1)] as const;
    }),
  ).entries(),
]
  .sort((a, b) => a[0] - b[0])
  .map(([degree, label]) => ({ degree, label }));
export function stringAnswer(quality: Quality, degree: number) {
  const option = STRING_INTERVAL_DEGREES.find((item) => item.degree === degree);
  return option ? `${quality}${option.label}度` : '';
}
const ANSWER_CHOICES = STRING_INTERVAL_QUALITIES.flatMap((quality) =>
  STRING_INTERVAL_DEGREES.map(({ degree }) => stringAnswer(quality, degree)),
);
const LEGACY_ANSWER_CHOICES = STRING_INTERVAL_QUALITIES.flatMap((quality) =>
  ['三', '四', '六', '七', '九', '十', '十二', '十五'].map((label) => `${quality}${label}度`),
);

export function createStringRound(random = Math.random): StringQuestion[] {
  const pairs = STRING_PAIRS.filter((q) => q.from > q.to);
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  const startUp = random() < 0.5;
  return pairs
    .slice(0, 10)
    .map((q, i) => ((i % 2 === 0) === startUp ? q : { from: q.to, to: q.from }));
}
export function stringStats(history: StringAttempt[]) {
  const correct = history.filter((a) => a.correct);
  return {
    total: history.length,
    correct: correct.length,
    meanTime: correct.length ? correct.reduce((sum, a) => sum + a.time, 0) / correct.length : 0,
  };
}
export function validStringAttempt(value: unknown): value is StringAttempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as StringAttempt;
  return (
    Number.isInteger(a.from) &&
    a.from >= 1 &&
    a.from <= 6 &&
    Number.isInteger(a.to) &&
    a.to >= 1 &&
    a.to <= 6 &&
    a.from !== a.to &&
    typeof a.id === 'string' &&
    a.id.length > 0 &&
    (a.rule === undefined || a.rule === 'simple' || a.rule === 'pitch-class') &&
    (a.rule === undefined ? LEGACY_ANSWER_CHOICES : ANSWER_CHOICES).includes(a.answer) &&
    typeof a.correct === 'boolean' &&
    Number.isFinite(a.time) &&
    a.time >= 0 &&
    Number.isFinite(a.date) &&
    a.date >= 0 &&
    a.correct === (a.answer === savedAnswer(a, a.rule))
  );
}
export function readStringProgress(value: unknown): StringAttempt[] | undefined {
  return Array.isArray(value) ? value.filter(validStringAttempt).slice(0, 100) : undefined;
}
