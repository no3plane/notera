export type RootString = 5 | 6;
export type Degree = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MemoryStage = 'study' | 'rows' | 'recall';
export interface MemoryPoint {
  string: number;
  offset: number;
  degree: Degree;
}
export interface MemoryShape {
  root: RootString;
  label: string;
  offsets: number[];
  points: MemoryPoint[];
}
export type MemoryDraft = Record<string, Degree>;
export interface MemoryError {
  string: number;
  offset: number;
  type: 'missing' | 'wrong' | 'extra';
}
export interface MemoryEvaluation {
  correct: boolean;
  errors: MemoryError[];
  correctCount: number;
  targetCount: number;
}
export interface MemoryAttempt {
  stage: 'rows' | 'recall';
  hiddenCount: number;
  firstPass: boolean;
  correct: boolean;
  errors: MemoryError[];
  date: number;
}
export type MemoryProgress = Partial<Record<RootString, MemoryAttempt[]>>;

// Transcribed from the two supplied diagrams, including intentional blank cells.
// The left diagram omits the low 7 before its anchor; the right includes 4 at the far right of string 2.
function shape(root: RootString, rows: number[][]): MemoryShape {
  return {
    root,
    label: root === 6 ? '左图 · 1 在六弦' : '右图 · 1 在五弦',
    offsets: root === 6 ? [-1, 0, 1, 2] : [-1, 0, 1, 2, 3],
    points: rows.flatMap((row, index) =>
      row.flatMap((degree, column) =>
        degree ? [{ string: index + 1, offset: column - 1, degree: degree as Degree }] : [],
      ),
    ),
  };
}
export const MEMORY_SHAPES: Record<RootString, MemoryShape> = {
  6: shape(6, [
    [7, 1, 0, 2],
    [0, 5, 0, 6],
    [2, 0, 3, 4],
    [6, 0, 7, 1],
    [3, 4, 0, 5],
    [0, 1, 0, 2],
  ]),
  5: shape(5, [
    [0, 5, 0, 6, 0],
    [0, 2, 0, 3, 4],
    [6, 0, 7, 1, 0],
    [3, 4, 0, 5, 0],
    [7, 1, 0, 2, 0],
    [0, 5, 0, 6, 0],
  ]),
};
export const cellKey = (string: number, offset: number) => `${string}:${offset}`;
export function pointAt(root: RootString, string: number, offset: number) {
  return MEMORY_SHAPES[root].points.find((p) => p.string === string && p.offset === offset);
}
export function isAnchor(root: RootString, string: number, offset: number) {
  return string === root && offset === 0;
}
export function hiddenStrings(root: RootString, count: number): number[] {
  return (root === 6 ? [6, 5, 4, 3, 2, 1] : [5, 4, 3, 2, 1, 6]).slice(0, count);
}
export function isEditable(
  root: RootString,
  stage: MemoryStage,
  count: number,
  string: number,
  offset: number,
) {
  if (stage === 'study' || isAnchor(root, string, offset)) return false;
  return (
    stage === 'recall' ||
    (hiddenStrings(root, count).includes(string) && Boolean(pointAt(root, string, offset)))
  );
}
export function editableCells(root: RootString, stage: MemoryStage, count: number) {
  return [1, 2, 3, 4, 5, 6].flatMap((string) =>
    MEMORY_SHAPES[root].offsets.flatMap((offset) =>
      isEditable(root, stage, count, string, offset) ? [cellKey(string, offset)] : [],
    ),
  );
}
export function evaluateMemory(
  root: RootString,
  stage: 'rows' | 'recall',
  count: number,
  draft: MemoryDraft,
): MemoryEvaluation {
  const errors: MemoryError[] = [];
  let correctCount = 0,
    targetCount = 0;
  for (const key of editableCells(root, stage, count)) {
    const [string, offset] = key.split(':').map(Number);
    const expected = pointAt(root, string, offset)?.degree;
    const actual = draft[key];
    if (expected) {
      targetCount++;
      if (expected === actual) correctCount++;
      else errors.push({ string, offset, type: actual ? 'wrong' : 'missing' });
    } else if (actual) errors.push({ string, offset, type: 'extra' });
  }
  return { correct: errors.length === 0, errors, correctCount, targetCount };
}
export function memoryStats(history: MemoryAttempt[]) {
  const recalls = history.filter((a) => a.stage === 'recall');
  const first = recalls.filter((a) => a.firstPass);
  return {
    recalls: recalls.length,
    first: first.length,
    firstCorrect: first.filter((a) => a.correct).length,
    stringErrors: [1, 2, 3, 4, 5, 6].map((string) =>
      history.reduce((sum, a) => sum + a.errors.filter((e) => e.string === string).length, 0),
    ),
  };
}
export function validMemoryAttempt(value: unknown, root: RootString): value is MemoryAttempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as MemoryAttempt;
  return (
    (a.stage === 'rows' || a.stage === 'recall') &&
    Number.isInteger(a.hiddenCount) &&
    a.hiddenCount >= 1 &&
    a.hiddenCount <= 6 &&
    typeof a.firstPass === 'boolean' &&
    typeof a.correct === 'boolean' &&
    Number.isFinite(a.date) &&
    a.date >= 0 &&
    Array.isArray(a.errors) &&
    a.errors.every(
      (e) =>
        e &&
        Number.isInteger(e.string) &&
        e.string >= 1 &&
        e.string <= 6 &&
        MEMORY_SHAPES[root].offsets.includes(e.offset) &&
        ['missing', 'wrong', 'extra'].includes(e.type),
    ) &&
    a.correct === (a.errors.length === 0)
  );
}
export function readMemoryProgress(value: unknown): MemoryProgress | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as MemoryProgress;
  return Object.fromEntries(
    ([6, 5] as const).flatMap((root) =>
      Array.isArray(data[root])
        ? [[root, data[root]!.filter((a) => validMemoryAttempt(a, root)).slice(0, 60)]]
        : [],
    ),
  );
}
