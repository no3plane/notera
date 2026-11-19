import { shuffle } from './exercises';
import { chordsInKey, RATING_LABELS, voicingFor } from './guitarChords';
import type { ChordVoicing, Rating } from './guitarChords';
import { suspensionShape } from './connectionSuspensions';
import type { SuspensionKind } from './connectionSuspensions';
import { transpose } from './theory';
import type { Note } from './types';

export const SUS_GUITAR_ROOTS = ['E', 'A'] as const;
export type SusGuitarRoot = (typeof SUS_GUITAR_ROOTS)[number];
export const SUS_GUITAR_QUALITIES = ['major', 'minor', '7', 'm7', 'maj7'] as const;
export type SusGuitarQuality = (typeof SUS_GUITAR_QUALITIES)[number];
export type SusGuitarShape = {
  symbol: string;
  tones: Note[];
  formula: string;
  voicing: ChordVoicing;
};
const BASE_FORMULAS: Record<SusGuitarQuality, string> = {
  major: '1 · 3 · 5',
  minor: '1 · ♭3 · 5',
  '7': '1 · 3 · 5 · ♭7',
  m7: '1 · ♭3 · 5 · ♭7',
  maj7: '1 · 3 · 5 · 7',
};

function group(root: SusGuitarRoot, quality: SusGuitarQuality) {
  const minor = quality === 'minor' || quality === 'm7';
  const seventh = quality !== 'major' && quality !== 'minor';
  const majorSeventh = quality === 'maj7';
  const major = chordsInKey(root)[0];
  const chord = {
    ...major,
    quality,
    symbol: root + (quality === 'major' ? '' : quality === 'minor' ? 'm' : quality),
    tones: [
      major.root,
      transpose(major.root, 3, minor ? 3 : 4, 1),
      major.tones[2],
      ...(seventh ? [transpose(major.root, 7, majorSeventh ? 11 : 10, 1)] : []),
    ],
  };
  const base: SusGuitarShape = {
    ...chord,
    formula: BASE_FORMULAS[quality],
    voicing: voicingFor(chord, root === 'E' ? 6 : 5),
  };
  const suspended = (degree: 2 | 4): SusGuitarShape => {
    const kind = `${majorSeventh ? 'maj7' : seventh ? '7' : ''}sus${degree}` as SuspensionKind;
    return {
      ...suspensionShape(chord, base.voicing, kind),
      formula: `1 · ${degree} · 5${seventh ? (majorSeventh ? ' · 7' : ' · ♭7') : ''}`,
    };
  };
  return {
    comparison: [suspended(2), base, suspended(4)] as const,
    comparisonHint:
      root === 'E'
        ? '挂四把第 3 弦改按第 2 品；挂二让第 3 弦消音，第 1 弦按第 2 品。'
        : '只动第 2 弦：挂二弹空弦，挂四按第 3 品。',
  };
}
function groups(root: SusGuitarRoot) {
  return {
    major: group(root, 'major'),
    minor: group(root, 'minor'),
    '7': group(root, '7'),
    m7: group(root, 'm7'),
    maj7: group(root, 'maj7'),
  };
}
export const SUS_GUITAR_GROUPS = { E: groups('E'), A: groups('A') };

/** The six distinct suspended voicings per root; major/minor origins share them. */
export function susGuitarShapes(root: SusGuitarRoot): SusGuitarShape[] {
  return (['major', '7', 'maj7'] as const).flatMap((quality) => {
    const [sus2, , sus4] = SUS_GUITAR_GROUPS[root][quality].comparison;
    return [sus2, sus4];
  });
}

export function changedStrings([first, ...others]: readonly [SusGuitarShape, ...SusGuitarShape[]]) {
  return first.voicing.frets.flatMap((fret, i) =>
    others.some((shape) => shape.voicing.frets[i] !== fret) ? [6 - i] : [],
  );
}

export function susGuitarTasks(root: SusGuitarRoot) {
  return SUS_GUITAR_QUALITIES.flatMap((quality) => {
    const {
      comparison: [sus2, base, sus4],
    } = SUS_GUITAR_GROUPS[root][quality];
    const sequences = [
      [base, sus2],
      [sus2, base],
      [base, sus4],
      [sus4, base],
    ] as const;
    return sequences.map((sequence) => ({ quality, sequence }));
  });
}

export function susGuitarQueue(root: SusGuitarRoot) {
  return shuffle(susGuitarTasks(root));
}

export type SusGuitarAttempt = { root: SusGuitarRoot | 'D'; rating: Rating };
export type SusGuitarProgress = {
  root: SusGuitarRoot;
  attempts: SusGuitarAttempt[];
};
export const SUS_GUITAR_PROGRESS_KEY = 'notera.guitar-sus-chords.v1';
export function susTaskName(task: readonly SusGuitarShape[]) {
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
