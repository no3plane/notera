import { fromMidi, midi } from './theory';
import type { Note, NoteFormat } from './types';

export type ConversionLevel = 'natural' | 'sharp' | 'flat';
export interface ConversionSettings {
  source: NoteFormat | 'any';
  target: NoteFormat | 'any';
  level: ConversionLevel;
}
export interface ConversionQuestion {
  note: Note;
  source: NoteFormat;
  target: NoteFormat;
  choices: Note[];
}
export interface ConversionResult {
  answer: Note;
  correct: boolean;
  time: number;
}
export interface ConversionSession {
  settings: ConversionSettings;
  queue: ConversionQuestion[];
  index: number;
  results: ConversionResult[];
  started: number;
  pausedAt: number | null;
}
export type ConversionAction =
  | { type: 'start'; settings: ConversionSettings; now: number }
  | { type: 'answer'; note: Note; now: number }
  | { type: 'next'; now: number }
  | { type: 'pause' | 'resume'; now: number };

function shuffle<T>(values: T[]): T[] {
  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function conversionNotes(level: ConversionLevel): Note[] {
  return Array.from({ length: 12 }, (_, i) => fromMidi(60 + i, level === 'flat')).filter(
    (n) => level !== 'natural' || n.acc === 0,
  );
}

export function createConversionSession(
  settings: ConversionSettings = { source: 'any', target: 'any', level: 'natural' },
  now = performance.now(),
): ConversionSession {
  const formats: NoteFormat[] = ['name', 'numbered', 'solfege', 'piano'];
  const directions = formats.flatMap((source) =>
    formats
      .filter(
        (target) =>
          source !== target &&
          (settings.source === 'any' || settings.source === source) &&
          (settings.target === 'any' || settings.target === target),
      )
      .map((target) => ({ source, target })),
  );
  // Keep this safe for callers outside the settings UI too.
  if (!directions.length) return createConversionSession({ ...settings, target: 'any' }, now);
  const pool = conversionNotes(settings.level);
  const notes = shuffle(pool);
  const order = shuffle(directions);
  const queue = Array.from({ length: 12 }, (_, i) => {
    const note = notes[i % notes.length];
    const choices = shuffle([
      note,
      ...shuffle(pool.filter((n) => midi(n) !== midi(note))).slice(0, 3),
    ]);
    return { note, ...order[i % order.length], choices };
  });
  return { settings, queue, index: 0, results: [], started: now, pausedAt: null };
}

export function conversionReducer(
  s: ConversionSession,
  action: ConversionAction,
): ConversionSession {
  const answering = s.index < s.queue.length && s.results.length === s.index;
  switch (action.type) {
    case 'start':
      return createConversionSession(action.settings, action.now);
    case 'answer': {
      if (!answering || s.pausedAt !== null) return s;
      const q = s.queue[s.index];
      if (!conversionNotes(s.settings.level).some((n) => midi(n) === midi(action.note))) return s;
      if (q.target !== 'piano' && !q.choices.some((n) => midi(n) === midi(action.note))) return s;
      return {
        ...s,
        results: [
          ...s.results,
          {
            answer: action.note,
            correct: midi(action.note) === midi(q.note),
            time: Math.max(0, action.now - s.started),
          },
        ],
      };
    }
    case 'next':
      return s.index < s.results.length
        ? { ...s, index: s.index + 1, started: action.now, pausedAt: null }
        : s;
    case 'pause':
      return answering && s.pausedAt === null ? { ...s, pausedAt: action.now } : s;
    case 'resume':
      return s.pausedAt !== null
        ? { ...s, started: s.started + action.now - s.pausedAt, pausedAt: null }
        : s;
  }
}
