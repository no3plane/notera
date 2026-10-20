import { samePoint } from './fretboard';
import type { FretPoint } from './fretboard';

export const SAME_NOTE_STAGES = ['basic', 'offset', 'mixed'] as const;
export type SameNoteStage = (typeof SAME_NOTE_STAGES)[number];
export const SAME_NOTE_LABELS: Record<SameNoteStage, string> = {
  basic: '基础形状 · ±2 品',
  offset: '加入二弦偏移 · ±3 品',
  mixed: '混合巩固 · 加入同品位',
};
export interface SameNoteQuestion {
  reference: FretPoint;
  target: FretPoint;
  startFret: number;
}
export interface SameNoteAttempt extends SameNoteQuestion {
  id: string;
  stage: SameNoteStage;
  answer: FretPoint;
  correct: boolean;
  hint: boolean;
  shownAnswer: boolean;
  time: number;
  date: number;
}
export type SameNoteProgress = Partial<Record<SameNoteStage, SameNoteAttempt[]>>;
const OPEN_MIDI = [64, 59, 55, 50, 45, 40];
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const sameNotePitch = (p: FretPoint) => OPEN_MIDI[p.string - 1] + p.fret;
export const sameNoteName = (p: FretPoint) => NAMES[sameNotePitch(p) % 12];

export function sameNoteShapes(stage: SameNoteStage) {
  const shapes = [
    { from: 6, to: 4, shift: 2 },
    { from: 5, to: 3, shift: 2 },
  ];
  if (stage !== 'basic') shapes.push({ from: 4, to: 2, shift: 3 }, { from: 3, to: 1, shift: 3 });
  if (stage === 'mixed') shapes.push({ from: 6, to: 1, shift: 0 });
  return shapes;
}
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const choose = <T>(items: T[], random: () => number) => items[Math.floor(random() * items.length)];
export function createSameNoteRound(
  stage: SameNoteStage,
  random = Math.random,
): SameNoteQuestion[] {
  const shapes = shuffle(sameNoteShapes(stage), random);
  const used = new Set<string>();
  const questions: SameNoteQuestion[] = [];
  // Alternate physical directions. Each direction covers every shape before repeating.
  const forwardFirst = random() < 0.5;
  for (let i = 0; i < 10; i++) {
    const shape = shapes[Math.floor(i / 2) % shapes.length];
    const forward = (i % 2 === 0) === forwardFirst;
    const from = forward ? shape.from : shape.to;
    const to = forward ? shape.to : shape.from;
    const shift = forward ? shape.shift : -shape.shift;
    const candidates = Array.from({ length: 12 }, (_, j) => j + 1).filter((fret) => {
      const target = fret + shift;
      return target >= 1 && target <= 12 && !used.has(`${from}:${fret}:${to}`);
    });
    const fret = choose(candidates, random);
    used.add(`${from}:${fret}:${to}`);
    const reference = { string: from, fret };
    const target = { string: to, fret: fret + shift };
    const starts = Array.from({ length: 8 }, (_, j) => j + 1).filter(
      (start) => start <= Math.min(fret, target.fret) && Math.max(fret, target.fret) < start + 5,
    );
    questions.push({ reference, target, startFret: choose(starts, random) });
  }
  return questions;
}
export function sameNoteDemo(stage: SameNoteStage): SameNoteQuestion {
  if (stage === 'offset')
    return { reference: { string: 4, fret: 5 }, target: { string: 2, fret: 8 }, startFret: 4 };
  if (stage === 'mixed')
    return { reference: { string: 6, fret: 6 }, target: { string: 1, fret: 6 }, startFret: 4 };
  return { reference: { string: 6, fret: 5 }, target: { string: 4, fret: 7 }, startFret: 4 };
}
export function sameNoteRule(q: SameNoteQuestion) {
  const shift = q.target.fret - q.reference.fret;
  return `${q.reference.string} 弦到 ${q.target.string} 弦，${shift === 0 ? '品号不变' : `品号${shift > 0 ? '加' : '减'} ${Math.abs(shift)}`}。`;
}
export function sameNoteExplanation(q: SameNoteQuestion) {
  const shift = q.target.fret - q.reference.fret;
  const openDistance = OPEN_MIDI[q.target.string - 1] - OPEN_MIDI[q.reference.string - 1];
  const direction = openDistance > 0 ? '升高' : '降低';
  if (shift === 0) return '六弦与一弦的空弦都是 E，同品位音名相同，实际音高相差两个八度。';
  return `同品位跨弦${direction} ${Math.abs(openDistance)} 个半音，再向${shift > 0 ? '右' : '左'} ${Math.abs(shift)} 品，合计${direction} 12 个半音，音名相同、相差一个八度。${Math.abs(shift) === 3 ? '经过 G、B 弦，形状比普通跨两弦多偏移一品。' : ''}`;
}
export function sameNoteStats(history: SameNoteAttempt[]) {
  const independent = history.filter((a) => a.correct && !a.hint);
  const pairs = new Map<
    string,
    { label: string; total: number; wrong: number; assisted: number }
  >();
  for (const a of history) {
    const key = `${a.reference.string}:${a.target.string}`;
    const pair = pairs.get(key) ?? {
      label: `${a.reference.string} 弦 → ${a.target.string} 弦`,
      total: 0,
      wrong: 0,
      assisted: 0,
    };
    pair.total++;
    pair.wrong += Number(!a.correct);
    pair.assisted += Number(a.hint);
    pairs.set(key, pair);
  }
  return {
    total: history.length,
    independent: independent.length,
    wrong: history.filter((a) => !a.correct).length,
    hints: history.filter((a) => a.hint).length,
    meanTime: independent.length
      ? independent.reduce((sum, a) => sum + a.time, 0) / independent.length
      : 0,
    weak: [...pairs.values()]
      .filter((p) => p.wrong || p.assisted)
      .sort((a, b) => b.wrong - a.wrong || b.assisted - a.assisted),
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
export function validSameNoteAttempt(value: unknown): value is SameNoteAttempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as SameNoteAttempt;
  if (
    !SAME_NOTE_STAGES.includes(a.stage) ||
    typeof a.id !== 'string' ||
    !a.id ||
    !validPoint(a.reference) ||
    !validPoint(a.target) ||
    !validPoint(a.answer) ||
    !Number.isInteger(a.startFret) ||
    a.startFret < 1 ||
    a.startFret > 8 ||
    ![a.reference, a.target, a.answer].every(
      (p) => p.fret >= a.startFret && p.fret < a.startFret + 5,
    ) ||
    a.answer.string !== a.target.string ||
    typeof a.correct !== 'boolean' ||
    typeof a.hint !== 'boolean' ||
    typeof a.shownAnswer !== 'boolean' ||
    (a.correct && a.shownAnswer) ||
    !Number.isFinite(a.time) ||
    a.time < 0 ||
    !Number.isFinite(a.date) ||
    a.date < 0
  )
    return false;
  const shapeMatches = sameNoteShapes(a.stage).some(
    ({ from, to, shift }) =>
      (a.reference.string === from &&
        a.target.string === to &&
        a.target.fret - a.reference.fret === shift) ||
      (a.reference.string === to &&
        a.target.string === from &&
        a.reference.fret - a.target.fret === shift),
  );
  return (
    shapeMatches &&
    sameNotePitch(a.reference) % 12 === sameNotePitch(a.target) % 12 &&
    a.correct === samePoint(a.answer, a.target)
  );
}
export function readSameNoteProgress(value: unknown): SameNoteProgress | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as SameNoteProgress;
  const result: SameNoteProgress = {};
  for (const stage of SAME_NOTE_STAGES) {
    const items = data[stage];
    if (Array.isArray(items)) {
      const seen = new Set<string>();
      result[stage] = items
        .filter((a) => {
          if (!validSameNoteAttempt(a) || a.stage !== stage || seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        })
        .slice(0, 100);
    }
  }
  return result;
}
