import { CONNECTION_MODES, GUITAR_CHORD_MODES, KINDS } from './exercises';
import type { Mode } from './exercises';

export const LAST_PRACTICE_KEY = 'notera.last-practice.v1';
const modes: readonly string[] = [
  ...KINDS,
  ...Object.values(GUITAR_CHORD_MODES),
  ...Object.values(CONNECTION_MODES),
];
export const isPracticeMode = (value: unknown): value is Mode =>
  typeof value === 'string' && modes.includes(value);

export function readPracticeMode(): Mode {
  const entry = new URLSearchParams(location.search).get('practice');
  if (isPracticeMode(entry)) return entry;
  try {
    const saved = localStorage.getItem(LAST_PRACTICE_KEY);
    if (isPracticeMode(saved)) return saved;
  } catch {
    /* A direct practice link works even without storage. */
  }
  return 'interval';
}
