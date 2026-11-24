import { memo } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import type { HalfTempoConflict } from './halfTempo';
import type { Measure, TimeRange } from './score';

interface WaveformMarksProps {
  wrapper: HTMLElement | null;
  duration: number;
  measures: Measure[];
  loop: TimeRange | null;
  conflicts?: HalfTempoConflict[];
}

const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  pointerEvents: 'none',
  overflow: 'hidden',
};

export const WaveformMarks = memo(function WaveformMarks({
  wrapper,
  duration,
  measures,
  loop,
  conflicts,
}: WaveformMarksProps) {
  if (!wrapper || !duration) return null;
  return createPortal(
    <div style={overlay} aria-hidden="true">
      {loop && (
        <i
          style={{
            position: 'absolute',
            insetBlock: 0,
            background: 'rgba(57, 116, 84, .10)',
            left: `${(loop.start / duration) * 100}%`,
            width: `${((loop.end - loop.start) / duration) * 100}%`,
          }}
        />
      )}
      {measures.flatMap((measure) =>
        measure.beats.map((beat, index) => (
          <i
            key={beat.id}
            style={{
              position: 'absolute',
              insetBlock: 0,
              left: `${(beat.time / duration) * 100}%`,
              width: index === 0 ? 1.5 : 1,
              background: index === 0 ? 'rgba(45, 91, 66, .46)' : 'rgba(45, 91, 66, .18)',
            }}
          />
        )),
      )}
      {conflicts?.map(({ beat }) => (
        <i
          key={beat.id}
          style={{
            position: 'absolute',
            insetBlock: 0,
            left: `${(beat.time / duration) * 100}%`,
            borderInlineStart: '2px dashed #a85d35',
          }}
        />
      ))}
    </div>,
    wrapper,
  );
});
