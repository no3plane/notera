import { MAJOR_KEYS, majorKeyChords, sameRootChord } from './chordHarmony';
import { interval, name } from './theory';
import type { Note } from './types';

export const DIATONIC_SUS_MODE = 'chord-sus-diatonic';
export const DIATONIC_SUS_CHOICES = ['两种都行', '只 sus2', '只 sus4', '都不行'] as const;

function checkInterval(root: Note, expected: Note, scale: Note[]) {
  const actual = scale.find((note) => note.letter === expected.letter)!;
  return {
    expected: name(expected, false),
    actual: name(actual, false),
    interval: interval(root, { ...actual, octave: expected.octave }).title,
    inKey: expected.acc === actual.acc,
  };
}

export const DIATONIC_SUS_LESSONS = MAJOR_KEYS.map(([key, letter, acc]) => {
  const chords = majorKeyChords({ letter, acc, octave: 3 }, 'triad');
  const scale = chords.map((chord) => chord.root);
  return {
    key,
    scale: scale.map((note) => name(note, false)),
    rows: chords.map(({ degree, roman, root, symbol }) => {
      const sus2 = sameRootChord(root, 'sus2');
      const sus4 = sameRootChord(root, 'sus4');
      const second = checkInterval(root, sus2.tones[1], scale);
      const fourth = checkInterval(root, sus4.tones[1], scale);
      const fifth = checkInterval(root, sus2.tones[2], scale);
      const options = [
        { ...sus2, missing: [second, fifth].filter((tone) => !tone.inKey) },
        { ...sus4, missing: [fourth, fifth].filter((tone) => !tone.inKey) },
      ];
      const [both, only2, only4, neither] = DIATONIC_SUS_CHOICES;
      const allowed = options.filter((option) => !option.missing.length);
      const answer =
        allowed.length === 2
          ? both
          : allowed.length === 0
            ? neither
            : allowed[0].symbol === sus2.symbol
              ? only2
              : only4;
      const rootName = name(root, false);
      const relation = (tone: typeof fifth) =>
        `${rootName} 到调内的 ${tone.actual} 是${tone.interval}`;
      const reason = !fifth.inKey
        ? `${relation(fifth)}，两种都需要纯五度音 ${fifth.expected}。`
        : !second.inKey
          ? `${relation(second)}，sus2 需要大二度音 ${second.expected}。`
          : !fourth.inKey
            ? `${relation(fourth)}，sus4 需要纯四度音 ${fourth.expected}。`
            : `大二度音 ${second.expected}、纯四度音 ${fourth.expected}、纯五度音 ${fifth.expected} 都在调内。`;
      const evidence = options.map(({ symbol: suspended, tones, missing }) => {
        const notes = tones.map((note) => name(note, false)).join('–');
        return missing.length
          ? `${suspended}（${notes}）需要调外音 ${missing.map((tone) => tone.expected).join('、')}。`
          : `${suspended}（${notes}）的三个音都在调内。`;
      });
      return {
        degree,
        roman,
        symbol,
        answer,
        reason,
        explanation: [reason, ...evidence].join(' '),
      };
    }),
  };
});
