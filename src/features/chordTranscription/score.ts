export const METERS = { '2/4': 2, '3/4': 3, '4/4': 4, '5/4': 5, '6/8': 2 } as const;
export type Meter = keyof typeof METERS;

export interface Beat {
  id: number;
  time: number;
  chord: string;
}

export interface Score {
  meter: Meter;
  firstBeat: number | null;
  beats: Beat[];
}

export interface Measure {
  number: number;
  start: number;
  end: number;
  beats: Beat[];
}

export interface TimeRange {
  start: number;
  end: number;
}

export const MIN_BEAT_GAP = 0.03;

export function measuresFor(score: Score, duration: number): Measure[] {
  const { beats, meter, firstBeat } = score;
  if (!beats.length) return [];
  const size = METERS[meter];
  const anchor = Math.max(
    0,
    beats.findIndex((beat) => beat.id === firstBeat),
  );
  const pickup = anchor % size;
  const measures: Measure[] = [];
  for (let i = 0; i < beats.length;) {
    const next = i + (i === 0 && pickup ? pickup : size);
    const number =
      i === 0 && pickup ? 0 : i < anchor ? (i - anchor) / size : (i - anchor) / size + 1;
    measures.push({
      number,
      start: beats[i].time,
      end: beats[next]?.time ?? duration,
      beats: beats.slice(i, next),
    });
    i = next;
  }
  return measures;
}

export function beatIndexAt(beats: Beat[], time: number): number {
  let low = 0;
  let high = beats.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (beats[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}

export function measureIndexAt(measures: Measure[], time: number): number {
  const index = measures.findIndex((measure) => time < measure.end);
  return index < 0 ? measures.length - 1 : index;
}

export function detectedBeats(times: number[], duration: number): Beat[] {
  const beats: Beat[] = [];
  for (const time of times) {
    const previous = beats.at(-1);
    if (
      Number.isFinite(time) &&
      time >= 0 &&
      time < duration &&
      (!previous || time - previous.time >= MIN_BEAT_GAP)
    ) {
      beats.push({ id: beats.length + 1, time, chord: '' });
    }
  }
  return beats;
}

export function formatTime(seconds: number): string {
  const whole = Math.floor(Math.max(0, seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function measureName(number: number): string {
  return number === 0 ? '弱起' : number < 0 ? `前置小节 ${-number}` : `第 ${number} 小节`;
}
