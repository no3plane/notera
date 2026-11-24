import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeBeats } from './beatAnalysis';
import { HalfTempoPreview } from './HalfTempoPreview';
import { phaseForDownbeat, previewHalfTempo, restoreHalfTempoBeats } from './halfTempo';
import type { BeatPhase, ChordDecision } from './halfTempo';
import { ScoreGrid } from './ScoreGrid';
import {
  beatIndexAt,
  detectedBeats,
  formatTime,
  measureIndexAt,
  measureName,
  measuresFor,
  METERS,
} from './score';
import type { Beat, Meter } from './score';
import { SPEEDS } from './projects';
import type { Project, Song } from './projects';
import { usePlayback } from './usePlayback';
import { WaveformMarks } from './WaveformMarks';

interface SongWorkspaceProps {
  song: Pick<Song, 'project' | 'audio'>;
  onUpdate: (id: string, changes: Partial<Project>) => void;
  sourcePending: boolean;
  sourcePermission: boolean;
  sourceError: string;
  onChooseAudio: () => void;
  onPermitAudio: () => void;
  playOnLoad: boolean;
}

type MeasureSelection = readonly [number, number] | null;

interface HalfTempoEdit {
  phase: BeatPhase;
  decisions: Map<number, ChordDecision>;
  previousSelection: MeasureSelection;
}

interface HalfTempoUndo {
  beats: Beat[];
  firstBeat: Project['firstBeat'];
  bpm: Project['bpm'];
  movedChords: ReadonlyMap<number, string>;
}

export function SongWorkspace({
  song: { audio, project },
  onUpdate,
  sourcePending,
  sourcePermission,
  sourceError,
  onChooseAudio,
  onPermitAudio,
  playOnLoad,
}: SongWorkspaceProps) {
  const {
    container,
    decoded,
    duration: mediaDuration,
    wrapper,
    time,
    playing,
    looping,
    loadError,
    playError,
    commitPosition,
    seek,
    toggle,
    startLoop,
    stopLoop,
    syncLoop,
    setSpeed,
    setZoom,
  } = usePlayback(audio, project.position);
  const duration = mediaDuration || project.duration;
  const { bpm, beats, id, meter, firstBeat, speed, analysisDone } = project;
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [measureIds, setMeasureIds] = useState<MeasureSelection>(null);
  const [extend, setExtend] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [halfTempo, setHalfTempo] = useState<HalfTempoEdit | null>(null);
  const [halfUndo, setHalfUndo] = useState<HalfTempoUndo | null>(null);
  const [notice, setNotice] = useState('');
  const [zoom, setZoomLevel] = useState(1);
  const initialized = useRef(false);
  const requestedPlayback = useRef(false);
  const savedPosition = useRef(project.position);
  const available = decoded !== null && !loadError;
  const detecting = available && !analysisDone;
  const halfDraft = useMemo(
    () => halfTempo && previewHalfTempo(beats, firstBeat, halfTempo.phase, halfTempo.decisions),
    [beats, firstBeat, halfTempo],
  );
  const displayBeats = halfDraft?.beats ?? beats;
  const displayFirstBeat = halfDraft ? halfDraft.firstBeat : firstBeat;
  const halfBpm = bpm === null ? null : bpm / 2;
  const bpmChange =
    bpm === null || halfBpm === null ? '' : `${Math.round(bpm)} → ${Math.round(halfBpm)} BPM`;
  const displayBpm = halfDraft ? halfBpm : bpm;
  const selectedBeat = beats.find((beat) => beat.id === selectedId) ?? null;
  const measures = useMemo(
    () => measuresFor({ beats: displayBeats, meter, firstBeat: displayFirstBeat }, duration),
    [displayBeats, meter, displayFirstBeat, duration],
  );
  const activeBeat = available ? (displayBeats[beatIndexAt(displayBeats, time)]?.id ?? null) : null;
  const update = useCallback((changes: Partial<Project>) => onUpdate(id, changes), [id, onUpdate]);

  const selection = useMemo(() => {
    if (!measureIds) return null;
    const [anchor, end] = measureIds.map((id) => {
      const index = measures.findIndex((measure) => measure.beats.some((beat) => beat.id === id));
      if (index !== -1 || !halfDraft) return index;
      const source = beats.find((beat) => beat.id === id);
      if (!source || !measures.length) return -1;
      const before = measureIndexAt(measures, source.time);
      const after = measures[before + 1];
      return after && after.start - source.time < source.time - measures[before].start
        ? before + 1
        : before;
    });
    if (anchor < 0 || end < 0) return null;
    return [Math.min(anchor, end), Math.max(anchor, end)] as const;
  }, [measureIds, measures, halfDraft, beats]);
  const loopRange = useMemo(() => {
    if (!selection) return null;
    const start = measures[selection[0]].start;
    const end = measures[selection[1]].end;
    return end > start ? { start, end } : null;
  }, [measures, selection]);
  const selectionLabel =
    selection &&
    (selection[0] === selection[1]
      ? measureName(measures[selection[0]].number)
      : `${measureName(measures[selection[0]].number)} – ${measureName(measures[selection[1]].number)}`);

  useEffect(() => {
    if (!available || initialized.current) return;
    initialized.current = true;
    if (project.duration <= 0) update({ duration, position: Math.min(project.position, duration) });
  }, [available, duration, project.duration, project.position, update]);

  useEffect(() => {
    if (!decoded || !detecting) return;
    const controller = new AbortController();
    void analyzeBeats(decoded, controller.signal)
      .then(({ bpm, times }) => {
        if (controller.signal.aborted) return;
        const found = detectedBeats(times, duration);
        update({
          bpm: found.length > 1 && bpm && Number.isFinite(bpm) && bpm > 0 ? bpm : null,
          beats: found.length > 1 ? found : [],
          analysisDone: true,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) update({ analysisDone: true });
      });
    return () => controller.abort();
  }, [decoded, detecting, duration, update]);

  useEffect(() => {
    if (available) setSpeed(speed);
  }, [available, speed, setSpeed]);

  useEffect(() => {
    if (!available || !playOnLoad || requestedPlayback.current) return;
    requestedPlayback.current = true;
    toggle();
  }, [available, playOnLoad, toggle]);

  useEffect(() => {
    if (!available || commitPosition === savedPosition.current) return;
    savedPosition.current = commitPosition;
    update({ position: Math.max(0, Math.min(commitPosition, duration)) });
  }, [commitPosition, available, duration, update]);

  useEffect(() => syncLoop(loopRange), [loopRange, syncLoop]);

  useEffect(() => {
    if (!available) return;
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.code !== 'Space' && event.key !== ' ') ||
        event.defaultPrevented ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        !(event.target instanceof Element)
      )
        return;
      const insideChord = Boolean(event.target.closest('.transcription-beat input'));
      if (
        !insideChord &&
        (event.shiftKey ||
          event.target.closest('button, a, select, input, textarea, summary, [contenteditable]'))
      )
        return;
      event.preventDefault();
      if (!event.repeat) toggle();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [available, toggle]);

  const selectBeat = useCallback(
    (beat: Beat) => {
      setSelectedId(beat.id);
      setNotice('');
      seek(beat.time);
    },
    [seek],
  );

  const setChord = useCallback(
    (id: number, chord: string) => {
      if (halfTempo) return;
      update({ beats: beats.map((beat) => (beat.id === id ? { ...beat, chord } : beat)) });
    },
    [beats, halfTempo, update],
  );

  const selectMeasure = useCallback(
    (index: number, shifted: boolean) => {
      const beat = measures[index].beats[0];
      if ((extend || shifted) && measureIds) {
        setMeasureIds([measureIds[0], beat.id]);
      } else {
        setMeasureIds([beat.id, beat.id]);
        if (!looping) seek(beat.time);
      }
      setExtend(false);
    },
    [extend, looping, measureIds, measures, seek],
  );

  function toggleCalibration() {
    if (halfTempo) cancelHalfTempo();
    setCalibrating(!calibrating);
    setNotice('');
  }

  function beginHalfTempo() {
    setHalfTempo({
      phase: phaseForDownbeat(beats, firstBeat),
      decisions: new Map(),
      previousSelection: measureIds,
    });
    setNotice('');
  }

  function cancelHalfTempo() {
    if (!halfTempo) return;
    setMeasureIds(halfTempo.previousSelection);
    stopLoop();
    setHalfTempo(null);
  }

  function listenToHalfTempo() {
    if (!measures.length) return;
    const start = selection?.[0] ?? measureIndexAt(measures, time);
    const first = measures[start];
    const last = measures[Math.min(start + 1, measures.length - 1)];
    setMeasureIds([first.beats[0].id, last.beats[0].id]);
    setExtend(false);
    startLoop({ start: first.start, end: last.end });
  }

  function setChordDecision(id: number, decision: ChordDecision | undefined) {
    setHalfTempo((draft) => {
      if (!draft) return draft;
      const decisions = new Map(draft.decisions);
      if (decision === undefined) decisions.delete(id);
      else decisions.set(id, decision);
      return { ...draft, decisions };
    });
  }

  function applyHalfTempo() {
    if (!halfDraft || halfDraft.conflicts.some(({ decision }) => decision === undefined)) return;
    setHalfUndo({ beats, firstBeat, bpm, movedChords: halfDraft.movedChords });
    setHalfTempo(null);
    setMeasureIds(
      selection ? [measures[selection[0]].beats[0].id, measures[selection[1]].beats[0].id] : null,
    );
    if (!halfDraft.beats.some((beat) => beat.id === selectedId)) setSelectedId(null);
    update({ beats: halfDraft.beats, firstBeat: halfDraft.firstBeat, bpm: halfBpm });
  }

  function undoHalfTempo() {
    if (!halfUndo) return;
    stopLoop();
    setMeasureIds(null);
    setHalfUndo(null);
    update({
      beats: restoreHalfTempoBeats(halfUndo.beats, beats, halfUndo.movedChords),
      firstBeat: halfUndo.firstBeat,
      bpm: halfUndo.bpm,
    });
    setNotice('已撤销节拍减半。');
  }

  return (
    <>
      <div className="transcription-transport" aria-label="播放控制">
        {(!audio && !sourcePermission) || loadError ? (
          <button
            type="button"
            className="transcription-primary"
            disabled={sourcePending}
            onClick={onChooseAudio}
          >
            {sourcePending ? '正在读取…' : `选择上次用的「${project.audioName}」`}
          </button>
        ) : (
          <button
            className="transcription-play"
            type="button"
            aria-label={playing ? '暂停' : '播放'}
            title={playing ? '暂停' : '播放'}
            disabled={!available && (!sourcePermission || sourcePending)}
            onClick={available ? toggle : onPermitAudio}
          >
            <span aria-hidden="true" className={playing ? 'pause-glyph' : 'play-glyph'} />
          </button>
        )}
        <div className="transcription-clock" aria-label="播放时间">
          <strong>{formatTime(time)}</strong>
          <span> / {formatTime(duration)}</span>
        </div>
        {audio && !loadError && (
          <label>
            速度
            <select
              value={speed}
              disabled={!available}
              onChange={(event) => update({ speed: Number(event.target.value) })}
            >
              {SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="transcription-bpm">
          <strong>{displayBpm ? Math.round(displayBpm) : '—'}</strong>
          <span>{halfDraft ? 'BPM 预览' : 'BPM'}</span>
        </div>
        <label>
          拍号
          <select
            value={meter}
            disabled={!available}
            onChange={(event) => update({ meter: event.target.value as Meter })}
          >
            {(Object.keys(METERS) as Meter[]).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {audio && !loadError && (
          <label>
            波形缩放
            <select
              value={zoom}
              disabled={!available}
              onChange={(event) => {
                const factor = Number(event.target.value);
                setZoomLevel(factor);
                setZoom(factor);
              }}
            >
              {[1, 2, 4, 8, 16].map((factor) => (
                <option key={factor} value={factor}>
                  {factor}×
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <section className="transcription-wave-section" aria-label="音频波形">
        <div className="transcription-wave" data-waiting-for-source={!audio || undefined}>
          <div ref={container} />
          {!available && (
            <p role={loadError ? 'alert' : 'status'}>
              {loadError ||
                (sourcePending || audio
                  ? '正在读取歌曲…'
                  : sourcePermission
                    ? `点播放，允许浏览器读取「${project.audioName}」。`
                    : '选回原音频后，可从上次的位置继续播放。')}
            </p>
          )}
          <WaveformMarks
            wrapper={wrapper}
            duration={duration}
            measures={measures}
            loop={looping ? loopRange : null}
            conflicts={halfDraft?.conflicts}
          />
        </div>
        {(sourceError || playError) && (
          <p className="transcription-feedback" role="alert">
            {sourceError || playError}
          </p>
        )}
      </section>

      <section className="transcription-score" aria-label="和弦谱">
        <div className="transcription-score-head">
          <div>
            <h2>和弦谱</h2>
            {selectionLabel || available ? (
              <p>
                {selectionLabel ? `已选 ${selectionLabel}` : '点小节标题选段，按住 Shift 扩选。'}
              </p>
            ) : null}
          </div>
          <div className="transcription-actions">
            <button
              type="button"
              disabled={!selection}
              aria-pressed={extend}
              onClick={() => setExtend(!extend)}
            >
              扩选
            </button>
            <button
              type="button"
              disabled={!loopRange || !available}
              aria-pressed={looping}
              onClick={() => (looping ? stopLoop() : loopRange && startLoop(loopRange))}
            >
              {looping ? '停止循环' : '循环所选'}
            </button>
            <button
              type="button"
              disabled={!available || detecting || !beats.length}
              aria-expanded={calibrating}
              onClick={toggleCalibration}
            >
              校准节拍
            </button>
          </div>
        </div>
        {available &&
          calibrating &&
          (halfDraft ? (
            <HalfTempoPreview
              draft={halfDraft}
              displayChange={bpmChange}
              downbeatMoved={firstBeat !== halfDraft.firstBeat}
              onAlternative={() =>
                setHalfTempo((draft) => draft && { ...draft, phase: draft.phase === 0 ? 1 : 0 })
              }
              onListen={listenToHalfTempo}
              onDecision={setChordDecision}
              onSeek={seek}
              onCancel={cancelHalfTempo}
              onApply={applyHalfTempo}
            />
          ) : (
            <div className="transcription-calibration">
              <div className="transcription-calibration-row" role="group" aria-label="节拍校准">
                <button type="button" disabled={beats.length < 2} onClick={beginHalfTempo}>
                  节拍减半
                </button>
                <button
                  type="button"
                  disabled={!selectedBeat}
                  title={selectedBeat ? '设为第 1 小节首拍' : '先在谱面中选一拍'}
                  onClick={() => {
                    if (!selectedBeat) return;
                    if (firstBeat !== selectedBeat.id) setHalfUndo(null);
                    update({ firstBeat: selectedBeat.id });
                    setNotice('已设为第 1 小节首拍。');
                  }}
                >
                  设该拍为起点
                </button>
              </div>
            </div>
          ))}
        {!halfDraft && (notice || halfUndo) && (
          <div className="transcription-calibration-notice">
            <p className="transcription-feedback" role="status">
              {notice || '已应用节拍减半。'}
            </p>
            {halfUndo && (
              <button type="button" className="transcription-undo" onClick={undoHalfTempo}>
                撤销节拍减半
              </button>
            )}
          </div>
        )}
        {measures.length > 0 ? (
          <ScoreGrid
            measures={measures}
            beatsPerMeasure={METERS[meter]}
            selection={selection}
            selectedBeat={displayBeats.some((beat) => beat.id === selectedId) ? selectedId : null}
            activeBeat={activeBeat}
            playing={playing}
            previewing={Boolean(halfDraft)}
            onSelectBeat={selectBeat}
            onSelectMeasure={selectMeasure}
            onChord={setChord}
          />
        ) : (
          <div className="transcription-score-empty">
            <p role={detecting ? 'status' : undefined}>
              {detecting
                ? '正在本地检测节拍…'
                : available
                  ? '这段音频没有检测到可用节拍。可以重新检测或换一段音频。'
                  : '和弦格将在音频载入并检测节拍后出现。'}
            </p>
            {available && analysisDone && (
              <button type="button" onClick={() => update({ analysisDone: false })}>
                重新检测
              </button>
            )}
          </div>
        )}
        {measures.length > 0 && !halfDraft && (
          <p className="transcription-keys">
            方向键换格 · Enter 下一拍 · Delete 清空{available && ' · 空格播放 / 暂停'}
          </p>
        )}
      </section>
    </>
  );
}
