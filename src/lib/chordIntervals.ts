import type { PracticeChordFamily } from './chordHarmony';
import { majorKeyChords } from './chordHarmony';
import { GUITAR_KEYS, chordsInKey, voicingDegrees, voicingFor } from './guitarChords';
import type { ChordVoicing } from './guitarChords';
import { susGuitarShapes } from './guitarSusChords';
import type { Note } from './types';

export const CHORD_INTERVAL_ROLES = ['R', '2', 'b3', '3', '4', 'b5', '5', 'b7', '7'] as const;
export type ChordIntervalRole = (typeof CHORD_INTERVAL_ROLES)[number];
export const CHORD_INTERVAL_LABELS: Record<ChordIntervalRole, string> = {
  R: '根音',
  '2': '大二度',
  b3: '小三度',
  '3': '大三度',
  '4': '纯四度',
  b5: '减五度',
  '5': '纯五度',
  b7: '小七度',
  '7': '大七度',
};
export const CHORD_INTERVAL_CHOICES: Record<PracticeChordFamily, readonly ChordIntervalRole[]> = {
  triad: ['R', 'b3', '3', 'b5', '5'],
  seventh: ['R', 'b3', '3', 'b5', '5', 'b7', '7'],
  sus: ['R', '2', '3', '4', '5', 'b7', '7'],
};
export interface ChordIntervalQuestion {
  id: string;
  symbol: string;
  tones: readonly Note[];
  voicing: ChordVoicing;
  answers: (ChordIntervalRole | null)[];
}
export interface ChordIntervalSession {
  questionId: string;
  answers: (ChordIntervalRole | null)[];
  active: number;
  checked: boolean;
}

function question(
  chord: { symbol: string; tones: readonly Note[] },
  voicing: ChordVoicing,
): ChordIntervalQuestion {
  const answers = voicingDegrees(voicing, chord.tones).map((degree) => {
    if (degree === '×') return null;
    const role = degree.replaceAll('♭', 'b');
    if (!CHORD_INTERVAL_ROLES.includes(role as ChordIntervalRole))
      throw new Error(`Unsupported chord interval: ${chord.symbol} ${degree}`);
    return role as ChordIntervalRole;
  });
  return {
    id: `${chord.symbol}:${voicing.rootString}:${voicing.frets.join(',')}`,
    symbol: chord.symbol,
    tones: chord.tones,
    voicing,
    answers,
  };
}

/** Basic E/A templates, with F/B as the half-diminished fingering examples. */
export function chordIntervalQuestions(family: PracticeChordFamily): ChordIntervalQuestion[] {
  const questions: ChordIntervalQuestion[] = [];
  if (family === 'sus') {
    for (const root of ['E', 'A'] as const) {
      for (const shape of susGuitarShapes(root)) {
        questions.push(question(shape, shape.voicing));
      }
    }
  } else {
    const seen = new Set<string>();
    for (const [key] of GUITAR_KEYS) {
      for (const chord of chordsInKey(key, family)) {
        if (chord.quality === 'm7b5') continue;
        if (chord.root.acc !== 0 || !['E', 'A'].includes(chord.root.letter)) continue;
        const rootString = chord.root.letter === 'E' ? 6 : 5;
        const item = question(chord, voicingFor(chord, rootString));
        if (!seen.has(item.id)) {
          questions.push(item);
          seen.add(item.id);
        }
      }
    }
  }
  if (family === 'seventh') {
    const examples = [
      {
        chord: majorKeyChords({ letter: 'G', acc: -1, octave: 3 }, 'seventh')[6],
        rootString: 6,
        symbol: 'Fm7(b5)',
      },
      { chord: chordsInKey('C', 'seventh')[6], rootString: 5, symbol: 'Bm7(b5)' },
    ] as const;
    for (const { chord, rootString, symbol } of examples) {
      questions.push(question({ ...chord, symbol }, voicingFor(chord, rootString)));
    }
  }
  const first =
    family === 'triad'
      ? ['E', 'Em', 'A', 'Am']
      : family === 'seventh'
        ? ['E7', 'Em7', 'Emaj7', 'A7', 'Am7', 'Amaj7']
        : ['Esus2', 'Esus4', 'Asus2', 'Asus4'];
  const rank = (item: ChordIntervalQuestion) =>
    item.voicing.rootFret === 0 && first.includes(item.symbol)
      ? first.indexOf(item.symbol)
      : first.length;
  return questions.sort((a, b) => rank(a) - rank(b) || a.voicing.rootFret - b.voicing.rootFret);
}

export const chordIntervalStorageKey = (family: PracticeChordFamily) =>
  `notera.chord-intervals.${family}.v1`;

export function newChordIntervalSession(question: ChordIntervalQuestion): ChordIntervalSession {
  return {
    questionId: question.id,
    answers: Array(6).fill(null),
    active: question.answers.findIndex((role) => role !== null),
    checked: false,
  };
}

export function intervalAnswersComplete(
  question: ChordIntervalQuestion,
  answers: ChordIntervalSession['answers'],
) {
  return question.answers.every((role, i) => role === null || answers[i] != null);
}

export function intervalAnswersCorrect(
  question: ChordIntervalQuestion,
  answers: ChordIntervalSession['answers'],
) {
  return question.answers.every((role, i) => role === null || answers[i] === role);
}

export function readChordIntervalSession(
  family: PracticeChordFamily,
  questions: readonly ChordIntervalQuestion[],
): ChordIntervalSession {
  const fallback = newChordIntervalSession(questions[0]);
  try {
    const saved = JSON.parse(localStorage.getItem(chordIntervalStorageKey(family)) ?? 'null');
    if (!saved || typeof saved !== 'object') return fallback;
    const questionId =
      typeof saved.questionId === 'string'
        ? saved.questionId.replace(/^(F|B)m7(?:-5|♭5):/u, '$1m7(b5):')
        : saved.questionId;
    const item = questions.find((entry) => entry.id === questionId);
    if (!item || !Array.isArray(saved.answers) || saved.answers.length !== 6) return fallback;
    const choices = CHORD_INTERVAL_CHOICES[family];
    const answers = item.answers.map((role, i) =>
      role !== null && choices.includes(saved.answers[i]) ? saved.answers[i] : null,
    );
    const active =
      Number.isInteger(saved.active) &&
      saved.active >= 0 &&
      saved.active < 6 &&
      item.answers[saved.active] !== null
        ? saved.active
        : item.answers.findIndex((role) => role !== null);
    return {
      questionId: item.id,
      answers,
      active,
      checked: saved.checked === true && intervalAnswersComplete(item, answers),
    };
  } catch {
    return fallback;
  }
}

export function chordIntervalFrame(voicing: Pick<ChordVoicing, 'frets'>) {
  const hasOpen = voicing.frets.includes(0);
  const pressed = voicing.frets.filter((fret): fret is number => fret !== null && fret > 0);
  const start = hasOpen || !pressed.length ? 1 : Math.min(...pressed);
  return { start, frets: Array.from({ length: 4 }, (_, i) => start + i) };
}
