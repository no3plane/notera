import { describe, expect, it } from 'vitest';
import { conversionNotes, conversionReducer, createConversionSession } from '../src/lib/conversion';
import { notation, notationLabel } from '../src/lib/notation';
import { LETTERS, midi } from '../src/lib/theory';

describe('note notation', () => {
  it('maps the seven letters and preserves enharmonic spelling', () => {
    expect(LETTERS.map((letter) => notation({ letter, acc: 0, octave: 4 }, 'numbered'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
    expect(LETTERS.map((letter) => notation({ letter, acc: 0, octave: 4 }, 'solfege'))).toEqual([
      'Do',
      'Re',
      'Mi',
      'Fa',
      'Sol',
      'La',
      'Si',
    ]);
    expect(notation({ letter: 'F', acc: 1, octave: 3 }, 'numbered')).toBe('♯4');
    expect(notation({ letter: 'G', acc: -1, octave: 3 }, 'numbered')).toBe('♭5');
    expect(notation({ letter: 'G', acc: -1, octave: 3 }, 'solfege')).toBe('♭Sol');
    expect(notationLabel({ letter: 'C', acc: 0, octave: 3 }, 'numbered')).toBe('1，低 1 个八度');
    expect(notationLabel({ letter: 'C', acc: 0, octave: 5 }, 'solfege')).toBe('Do，高 1 个八度');
  });
});

describe('conversion practice', () => {
  it('covers all 12 directed conversions in a mixed round, with unambiguous choices', () => {
    for (const level of ['natural', 'sharp', 'flat'] as const) {
      const s = createConversionSession({ source: 'any', target: 'any', level });
      expect(s.queue).toHaveLength(12);
      expect(new Set(s.queue.map((q) => `${q.source}-${q.target}`)).size).toBe(12);
      for (const q of s.queue) {
        expect(q.source).not.toBe(q.target);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map(midi)).size).toBe(4);
        expect(q.choices.filter((n) => midi(n) === midi(q.note))).toHaveLength(1);
        if (level === 'natural') expect(q.choices.every((n) => n.acc === 0)).toBe(true);
        if (level === 'sharp') expect(q.choices.every((n) => n.acc >= 0)).toBe(true);
        if (level === 'flat') expect(q.choices.every((n) => n.acc <= 0)).toBe(true);
      }
      if (level !== 'natural') expect(new Set(s.queue.map((q) => midi(q.note))).size).toBe(12);
    }
  });
  it('supports every fixed direction, and safely resolves the same format on both sides', () => {
    const formats = ['name', 'numbered', 'solfege', 'piano'] as const;
    for (const source of formats)
      for (const target of formats) {
        const s = createConversionSession({ source, target, level: 'natural' });
        expect(s.queue.every((q) => q.source === source && q.target !== source)).toBe(true);
        if (source !== target) expect(s.queue.every((q) => q.target === target)).toBe(true);
      }
  });
  it('scores once, ignores invalid answers, pauses timing, and completes a round', () => {
    let s = createConversionSession({ source: 'name', target: 'piano', level: 'natural' }, 100);
    expect(conversionReducer(s, { type: 'next', now: 200 })).toBe(s);
    expect(
      conversionReducer(s, { type: 'answer', note: { letter: 'C', acc: 1, octave: 4 }, now: 200 }),
    ).toBe(s);
    s = conversionReducer(s, { type: 'pause', now: 1100 });
    expect(conversionReducer(s, { type: 'answer', note: s.queue[0].note, now: 1200 })).toBe(s);
    s = conversionReducer(s, { type: 'resume', now: 11100 });
    s = conversionReducer(s, { type: 'answer', note: s.queue[0].note, now: 12100 });
    expect(s.results[0]).toMatchObject({ correct: true, time: 2000 });
    expect(conversionReducer(s, { type: 'answer', note: s.queue[0].note, now: 13000 })).toBe(s);
    s = conversionReducer(s, { type: 'next', now: 14000 });
    const wrong = conversionNotes('natural').find((n) => midi(n) !== midi(s.queue[1].note))!;
    s = conversionReducer(s, { type: 'answer', note: wrong, now: 14500 });
    expect(s.results[1]).toMatchObject({ correct: false, time: 500 });
    s = conversionReducer(s, { type: 'next', now: 15000 });
    while (s.index < s.queue.length) {
      s = conversionReducer(s, { type: 'answer', note: s.queue[s.index].note, now: 16000 });
      s = conversionReducer(s, { type: 'next', now: 17000 });
    }
    expect(s.index).toBe(12);
    expect(s.results.filter((r) => r.correct)).toHaveLength(11);
    expect(conversionReducer(s, { type: 'answer', note: wrong, now: 18000 })).toBe(s);
  });
});
