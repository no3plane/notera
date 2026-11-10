import { BASE, name, transpose } from './theory';
import type { Note } from './types';

export const CHORD_FAMILIES = ['triad', 'seventh'] as const;
export type ChordFamily = (typeof CHORD_FAMILIES)[number];
export const PRACTICE_CHORD_FAMILIES = [...CHORD_FAMILIES, 'sus'] as const;
export type PracticeChordFamily = (typeof PRACTICE_CHORD_FAMILIES)[number];
export const CHORD_FAMILY_LABELS = { triad: '三和弦', seventh: '七和弦', sus: '挂留和弦' };
export const CHORD_DEGREES = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
export const SEVENTH_DEGREES = ['Imaj7', 'iim7', 'iiim7', 'IVmaj7', 'V7', 'vim7', 'viiø7'];
export const MAJOR_KEYS = [
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
export type MajorKey = (typeof MAJOR_KEYS)[number][0];

const TRIAD_QUALITIES = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'] as const;
const SEVENTH_QUALITIES = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'] as const;
export type SeventhQuality = (typeof SEVENTH_QUALITIES)[number];
export type ChordQuality = (typeof TRIAD_QUALITIES)[number] | SeventhQuality;
export const QUALITY_LABELS: Record<ChordQuality, string> = {
  major: '大三和弦',
  minor: '小三和弦',
  dim: '减三和弦',
  maj7: '大七和弦',
  m7: '小七和弦',
  '7': '属七和弦',
  m7b5: '半减七和弦',
};
const SUFFIXES: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  dim: 'dim',
  maj7: 'maj7',
  m7: 'm7',
  '7': '7',
  m7b5: 'm7♭5',
};

export interface DiatonicChord {
  degree: number;
  roman: string;
  root: Note;
  symbol: string;
  quality: ChordQuality;
  tones: Note[];
}

export function majorKeyChords(tonic: Note, family: ChordFamily): DiatonicChord[] {
  const sevenths = family === 'seventh';
  const scale = BASE.slice(0, 7);
  const noteAt = (index: number) =>
    transpose(tonic, index + 1, scale[index % 7] + 12 * Math.floor(index / 7), 1);
  return scale.map((_, index) => {
    const offsets = sevenths ? [0, 2, 4, 6] : [0, 2, 4];
    const tones = offsets.map((offset) => noteAt(index + offset));
    const root = tones[0];
    const quality = (sevenths ? SEVENTH_QUALITIES : TRIAD_QUALITIES)[index];
    return {
      degree: index + 1,
      roman: (sevenths ? SEVENTH_DEGREES : CHORD_DEGREES)[index],
      root,
      quality,
      symbol: name(root, false) + SUFFIXES[quality],
      tones,
    };
  });
}

export const SUS_TYPES = ['sus2', 'sus4'] as const;
export const SAME_ROOT_FORMULAS = { major: '1 · 3 · 5', sus2: '1 · 2 · 5', sus4: '1 · 4 · 5' };
export function sameRootChord(root: Note, quality: keyof typeof SAME_ROOT_FORMULAS) {
  const [degree, distance] = { major: [3, 4], sus2: [2, 2], sus4: [4, 5] }[quality];
  return {
    symbol: name(root, false) + (quality === 'major' ? '' : quality),
    tones: [root, transpose(root, degree, distance, 1), transpose(root, 5, 7, 1)],
  };
}

const CHORD_FAMILY_KEY = 'notera.chord-family.v1';
export function readChordFamily(): PracticeChordFamily {
  try {
    const saved = localStorage.getItem(CHORD_FAMILY_KEY);
    return PRACTICE_CHORD_FAMILIES.find((family) => family === saved) ?? 'triad';
  } catch {
    return 'triad';
  }
}
export function saveChordFamily(family: PracticeChordFamily) {
  try {
    localStorage.setItem(CHORD_FAMILY_KEY, family);
  } catch {
    // The current selection still works without storage.
  }
}
