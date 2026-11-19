import { GUITAR_KEYS } from '../lib/guitarChords';
import type { GuitarKey } from '../lib/guitarChords';

export function RandomKeyButton({
  currentKey,
  onChange,
  disabled = false,
}: {
  currentKey: GuitarKey;
  onChange: (key: GuitarKey) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="guitar-secondary guitar-random-key"
      disabled={disabled}
      onClick={() => {
        const candidates = GUITAR_KEYS.filter(([key]) => key !== currentKey);
        onChange(candidates[Math.floor(Math.random() * candidates.length)][0]);
      }}
    >
      随机换调
    </button>
  );
}
