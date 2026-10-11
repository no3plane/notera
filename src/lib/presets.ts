import type { NotePair } from './types';
export const PRESETS = {
  third: { a: { letter: 'C', acc: 0, octave: 3 }, b: { letter: 'E', acc: -1, octave: 3 } },
  enharmonic: { a: { letter: 'C', acc: 0, octave: 3 }, b: { letter: 'F', acc: 1, octave: 3 } },
  augmented: { a: { letter: 'C', acc: 0, octave: 3 }, b: { letter: 'G', acc: 1, octave: 3 } },
} satisfies Record<string, NotePair>;
export type PresetName = keyof typeof PRESETS;
