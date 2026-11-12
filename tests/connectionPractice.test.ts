import { describe, expect, it } from 'vitest';
import {
  connectionStorageKey,
  progressionLinks,
  readConnectionProgress,
  connectionChordsInKey,
} from '../src/lib/connectionPractice';
import type { ConnectionAttempt } from '../src/lib/connectionPractice';
import { GUITAR_KEYS, voicingFor, voicingNotes } from '../src/lib/guitarChords';
import { midi } from '../src/lib/theory';
import { CHORD_PROGRESSIONS } from '../src/lib/chordProgressions';

const attempt = (patch: Partial<ConnectionAttempt> = {}): ConnectionAttempt => ({
  at: 1,
  key: 'C',
  degrees: [1, 5, 6, 4],
  style: 'free',
  tempo: null,
  loops: 4,
  rating: 'hesitant',
  weakLinks: [[6, 4]],
  ...patch,
});

describe('connection records', () => {
  it('restores new progression settings and rejects corrupt indices', () => {
    for (const index of [3, CHORD_PROGRESSIONS.length - 1, -1, 100, 1.5, '3']) {
      localStorage.setItem(
        connectionStorageKey('triad'),
        JSON.stringify({ settings: { progression: index } }),
      );
      expect(readConnectionProgress('triad').settings.progression).toBe(
        typeof index === 'number' &&
          Number.isInteger(index) &&
          index >= 0 &&
          index < CHORD_PROGRESSIONS.length
          ? index
          : 1,
      );
    }
  });
  it('plays the altered minor cadence tones correctly on both root strings in every key', () => {
    for (const [key] of GUITAR_KEYS) {
      for (const family of ['triad', 'seventh'] as const) {
        const chords = connectionChordsInKey(key, family, true);
        for (const chord of [chords[2], chords[6]]) {
          const expected = chord.tones.map((note) => midi(note) % 12).sort((a, b) => a - b);
          for (const rootString of [5, 6] as const) {
            const actual = [
              ...new Set(
                voicingNotes(voicingFor(chord, rootString)).map((note) => midi(note) % 12),
              ),
            ].sort((a, b) => a - b);
            expect(actual, `${key} ${family} ${chord.symbol} ${rootString}`).toEqual(expected);
          }
        }
      }
    }
  });
  it('includes the loop boundary, preserves direction and omits repeated tonic changes', () => {
    expect(progressionLinks([1, 4, 5, 1])).toEqual([
      [1, 4],
      [4, 5],
      [5, 1],
    ]);
    expect(progressionLinks([6, 4])).toEqual([
      [6, 4],
      [4, 6],
    ]);
  });
  it('validates settings and individual records, and separates the chord materials', () => {
    localStorage.setItem(
      connectionStorageKey('triad'),
      JSON.stringify({
        settings: {
          key: 'G',
          progression: 2,
          tempo: -4,
          loops: 5,
          focus: [1, 8],
          style: 'invalid',
        },
        attempts: [
          attempt(),
          attempt({ degrees: [1, 9] }),
          attempt({ style: 'timed', tempo: null }),
          null,
        ],
      }),
    );
    expect(readConnectionProgress('triad')).toMatchObject({
      settings: { key: 'G', progression: 2, tempo: 60, loops: 4, focus: null },
      attempts: [attempt()],
    });
    expect(readConnectionProgress('seventh').attempts).toEqual([]);
    localStorage.setItem(connectionStorageKey('sus'), JSON.stringify({ settings: { key: 'C' } }));
    expect(readConnectionProgress('sus').settings.key).toBe('E');
    localStorage.setItem(connectionStorageKey('triad'), '{');
    expect(readConnectionProgress('triad').attempts).toEqual([]);
  });
});
