import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePracticeMetronome } from '../hooks/usePracticeMetronome';
import { useAudio } from '../hooks/useAudio';
import {
  GUITAR_KEYS,
  PROGRESSIONS,
  guitarProgressKey,
  readGuitarProgress,
  recommendedVoicings,
  rootPosition,
  voicingFor,
  voicingNotes,
} from '../lib/guitarChords';
import type { GuitarKey, RootString } from '../lib/guitarChords';
import type { ChordFamily } from '../lib/chordHarmony';
import {
  connectionStorageKey,
  connectionChordsInKey,
  readConnectionProgress,
} from '../lib/connectionPractice';
import type { ConnectionSettings } from '../lib/connectionPractice';
import { connectionSuspensions, SUSPENSION_USAGES } from '../lib/connectionSuspensions';
import type { SuspensionBeat } from '../lib/connectionSuspensions';
import { readSusGuitarProgress } from '../lib/guitarSusChords';
import { ChordDiagram } from './ChordDiagram';
import { RandomKeyButton } from './RandomKeyButton';
import { ProgressionPicker } from './ProgressionPicker';
import { CHORD_PROGRESSIONS, progressionDegree } from '../lib/chordProgressions';
import { name } from '../lib/theory';
import './guitarChords.css';

const beats = [1, 2, 3, 4];

export function ChordConnectionPractice({
  family = 'triad',
  familySwitch,
}: {
  family?: ChordFamily;
  familySwitch?: ReactNode;
}) {
  const [progress, setProgress] = useState(() => {
    const saved = readConnectionProgress(family, readGuitarProgress(family).key);
    // Old bookmarks and the old last-used entry now open the integrated exercise.
    const params = new URLSearchParams(location.search);
    try {
      if (
        params.get('practice') === 'sus-connection' ||
        params.get('task') === 'resolve' ||
        (!params.has('practice') &&
          localStorage.getItem('notera.last-practice.v1') === 'sus-connection')
      ) {
        const legacy = readConnectionProgress('sus', readSusGuitarProgress().root);
        saved.settings = {
          ...saved.settings,
          key: legacy.settings.key === 'A' ? 'D' : 'A',
          progression: 0,
          tempo: legacy.settings.tempo,
          loops: legacy.settings.loops,
          display: legacy.settings.display,
          suspensions: true,
        };
      }
    } catch {
      /* Settings and playback remain available without browser storage. */
    }
    return saved;
  });
  const { settings } = progress;
  const { key, progression, tempo, loops, display, suspensions, suspensionVersion } = settings;
  const pattern = CHORD_PROGRESSIONS[progression];
  const minor = Boolean(pattern.minor);
  const [fingerings, setFingerings] = useState(() => readGuitarProgress(family));
  const chords = useMemo(() => connectionChordsInKey(key, family, minor), [key, family, minor]);
  const plan = useMemo(() => {
    const recommended = recommendedVoicings(chords);
    return chords.map((chord, i) => {
      const override = fingerings.overrides[key]?.[chord.degree];
      return override ? voicingFor(chord, override) : recommended[i];
    });
  }, [chords, fingerings, key]);
  const sequence = PROGRESSIONS[progression];
  const cues = useMemo(
    () =>
      suspensions
        ? connectionSuspensions(key, chords, plan, sequence, loops, suspensionVersion)
        : [],
    [suspensions, key, chords, plan, sequence, loops, suspensionVersion],
  );
  const [previewLoop, setPreviewLoop] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [audioError, setAudioError] = useState('');
  const play = useAudio(setAudioError);
  const metro = usePracticeMetronome();
  const active = metro.phase === 'starting' || metro.phase === 'playing';
  const complete = metro.phase === 'complete';
  const heading = useRef<HTMLHeadingElement>(null);
  const board = useRef<HTMLElement>(null);
  const playingBeat = metro.phase === 'playing' ? metro.beat - 4 : -1;
  const countIn = metro.phase === 'playing' && playingBeat < 0;
  const loopLength = sequence.length * 4;
  const loop = Math.floor(playingBeat / loopLength);
  const offset = playingBeat % loopLength;
  const bar = Math.floor(offset / 4);
  const beatInBar = metro.phase === 'playing' ? (metro.beat % 4) + 1 : 0;
  const scoreLoop = active
    ? Math.max(0, Math.min(loop, loops - 1))
    : Math.min(previewLoop, loops - 1);
  const cue = cues[scoreLoop];
  const uniqueDegrees = [...new Set(sequence)];
  const susShapes = [
    ...new Map(
      cues.flatMap((item) =>
        item.bars.flatMap((bar) =>
          bar.beats
            .filter((beat) => beat.kind)
            .map((beat) => [beat.shape.symbol, beat.shape] as const),
        ),
      ),
    ).values(),
  ];
  const nameOf = (degree: number) => chords[degree - 1].symbol;
  const degreeOf = (degree: number) => String(progressionDegree(degree, minor));
  const labelOf = (degree: number) => (display === 'names' ? nameOf(degree) : degreeOf(degree));
  const susSuffix = (beat: SuspensionBeat) =>
    beat.kind?.replace('maj7', 'maj⁷').replace(/^7/, '⁷') ?? '';
  const beatLabel = (degree: number, beat: SuspensionBeat) =>
    display === 'names' ? beat.shape.symbol : `${degreeOf(degree)}${susSuffix(beat)}`;
  const nextBar = (loopIndex: number, barIndex: number) =>
    cues[loopIndex].bars[barIndex + 1] ?? cues[loopIndex + 1]?.bars[0];
  const context = minor ? `${name(chords[5].root, false)} 小调 · 关系大调 ${key}` : `${key} 大调`;

  useEffect(() => {
    try {
      localStorage.setItem(connectionStorageKey(family), JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress, family]);
  useEffect(() => {
    if (!active && !complete) return;
    const panel = board.current;
    if (panel && panel.getBoundingClientRect().bottom > window.innerHeight) {
      const controls = active ? panel.querySelector('.guitar-loop-controls') : null;
      (controls ?? panel).scrollIntoView({ block: 'start' });
    }
  }, [active, complete]);

  function resetRound() {
    metro.stop();
  }
  function configure(patch: Partial<ConnectionSettings>) {
    resetRound();
    setPreviewLoop(0);
    setProgress((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }
  function start() {
    resetRound();
    void metro.start(tempo, 4 + loops * loopLength, 4);
    heading.current?.focus({ preventScroll: true });
  }
  function changeKey(value: GuitarKey) {
    configure({ key: value });
    try {
      localStorage.setItem(
        guitarProgressKey(family),
        JSON.stringify({ ...readGuitarProgress(family), key: value }),
      );
    } catch {
      setStorageError(true);
    }
  }
  function changeVoicing(degree: number, rootString: RootString) {
    resetRound();
    const next = {
      ...fingerings,
      key,
      overrides: {
        ...fingerings.overrides,
        [key]: { ...fingerings.overrides[key], [degree]: rootString },
      },
    };
    setFingerings(next);
    try {
      localStorage.setItem(guitarProgressKey(family), JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  }

  return (
    <section className="guitar-practice connection-practice" aria-label="和弦连接练习">
      <div className="connection-scope">
        {familySwitch}
        <label>
          {minor ? '关系大调' : '调性'}
          <select
            aria-label="连接调性"
            value={key}
            disabled={active}
            onChange={(e) => changeKey(e.target.value as GuitarKey)}
          >
            {GUITAR_KEYS.map(([value]) => (
              <option key={value} value={value}>
                {value} 大调
              </option>
            ))}
          </select>
        </label>
        <RandomKeyButton currentKey={key} onChange={changeKey} disabled={active} />
      </div>
      <div className="connection-layout">
        <section
          className="guitar-board guitar-connection"
          ref={board}
          data-playing={active || undefined}
        >
          <div className="guitar-board-header">
            <span>{context}</span>
            <span>4/4 拍 · 每小节四拍</span>
          </div>
          <h2 ref={heading} tabIndex={-1} className="guitar-stage-heading">
            常见进行连接
          </h2>
          <div className="connection-setup">
            <ProgressionPicker
              value={progression}
              onChange={(value) => configure({ progression: value })}
              disabled={active}
              chordKey={key}
              family={family}
              showNames={display === 'names'}
            />
          </div>
          <p className="connection-sequence" aria-label="本轮进行">
            {sequence.map(labelOf).join(' → ')}
          </p>
          {minor && (
            <p className="connection-instruction">
              以小调主音为 1；包含属七和弦，251 还包含半减七和弦。
            </p>
          )}
          <div className="connection-suspensions">
            <label className="connection-suspension-toggle">
              <input
                type="checkbox"
                checked={suspensions}
                disabled={active}
                aria-describedby="connection-suspension-help"
                onChange={(e) => configure({ suspensions: e.target.checked })}
              />
              加入挂留变化
            </label>
            {suspensions && (
              <button
                className="guitar-text-button"
                disabled={active}
                onClick={() => configure({ suspensionVersion: suspensionVersion + 1 })}
              >
                换一组变化
              </button>
            )}
          </div>
          <p className="connection-instruction" id="connection-suspension-help">
            {suspensions
              ? '每圈可有多处变化，混合恢复、保持、直接连接与连续换色；先看谱，熟悉后再换一组。'
              : '跟着拍点换和弦，下一小节第一拍落稳。'}
          </p>
          <div className="guitar-loop-controls">
            <div className="connection-timing">
              <label>
                速度
                <select
                  aria-label="速度"
                  disabled={active}
                  value={tempo}
                  onChange={(e) => configure({ tempo: Number(e.target.value) })}
                >
                  {[40, 50, 60, 70, 80, 90, 100, 110, 120].map((value) => (
                    <option key={value} value={value}>
                      {value} BPM
                    </option>
                  ))}
                </select>
              </label>
              <label>
                圈数
                <select
                  aria-label="循环圈数"
                  disabled={active}
                  value={loops}
                  onChange={(e) => configure({ loops: Number(e.target.value) })}
                >
                  {[1, 2, 4, 8].map((value) => (
                    <option key={value} value={value}>
                      {value} 圈
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className={active ? 'guitar-secondary' : 'guitar-primary'}
              onClick={active ? resetRound : start}
            >
              {active ? '停止节拍' : complete ? '再练一轮' : '开始节拍'}
            </button>
          </div>
          <p className="guitar-loop-status" role="status">
            {metro.phase === 'starting'
              ? '准备开始'
              : countIn
                ? '预数四拍'
                : loop >= 0
                  ? `第 ${loop + 1} / ${loops} 圈 · 第 ${bar + 1} 小节`
                  : complete
                    ? '本轮连接完成'
                    : `共 ${loops} 圈 · 开始前预数四拍`}
          </p>
          {cue && (
            <div className="connection-score-preview">
              <label>
                {active ? '当前圈次' : '预览圈次'}
                <select
                  aria-label={active ? '当前圈次' : '预览圈次'}
                  value={scoreLoop}
                  disabled={active}
                  onChange={(e) => setPreviewLoop(Number(e.target.value))}
                >
                  {cues.map((_, i) => (
                    <option key={i} value={i}>
                      第 {i + 1} 圈 · {cues[i].role}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                {cue.role} · {cue.bars.filter((item) => item.usage !== 'plain').length} 个小节有变化
              </p>
            </div>
          )}
          {suspensions && !cue && (
            <p className="connection-instruction">这组进行暂没有合适的挂留位置，按原进行练习。</p>
          )}
          <table
            className="guitar-loop-score"
            aria-label={sequence.length === 4 ? '四小节节拍谱' : '连接节拍谱'}
          >
            <thead>
              <tr>
                <th scope="col">和弦</th>
                {beats.map((value) => (
                  <th
                    key={value}
                    scope="col"
                    aria-current={countIn && value === beatInBar ? 'step' : undefined}
                  >
                    {value}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sequence.map((degree, i) => {
                const rowCue = cue?.bars[i];
                return (
                  <tr
                    key={i}
                    data-current={bar === i || undefined}
                    data-target={(rowCue && rowCue.usage !== 'plain') || undefined}
                  >
                    <th scope="row" aria-label={`第 ${i + 1} 小节 ${labelOf(degree)}`}>
                      <strong>{labelOf(degree)}</strong>
                      {display === 'names' && <small>{degreeOf(degree)} 级</small>}
                    </th>
                    {beats.map((value) => {
                      const cell = rowCue?.beats[value - 1];
                      const suspended = Boolean(cell?.kind);
                      const action = cell?.action ?? '';
                      const sounding = cell ? beatLabel(degree, cell) : labelOf(degree);
                      const showChord = value === 1 || Boolean(action);
                      return (
                        <td
                          key={value}
                          aria-current={bar === i && value === beatInBar ? 'step' : undefined}
                          aria-label={`第 ${value} 拍，${action || (showChord ? '弹' : '延续')} ${sounding}`}
                          data-suspended={suspended || undefined}
                        >
                          {showChord ? (
                            <strong className={suspended ? 'connection-sus-symbol' : undefined}>
                              {suspended ? (
                                <>
                                  <span>
                                    {display === 'names'
                                      ? name(chords[degree - 1].root, false)
                                      : degreeOf(degree)}
                                  </span>
                                  <span>
                                    {cell!.kind === 'maj7sus2' ? (
                                      <>
                                        {display === 'names' ? 'maj7' : 'maj⁷'}
                                        <wbr />
                                        sus2
                                      </>
                                    ) : display === 'names' ? (
                                      cell!.kind
                                    ) : (
                                      susSuffix(cell!)
                                    )}
                                  </span>
                                </>
                              ) : (
                                sounding
                              )}
                            </strong>
                          ) : (
                            <span aria-hidden="true">·</span>
                          )}
                          {action && <small>{action}</small>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="guitar-loop-key">· 延续前一拍</p>
          {cues.length > 0 && (
            <details className="connection-suspension-plan">
              <summary>查看整轮挂留安排 · {loops} 圈</summary>
              <table className="guitar-sus-plan" aria-label="整轮挂留安排">
                <thead>
                  <tr>
                    <th scope="col">圈次</th>
                    <th scope="col">本圈安排</th>
                  </tr>
                </thead>
                <tbody>
                  {cues.map((item, loopIndex) => (
                    <tr
                      key={loopIndex}
                      aria-current={active && loop === loopIndex ? 'step' : undefined}
                    >
                      <th scope="row">
                        第 {loopIndex + 1} 圈<small>{item.role}</small>
                      </th>
                      <td>
                        {item.bars
                          .filter((bar) => bar.usage !== 'plain')
                          .map((bar) => {
                            const next = nextBar(loopIndex, bar.bar);
                            return (
                              <div className="connection-plan-bar" key={bar.bar}>
                                <p>
                                  第 {bar.bar + 1} 小节 · {SUSPENSION_USAGES[bar.usage]}
                                </p>
                                <p className="connection-plan-beats">
                                  {bar.beats.map(
                                    (beat, i) =>
                                      (i === 0 || beat.action) && (
                                        <span key={i}>
                                          第 {i + 1} 拍{' '}
                                          <strong>{beatLabel(bar.degree, beat)}</strong>
                                        </span>
                                      ),
                                  )}
                                </p>
                                {bar.beats[3].kind && (
                                  <p className="connection-plan-next">
                                    {next ? (
                                      <>
                                        接 <strong>{beatLabel(next.degree, next.beats[0])}</strong>
                                        （下一小节）
                                      </>
                                    ) : (
                                      '保持至本轮结束'
                                    )}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        {item.bars.every((bar) => bar.usage === 'plain') && (
                          <p>按原进行，留出呼吸。</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="guitar-loop-key">
                四圈依次为主题、呼应、展开、收束；挂留可以保持或直接连接，不必每次恢复。
              </p>
              {family === 'seventh' && (
                <p className="guitar-loop-key">
                  挂留保留原七音：maj7sus2 留大七音，7sus2 / 7sus4
                  留小七音；恢复时回到原来的大七、小七或属七和弦。
                </p>
              )}
            </details>
          )}
          {metro.notice && <p role="status">{metro.notice}</p>}
          {complete && (
            <button
              className="guitar-text-button"
              onClick={() => configure({ progression: (progression + 1) % PROGRESSIONS.length })}
            >
              换一个进行
            </button>
          )}
        </section>
        <aside className="connection-aside">
          <label className="connection-display">
            显示
            <select
              aria-label="连接显示"
              value={display}
              onChange={(e) =>
                setProgress((current) => ({
                  ...current,
                  settings: { ...current.settings, display: e.target.value as 'names' | 'degrees' },
                }))
              }
            >
              <option value="names">和弦名＋级数</option>
              <option value="degrees">只看级数</option>
            </select>
          </label>
          <details className="connection-reference">
            <summary>查看本轮指法 · {uniqueDegrees.length + susShapes.length} 个和弦</summary>
            {uniqueDegrees.map((degree) => {
              const chord = chords[degree - 1];
              const shape = plan[degree - 1];
              return (
                <div className="connection-shape" key={degree}>
                  <h3>
                    {chord.symbol} <small>{degreeOf(degree)} 级</small>
                  </h3>
                  <ChordDiagram chord={chord} voicing={shape} />
                  <label>
                    本轮按法
                    <select
                      aria-label={`${chord.symbol} 本轮按法`}
                      disabled={active}
                      value={shape.rootString}
                      onChange={(e) => changeVoicing(degree, Number(e.target.value) as RootString)}
                    >
                      {([5, 6] as const).map((value) => (
                        <option key={value} value={value}>
                          {rootPosition(voicingFor(chord, value))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="guitar-text-button"
                    onClick={() => {
                      setAudioError('');
                      void play(voicingNotes(shape));
                    }}
                  >
                    试听 {chord.symbol}
                  </button>
                </div>
              );
            })}
            {susShapes.map((shape) => (
              <div className="connection-shape" key={shape.symbol}>
                <h3>{shape.symbol}</h3>
                <ChordDiagram chord={shape} voicing={shape.voicing} />
                <button
                  className="guitar-text-button"
                  onClick={() => {
                    setAudioError('');
                    void play(voicingNotes(shape.voicing));
                  }}
                >
                  试听 {shape.symbol}
                </button>
              </div>
            ))}
            {audioError && <p role="status">{audioError}</p>}
          </details>
          {storageError && <p role="status">浏览器暂时无法保存设置，当前仍可继续练习。</p>}
        </aside>
      </div>
    </section>
  );
}
