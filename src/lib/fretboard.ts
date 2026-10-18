export const DEGREES = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'] as const;
export type FretDegree = (typeof DEGREES)[number];
export type FretMode = 'recognize' | 'locate';
export type FretLevel = 'natural' | 'chromatic';
export interface FretPoint {
  string: number;
  fret: number;
}
export interface Reference extends FretPoint {
  degree: FretDegree;
}
export interface FretQuestion {
  mode: FretMode;
  startFret: number;
  tonic: number;
  reference: Reference;
  target: Reference;
}
export interface FretAttempt extends FretQuestion {
  id: string;
  level: FretLevel;
  answer: FretDegree | FretPoint;
  correct: boolean;
  time: number;
  date: number;
}
export type FretProgressKey = `${FretMode}:${FretLevel}`;
export type FretboardProgress = Partial<Record<FretProgressKey, FretAttempt[]>>;
export const FRET_MODE_LABELS: Record<FretMode, string> = { recognize: '认音', locate: '找音接力' };
export const FRET_LEVEL_LABELS: Record<FretLevel, string> = {
  natural: '自然级数 · 1–7',
  chromatic: '全部半音 · 12 级数',
};
export const progressKey = (mode: FretMode, level: FretLevel): FretProgressKey =>
  `${mode}:${level}`;
const OPEN_PITCHES = [4, 11, 7, 2, 9, 4]; // Standard tuning, strings 1–6: E B G D A E.
const mod = (n: number) => ((n % 12) + 12) % 12;
export function degreeAt(tonic: number, point: FretPoint): FretDegree {
  return DEGREES[mod(OPEN_PITCHES[point.string - 1] + point.fret - tonic)];
}
export function samePoint(a: FretPoint, b: FretPoint) {
  return a.string === b.string && a.fret === b.fret;
}
export function boardPoints(startFret: number): FretPoint[] {
  return [1, 2, 3, 4, 5, 6].flatMap((string) =>
    Array.from({ length: 5 }, (_, i) => ({ string, fret: startFret + i })),
  );
}
export function allowedDegrees(level: FretLevel): FretDegree[] {
  return level === 'natural' ? ['1', '2', '3', '4', '5', '6', '7'] : [...DEGREES];
}
function choose<T>(values: T[], random: () => number): T {
  return values[Math.floor(random() * values.length)];
}
function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function createFretRound(
  mode: FretMode,
  level: FretLevel,
  random = Math.random,
): FretQuestion[] {
  const startFret = 1 + Math.floor(random() * 8);
  const points = boardPoints(startFret);
  const degrees = allowedDegrees(level);
  const firstPoint = choose(points, random);
  const firstDegree =
    mode === 'recognize'
      ? '1'
      : choose(
          degrees.filter((degree) => degree !== '1'),
          random,
        );
  const tonic = mod(
    OPEN_PITCHES[firstPoint.string - 1] + firstPoint.fret - DEGREES.indexOf(firstDegree),
  );
  let reference: Reference = { ...firstPoint, degree: firstDegree };
  const available = points
    .map((point) => ({ ...point, degree: degreeAt(tonic, point) }))
    .filter((point) => degrees.includes(point.degree));
  if (mode === 'recognize') {
    return shuffled(
      available.filter((point) => !samePoint(point, reference)),
      random,
    )
      .slice(0, 10)
      .map((target) => ({ mode, startFret, tonic, reference, target }));
  }
  const questions: FretQuestion[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 10; i++) {
    // Cross strings, retain the key and carry the actual destination into the next question.
    const candidates = available.filter(
      (point) => point.string !== reference.string && point.degree !== reference.degree,
    );
    const edgeKey = (point: Reference) =>
      `${reference.string}:${reference.fret}>${point.string}:${point.fret}`;
    const fresh = candidates.filter((point) => !seen.has(edgeKey(point)));
    const pool = fresh.length ? fresh : candidates;
    const targetDegree = choose([...new Set(pool.map((point) => point.degree))], random);
    const target = choose(
      pool.filter((point) => point.degree === targetDegree),
      random,
    );
    seen.add(edgeKey(target));
    questions.push({ mode, startFret, tonic, reference, target });
    reference = target;
  }
  return questions;
}
export function isFretAnswerCorrect(q: FretQuestion, answer: FretDegree | FretPoint) {
  return q.mode === 'recognize'
    ? answer === q.target.degree
    : typeof answer === 'object' && samePoint(answer, q.target);
}
export function fretStats(history: FretAttempt[]) {
  const correct = history.filter((a) => a.correct);
  return {
    total: history.length,
    correct: correct.length,
    meanTime: correct.length ? correct.reduce((sum, a) => sum + a.time, 0) / correct.length : 0,
    byDegree: DEGREES.map((degree) => {
      const items = history.filter((a) => a.target.degree === degree);
      const passed = items.filter((a) => a.correct);
      return {
        degree,
        total: items.length,
        wrong: items.length - passed.length,
        time: passed.length ? passed.reduce((sum, a) => sum + a.time, 0) / passed.length : 0,
      };
    }),
  };
}
function validPoint(value: unknown): value is FretPoint {
  if (!value || typeof value !== 'object') return false;
  const p = value as FretPoint;
  return (
    Number.isInteger(p.string) &&
    p.string >= 1 &&
    p.string <= 6 &&
    Number.isInteger(p.fret) &&
    p.fret >= 1 &&
    p.fret <= 12
  );
}
export function validFretAttempt(value: unknown): value is FretAttempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as FretAttempt;
  if (
    !(a.mode === 'recognize' || a.mode === 'locate') ||
    !(a.level === 'natural' || a.level === 'chromatic') ||
    typeof a.id !== 'string' ||
    !a.id ||
    !Number.isInteger(a.startFret) ||
    a.startFret < 1 ||
    a.startFret > 8 ||
    !Number.isInteger(a.tonic) ||
    a.tonic < 0 ||
    a.tonic > 11 ||
    !validPoint(a.reference) ||
    !validPoint(a.target) ||
    samePoint(a.reference, a.target) ||
    !Number.isFinite(a.time) ||
    a.time < 0 ||
    !Number.isFinite(a.date) ||
    a.date < 0 ||
    typeof a.correct !== 'boolean'
  )
    return false;
  if (
    ![a.reference, a.target].every(
      (p) =>
        p.fret >= a.startFret &&
        p.fret < a.startFret + 5 &&
        allowedDegrees(a.level).includes(p.degree) &&
        degreeAt(a.tonic, p) === p.degree,
    )
  )
    return false;
  if (
    a.mode === 'recognize'
      ? a.reference.degree !== '1' || !DEGREES.includes(a.answer as FretDegree)
      : !validPoint(a.answer) ||
        a.answer.string !== a.target.string ||
        a.answer.fret < a.startFret ||
        a.answer.fret >= a.startFret + 5
  )
    return false;
  return a.correct === isFretAnswerCorrect(a, a.answer);
}
export function readFretProgress(value: unknown): FretboardProgress | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as FretboardProgress;
  const result: FretboardProgress = {};
  for (const mode of ['recognize', 'locate'] as const)
    for (const level of ['natural', 'chromatic'] as const) {
      const key = progressKey(mode, level),
        history = data[key];
      if (Array.isArray(history))
        result[key] = history
          .filter((a) => validFretAttempt(a) && a.mode === mode && a.level === level)
          .slice(0, 100);
    }
  return result;
}
