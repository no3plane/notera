import { memo, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { formatTime, measureName } from './score';
import type { Beat, Measure } from './score';

interface ScoreGridProps {
  measures: Measure[];
  beatsPerMeasure: number;
  selection: readonly [number, number] | null;
  selectedBeat: number | null;
  activeBeat: number | null;
  playing: boolean;
  previewing: boolean;
  onSelectBeat: (beat: Beat) => void;
  onSelectMeasure: (index: number, extend: boolean) => void;
  onChord: (id: number, chord: string) => void;
}

export const ScoreGrid = memo(function ScoreGrid({
  measures,
  beatsPerMeasure,
  selection,
  selectedBeat,
  activeBeat,
  playing,
  previewing,
  onSelectBeat,
  onSelectMeasure,
  onChord,
}: ScoreGridProps) {
  const grid = useRef<HTMLDivElement>(null);
  const activeMeasure = measures.findIndex((measure) =>
    measure.beats.some((beat) => beat.id === activeBeat),
  );

  useEffect(() => {
    if (!playing || !grid.current || grid.current.contains(document.activeElement)) return;
    const measure = grid.current.children[activeMeasure];
    const viewport = grid.current.parentElement;
    if (!measure || !viewport) return;
    const bounds = measure.getBoundingClientRect();
    const visible = viewport.getBoundingClientRect();
    if (bounds.bottom > visible.bottom || bounds.top < visible.top) {
      viewport.scrollTop += bounds.top - visible.top - 8;
    }
  }, [activeMeasure, playing]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, measureIndex: number, index: number) {
    if (
      event.nativeEvent.isComposing ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey
    )
      return;
    if (event.key === 'Delete') {
      if (previewing) return;
      event.preventDefault();
      onChord(measures[measureIndex].beats[index].id, '');
      return;
    }
    let measure = measureIndex;
    let column = index;
    if (event.key === 'Enter') {
      column++;
      if (column === measures[measure].beats.length) {
        measure++;
        column = 0;
      }
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const columns = grid.current
        ? getComputedStyle(grid.current).gridTemplateColumns.split(' ').length
        : 1;
      measure += event.key === 'ArrowUp' ? -columns : columns;
      column = Math.min(index, (measures[measure]?.beats.length ?? 1) - 1);
    } else {
      return;
    }
    event.preventDefault();
    const next = measures[measure]?.beats[column];
    if (next) grid.current?.querySelector<HTMLInputElement>(`[data-beat="${next.id}"]`)?.focus();
  }

  return (
    <div className="transcription-grid-scroll">
      <div className="transcription-grid" ref={grid}>
        {measures.map((measure, measureIndex) => {
          const inRange = selection && measureIndex >= selection[0] && measureIndex <= selection[1];
          const label = measureName(measure.number);
          return (
            <div
              key={measure.beats[0].id}
              className="transcription-measure"
              data-in-range={inRange || undefined}
            >
              <button
                type="button"
                className="transcription-measure-head"
                aria-label={`选择${label}`}
                aria-pressed={Boolean(inRange)}
                onClick={(event) => onSelectMeasure(measureIndex, event.shiftKey)}
              >
                <span>{measure.number > 0 ? `小节 ${measure.number}` : label}</span>
                <time title={`${measure.start.toFixed(3)} 秒`}>{formatTime(measure.start)}</time>
              </button>
              <div
                className="transcription-beats"
                style={{ gridTemplateColumns: `repeat(${beatsPerMeasure}, minmax(0, 1fr))` }}
              >
                {measure.beats.map((beat, index) => (
                  <label
                    key={beat.id}
                    className="transcription-beat"
                    data-selected={beat.id === selectedBeat || undefined}
                    data-current={beat.id === activeBeat || undefined}
                  >
                    <span aria-hidden="true">{index + 1}</span>
                    <input
                      data-beat={beat.id}
                      value={beat.chord}
                      readOnly={previewing}
                      aria-label={`${label}第 ${index + 1} 拍和弦`}
                      aria-current={beat.id === activeBeat ? 'true' : undefined}
                      title={beat.chord || `${beat.time.toFixed(3)} 秒`}
                      placeholder="·"
                      spellCheck={false}
                      autoComplete="off"
                      autoCapitalize="off"
                      tabIndex={beat.id === (selectedBeat ?? measures[0].beats[0].id) ? 0 : -1}
                      onFocus={() => onSelectBeat(beat)}
                      onPointerDown={(event) => {
                        if (event.button === 0 && document.activeElement === event.currentTarget)
                          onSelectBeat(beat);
                      }}
                      onChange={(event) => onChord(beat.id, event.target.value)}
                      onKeyDown={(event) => onKeyDown(event, measureIndex, index)}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
