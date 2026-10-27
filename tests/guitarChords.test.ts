import { describe, expect, it } from 'vitest';
import {
  GUITAR_KEYS,
  GUITAR_PROGRESS_KEY,
  GUITAR_TUNING,
  chordsInKey,
  pendingDegrees,
  readGuitarProgress,
  recallQueue,
  recommendedVoicings,
  voicingFor,
  voicingsFor,
  voicingNotes,
} from '../src/lib/guitarChords';
import type { ChordAttempt } from '../src/lib/guitarChords';
import { midi } from '../src/lib/theory';

describe('guitar chord harmony and fingerings', () => {
  it.each(GUITAR_KEYS)(
    'spells all seven triads in %s and produces exact chord tones on both root strings',
    (key) => {
      const chords = chordsInKey(key);
      expect(chords).toHaveLength(7);
      for (const chord of chords) {
        const expected = chord.tones.map((note) => midi(note) % 12).sort((a, b) => a - b);
        for (const voicing of voicingsFor(chord)) {
          const rootString = voicing.rootString;
          const played = [...new Set(voicingNotes(voicing).map((note) => midi(note) % 12))].sort(
            (a, b) => a - b,
          );
          expect(played, `${key} ${chord.symbol}, root on ${rootString}`).toEqual(expected);
          const rootIndex = 6 - rootString;
          expect((GUITAR_TUNING[rootIndex] + voicing.rootFret) % 12).toBe(midi(chord.root) % 12);
          expect(voicing.frets.slice(0, rootIndex).every((fret) => fret === null)).toBe(true);
          // Full major/minor shapes sound every string from the bass root through the first string.
          if (chord.quality !== 'dim') {
            expect(
              voicing.frets.slice(rootIndex).every((fret) => fret !== null),
              `${key} ${chord.symbol}, incomplete shape on string ${rootString}`,
            ).toBe(true);
          }
          const intervals = [
            ...new Set(
              voicingNotes(voicing).map((note) => (midi(note) - midi(chord.root) + 120) % 12),
            ),
          ].sort((a, b) => a - b);
          expect(intervals).toEqual(
            chord.quality === 'major'
              ? [0, 4, 7]
              : chord.quality === 'minor'
                ? [0, 3, 7]
                : [0, 3, 6],
          );
          for (let string = 0; string < 6; string++) {
            const fret = voicing.frets[string],
              finger = voicing.fingers[string];
            if (fret === null) expect(finger).toBeNull();
            else if (fret === 0) expect(finger).toBe(0);
            else expect([1, 2, 3, 4]).toContain(finger);
          }
          // A finger can fret several strings only at one fret; multiple strings require a barre.
          for (const finger of [1, 2, 3, 4]) {
            const strings = voicing.fingers.flatMap((value, i) => (value === finger ? [i] : []));
            expect(new Set(strings.map((i) => voicing.frets[i])).size).toBeLessThanOrEqual(1);
            if (strings.length > 1) {
              expect(voicing.barre?.finger).toBe(finger);
              expect(voicing.barre?.from).toBeLessThanOrEqual(Math.min(...strings));
              expect(voicing.barre?.to).toBeGreaterThanOrEqual(Math.max(...strings));
              expect(voicing.barre?.fret).toBe(voicing.frets[strings[0]]);
            }
          }
          const pressed = voicing.frets.filter((f): f is number => f !== null && f > 0);
          expect(Math.max(...pressed) - Math.min(...pressed)).toBeLessThanOrEqual(3);
          expect(
            voicing.frets.every((f) => f === null || (Number.isInteger(f) && f >= 0 && f <= 14)),
          ).toBe(true);
        }
      }
      const plan = recommendedVoicings(chords);
      expect(plan).toEqual(recommendedVoicings(chords));
      expect(plan.every((v) => v.rootFret <= 9)).toBe(true);
    },
  );
  it('keeps theoretical spellings even when their fretboard equivalents have other names', () => {
    expect(chordsInKey('F♯').map((c) => c.symbol)).toEqual([
      'F♯',
      'G♯m',
      'A♯m',
      'B',
      'C♯',
      'D♯m',
      'E♯dim',
    ]);
    expect(chordsInKey('D♭').map((c) => c.symbol)).toEqual([
      'D♭',
      'E♭m',
      'Fm',
      'G♭',
      'A♭',
      'B♭m',
      'Cdim',
    ]);
  });
  it('covers every degree once in a recall round', () => {
    expect(recallQueue().flat().sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it('includes Em on both strings and at both open E and the twelfth fret', () => {
    const em = chordsInKey('G')[5];
    expect(voicingsFor(em).map((v) => [v.rootString, v.rootFret])).toEqual([
      [5, 7],
      [6, 0],
      [6, 12],
    ]);
    expect(voicingFor(em, 6).frets).toEqual([0, 2, 2, 0, 0, 0]);
    expect(voicingFor(chordsInKey('F')[6], 6).frets).toEqual([0, 1, 2, 0, null, null]);
  });
  it('uses a complete C major A-shape barre, with G on the first string', () => {
    const voicing = voicingFor(chordsInKey('C')[0], 5);
    expect(voicing.frets).toEqual([null, 3, 5, 5, 5, 3]);
    expect(midi(voicingNotes(voicing).at(-1)!)).toBe(67);
    expect(voicing.barre).toEqual({ fret: 3, from: 1, to: 5, finger: 1 });
  });
});

function attempt(
  degrees: number[],
  rating: ChordAttempt['rating'],
  hints = 0,
  phase: ChordAttempt['phase'] = 'recall',
): ChordAttempt {
  return { key: 'C', degrees, rating, hints, phase, at: 1 };
}
describe('guitar practice records', () => {
  it('only clears a weak degree after an independent recall; progressions add weak transitions to review', () => {
    const records = [attempt([2], 'missed'), attempt([2], 'easy', 1), attempt([4], 'slow')];
    expect(pendingDegrees(records, 'C')).toEqual([2, 4]);
    records.push(attempt([2], 'easy', 0, 'review'), attempt([1, 4, 5, 1], 'easy', 0, 'connect'));
    expect(pendingDegrees(records, 'C')).toEqual([4]);
    records.push(attempt([2, 5, 1], 'slow', 0, 'connect'));
    expect(pendingDegrees(records, 'C')).toEqual([1, 2, 4, 5]);
    expect(pendingDegrees(records, 'G')).toEqual([]);
  });
  it('recovers safely from corrupt records and validates stored data', () => {
    localStorage.setItem(GUITAR_PROGRESS_KEY, '{broken');
    expect(readGuitarProgress()).toEqual({ key: 'C', attempts: [], overrides: {} });
    localStorage.setItem(
      GUITAR_PROGRESS_KEY,
      JSON.stringify({
        key: 'G',
        attempts: [attempt([2], 'slow'), null, { degrees: [99] }],
        overrides: { G: { 1: 6, 2: 99 }, X: { 1: 5 } },
      }),
    );
    expect(readGuitarProgress()).toEqual({
      key: 'G',
      attempts: [attempt([2], 'slow')],
      overrides: { G: { 1: 6 } },
    });
  });
});
