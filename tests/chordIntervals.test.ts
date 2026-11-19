import { describe, expect, it, vi } from 'vitest';
import {
  CHORD_INTERVAL_CHOICES,
  CHORD_INTERVAL_ROLES,
  chordIntervalFrame,
  chordIntervalQuestions,
  chordIntervalStorageKey,
  intervalAnswersComplete,
  intervalAnswersCorrect,
  newChordIntervalSession,
  readChordIntervalSession,
} from '../src/lib/chordIntervals';
import { PRACTICE_CHORD_FAMILIES } from '../src/lib/chordHarmony';
import { GUITAR_TUNING } from '../src/lib/guitarChords';
import { midi } from '../src/lib/theory';

const semitones = { R: 0, '2': 2, b3: 3, '3': 4, '4': 5, b5: 6, '5': 7, b7: 10, '7': 11 };

describe('chord interval material', () => {
  it.each(PRACTICE_CHORD_FAMILIES)('validates every string and fret window in %s', (family) => {
    const questions = chordIntervalQuestions(family);
    expect(questions).toHaveLength({ triad: 6, seventh: 8, sus: 4 }[family]);
    const basics = questions.filter((q) => !['Fm7(b5)', 'Bm7(b5)'].includes(q.symbol));
    expect(basics.every((q) => q.voicing.rootFret === 0)).toBe(true);
    expect(
      basics.every((q) => ['E', 'A'].includes(q.tones[0].letter) && q.tones[0].acc === 0),
    ).toBe(true);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const question of questions) {
      expect(question.answers).toHaveLength(6);
      const { start } = chordIntervalFrame(question.voicing);
      for (let i = 0; i < 6; i++) {
        const fret = question.voicing.frets[i];
        const role = question.answers[i];
        if (fret === null) {
          expect(role).toBeNull();
          continue;
        }
        expect(CHORD_INTERVAL_ROLES).toContain(role);
        expect(CHORD_INTERVAL_CHOICES[family]).toContain(role);
        const offset = (GUITAR_TUNING[i] + fret - midi(question.tones[0]) + 120) % 12;
        expect(offset, `${question.id}, string ${6 - i}`).toBe(semitones[role!]);
        if (fret > 0) expect(fret >= start && fret < start + 4).toBe(true);
      }
    }
  });

  it('starts with open E/A shapes and distinguishes thirds, fifths and sevenths', () => {
    const triads = chordIntervalQuestions('triad');
    expect(triads.slice(0, 4).map((q) => q.symbol)).toEqual(['E', 'Em', 'A', 'Am']);
    expect(triads[0].answers).toEqual(['R', '5', 'R', '3', '5', 'R']);
    expect(triads[1].answers).toEqual(['R', '5', 'R', 'b3', '5', 'R']);
    expect(triads[2].answers).toEqual([null, 'R', '5', 'R', '3', '5']);
    expect(triads.some((q) => ['F', 'G', 'Bm'].includes(q.symbol))).toBe(false);
    const seventh = chordIntervalQuestions('seventh');
    expect(seventh[0].symbol).toBe('E7');
    expect(seventh[0].answers).toEqual(['R', '5', 'b7', '3', '5', 'R']);
    expect(seventh[2].answers).toEqual(['R', '5', '7', '3', '5', 'R']);
    expect(seventh.find((q) => q.symbol === 'Amaj7')!.answers).toEqual([
      null,
      'R',
      '5',
      '7',
      '3',
      '5',
    ]);
    expect(seventh.some((q) => q.answers.includes('b5'))).toBe(true);
    const suspended = chordIntervalQuestions('sus');
    expect(suspended[0].symbol).toBe('Esus2');
    expect(suspended[0].answers).toEqual(['R', '5', 'R', null, '5', '2']);
    expect(suspended[1].answers).toEqual(['R', '5', 'R', '4', '5', 'R']);
  });

  it.each([
    ['Fm7(b5)', 6, [1, null, 1, 1, 0, null], ['R', null, 'b7', 'b3', 'b5', null]],
    ['Bm7(b5)', 5, [null, 2, 3, 2, 3, null], [null, 'R', 'b5', 'b7', 'b3', null]],
  ] as const)(
    'uses the actual %s fingering and interval answers',
    (symbol, rootString, frets, answers) => {
      const questions = chordIntervalQuestions('seventh');
      expect(questions.some((q) => ['Em7♭5', 'Am7♭5'].includes(q.symbol))).toBe(false);
      const item = questions.find((q) => q.symbol === symbol)!;
      expect(item.voicing.rootString).toBe(rootString);
      expect(item.voicing.frets).toEqual(frets);
      expect(item.answers).toEqual(answers);
    },
  );

  it('ignores muted strings while requiring every sounding string before checking', () => {
    const question = chordIntervalQuestions('triad')[2];
    expect(intervalAnswersComplete(question, Array(6).fill(null))).toBe(false);
    expect(intervalAnswersComplete(question, question.answers)).toBe(true);
    expect(intervalAnswersCorrect(question, question.answers)).toBe(true);
    const wrong = [...question.answers];
    wrong[4] = 'b3';
    expect(intervalAnswersComplete(question, wrong)).toBe(true);
    expect(intervalAnswersCorrect(question, wrong)).toBe(false);
    expect(newChordIntervalSession(question).active).toBe(1);
  });
});

describe('chord interval session recovery', () => {
  it('restores an unfinished chord and validates stored roles and active strings', () => {
    const questions = chordIntervalQuestions('triad');
    const saved = {
      ...newChordIntervalSession(questions[2]),
      answers: [null, 'R', 'wrong', null, null, null],
      active: 0,
      checked: true,
    };
    localStorage.setItem(chordIntervalStorageKey('triad'), JSON.stringify(saved));
    expect(readChordIntervalSession('triad', questions)).toEqual({
      questionId: questions[2].id,
      answers: [null, 'R', null, null, null, null],
      active: 1,
      checked: false,
    });
  });

  it('recovers from malformed, obsolete or inaccessible storage', () => {
    const questions = chordIntervalQuestions('triad');
    for (const value of ['{broken', 'null', '[]', '{"questionId":"retired"}', '{"answers":42}']) {
      localStorage.setItem(chordIntervalStorageKey('triad'), value);
      expect(readChordIntervalSession('triad', questions)).toEqual(
        newChordIntervalSession(questions[0]),
      );
    }
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readChordIntervalSession('triad', questions)).toEqual(
      newChordIntervalSession(questions[0]),
    );
    spy.mockRestore();
  });
});
