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
import type { PracticeChordFamily } from '../lib/chordHarmony';
import {
  connectionStorageKey,
  connectionChordsInKey,
  progressionLinks,
  readConnectionProgress,
} from '../lib/connectionPractice';
import type { ConnectionLink, ConnectionSettings } from '../lib/connectionPractice';
import {
  readSusGuitarProgress,
  SUS_GUITAR_GROUPS,
  SUS_GUITAR_PROGRESS_KEY,
} from '../lib/guitarSusChords';
import type { SusGuitarRoot } from '../lib/guitarSusChords';
import { ChordDiagram } from './ChordDiagram';
import { ProgressionPicker } from './ProgressionPicker';
import { CHORD_PROGRESSIONS, progressionDegree } from '../lib/chordProgressions';
import { name } from '../lib/theory';
import './guitarChords.css';

const beats = [1, 2, 3, 4];
const susPatterns = [
  { type: 'sus2', enter: 1, release: 3 },
  { type: 'sus4', enter: 1, release: 3 },
  { type: 'sus2', enter: 2, release: 4 },
  { type: 'sus4', enter: 2, release: 4 },
] as const;

export function ChordConnectionPractice({
  family = 'triad',
  familySwitch,
  fixedRoot,
}: {
  family?: PracticeChordFamily;
  familySwitch?: ReactNode;
  fixedRoot?: SusGuitarRoot;
}) {
  const sus = family === 'sus';
  const [progress, setProgress] = useState(() => {
    const saved = readConnectionProgress(
      family,
      sus ? readSusGuitarProgress().root : readGuitarProgress(family).key,
    );
    if (fixedRoot) saved.settings.key = fixedRoot;
    return saved;
  });
  const { settings } = progress;
  const { key, progression, tempo, loops, display, focus } = settings;
  const pattern = CHORD_PROGRESSIONS[sus ? 0 : progression];
  const minor = Boolean(pattern.minor);
  const root = (key === 'A' ? 'A' : 'E') as SusGuitarRoot;
  const harmonyKey = sus ? (root === 'E' ? 'A' : 'D') : key;
  const [fingerings, setFingerings] = useState(() => readGuitarProgress(sus ? 'triad' : family));
  const chords = useMemo(
    () => connectionChordsInKey(harmonyKey, sus ? 'triad' : family, minor),
    [harmonyKey, family, sus, minor],
  );
  const recommended = useMemo(() => recommendedVoicings(chords), [chords]);
  const plan = chords.map((chord, i) => {
    const override = fingerings.overrides[harmonyKey]?.[chord.degree];
    return override ? voicingFor(chord, override) : recommended[i];
  });
  const fullSequence = sus ? PROGRESSIONS[0] : PROGRESSIONS[progression];
  const sequence = focus ?? fullSequence;
  const cues = Array.from({ length: loops }, (_, i) => ({
    ...susPatterns[i % susPatterns.length],
    chord: `${root}${susPatterns[i % susPatterns.length].type}`,
  }));
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
  const target = sequence.indexOf(5);
  const scoreLoop = Math.max(0, Math.min(loop, loops - 1));
  const cue = sus && target >= 0 ? cues[scoreLoop] : undefined;
  const uniqueDegrees = [...new Set(sequence)];
  const nameOf = (degree: number) => chords[degree - 1].symbol;
  const degreeOf = (degree: number) => String(progressionDegree(degree, minor));
  const labelOf = (degree: number) => (display === 'names' ? nameOf(degree) : degreeOf(degree));
  const linkName = (link: ConnectionLink) => link.map(labelOf).join(' → ');
  const context = sus
    ? `${root} 组 · ${harmonyKey} 大调`
    : minor
      ? `${name(chords[5].root, false)} 小调 · 关系大调 ${key}`
      : `${key} 大调`;

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
      const controls = active && sus ? panel.querySelector('.guitar-loop-controls') : null;
      (controls ?? panel).scrollIntoView({ block: 'start' });
    }
  }, [active, complete, sus]);

  function resetRound() {
    metro.stop();
  }
  function configure(patch: Partial<ConnectionSettings>) {
    resetRound();
    setProgress((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }
  function start() {
    resetRound();
    void metro.start(tempo, 4 + loops * loopLength, 4);
    heading.current?.focus({ preventScroll: true });
  }
  function practiceLink(link: ConnectionLink) {
    configure({ focus: link });
  }
  function changeKey(value: GuitarKey) {
    configure({ key: value, focus: null });
    if (sus) {
      try {
        localStorage.setItem(
          SUS_GUITAR_PROGRESS_KEY,
          JSON.stringify({ ...readSusGuitarProgress(), root: value }),
        );
      } catch {
        setStorageError(true);
      }
    }
  }
  function changeVoicing(degree: number, rootString: RootString) {
    const next = {
      ...fingerings,
      overrides: {
        ...fingerings.overrides,
        [harmonyKey]: { ...fingerings.overrides[harmonyKey], [degree]: rootString },
      },
    };
    setFingerings(next);
    try {
      localStorage.setItem(guitarProgressKey(sus ? 'triad' : family), JSON.stringify(next));
    } catch {
      setStorageError(true);
    }
  }

  return (
    <section
      className="guitar-practice connection-practice"
      aria-label={sus ? '挂留和弦连接练习' : '和弦连接练习'}
    >
      <div className="connection-scope">
        {familySwitch}
        {!fixedRoot && (
          <label>
            {sus ? '开放指法组' : minor ? '关系大调' : '调性'}
            <select
              aria-label={sus ? '开放指法组' : '连接调性'}
              value={key}
              disabled={active}
              onChange={(e) => changeKey(e.target.value as GuitarKey)}
            >
              {(sus
                ? GUITAR_KEYS.filter(([value]) => value === 'E' || value === 'A')
                : GUITAR_KEYS
              ).map(([value]) => (
                <option key={value} value={value}>
                  {value}
                  {sus ? ' 组' : ' 大调'}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="connection-layout">
        <section
          className="guitar-board guitar-connection"
          ref={board}
          data-playing={active || undefined}
        >
          <div className="guitar-board-header">
            <span>
              {context}
              {focus ? ' · 两和弦专项' : ''}
            </span>
            <span>4/4 拍 · 每个和弦一小节</span>
          </div>
          <h2 ref={heading} tabIndex={-1} className="guitar-stage-heading">
            {sus ? '挂留与解决' : focus ? '把这一对换顺' : '常见进行连接'}
          </h2>
          {!sus && (
            <div className="connection-setup">
              <ProgressionPicker
                value={progression}
                onChange={(value) => configure({ progression: value, focus: null })}
                disabled={active}
                chordKey={key}
                family={family}
                showNames={display === 'names'}
              />
            </div>
          )}
          <p className="connection-sequence" aria-label="本轮进行">
            {sequence.map(labelOf).join(' → ')}
          </p>
          {minor && (
            <p className="connection-instruction">
              以小调主音为 1；包含属七和弦，251 还包含半减七和弦。
            </p>
          )}
          <p className="connection-instruction">
            {sus && target >= 0
              ? '每圈的挂留与恢复拍点已全部列出，按谱跟弹。'
              : '跟着拍点换和弦，下一小节第一拍落稳。'}
          </p>
          {sus && target >= 0 && (
            <table className="guitar-sus-plan" aria-label="整轮挂留安排">
              <caption>
                整轮挂留安排 · 第 {target + 1} 小节（{labelOf(5)}）
              </caption>
              <thead>
                <tr>
                  <th scope="col">圈数</th>
                  <th scope="col">挂上</th>
                  <th scope="col">恢复</th>
                </tr>
              </thead>
              <tbody>
                {cues.map((item, i) => (
                  <tr key={i} aria-current={active && loop === i ? 'step' : undefined}>
                    <th scope="row">第 {i + 1} 圈</th>
                    <td>
                      第 {item.enter} 拍换{' '}
                      <strong>{display === 'names' ? item.chord : `5${item.type}`}</strong>
                    </td>
                    <td>
                      第 {item.release} 拍恢复 <strong>{labelOf(5)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
          {sus && target >= 0 && <p className="guitar-loop-key">当前谱：第 {scoreLoop + 1} 圈</p>}
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
                const rowCue = i === target ? cue : undefined;
                const chord = nameOf(degree);
                return (
                  <tr
                    key={i}
                    data-current={bar === i || undefined}
                    data-target={(sus && i === target) || undefined}
                  >
                    <th scope="row" aria-label={`第 ${i + 1} 小节 ${labelOf(degree)}`}>
                      <strong>{labelOf(degree)}</strong>
                      {display === 'names' && <small>{degreeOf(degree)} 级</small>}
                    </th>
                    {beats.map((value) => {
                      const suspended = rowCue && value >= rowCue.enter && value < rowCue.release;
                      const action =
                        rowCue?.enter === value ? '挂上' : rowCue?.release === value ? '恢复' : '';
                      const sounding =
                        display === 'names'
                          ? suspended
                            ? rowCue!.chord
                            : chord
                          : `${degreeOf(degree)}${suspended ? rowCue!.chord.slice(-4) : ''}`;
                      const showChord = value === 1 || Boolean(action);
                      return (
                        <td
                          key={value}
                          aria-current={bar === i && value === beatInBar ? 'step' : undefined}
                          aria-label={`第 ${value} 拍，${action || (showChord ? '弹' : '延续')} ${sounding}`}
                          data-suspended={suspended || undefined}
                        >
                          {showChord ? (
                            <strong>{sounding}</strong>
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
          {metro.notice && <p role="status">{metro.notice}</p>}
          {complete && !sus && (
            <button
              className="guitar-text-button"
              onClick={() =>
                configure({ progression: (progression + 1) % PROGRESSIONS.length, focus: null })
              }
            >
              换一个进行
            </button>
          )}
          {focus && (
            <button
              className="guitar-text-button"
              disabled={active}
              onClick={() => configure({ focus: null })}
            >
              回到完整进行
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
                  settings: {
                    ...current.settings,
                    display: e.target.value as 'names' | 'degrees',
                  },
                }))
              }
            >
              <option value="names">和弦名＋级数</option>
              <option value="degrees">只看级数</option>
            </select>
          </label>
          <details className="connection-reference">
            <summary>查看本轮指法 · {uniqueDegrees.length} 个和弦</summary>
            {uniqueDegrees.map((degree) => {
              const chord = chords[degree - 1];
              const shape =
                sus && degree === 5
                  ? SUS_GUITAR_GROUPS[root].comparison[1].voicing
                  : plan[degree - 1];
              return (
                <div className="connection-shape" key={degree}>
                  <h3>
                    {chord.symbol} <small>{degreeOf(degree)} 级</small>
                  </h3>
                  <ChordDiagram chord={chord} voicing={shape} />
                  {!sus && (
                    <label>
                      本轮按法
                      <select
                        aria-label={`${chord.symbol} 本轮按法`}
                        disabled={active}
                        value={shape.rootString}
                        onChange={(e) =>
                          changeVoicing(degree, Number(e.target.value) as RootString)
                        }
                      >
                        {([5, 6] as const).map((value) => (
                          <option key={value} value={value}>
                            {rootPosition(voicingFor(chord, value))}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
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
            {sus &&
              SUS_GUITAR_GROUPS[root].comparison
                .filter((shape) => shape.symbol !== root)
                .map((shape) => (
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
          <div className="connection-pair-practice">
            <h3>拆开练一对</h3>
            <p>换不过去时，先单练这一步。</p>
            <div className="connection-link-list">
              {progressionLinks(fullSequence).map((link) => (
                <button
                  className="guitar-text-button"
                  disabled={active}
                  key={link.join(':')}
                  onClick={() => practiceLink(link)}
                >
                  单练 {linkName(link)}
                </button>
              ))}
            </div>
          </div>
          {storageError && <p role="status">浏览器暂时无法保存设置，当前仍可继续练习。</p>}
        </aside>
      </div>
    </section>
  );
}
