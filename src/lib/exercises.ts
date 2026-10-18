import { interval, LETTERS, midi, name, NATURAL, position } from './theory';
import type { Level, Note } from './types';

export const KINDS = [
  'interval',
  'build-note',
  'fretboard',
  'chord-degree',
  'chord-tones',
] as const;
export type ExerciseKind = (typeof KINDS)[number];
export type Mode = ExerciseKind;
export type StoredExerciseKind = ExerciseKind | 'strings';
export const KIND_LABELS: Record<ExerciseKind, string> = {
  interval: '判断音程',
  'build-note': '推算音名',
  fretboard: '指板定位',
  'chord-degree': '级数与和弦',
  'chord-tones': '和弦构成音',
};
export const TOPICS: { label: string; modes: Mode[] }[] = [
  { label: '音程推算', modes: ['interval', 'build-note'] },
  { label: '指板定位', modes: ['fretboard'] },
  { label: '和弦对应', modes: ['chord-degree', 'chord-tones'] },
];
export const MODE_LABELS = KIND_LABELS;
export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  interval: '先数音名确定度数，再用半音距离判断性质。',
  'build-note': '给出起点、方向和完整音程，推算目标音名；注意升降号的拼写。',
  fretboard: '认音：从参照 1 判断位置的级数。找音接力：从任意已知音出发，连续找到下一个目标音。',
  'chord-degree': 'C 大调七个顺阶三和弦，交替练级数到和弦、和弦到级数。',
  'chord-tones': 'C 大调七个顺阶三和弦，交替练选出三个构成音、由三个音认和弦。',
};
export interface Exercise {
  id: string;
  kind: Exclude<ExerciseKind, 'interval' | 'fretboard'>;
  title: string;
  context: string;
  answer: string[];
  choices: string[];
  hint: string;
  explanation: string;
  notes: Note[];
  listenBefore?: Note[];
  advanced?: boolean;
}
export function transpose(note: Note, degree: number, semitones: number, direction: 1 | -1): Note {
  const targetPosition = position(note) + direction * (degree - 1);
  const letterIndex = ((targetPosition % 7) + 7) % 7;
  const octave = Math.floor(targetPosition / 7);
  const targetMidi = midi(note) + direction * semitones;
  return {
    letter: LETTERS[letterIndex],
    octave,
    acc: targetMidi - ((octave + 1) * 12 + NATURAL[letterIndex]),
  };
}
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const numberNames = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
  '十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
];
export function intervalTitle(result: ReturnType<typeof interval>) {
  return `${result.quality}${numberNames[result.degree - 1] ?? result.degree}度`;
}
const noteChoices = LETTERS.flatMap((letter) =>
  [-1, 0, 1].map((acc) => name({ letter, acc, octave: 4 }, false)),
);
const intervalSpecs = [
  [1, 0],
  [2, 1],
  [2, 2],
  [3, 3],
  [3, 4],
  [4, 5],
  [4, 6],
  [5, 6],
  [5, 7],
  [6, 8],
  [6, 9],
  [7, 10],
  [7, 11],
  [8, 12],
];
export const CHORDS = [
  { degree: 'I', symbol: 'C', tones: ['C', 'E', 'G'], formula: '1 · 3 · 5', quality: '大三和弦' },
  {
    degree: 'ii',
    symbol: 'Dm',
    tones: ['D', 'F', 'A'],
    formula: '1 · ♭3 · 5',
    quality: '小三和弦',
  },
  {
    degree: 'iii',
    symbol: 'Em',
    tones: ['E', 'G', 'B'],
    formula: '1 · ♭3 · 5',
    quality: '小三和弦',
  },
  { degree: 'IV', symbol: 'F', tones: ['F', 'A', 'C'], formula: '1 · 3 · 5', quality: '大三和弦' },
  { degree: 'V', symbol: 'G', tones: ['G', 'B', 'D'], formula: '1 · 3 · 5', quality: '大三和弦' },
  {
    degree: 'vi',
    symbol: 'Am',
    tones: ['A', 'C', 'E'],
    formula: '1 · ♭3 · 5',
    quality: '小三和弦',
  },
  {
    degree: 'vii°',
    symbol: 'Bdim',
    tones: ['B', 'D', 'F'],
    formula: '1 · ♭3 · ♭5',
    quality: '减三和弦',
  },
];
function chordNotes(tones: string[]): Note[] {
  let last = -1;
  return tones.map((letter) => {
    let note: Note = { letter: letter as Note['letter'], acc: 0, octave: 3 };
    while (midi(note) <= last) note = { ...note, octave: note.octave + 1 };
    last = midi(note);
    return note;
  });
}
let cached: Exercise[] | undefined;
export function exerciseBank(): Exercise[] {
  if (cached) return cached;
  const bank: Exercise[] = [];
  for (const letter of LETTERS)
    for (const acc of [-1, 0, 1]) {
      const a: Note = { letter, acc, octave: 4 };
      for (const [degree, semitones] of intervalSpecs)
        for (const direction of [1, -1] as const) {
          const b = transpose(a, degree, semitones, direction);
          if (Math.abs(b.acc) > 1) continue;
          const title = intervalTitle(interval(a, b));
          const verb = direction === 1 ? '向上' : '向下';
          const spelledPath = Array.from(
            { length: degree },
            (_, i) => LETTERS[(((LETTERS.indexOf(a.letter) + direction * i) % 7) + 7) % 7],
          );
          bank.push({
            id: `build:${name(a)}:${degree}:${semitones}:${direction}`,
            kind: 'build-note',
            title: `${name(a, false)} ${verb}${title}，是什么音？`,
            context: `${verb} · ${title} · 回答音名，不计八度`,
            answer: [name(b, false)],
            choices: noteChoices,
            hint: `首尾都算，沿${verb}方向数 ${degree} 个音名；再让半音距离符合${title}。`,
            explanation: `${spelledPath.join(' → ')}，目标音名是 ${b.letter}；${verb} ${semitones} 个半音得到 ${name(b, false)}，所以应写作 ${name(b, false)}。`,
            notes: [a, b],
            listenBefore: [a],
            advanced:
              acc !== 0 ||
              b.acc !== 0 ||
              (degree === 4 && semitones === 6) ||
              (degree === 5 && semitones === 6),
          });
        }
    }
  CHORDS.forEach((chord, i) => {
    const notes = chordNotes(chord.tones);
    const explanation = `C 大调第 ${i + 1} 级是 ${chord.tones[0]}，隔一个音取一个音得到 ${chord.tones.join(' · ')}，组成 ${chord.symbol}（${chord.quality}）。`;
    for (const reverse of [false, true]) {
      bank.push({
        id: `degree:${chord.symbol}:${reverse}`,
        kind: 'chord-degree',
        title: reverse
          ? `${chord.symbol} 是 C 大调的哪一级和弦？`
          : `C 大调的 ${chord.degree} 级，是什么和弦？`,
        context: 'C 大调 · 顺阶三和弦 · 大写表示大和弦，小写表示小和弦，° 表示减和弦',
        answer: [reverse ? chord.degree : chord.symbol],
        choices: CHORDS.map((c) => (reverse ? c.degree : c.symbol)),
        hint: 'C 大调音阶：C D E F G A B。顺阶三和弦的性质依次为：大、小、小、大、大、小、减。',
        explanation,
        notes,
        listenBefore: reverse ? notes : undefined,
      });
      bank.push({
        id: `tones:${chord.symbol}:${reverse}`,
        kind: 'chord-tones',
        title: reverse
          ? `${chord.tones.join(' · ')}，组成什么和弦？`
          : `${chord.symbol} 的三个构成音是什么？`,
        context: reverse ? 'C 大调 · 由构成音认和弦' : 'C 大调 · 选择三个音，顺序不限',
        answer: reverse ? [chord.symbol] : chord.tones,
        choices: reverse ? CHORDS.map((c) => c.symbol) : [...LETTERS],
        hint: reverse
          ? '第一个音是根音，看看根音到三音、五音各有几个半音。'
          : `${chord.symbol} 是${chord.quality}。大三和弦为 1·3·5，小三和弦为 1·♭3·5，减三和弦为 1·♭3·♭5。`,
        explanation: `${chord.symbol} = ${chord.tones.join(' · ')}；它是${chord.quality}，相对自身根音的构成为 ${chord.formula}。这里的和弦构成级数以和弦根音为 1。`,
        notes,
        listenBefore: reverse ? notes : undefined,
      });
    }
  });
  cached = bank;
  return bank;
}
export function findExercise(id: string) {
  return exerciseBank().find((e) => e.id === id);
}
export function exercisesFor(kind: ExerciseKind, level: Level) {
  return exerciseBank().filter((e) => e.kind === kind && (level !== 'basic' || !e.advanced));
}
export function takeExercise(pool: Exercise[], turn: number): Exercise | undefined {
  // Alternate directions within the selected exercise type.
  const side = turn % 2 === 0;
  const index = pool.findIndex((e) =>
    e.kind === 'build-note'
      ? e.id.endsWith(side ? ':1' : ':-1')
      : e.id.endsWith(side ? ':false' : ':true'),
  );
  return index < 0 ? pool.pop() : pool.splice(index, 1)[0];
}
