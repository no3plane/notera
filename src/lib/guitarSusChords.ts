import { SAME_ROOT_FORMULAS, sameRootChord } from './chordHarmony';
import { shuffle } from './exercises';
import { chordsInKey, RATING_LABELS, voicingFor } from './guitarChords';
import type { ChordVoicing, Rating, RootString } from './guitarChords';
import type { Note } from './types';

export const SUS_GUITAR_ROOTS = ['E', 'A'] as const;
export type SusGuitarRoot = (typeof SUS_GUITAR_ROOTS)[number];
type Shape = {
  symbol: string;
  tones: Note[];
  formula: string;
  voicing: ChordVoicing;
};
function openShape(
  letter: SusGuitarRoot,
  quality: keyof typeof SAME_ROOT_FORMULAS,
  rootString: ChordVoicing['rootString'],
  frets: ChordVoicing['frets'],
  fingers: ChordVoicing['fingers'],
): Shape {
  return {
    ...sameRootChord({ letter, acc: 0, octave: 3 }, quality),
    formula: SAME_ROOT_FORMULAS[quality],
    voicing: { rootString, rootFret: 0, frets, fingers },
  };
}

function openMajor(root: SusGuitarRoot, rootString: RootString): Shape {
  const chord = chordsInKey(root)[0];
  return {
    symbol: chord.symbol,
    tones: chord.tones,
    formula: SAME_ROOT_FORMULAS.major,
    voicing: voicingFor(chord, rootString),
  };
}

const e = openMajor('E', 6);
const e2 = openShape('E', 'sus2', 6, [0, 2, 2, null, 0, 2], [0, 2, 3, null, 0, 1]);
const e4 = openShape('E', 'sus4', 6, [0, 2, 2, 2, 0, 0], [0, 2, 3, 4, 0, 0]);
const a = openMajor('A', 5);
const a2 = openShape('A', 'sus2', 5, [null, 0, 2, 2, 0, 0], [null, 0, 1, 2, 0, 0]);
const a4 = openShape('A', 'sus4', 5, [null, 0, 2, 2, 3, 0], [null, 0, 1, 2, 3, 0]);

export const SUS_GUITAR_GROUPS = {
  E: {
    comparison: [e2, e, e4],
    progression: ['A', 'D', 'E', 'A'],
    comparisonHint: 'Esus4 把第 3 弦从第 1 品移到第 2 品。Esus2 让第 3 弦消音，第 1 弦按第 2 品。',
  },
  A: {
    comparison: [a2, a, a4],
    progression: ['D', 'G', 'A', 'D'],
    comparisonHint: '只动第 2 弦。Asus2 弹空弦，A 按第 2 品，Asus4 按第 3 品。',
  },
} as const;

export function changedStrings([first, ...others]: readonly [Shape, ...Shape[]]) {
  return first.voicing.frets.flatMap((fret, i) =>
    others.some((shape) => shape.voicing.frets[i] !== fret) ? [6 - i] : [],
  );
}

export function susGuitarQueue(root: SusGuitarRoot) {
  const {
    comparison: [sus2, major, sus4],
  } = SUS_GUITAR_GROUPS[root];
  return shuffle<readonly [Shape, Shape]>([
    [major, sus2],
    [sus2, major],
    [major, sus4],
    [sus4, major],
  ]);
}

export type SusGuitarAttempt = { root: SusGuitarRoot | 'D'; rating: Rating };
export type SusGuitarProgress = { root: SusGuitarRoot; attempts: SusGuitarAttempt[] };
export const SUS_GUITAR_PROGRESS_KEY = 'notera.guitar-sus-chords.v1';
export function susTaskName(task: readonly Shape[]) {
  return task.map((shape) => shape.symbol).join(' → ');
}
export function readSusGuitarProgress(): SusGuitarProgress {
  try {
    const data = JSON.parse(localStorage.getItem(SUS_GUITAR_PROGRESS_KEY) ?? 'null');
    const root = data?.root === 'A' ? 'A' : 'E';
    const attempts = Array.isArray(data?.attempts)
      ? data.attempts
          .filter(
            (a: SusGuitarAttempt) =>
              a &&
              (a.root === 'D' || a.root === 'E' || a.root === 'A') &&
              typeof a.rating === 'string' &&
              Object.hasOwn(RATING_LABELS, a.rating),
          )
          .slice(-500)
      : [];
    return { root, attempts };
  } catch {
    return { root: 'E', attempts: [] };
  }
}
