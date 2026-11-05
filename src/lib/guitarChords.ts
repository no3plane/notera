import { shuffle } from './exercises';
import { majorKeyChords } from './chordHarmony';
import type { ChordFamily, DiatonicChord, SeventhQuality } from './chordHarmony';
import { midi } from './theory';
import type { Note } from './types';

export const GUITAR_KEYS = [
  ['C', 'C', 0],
  ['D♭', 'D', -1],
  ['D', 'D', 0],
  ['E♭', 'E', -1],
  ['E', 'E', 0],
  ['F', 'F', 0],
  ['F♯', 'F', 1],
  ['G', 'G', 0],
  ['A♭', 'A', -1],
  ['A', 'A', 0],
  ['B♭', 'B', -1],
  ['B', 'B', 0],
] as const;
export type GuitarKey = (typeof GUITAR_KEYS)[number][0];
export type RootString = 5 | 6;
export const GUITAR_TUNING = [40, 45, 50, 55, 59, 64]; // Sixth to first string, standard tuning.
export type GuitarChord = DiatonicChord;
export interface ChordVoicing {
  rootString: RootString;
  rootFret: number;
  frets: (number | null)[];
  fingers: (number | null)[];
  barre?: { fret: number; from: number; to: number; finger: number };
}
export function chordsInKey(key: GuitarKey, family: ChordFamily = 'triad'): GuitarChord[] {
  const entry = GUITAR_KEYS.find(([label]) => label === key)!;
  return majorKeyChords({ letter: entry[1], acc: entry[2], octave: 3 }, family);
}

function seventhVoicing(quality: SeventhQuality, rootString: RootString, r: number): ChordVoicing {
  const shape = (
    frets: (number | null)[],
    fingers: (number | null)[],
    barreTo?: number,
  ): ChordVoicing => ({
    rootString,
    rootFret: r,
    frets,
    fingers: fingers.map((finger, i) => (frets[i] === 0 ? 0 : finger)),
    ...(r > 0 && barreTo !== undefined
      ? { barre: { fret: r, from: 6 - rootString, to: barreTo, finger: 1 } }
      : {}),
  });
  if (rootString === 5) {
    switch (quality) {
      case 'maj7':
        return shape([null, r, r + 2, r + 1, r + 2, null], [null, 1, 3, 2, 4, null]);
      case 'm7':
        return shape([null, r, r + 2, r, r + 1, r], [null, 1, r ? 3 : 2, 1, r ? 2 : 1, 1], 5);
      case '7':
        return shape([null, r, r + 2, r, r + 2, r], [null, 1, r ? 3 : 2, 1, r ? 4 : 3, 1], 5);
      case 'm7b5':
        return shape([null, r, r + 1, r, r + 1, null], [null, 1, r ? 2 : 1, 1, r ? 3 : 2, null], 3);
    }
  }
  switch (quality) {
    case 'maj7':
      // Move the open Emaj7 shape: R, 5, 7, 3, 5, R.
      return shape([r, r + 2, r + 1, r + 1, r, r], [1, r ? 4 : 3, r ? 2 : 1, r ? 3 : 2, 1, 1], 5);
    case 'm7':
      return shape([r, r + 2, r, r, r, r], [1, r ? 3 : 2, 1, 1, 1, 1], 5);
    case '7':
      return shape([r, r + 2, r, r + 1, r, r], [1, r ? 3 : 2, 1, r ? 2 : 1, 1, 1], 5);
    case 'm7b5':
      return r === 0
        ? shape([0, 1, 0, 0, null, null], [0, 1, 0, 0, null, null])
        : shape([r, null, r, r, r - 1, null], [2, null, 3, 4, 1, null]);
  }
}

export function voicingFor(
  chord: GuitarChord,
  rootString: RootString,
  octave: 0 | 1 = 0,
): ChordVoicing {
  const fret = ((midi(chord.root) - (rootString === 6 ? 40 : 45) + 120) % 12) + octave * 12;
  const r = fret;
  if (chord.quality !== 'major' && chord.quality !== 'minor' && chord.quality !== 'dim')
    return seventhVoicing(chord.quality, rootString, r);
  if (chord.quality === 'dim') {
    // A-root diminished triad: 1, ♭5, 1, ♭3. No diminished-seventh substitution.
    if (rootString === 5)
      return {
        rootString,
        rootFret: r,
        frets: [null, r, r + 1, r + 2, r + 1, null],
        fingers: r ? [null, 1, 2, 4, 3, null] : [null, 0, 1, 3, 2, null],
      };
    // Three-note E-root triad: 1, ♭3, ♭5; the intervening strings stay muted.
    if (r === 0)
      return {
        rootString,
        rootFret: 0,
        frets: [0, 1, 2, 0, null, null],
        fingers: [0, 1, 2, 0, null, null],
      };
    const base = r;
    return {
      rootString,
      rootFret: base,
      frets: [base, null, null, base, base - 1, null],
      fingers: [2, null, null, 3, base === 1 ? 0 : 1, null],
    };
  }
  if (rootString === 6) {
    const major = chord.quality === 'major';
    return {
      rootString,
      rootFret: r,
      frets: [r, r + 2, r + 2, r + Number(major), r, r],
      fingers: r ? [1, 3, 4, major ? 2 : 1, 1, 1] : [0, 2, 3, major ? 1 : 0, 0, 0],
      ...(r ? { barre: { fret: r, from: 0, to: 5, finger: 1 } } : {}),
    };
  }
  if (chord.quality === 'major') {
    // Complete A shape: the index barre sounds both the fifth-string root and first-string fifth.
    return {
      rootString,
      rootFret: r,
      frets: [null, r, r + 2, r + 2, r + 2, r],
      fingers: r ? [null, 1, 2, 3, 4, 1] : [null, 0, 1, 2, 3, 0],
      ...(r ? { barre: { fret: r, from: 1, to: 5, finger: 1 } } : {}),
    };
  }
  return {
    rootString,
    rootFret: r,
    frets: [null, r, r + 2, r + 2, r + 1, r],
    fingers: r ? [null, 1, 3, 4, 2, 1] : [null, 0, 2, 3, 1, 0],
    ...(r ? { barre: { fret: r, from: 1, to: 5, finger: 1 } } : {}),
  };
}
/** Basic fifth/sixth-string root shapes, with every root position from open to fret 12. */
export function voicingsFor(chord: GuitarChord): ChordVoicing[] {
  return ([5, 6] as const).flatMap((root) => {
    const base = voicingFor(chord, root);
    return base.rootFret === 0 ? [base, voicingFor(chord, root, 1)] : [base];
  });
}
const LINKS = [
  [0, 3],
  [3, 4],
  [4, 0],
  [0, 5],
  [5, 3],
  [1, 4],
  [2, 5],
];
export function recommendedVoicings(chords: GuitarChord[]): ChordVoicing[] {
  // Score the whole key as one route, including common progressions. Stable across rounds.
  const candidates = chords.map((chord) => [voicingFor(chord, 5), voicingFor(chord, 6)]);
  let best: ChordVoicing[] = [],
    bestScore = Infinity;
  for (let mask = 0; mask < 128; mask++) {
    const plan = candidates.map((options, i) => options[(mask >> i) & 1]);
    const positions = plan.map((v) => Math.max(1, v.rootFret));
    const score =
      plan.reduce(
        (sum, v, i) =>
          sum +
          v.rootFret * 0.35 +
          Math.max(0, v.rootFret - 7) * 2 +
          (v.rootString === 6 && chords[i].quality === 'dim' ? 7 : 0) +
          (v.rootString === 6 && chords[i].quality === 'm7b5' && v.rootFret > 0 ? 3 : 0),
        0,
      ) +
      LINKS.reduce((sum, [a, b]) => sum + Math.abs(positions[a] - positions[b]), 0) +
      (Math.max(...positions) - Math.min(...positions)) * 1.8;
    if (score < bestScore) {
      bestScore = score;
      best = plan;
    }
  }
  return best;
}
export function rootPosition(voicing: ChordVoicing) {
  return `第${voicing.rootString === 5 ? '五' : '六'}弦${voicing.rootFret ? `第 ${voicing.rootFret} 品` : '空弦'}`;
}
export function voicingNotes(voicing: ChordVoicing): Note[] {
  const spellings: Note[] = [
    { letter: 'C', acc: 0, octave: 0 },
    { letter: 'C', acc: 1, octave: 0 },
    { letter: 'D', acc: 0, octave: 0 },
    { letter: 'E', acc: -1, octave: 0 },
    { letter: 'E', acc: 0, octave: 0 },
    { letter: 'F', acc: 0, octave: 0 },
    { letter: 'F', acc: 1, octave: 0 },
    { letter: 'G', acc: 0, octave: 0 },
    { letter: 'A', acc: -1, octave: 0 },
    { letter: 'A', acc: 0, octave: 0 },
    { letter: 'B', acc: -1, octave: 0 },
    { letter: 'B', acc: 0, octave: 0 },
  ];
  return voicing.frets.flatMap((fret, i) => {
    if (fret === null) return [];
    const value = GUITAR_TUNING[i] + fret;
    return [{ ...spellings[value % 12], octave: Math.floor(value / 12) - 1 }];
  });
}
export const PROGRESSIONS = [
  [1, 4, 5, 1],
  [1, 5, 6, 4],
  [2, 5, 1],
];
export type Rating = 'easy' | 'slow' | 'missed';
export interface ChordAttempt {
  key: GuitarKey;
  degrees: number[];
  rating: Rating;
  hints: number;
  phase: 'recall' | 'connect' | 'review';
  at: number;
}
export interface GuitarChordProgress {
  key: GuitarKey;
  attempts: ChordAttempt[];
  overrides: Partial<Record<GuitarKey, Partial<Record<number, RootString>>>>;
}
export const GUITAR_PROGRESS_KEY = 'notera.guitar-chords.v1';
const SEVENTH_GUITAR_PROGRESS_KEY = 'notera.guitar-seventh-chords.v1';
export const guitarProgressKey = (family: ChordFamily) =>
  family === 'seventh' ? SEVENTH_GUITAR_PROGRESS_KEY : GUITAR_PROGRESS_KEY;
export const validKey = (key: unknown): key is GuitarKey =>
  GUITAR_KEYS.some(([label]) => label === key);
export function readGuitarProgress(family: ChordFamily = 'triad'): GuitarChordProgress {
  const fallback: GuitarChordProgress = { key: 'C', attempts: [], overrides: {} };
  try {
    const data = JSON.parse(localStorage.getItem(guitarProgressKey(family)) ?? 'null');
    if (!data || typeof data !== 'object') return fallback;
    const attempts = Array.isArray(data.attempts)
      ? data.attempts.filter(
          (a: ChordAttempt) =>
            a &&
            validKey(a.key) &&
            Array.isArray(a.degrees) &&
            a.degrees.length > 0 &&
            a.degrees.length <= 4 &&
            a.degrees.every((d) => Number.isInteger(d) && d >= 1 && d <= 7) &&
            ['easy', 'slow', 'missed'].includes(a.rating) &&
            ['recall', 'connect', 'review'].includes(a.phase) &&
            Number.isInteger(a.hints) &&
            a.hints >= 0 &&
            a.hints <= 3 &&
            Number.isFinite(a.at),
        )
      : [];
    const overrides: GuitarChordProgress['overrides'] = {};
    for (const [key] of GUITAR_KEYS) {
      const values = data.overrides?.[key];
      if (!values || typeof values !== 'object') continue;
      overrides[key] = {};
      for (let degree = 1; degree <= 7; degree++) {
        if (values[degree] === 5 || values[degree] === 6) overrides[key]![degree] = values[degree];
      }
    }
    return { key: validKey(data.key) ? data.key : 'C', attempts: attempts.slice(-500), overrides };
  } catch {
    return fallback;
  }
}
export function pendingDegrees(attempts: ChordAttempt[], key: GuitarKey): number[] {
  const pending = new Set<number>();
  for (const attempt of attempts) {
    if (
      attempt.key !== key ||
      (attempt.phase === 'connect' && attempt.rating === 'easy' && attempt.hints === 0)
    )
      continue;
    for (const degree of attempt.degrees) {
      if (attempt.phase !== 'connect' && attempt.rating === 'easy' && attempt.hints === 0)
        pending.delete(degree);
      else pending.add(degree);
    }
  }
  return [...pending].sort((a, b) => a - b);
}
export function recallQueue(): number[][] {
  return shuffle([1, 2, 3, 4, 5, 6, 7]).map((degree) => [degree]);
}
