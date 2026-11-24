import { useEffect, useRef } from 'react';
import type { ChordDecision, HalfTempoPreviewData } from './halfTempo';

interface HalfTempoPreviewProps {
  draft: HalfTempoPreviewData;
  displayChange: string;
  downbeatMoved: boolean;
  onAlternative: () => void;
  onListen: () => void;
  onDecision: (id: number, decision: ChordDecision | undefined) => void;
  onSeek: (time: number) => void;
  onCancel: () => void;
  onApply: () => void;
}

export function HalfTempoPreview({
  draft,
  displayChange,
  downbeatMoved,
  onAlternative,
  onListen,
  onDecision,
  onSeek,
  onCancel,
  onApply,
}: HalfTempoPreviewProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  const { beats, conflicts, firstBeat } = draft;
  const unresolved = conflicts.filter(({ decision }) => decision === undefined).length;
  const newDownbeat = downbeatMoved ? beats.find((beat) => beat.id === firstBeat) : undefined;

  return (
    <section
      className="transcription-calibration transcription-half-preview"
      aria-labelledby="transcription-half-preview-title"
    >
      <h3 ref={heading} tabIndex={-1} id="transcription-half-preview-title">
        节拍减半预览 <span>{displayChange}</span>
      </h3>
      <p>保留的这组拍点从 {beats[0].time.toFixed(3)} 秒开始。试听时跟着高亮数拍。</p>
      {newDownbeat && <p>第 1 小节首拍将随这一组移到 {newDownbeat.time.toFixed(3)} 秒。</p>}
      <div className="transcription-calibration-row">
        <button type="button" onClick={onListen}>
          试听两小节
        </button>
        <button type="button" onClick={onAlternative}>
          换另一组
        </button>
      </div>
      {conflicts.length > 0 && (
        <div className="transcription-half-conflicts">
          <p role="status">
            {unresolved
              ? `请处理将被移除的拍点上的和弦（剩余 ${unresolved} 处）。`
              : '已处理即将移除的拍点上的和弦。'}
          </p>
          <ul>
            {conflicts.map(({ beat, destinations, decision }) => (
              <li key={beat.id}>
                <button
                  type="button"
                  className="transcription-conflict-time"
                  onClick={() => onSeek(beat.time)}
                  aria-label={`定位到 ${beat.time.toFixed(3)} 秒的 ${beat.chord}`}
                >
                  <span>{beat.time.toFixed(3)} 秒</span> <strong>{beat.chord}</strong>
                </button>
                <select
                  aria-label={`处理 ${beat.time.toFixed(3)} 秒的 ${beat.chord}`}
                  value={decision ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    onDecision(
                      beat.id,
                      value === 'remove' ? value : value ? Number(value) : undefined,
                    );
                  }}
                >
                  <option value="">选择处理方式</option>
                  {destinations.map(({ beat, direction }) => (
                    <option value={beat.id} key={beat.id}>
                      移到{direction === 'before' ? '前' : '后'}一拍 · {beat.time.toFixed(3)} 秒
                    </option>
                  ))}
                  <option value="remove">从谱面移除</option>
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="transcription-calibration-row transcription-half-confirm">
        <button type="button" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="transcription-primary"
          disabled={unresolved > 0}
          onClick={onApply}
        >
          应用节拍减半
        </button>
      </div>
    </section>
  );
}
