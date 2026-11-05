import { interval, LETTERS, name, transpose } from './theory';
import {
  CHORD_FAMILIES,
  CHORD_FAMILY_LABELS,
  majorKeyChords,
  QUALITY_LABELS,
} from './chordHarmony';
import type { ChordFamily, ChordQuality } from './chordHarmony';
import { notation } from './notation';
import type { Level, Note } from './types';

export const CHORD_MODES = {
  triad: ['chord-degree', 'chord-tones-forward', 'chord-tones-reverse'],
  seventh: ['chord-seventh-degree', 'chord-seventh-tones-forward', 'chord-seventh-tones-reverse'],
} as const;
export const GUITAR_CHORD_MODES = {
  triad: 'guitar-chords',
  seventh: 'guitar-seventh-chords',
} as const;

export const KINDS = [
  'interval',
  'build-note',
  'fretboard',
  ...CHORD_MODES.triad,
  ...CHORD_MODES.seventh,
] as const;
export type ExerciseKind = (typeof KINDS)[number];
export type GuitarChordMode = (typeof GUITAR_CHORD_MODES)[ChordFamily];
export type Mode = ExerciseKind | GuitarChordMode;
export const isGuitarChordMode = (mode: Mode): mode is GuitarChordMode =>
  mode === GUITAR_CHORD_MODES.triad || mode === GUITAR_CHORD_MODES.seventh;
export const isForwardChordMode = (mode: Mode) =>
  mode === CHORD_MODES.triad[1] || mode === CHORD_MODES.seventh[1];
export const chordFamilyForMode = (mode: Mode): ChordFamily | undefined =>
  CHORD_FAMILIES.find(
    (family) =>
      mode === GUITAR_CHORD_MODES[family] || CHORD_MODES[family].some((kind) => mode === kind),
  );
export type StoredExerciseKind = ExerciseKind | 'strings' | 'chord-tones';
export const KIND_LABELS: Record<Mode, string> = {
  interval: '判断音程',
  'build-note': '推算音名',
  fretboard: '指板定位',
  'chord-degree': '级数与和弦',
  'chord-tones-forward': '和弦名 → 构成音',
  'chord-tones-reverse': '构成音 → 和弦名',
  'guitar-chords': '实琴和弦',
  'chord-seventh-degree': '级数与和弦',
  'chord-seventh-tones-forward': '和弦名 → 构成音',
  'chord-seventh-tones-reverse': '构成音 → 和弦名',
  'guitar-seventh-chords': '实琴和弦',
};
export const TOPICS: { label: string; modes: readonly Mode[]; seventhModes?: readonly Mode[] }[] = [
  { label: '音程推算', modes: ['interval', 'build-note'] },
  { label: '指板定位', modes: ['fretboard'] },
  { label: '和弦对应', modes: CHORD_MODES.triad, seventhModes: CHORD_MODES.seventh },
  {
    label: '实琴和弦',
    modes: [GUITAR_CHORD_MODES.triad],
    seventhModes: [GUITAR_CHORD_MODES.seventh],
  },
];
export const MODE_LABELS = KIND_LABELS;
export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  interval: '先数音名确定度数，再用半音距离判断性质。',
  'build-note': '给出起点、方向和完整音程，推算目标音名；注意升降号的拼写。',
  fretboard: '从弦间音程、同音搬运到认音与找音接力，逐步连接指板位置。',
  'chord-degree': 'C 大调七个顺阶三和弦，交替练级数到和弦、和弦到级数。',
  'chord-tones-forward': '给出 C 大调顺阶三和弦名，用简谱选出三个构成音，选择顺序不限。',
  'chord-tones-reverse': '给出顺序随机的三个简谱音，判断它们组成的 C 大调顺阶三和弦。',
  'guitar-chords': '一组只练一个大调。用第五、六弦根音的固定按法，把级数练到手上。',
  'chord-seventh-degree': 'C 大调七个顺阶七和弦，交替练级数到和弦、和弦到级数。',
  'chord-seventh-tones-forward': '给出 C 大调顺阶七和弦名，用简谱选出四个构成音，选择顺序不限。',
  'chord-seventh-tones-reverse': '给出顺序随机的四个简谱音，判断它们组成的 C 大调顺阶七和弦。',
  'guitar-seventh-chords': '一组只练一个大调，用第五、六弦根音的指法练七个顺阶七和弦。',
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
export { transpose } from './theory';
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
const FORMULAS: Record<ChordQuality, string> = {
  major: '1 · 3 · 5',
  minor: '1 · ♭3 · 5',
  dim: '1 · ♭3 · ♭5',
  maj7: '1 · 3 · 5 · 7',
  m7: '1 · ♭3 · 5 · ♭7',
  '7': '1 · 3 · 5 · ♭7',
  m7b5: '1 · ♭3 · ♭5 · ♭7',
};
const cMajorChords = (family: ChordFamily) =>
  majorKeyChords({ letter: 'C', acc: 0, octave: 3 }, family);
const cMajorTriads = cMajorChords('triad');
export const CHORDS = cMajorTriads.map((chord) => ({
  degree: chord.roman,
  symbol: chord.symbol,
  tones: chord.tones.map((n) => name(n, false)),
  formula: FORMULAS[chord.quality],
  quality: QUALITY_LABELS[chord.quality],
}));
function permutations(values: number[]): number[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, i) =>
    permutations(values.filter((_, j) => j !== i)).map((rest) => [value, ...rest]),
  );
}
function chordExercises(family: ChordFamily): Exercise[] {
  const seventh = family === 'seventh';
  const [degreeKind, forwardKind, reverseKind] = CHORD_MODES[family];
  const chords = seventh ? cMajorChords(family) : cMajorTriads;
  const prefix = seventh ? 'seventh-' : '';
  const count = seventh ? '四' : '三';
  const label = CHORD_FAMILY_LABELS[family];
  const symbols = chords.map((chord) => chord.symbol);
  const degrees = chords.map((chord) => chord.roman);
  const toneOrders = permutations(chords[0].tones.map((_, index) => index));

  return chords.flatMap((chord, i) => {
    const { tones: notes, symbol, roman, quality } = chord;
    const numbered = notes.map((note) => notation(note, 'numbered'));
    const noteNames = notes.map((note) => name(note, false));
    const connection = seventh
      ? `${cMajorTriads[i].symbol}（${noteNames.slice(0, 3).join(' · ')}）加上七音 ${noteNames[3]}，成为 ${symbol}。`
      : `C 大调第 ${i + 1} 级是 ${noteNames[0]}，隔一个音取一个音得到 ${noteNames.join(' · ')}，组成 ${symbol}（${QUALITY_LABELS[quality]}）。`;
    const explanation = `${symbol} = ${numbered.join(' · ')}（简谱 1=C）；它是${QUALITY_LABELS[quality]}，相对自身根音的构成为 ${FORMULAS[quality]}。这里的和弦构成公式以和弦根音为 1，简谱则以 C 为 1。`;
    const degreeQuestions: Exercise[] = [false, true].map((reverse) => ({
      id: `${prefix}degree:${symbol}:${reverse}`,
      kind: degreeKind,
      title: reverse ? `${symbol} 是 C 大调的哪一级和弦？` : `C 大调的 ${roman} 级，是什么和弦？`,
      context: seventh
        ? 'C 大调 · 顺阶七和弦 · maj7 大七 / m7 小七 / 7 属七 / ø7 半减七'
        : 'C 大调 · 顺阶三和弦 · 大写表示大和弦，小写表示小和弦，° 表示减和弦',
      answer: [reverse ? roman : symbol],
      choices: reverse ? degrees : symbols,
      hint: seventh
        ? 'C 大调音阶：C D E F G A B。从该级根音开始，隔一个音取一个音，直到凑齐四个音。'
        : 'C 大调音阶：C D E F G A B。顺阶三和弦的性质依次为：大、小、小、大、大、小、减。',
      explanation: seventh ? connection + explanation : connection,
      notes,
      listenBefore: reverse ? notes : undefined,
    }));
    const forward: Exercise = {
      id: `${prefix}tones:${symbol}:false`,
      kind: forwardKind,
      title: `${symbol} 的${count}个构成音是什么？`,
      context: `C 大调 · 1=C · 选择${count}个简谱音，顺序不限`,
      answer: numbered,
      choices: LETTERS.map((_, index) => String(index + 1)),
      hint: `1=C，C D E F G A B 对应 1 2 3 4 5 6 7。从 ${symbol} 的根音开始，在音阶中隔一个音取一个音。`,
      explanation: seventh ? connection + explanation : explanation,
      notes,
    };
    const reverseQuestions: Exercise[] = toneOrders.map((order, variant) => {
      const displayed = order.map((index) => numbered[index]);
      const displayedNotes = order.map((index) => notes[index]);
      return {
        id: `${prefix}tones:${symbol}:true${variant ? `:${displayed.join('')}` : ''}`,
        kind: reverseKind,
        title: `${displayed.join(' · ')}，组成什么和弦？`,
        context: `C 大调 · 顺阶${label} · 1=C · 首音不一定是根音`,
        answer: [symbol],
        choices: symbols,
        hint: `1=C，先将${count}个音重新排列成隔一个音取一个音的形式，再判断根音及和弦性质；第一个音不一定是根音。`,
        explanation: forward.explanation,
        notes: displayedNotes,
        listenBefore: displayedNotes,
      };
    });
    return [...degreeQuestions, forward, ...reverseQuestions];
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
  bank.push(...CHORD_FAMILIES.flatMap(chordExercises));
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
  // Only the remaining bidirectional types alternate within a round.
  const side = turn % 2 === 0;
  const index = pool.findIndex((e) =>
    e.kind === 'build-note'
      ? e.id.endsWith(side ? ':1' : ':-1')
      : (e.kind === CHORD_MODES.triad[0] || e.kind === CHORD_MODES.seventh[0]) &&
        e.id.endsWith(side ? ':false' : ':true'),
  );
  return index < 0 ? pool.pop() : pool.splice(index, 1)[0];
}
