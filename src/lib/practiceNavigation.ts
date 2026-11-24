import { CONNECTION_MODES, GUITAR_CHORD_MODES, KINDS, TRANSCRIPTION_MODE } from './exercises';
import type { Mode } from './exercises';

export const LAST_PRACTICE_KEY = 'notera.last-practice.v1';
const modes: readonly string[] = [
  ...KINDS,
  ...Object.values(GUITAR_CHORD_MODES),
  ...Object.values(CONNECTION_MODES),
  TRANSCRIPTION_MODE,
];
export const isPracticeMode = (value: unknown): value is Mode =>
  typeof value === 'string' && modes.includes(value);

const retiredModes: Record<string, Mode> = {
  'sus-connection': 'chord-connection',
  'chord-degree': 'chord-tones-forward',
  'chord-seventh-degree': 'chord-seventh-tones-forward',
  'chord-sus-change': 'chord-sus-tones-forward',
};
const currentMode = (value: string | null): Mode | undefined =>
  value && Object.hasOwn(retiredModes, value)
    ? retiredModes[value]
    : isPracticeMode(value)
      ? value
      : undefined;

export function readPracticeMode(): Mode {
  const entry = currentMode(new URLSearchParams(location.search).get('practice'));
  if (entry) return entry;
  try {
    const saved = currentMode(localStorage.getItem(LAST_PRACTICE_KEY));
    if (saved) return saved;
  } catch {
    /* A direct practice link works even without storage. */
  }
  return 'interval';
}
