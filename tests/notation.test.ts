import { describe, expect, it } from 'vitest';
import { notation, notationLabel } from '../src/lib/notation';
import { LETTERS } from '../src/lib/theory';

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
