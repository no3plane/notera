import type { Note, Level } from './types';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export const NATURAL = [0, 2, 4, 5, 7, 9, 11];
export const BASE = [0, 2, 4, 5, 7, 9, 11, 12];
export const DEGREE_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八'];
export function midi(n: Note) {
  return (n.octave + 1) * 12 + NATURAL[LETTERS.indexOf(n.letter)] + n.acc;
}
export function position(n: Note) {
  return n.octave * 7 + LETTERS.indexOf(n.letter);
}
export function name(n: Note, octave = true) {
  return (
    n.letter +
    (({ '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' } as Record<number, string>)[n.acc] ??
      '') +
    (octave ? n.octave : '')
  );
}
export function fromMidi(m: number, flat = false): Note {
  const spelling = flat
    ? ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
    : ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const pc = ((m % 12) + 12) % 12,
    s = spelling[pc];
  return {
    letter: s[0] as Note['letter'],
    acc: s.length > 1 ? (flat ? -1 : 1) : 0,
    octave: Math.floor(m / 12) - 1,
  };
}
export function interval(a: Note, b: Note) {
  let low = a,
    high = b;
  if (position(a) > position(b) || (position(a) === position(b) && midi(a) > midi(b)))
    [low, high] = [b, a];
  const degree = position(high) - position(low) + 1;
  const simple = ((degree - 1) % 7) + 1;
  const octaves = Math.floor((degree - 1) / 7);
  const semitones = midi(high) - midi(low);
  const baseline = BASE[simple - 1] + 12 * octaves;
  const delta = semitones - baseline;
  const perfect = [1, 4, 5].includes(simple);
  let quality, short;
  if (delta === 0) {
    quality = perfect ? '纯' : '大';
    short = perfect ? 'P' : 'M';
  } else if (!perfect && delta === -1) {
    quality = '小';
    short = 'm';
  } else if (delta > 0) {
    quality = ['', '增', '重增', '三增', '四增'][delta] || `${delta}重增`;
    short = 'A'.repeat(delta);
  } else {
    const count = -delta - (perfect ? 0 : 1);
    quality = ['', '减', '重减', '三减', '四减'][count] || `${count}重减`;
    short = 'd'.repeat(count);
  }
  return {
    degree,
    semitones,
    baseline,
    delta,
    perfect,
    quality,
    short: short + degree,
    title: quality + (DEGREE_NAMES[degree - 1] || degree) + '度',
    low,
    high,
    descending: low !== a,
  };
}
export function letterPath(a: Note, b: Note) {
  const result = interval(a, b),
    list = [];
  for (let i = position(result.low); i <= position(result.high); i++)
    list.push(LETTERS[((i % 7) + 7) % 7]);
  return list;
}
export function makeQuestion(level: Level = 'basic'): {
  a: Note;
  b: Note;
  result: ReturnType<typeof interval>;
} {
  for (let attempt = 0; attempt < 200; attempt++) {
    const degree = 1 + Math.floor(Math.random() * 8);
    const letterIndex = Math.floor(Math.random() * 7),
      octave = 3;
    const a: Note = {
      letter: LETTERS[letterIndex],
      acc: level === 'basic' ? 0 : Math.floor(Math.random() * 3) - 1,
      octave,
    };
    const target = letterIndex + degree - 1;
    const b: Note = {
      letter: LETTERS[target % 7],
      acc: level === 'basic' ? 0 : Math.floor(Math.random() * 3) - 1,
      octave: octave + Math.floor(target / 7),
    };
    const r = interval(a, b);
    if (['纯', '大', '小', '增', '减'].includes(r.quality) && r.semitones >= 0 && !r.descending)
      return { a, b, result: r };
  }
  return {
    a: { letter: 'C', acc: 0, octave: 3 },
    b: { letter: 'G', acc: 1, octave: 3 },
    result: interval({ letter: 'C', acc: 0, octave: 3 }, { letter: 'G', acc: 1, octave: 3 }),
  };
}
