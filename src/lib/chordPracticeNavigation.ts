import {
  CHORD_MODES,
  CONNECTION_MODES,
  GUITAR_CHORD_MODES,
  chordFamilyForMode,
  isConnectionMode,
  isGuitarChordMode,
} from './exercises';
import type { Mode } from './exercises';
import type { PracticeChordFamily } from './chordHarmony';
import { DIATONIC_SUS_MODE } from './diatonicSus';
import { isPracticeMode } from './practiceNavigation';

export const CHORD_TASK_GROUPS = [
  {
    label: '认和弦',
    tasks: [
      { id: 'tones', label: '和弦名 → 构成音' },
      { id: 'identify', label: '构成音 → 和弦名' },
      { id: 'diatonic', label: '调内挂留判断', susOnly: true },
    ],
  },
  {
    label: '弹和弦',
    tasks: [
      { id: 'recall', label: '看题按弦' },
      { id: 'connection', label: '和弦连接' },
    ],
  },
  { label: '查指法', tasks: [{ id: 'reference', label: '指法参考' }] },
] as const;
export type ChordTask = (typeof CHORD_TASK_GROUPS)[number]['tasks'][number]['id'];
export const CHORD_NAVIGATION_KEY = 'notera.chord-navigation.v1';
export const isChordTask = (value: unknown): value is ChordTask =>
  CHORD_TASK_GROUPS.some((group) => group.tasks.some((task) => task.id === value));

export function modeForChordTask(task: ChordTask, family: PracticeChordFamily): Mode {
  switch (task) {
    case 'tones':
      return CHORD_MODES[family][0];
    case 'identify':
      return CHORD_MODES[family][1];
    case 'diatonic':
      return DIATONIC_SUS_MODE;
    case 'connection':
      return CONNECTION_MODES[family === 'sus' ? 'triad' : family];
    default:
      return GUITAR_CHORD_MODES[family];
  }
}

export function defaultChordTask(mode: Mode): ChordTask {
  if (mode === DIATONIC_SUS_MODE) return 'diatonic';
  if (isConnectionMode(mode)) return 'connection';
  if (isGuitarChordMode(mode)) return 'reference';
  const family = chordFamilyForMode(mode);
  return family && mode === CHORD_MODES[family][1] ? 'identify' : 'tones';
}

const matches = (mode: Mode, task: unknown): task is ChordTask => {
  const family = chordFamilyForMode(mode);
  return Boolean(family && isChordTask(task) && modeForChordTask(task, family) === mode);
};

export function readLastChordPractice(): { mode: Mode; task: ChordTask } | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(CHORD_NAVIGATION_KEY) ?? 'null');
    if (saved?.mode === CONNECTION_MODES.sus || saved?.task === 'resolve')
      return { mode: CONNECTION_MODES.triad, task: 'connection' };
    if (saved && isPracticeMode(saved.mode) && matches(saved.mode, saved.task)) return saved;
  } catch {
    /* Navigation works without storage. */
  }
}

export function readChordTask(mode: Mode): ChordTask {
  const params = new URLSearchParams(location.search);
  const explicit = params.get('task') === 'resolve' ? 'connection' : params.get('task');
  if (matches(mode, explicit)) return explicit;
  const saved = readLastChordPractice();
  if (!params.has('practice') && saved?.mode === mode) return saved.task;
  const family = chordFamilyForMode(mode);
  if (family && isGuitarChordMode(mode)) {
    try {
      if (localStorage.getItem(`notera.guitar-task.${family}.v1`) === 'recall') return 'recall';
    } catch {
      /* Use the reference if storage is unavailable. */
    }
  }
  return defaultChordTask(mode);
}
