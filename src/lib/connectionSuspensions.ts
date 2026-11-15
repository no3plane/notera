import type { GuitarChord, ChordVoicing, GuitarKey } from './guitarChords';
import { chordsInKey } from './guitarChords';
import { midi, name, transpose } from './theory';

export type SuspensionKind = 'sus2' | 'sus4' | '7sus4' | '7sus2' | 'maj7sus2';
export interface SuspensionShape {
  symbol: string;
  tones: GuitarChord['tones'];
  voicing: ChordVoicing;
}
export const SUSPENSION_USAGES = {
  plain: '留白',
  resolve: '挂留后恢复',
  decorate: '中途装饰',
  hold: '整小节保持',
  lead: '挂留接下个和弦',
  chain: '连续换色',
} as const;
export type SuspensionUsage = keyof typeof SUSPENSION_USAGES;
export type SuspensionAction = '' | '挂上' | '恢复' | '换色' | '保持';
export interface SuspensionBeat {
  kind: SuspensionKind | null;
  shape: SuspensionShape;
  action: SuspensionAction;
}
export interface SuspensionBar {
  bar: number;
  degree: number;
  usage: SuspensionUsage;
  beats: [SuspensionBeat, SuspensionBeat, SuspensionBeat, SuspensionBeat];
}
export interface SuspensionLoop {
  role: '主题' | '呼应' | '展开' | '收束';
  bars: SuspensionBar[];
}

/** Move familiar E/A shapes without changing the source seventh. */
export function suspensionShape(
  chord: GuitarChord,
  base: ChordVoicing,
  kind: SuspensionKind,
): SuspensionShape {
  const r = base.rootFret;
  const fifthRoot = base.rootString === 5;
  let frets: ChordVoicing['frets'];
  let fingers: ChordVoicing['fingers'];
  if (fifthRoot) {
    if (kind === '7sus2' || kind === 'maj7sus2') {
      const seventh = kind === 'maj7sus2' ? 1 : 0;
      frets = [null, r, r + 2, r + seventh, r, r];
      fingers = r ? [null, 1, 3, seventh ? 2 : 1, 1, 1] : [null, 0, 2, seventh ? 1 : 0, 0, 0];
    } else if (kind === 'sus2') {
      frets = [null, r, r + 2, r + 2, r, r];
      fingers = r ? [null, 1, 3, 4, 1, 1] : [null, 0, 1, 2, 0, 0];
    } else if (kind === 'sus4') {
      frets = [null, r, r + 2, r + 2, r + 3, r];
      fingers = r ? [null, 1, 2, 3, 4, 1] : [null, 0, 1, 2, 3, 0];
    } else {
      frets = [null, r, r + 2, r, r + 3, r];
      fingers = r ? [null, 1, 3, 1, 4, 1] : [null, 0, 2, 0, 3, 0];
    }
  } else if (kind === '7sus2' || kind === 'maj7sus2') {
    const seventh = kind === 'maj7sus2' ? 1 : 0;
    frets = [r, r + 2, r + seventh, null, r, r + 2];
    fingers = r ? [1, 3, seventh ? 2 : 1, null, 1, 4] : [0, 2, seventh ? 1 : 0, null, 0, 3];
  } else if (kind === 'sus2') {
    frets = [r, r + 2, r + 2, null, r, r + 2];
    fingers = r ? [1, 3, 4, null, 1, 2] : [0, 2, 3, null, 0, 1];
  } else if (kind === 'sus4') {
    frets = [r, r + 2, r + 2, r + 2, r, r];
    fingers = r ? [1, 3, 4, 2, 1, 1] : [0, 2, 3, 4, 0, 0];
  } else {
    frets = [r, r + 2, r, r + 2, r, r];
    fingers = r ? [1, 3, 1, 4, 1, 1] : [0, 2, 0, 3, 0, 0];
  }
  const root = chord.root;
  const second = kind.endsWith('sus2');
  const tones = [
    root,
    transpose(root, second ? 2 : 4, second ? 2 : 5, 1),
    transpose(root, 5, 7, 1),
    ...(kind === 'maj7sus2'
      ? [transpose(root, 7, 11, 1)]
      : kind.startsWith('7')
        ? [transpose(root, 7, 10, 1)]
        : []),
  ];
  return {
    symbol: `${name(root, false)}${kind}`,
    tones,
    voicing: {
      rootString: base.rootString,
      rootFret: r,
      frets,
      fingers,
      ...(r ? { barre: { fret: r, from: fifthRoot ? 1 : 0, to: 5, finger: 1 } } : {}),
    },
  };
}

type Candidate = { kind: SuspensionKind; shape: SuspensionShape };

/** Build all four beats explicitly: a suspended last beat never implies a restoration. */
function arrangeBar(
  chord: GuitarChord,
  voicing: ChordVoicing,
  bar: number,
  options: Candidate[],
  requested: SuspensionUsage,
  variant: number,
): SuspensionBar {
  const base: SuspensionShape = { symbol: chord.symbol, tones: chord.tones, voicing };
  const primary = options[variant % Math.max(1, options.length)];
  const other = options.find((item) => item.kind !== primary?.kind);
  const usage = !primary ? 'plain' : requested === 'chain' && !other ? 'decorate' : requested;
  const k = primary?.kind ?? null;
  const alternate = other?.kind ?? k;
  let kinds: (SuspensionKind | null)[];
  switch (usage) {
    case 'resolve':
      kinds = variant % 2 ? [k, k, k, null] : [k, k, null, null];
      break;
    case 'decorate':
      kinds = variant % 2 ? [null, null, k, null] : [null, k, k, null];
      break;
    case 'hold':
      kinds = [k, k, k, k];
      break;
    case 'lead':
      kinds = variant % 2 ? [null, null, null, k] : [null, null, k, k];
      break;
    case 'chain':
      kinds = variant % 2 ? [k, alternate, null, null] : [null, k, alternate, null];
      break;
    default:
      kinds = [null, null, null, null];
  }
  const beats = kinds.map((kind, beat): SuspensionBeat => {
    const previous = beat ? kinds[beat - 1] : null;
    const action = kind === previous ? '' : kind === null ? '恢复' : previous ? '换色' : '挂上';
    return {
      kind,
      shape: kind ? options.find((item) => item.kind === kind)!.shape : base,
      action: usage === 'hold' && beat === 0 ? '保持' : action,
    };
  }) as SuspensionBar['beats'];
  return { bar, degree: chord.degree, usage, beats };
}

const usages: Exclude<SuspensionUsage, 'plain'>[] = [
  'resolve',
  'hold',
  'lead',
  'chain',
  'decorate',
];
const roles = ['主题', '呼应', '展开', '收束'] as const;

/** A four-loop phrase repeats its motif, answers it, develops it, then thins out.
 * The score is deterministic and prefix-stable when more loops are requested.
 * Changes stay inside existing bars; scale, root and seventh are preserved.
 */
export function connectionSuspensions(
  key: GuitarKey,
  chords: GuitarChord[],
  voicings: ChordVoicing[],
  sequence: readonly number[],
  loops: number,
  version: number,
): SuspensionLoop[] {
  const scale = new Set(chordsInKey(key).map((chord) => midi(chord.root) % 12));
  const options = sequence.map((degree) => {
    const chord = chords[degree - 1];
    const kinds: SuspensionKind[] =
      chord.quality === 'major' || chord.quality === 'minor'
        ? ['sus4', 'sus2']
        : chord.quality === '7' || chord.quality === 'm7'
          ? ['7sus4', '7sus2']
          : chord.quality === 'maj7'
            ? ['maj7sus2']
            : [];
    return kinds.flatMap((kind): Candidate[] => {
      const shape = suspensionShape(chord, voicings[degree - 1], kind);
      return shape.tones.every((tone) => scale.has(midi(tone) % 12)) ? [{ kind, shape }] : [];
    });
  });
  const eligible = options.flatMap((items, bar) => (items.length ? [bar] : []));
  return Array.from({ length: loops }, (_, loop) => {
    const phase = loop % 4;
    const motif = version + Math.floor(loop / 4) * 13;
    const order = eligible.map((_, i) => eligible[(motif + i) % eligible.length]);
    const themeCount = Math.min(
      eligible.length,
      Math.max(2, Math.round(sequence.length / 2) + (motif % 2)),
    );
    const theme = order.slice(0, themeCount);
    const closing = order.filter((bar) => bar !== sequence.length - 1);
    const selected =
      phase === 2
        ? order.slice(0, Math.min(eligible.length, themeCount + 1))
        : phase === 3
          ? closing.slice(0, Math.max(1, themeCount - 1))
          : theme;
    return {
      role: roles[phase],
      bars: sequence.map((degree, bar) => {
        const index = selected.indexOf(bar);
        let usage: SuspensionUsage = index < 0 ? 'plain' : usages[(motif + index) % usages.length];
        // The echo retains all but the last ornament of the theme.
        if (phase === 1 && index === selected.length - 1)
          usage = usages[(motif + index + 1) % usages.length];
        if (phase === 2 && index >= 0) usage = usages[(motif + index + 2) % usages.length];
        if (phase === 3 && index >= 0) usage = index % 2 ? 'decorate' : 'resolve';
        const variant = motif + bar + (phase === 2 ? 1 : 0);
        return arrangeBar(
          chords[degree - 1],
          voicings[degree - 1],
          bar,
          options[bar],
          usage,
          variant,
        );
      }),
    };
  });
}
