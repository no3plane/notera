import { describe, expect, it } from 'vitest';
import {
  connectionStorageKey,
  progressionLinks,
  readConnectionProgress,
} from '../src/lib/connectionPractice';
import type { ConnectionAttempt } from '../src/lib/connectionPractice';

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
