import type { Beat, Score } from './score';

export type BeatPhase = 0 | 1;
export type ChordDecision = number | 'remove';

interface ChordDestination {
  beat: Beat;
  direction: 'before' | 'after';
}

export interface HalfTempoConflict {
  beat: Beat;
  destinations: ChordDestination[];
  decision?: ChordDecision;
}

export interface HalfTempoPreviewData {
  beats: Beat[];
  firstBeat: Score['firstBeat'];
  conflicts: HalfTempoConflict[];
  movedChords: Map<number, string>;
}

export function phaseForDownbeat(beats: Beat[], firstBeat: Score['firstBeat']): BeatPhase {
  return beats.findIndex((beat) => beat.id === firstBeat) % 2 === 1 ? 1 : 0;
}

export function previewHalfTempo(
  beats: Beat[],
  firstBeat: Score['firstBeat'],
  phase: BeatPhase,
  decisions: ReadonlyMap<number, ChordDecision>,
): HalfTempoPreviewData {
  const kept = beats.filter((_, index) => index % 2 === phase);
  const owners = new Map<number, number>();
  const movedChords = new Map<number, string>();
  const conflicts: HalfTempoConflict[] = [];

  beats.forEach((beat, index) => {
    if (index % 2 === phase || !beat.chord) return;
    const neighbors: [Beat | undefined, ChordDestination['direction']][] = [
      [beats[index - 1], 'before'],
      [beats[index + 1], 'after'],
    ];
    const destinations: ChordDestination[] = neighbors.flatMap(([neighbor, direction]) =>
      neighbor && !neighbor.chord ? [{ beat: neighbor, direction }] : [],
    );
    const choice = decisions.get(beat.id);
    let decision: ChordDecision | undefined;
    if (choice === 'remove') decision = choice;
    else if (
      choice !== undefined &&
      !owners.has(choice) &&
      destinations.some(({ beat }) => beat.id === choice)
    ) {
      owners.set(choice, beat.id);
      movedChords.set(choice, beat.chord);
      decision = choice;
    }
    conflicts.push({ beat, destinations, decision });
  });

  const anchorIndex = beats.findIndex((beat) => beat.id === firstBeat);
  const anchor =
    anchorIndex >= 0 && anchorIndex % 2 !== phase
      ? ((beats[anchorIndex + 1] ?? beats[anchorIndex - 1])?.id ?? null)
      : firstBeat;
  return {
    beats: kept.map((beat) =>
      movedChords.has(beat.id) ? { ...beat, chord: movedChords.get(beat.id)! } : beat,
    ),
    firstBeat: anchor,
    conflicts: conflicts.map((conflict) => ({
      ...conflict,
      destinations: conflict.destinations.filter(({ beat }) => {
        const owner = owners.get(beat.id);
        return owner === undefined || owner === conflict.beat.id;
      }),
    })),
    movedChords,
  };
}

export function restoreHalfTempoBeats(
  original: Beat[],
  current: Beat[],
  movedChords: ReadonlyMap<number, string>,
): Beat[] {
  const currentChords = new Map(current.map((beat) => [beat.id, beat.chord]));
  return original.map((beat) => {
    const chord = currentChords.get(beat.id);
    return chord === undefined || chord === movedChords.get(beat.id) ? beat : { ...beat, chord };
  });
}
