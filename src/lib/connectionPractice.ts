import type { PracticeChordFamily } from './chordHarmony';
import { chordsInKey, validKey } from './guitarChords';
import type { GuitarKey } from './guitarChords';
import { CHORD_PROGRESSIONS } from './chordProgressions';
import { name, transpose } from './theory';
import type { ChordFamily } from './chordHarmony';

/** Resolve the altered dominant and half-diminished chord in minor cadences. */
export function connectionChordsInKey(key: GuitarKey, family: ChordFamily, minor = false) {
  const chords = chordsInKey(key, family);
  if (!minor) return chords;
  const root = chords[2].root;
  chords[2] = {
    ...chords[2],
    quality: '7',
    symbol: `${name(root, false)}7`,
    tones: [root, transpose(root, 3, 4, 1), transpose(root, 5, 7, 1), transpose(root, 7, 10, 1)],
  };
  chords[6] = chordsInKey(key, 'seventh')[6];
  return chords;
}

/** Historical record format; current practice always follows the metronome. */
type ConnectionStyle = 'free' | 'timed';
export type ConnectionRating = 'smooth' | 'hesitant' | 'stopped';
export type ConnectionLink = [number, number];
export interface ConnectionSettings {
  key: GuitarKey;
  progression: number;
  tempo: number;
  loops: number;
  display: 'names' | 'degrees';
  focus: ConnectionLink | null;
}
export interface ConnectionAttempt {
  at: number;
  key: GuitarKey;
  degrees: number[];
  style: ConnectionStyle;
  tempo: number | null;
  loops: number;
  rating: ConnectionRating;
  /** Retained for compatibility with earlier saved self-assessments. */
  weakLinks: ConnectionLink[];
}
export interface ConnectionProgress {
  settings: ConnectionSettings;
  attempts: ConnectionAttempt[];
}
export const CONNECTION_RATINGS: Record<ConnectionRating, string> = {
  smooth: '连贯',
  hesitant: '有犹豫',
  stopped: '有停顿',
};
export const connectionStorageKey = (family: PracticeChordFamily) =>
  `notera.connection.${family}.v1`;
const isDegree = (n: unknown): n is number =>
  Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 7;
const isLink = (link: unknown): link is ConnectionLink =>
  Array.isArray(link) && link.length === 2 && link.every(isDegree) && link[0] !== link[1];
const isStyle = (style: unknown): style is ConnectionStyle => style === 'free' || style === 'timed';
const isTempo = (tempo: unknown): tempo is number =>
  Number.isInteger(tempo) && Number(tempo) >= 40 && Number(tempo) <= 120;
const isLoops = (loops: unknown): loops is number =>
  [1, 2, 4, 8].includes(Number(loops)) && typeof loops === 'number';

export function readConnectionProgress(
  family: PracticeChordFamily,
  defaultKey: GuitarKey = family === 'sus' ? 'E' : 'C',
): ConnectionProgress {
  const settings: ConnectionSettings = {
    key: defaultKey,
    progression: 1,
    tempo: 60,
    loops: 4,
    display: 'names',
    focus: null,
  };
  const fallback = { settings, attempts: [] };
  try {
    const data = JSON.parse(localStorage.getItem(connectionStorageKey(family)) ?? 'null');
    if (!data || typeof data !== 'object') return fallback;
    const saved = data.settings ?? {};
    if (validKey(saved.key) && (family !== 'sus' || saved.key === 'E' || saved.key === 'A'))
      settings.key = saved.key;
    if (
      Number.isInteger(saved.progression) &&
      saved.progression >= 0 &&
      saved.progression < CHORD_PROGRESSIONS.length
    )
      settings.progression = saved.progression;
    if (isTempo(saved.tempo)) settings.tempo = saved.tempo;
    if (isLoops(saved.loops)) settings.loops = saved.loops;
    if (saved.display === 'names' || saved.display === 'degrees') settings.display = saved.display;
    if (isLink(saved.focus)) settings.focus = saved.focus;
    const attempts: ConnectionAttempt[] = Array.isArray(data.attempts)
      ? data.attempts
          .filter(
            (a: ConnectionAttempt) =>
              a &&
              Number.isFinite(a.at) &&
              validKey(a.key) &&
              Array.isArray(a.degrees) &&
              a.degrees.length >= 2 &&
              a.degrees.length <= 8 &&
              a.degrees.every(isDegree) &&
              isStyle(a.style) &&
              (a.style === 'free' ? a.tempo === null : isTempo(a.tempo)) &&
              isLoops(a.loops) &&
              Object.hasOwn(CONNECTION_RATINGS, a.rating) &&
              Array.isArray(a.weakLinks) &&
              a.weakLinks.every(
                (link) =>
                  isLink(link) &&
                  progressionLinks(a.degrees).some((edge) => edge.join(':') === link.join(':')),
              ),
          )
          .slice(-500)
      : [];
    return { settings, attempts };
  } catch {
    return fallback;
  }
}

/** Include the last-to-first change: it is part of a repeating progression too. */
export function progressionLinks(degrees: readonly number[]): ConnectionLink[] {
  const seen = new Set<string>();
  return degrees.flatMap((from, i) => {
    const to = degrees[(i + 1) % degrees.length];
    const id = `${from}:${to}`;
    if (from === to || seen.has(id)) return [];
    seen.add(id);
    return [[from, to] as ConnectionLink];
  });
}
