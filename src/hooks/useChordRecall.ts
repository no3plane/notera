import { useState } from 'react';
import { shuffle } from '../lib/exercises';

type Round = {
  order: number[];
  index: number;
  hints: number;
  revealed: boolean;
};

function newRound(size: number, previous?: number): Round {
  const order = shuffle(Array.from({ length: size }, (_, i) => i));
  if (order[0] === previous) [order[0], order[1]] = [order[1], order[0]];
  return { order, index: 0, hints: 0, revealed: false };
}

export function useChordRecall(size: number) {
  const [round, setRound] = useState(() => newRound(size));

  return {
    ...round,
    item: round.order[round.index],
    size,
    reset: () => setRound(newRound(size)),
    hint: () => setRound((current) => ({ ...current, hints: Math.min(3, current.hints + 1) })),
    reveal: () => setRound((current) => ({ ...current, revealed: true })),
    next: () =>
      setRound((current) => {
        if (!current.revealed) return current;
        if (current.index + 1 === size) return newRound(size, current.order[current.index]);
        return { ...current, index: current.index + 1, hints: 0, revealed: false };
      }),
  };
}
