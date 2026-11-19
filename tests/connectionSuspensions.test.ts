import { describe, expect, it } from 'vitest';
import {
  connectionChordsInKey,
  connectionStorageKey,
  readConnectionProgress,
} from '../src/lib/connectionPractice';
import { connectionSuspensions, suspensionShape } from '../src/lib/connectionSuspensions';
import { CHORD_PROGRESSIONS } from '../src/lib/chordProgressions';
import {
  chordsInKey,
  GUITAR_KEYS,
  recommendedVoicings,
  voicingFor,
  voicingNotes,
} from '../src/lib/guitarChords';
import { midi } from '../src/lib/theory';

const pitches = (notes: ReturnType<typeof voicingNotes>) =>
  [...new Set(notes.map((note) => midi(note) % 12))].sort((a, b) => a - b);
const formulas = {
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  '7sus2': [0, 2, 7, 10],
  maj7sus2: [0, 2, 7, 11],
  maj7sus4: [0, 5, 7, 11],
} as const;

describe('musical suspension arrangements', () => {
  it('sounds exactly the named tones on both root strings, including open and octave shapes in all keys', () => {
    for (const [key] of GUITAR_KEYS) {
      const chord = chordsInKey(key)[0];
      for (const rootString of [5, 6] as const)
        for (const octave of [0, 1] as const) {
          for (const kind of Object.keys(formulas) as (keyof typeof formulas)[]) {
            const shape = suspensionShape(chord, voicingFor(chord, rootString, octave), kind);
            const actual = voicingNotes(shape.voicing);
            expect(pitches(actual), `${key} ${rootString} ${octave} ${kind}`).toEqual(
              pitches(shape.tones),
            );
            expect(
              pitches(actual)
                .map((pitch) => (pitch - (midi(chord.root) % 12) + 12) % 12)
                .sort((a, b) => a - b),
            ).toEqual(formulas[kind]);
            expect(shape.voicing.frets.every((fret) => fret === null || fret >= 0)).toBe(true);
            expect(
              shape.voicing.fingers.every((finger, i) =>
                shape.voicing.frets[i] === null
                  ? finger === null
                  : shape.voicing.frets[i] === 0
                    ? finger === 0
                    : finger! >= 1 && finger! <= 4,
              ),
            ).toBe(true);
          }
        }
    }
  });
  it.each(GUITAR_KEYS)(
    'writes four correct beats per bar in %s across all progressions and seventh qualities',
    (key) => {
      const scale = pitches(chordsInKey(key).map((chord) => chord.root));
      for (const family of ['triad', 'seventh'] as const)
        for (const progression of CHORD_PROGRESSIONS) {
          const chords = connectionChordsInKey(key, family, progression.minor);
          for (const voicings of [
            recommendedVoicings(chords),
            chords.map((chord) => voicingFor(chord, 5)),
            chords.map((chord) => voicingFor(chord, 6)),
          ]) {
            const phrase = connectionSuspensions(key, chords, voicings, progression.degrees, 8, 0);
            expect(phrase).toHaveLength(8);
            for (const loop of phrase) {
              expect(loop.bars).toHaveLength(progression.degrees.length);
              for (const bar of loop.bars) {
                const source = chords[bar.degree - 1];
                expect(progression.degrees[bar.bar]).toBe(bar.degree);
                expect(bar.beats).toHaveLength(4);
                if (source.quality === 'dim' || source.quality === 'm7b5')
                  expect(bar.usage).toBe('plain');
                for (const beat of bar.beats) {
                  expect(pitches(voicingNotes(beat.shape.voicing))).toEqual(
                    pitches(beat.shape.tones),
                  );
                  if (!beat.kind) {
                    expect(beat.shape.symbol).toBe(source.symbol);
                    continue;
                  }
                  expect(pitches(beat.shape.tones).every((pitch) => scale.includes(pitch))).toBe(
                    true,
                  );
                  expect(beat.shape.voicing.rootFret).toBe(voicings[bar.degree - 1].rootFret);
                  if (source.quality === 'maj7') expect(beat.kind).toBe('maj7sus2');
                  if (source.quality === 'm7' || source.quality === '7')
                    expect(['7sus2', '7sus4']).toContain(beat.kind);
                  if (source.tones.length === 4)
                    expect(midi(beat.shape.tones[3]) % 12).toBe(midi(source.tones[3]) % 12);
                  else expect(beat.shape.tones).toHaveLength(3);
                }
              }
            }
          }
        }
    },
  );
  it('includes multiple altered bars, non-resolving holds, direct transitions, single-beat ornaments and continuous colour changes', () => {
    const chords = connectionChordsInKey('C', 'triad');
    const phrase = connectionSuspensions(
      'C',
      chords,
      recommendedVoicings(chords),
      [1, 5, 6, 4],
      4,
      0,
    );
    const altered = (loop: (typeof phrase)[number]) =>
      loop.bars.filter((bar) => bar.usage !== 'plain');
    expect(altered(phrase[0])).toHaveLength(2);
    expect(altered(phrase[2])).toHaveLength(3);
    const usages = new Set(phrase.flatMap((loop) => loop.bars.map((bar) => bar.usage)));
    for (const usage of ['plain', 'hold', 'lead', 'resolve', 'decorate', 'chain'] as const)
      expect(usages.has(usage)).toBe(true);
    for (const loop of phrase)
      for (const bar of loop.bars) {
        if (bar.usage === 'hold') {
          expect(bar.beats.every((beat) => beat.kind)).toBe(true);
          expect(bar.beats.every((beat) => beat.action !== '恢复')).toBe(true);
        }
        if (bar.usage === 'lead') {
          expect(bar.beats[0].kind).toBeNull();
          expect(bar.beats[3].kind).not.toBeNull();
        }
        if (bar.usage === 'chain')
          expect(bar.beats.some((beat) => beat.action === '换色')).toBe(true);
      }
    expect(phrase[2].bars[2].beats.filter((beat) => beat.kind)).toHaveLength(1);
    expect(phrase[0].bars[1].beats[3].kind).not.toBeNull();
    expect(phrase[0].bars[2].beats[0].shape.symbol).toBe('Am');
  });
  it('retains the theme in its echo, develops it and leaves space at the end without changing the underlying progression', () => {
    const chords = connectionChordsInKey('C', 'triad');
    const generate = (version: number, loops = 4) =>
      connectionSuspensions('C', chords, recommendedVoicings(chords), [1, 5, 6, 4], loops, version);
    const phrase = generate(0);
    expect(phrase.map((loop) => loop.role)).toEqual(['主题', '呼应', '展开', '收束']);
    expect(phrase[0].bars[0]).toEqual(phrase[1].bars[0]);
    expect(phrase[0].bars[1]).not.toEqual(phrase[1].bars[1]);
    expect(phrase[3].bars.at(-1)?.usage).toBe('plain');
    expect(generate(0, 8).slice(0, 4)).toEqual(phrase);
    expect(generate(0)).toEqual(phrase);
    for (let version = 0; version < 30; version++)
      expect(generate(version)).not.toEqual(generate(version + 1));
    expect(generate(0, 8)[4].bars).not.toEqual(phrase[0].bars);
  });
  it('does not invent unavailable sus colours when only one fits, or invent a change on diminished chords', () => {
    const chords = connectionChordsInKey('C', 'triad');
    const shapes = recommendedVoicings(chords);
    const phrase = connectionSuspensions('C', chords, shapes, [3, 7], 4, 3);
    for (const loop of phrase)
      for (const bar of loop.bars) {
        if (bar.degree === 7) expect(bar.usage).toBe('plain');
        if (bar.degree === 3)
          expect(bar.beats.every((beat) => !beat.kind || beat.kind === 'sus4')).toBe(true);
        expect(bar.usage).not.toBe('chain');
      }
    expect(
      connectionSuspensions('C', chords, shapes, [7], 4, 0).every(
        (loop) => loop.bars[0].usage === 'plain',
      ),
    ).toBe(true);
  });
  it('defaults off and validates persisted variation preferences independently for each family', () => {
    expect(readConnectionProgress('triad').settings.suspensions).toBe(false);
    localStorage.setItem(
      connectionStorageKey('triad'),
      JSON.stringify({ settings: { suspensions: true, suspensionVersion: 17 } }),
    );
    expect(readConnectionProgress('triad').settings).toMatchObject({
      suspensions: true,
      suspensionVersion: 17,
    });
    expect(readConnectionProgress('seventh').settings.suspensions).toBe(false);
    localStorage.setItem(
      connectionStorageKey('triad'),
      JSON.stringify({ settings: { suspensions: 'true', suspensionVersion: -3 } }),
    );
    expect(readConnectionProgress('triad').settings.suspensions).toBe(false);
    expect(readConnectionProgress('triad').settings.suspensionVersion).toBeGreaterThanOrEqual(0);
  });
});
