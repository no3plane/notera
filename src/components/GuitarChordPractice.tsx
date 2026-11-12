import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ChordVoicingOptions } from './ChordVoicingOptions';
import { useAudio } from '../hooks/useAudio';
import {
  GUITAR_KEYS,
  chordsInKey,
  guitarProgressKey,
  readGuitarProgress,
  recallQueue,
  recommendedVoicings,
  rootPosition,
  voicingFor,
  voicingNotes,
} from '../lib/guitarChords';
import { CHORD_FAMILY_LABELS, QUALITY_LABELS } from '../lib/chordHarmony';
import type { ChordFamily } from '../lib/chordHarmony';
import { name } from '../lib/theory';
import type { ChordVoicing, GuitarKey, RootString } from '../lib/guitarChords';
import './guitarChords.css';

type Phase = 'overview' | 'recall' | 'summary';
type Task = 'reference' | 'recall';
function readTask(family: ChordFamily): Task {
  try {
    const value = localStorage.getItem(`notera.guitar-task.${family}.v1`);
    return value === 'recall' ? value : 'reference';
  } catch {
    return 'reference';
  }
}
export function GuitarChordPractice({
  family = 'triad',
  familySwitch,
  onConnect,
}: {
  family?: ChordFamily;
  familySwitch?: ReactNode;
  onConnect?: () => void;
}) {
  const [progress, setProgress] = useState(() => readGuitarProgress(family));
  const seventh = family === 'seventh';
  const familyLabel = CHORD_FAMILY_LABELS[family];
  const [storageError, setStorageError] = useState(false);
  const key = progress.key;
  const [task, setTask] = useState<Task>(() => readTask(family));
  const [phase, setPhase] = useState<Phase>(() => (task === 'recall' ? 'recall' : 'overview'));
  const [queue, setQueue] = useState<number[][]>(() => (task === 'recall' ? recallQueue() : []));
  const [index, setIndex] = useState(0);
  const [hints, setHints] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(1);
  const [completed, setCompleted] = useState(0);
  const [audioError, setAudioError] = useState('');
  const play = useAudio(setAudioError);
  const heading = useRef<HTMLHeadingElement>(null);
  const nextLock = useRef(false);
  const chords = useMemo(() => chordsInKey(key, family), [key, family]);
  const recommended = useMemo(() => recommendedVoicings(chords), [chords]);
  const plan = chords.map((chord, i) => {
    const root = progress.overrides[key]?.[chord.degree];
    return root ? voicingFor(chord, root) : recommended[i];
  });
  const active = phase !== 'overview' && phase !== 'summary' && queue.length > 0;
  const degrees = queue[index] ?? [];
  const visible = phase === 'overview' ? [selected] : degrees;
  const positions = plan.map((v) => v.rootFret);
  const region = `${Math.min(...positions)}–${Math.max(...positions)} 品`;
  function listen(voicing: ChordVoicing) {
    setAudioError('');
    void play(voicingNotes(voicing));
  }

  useEffect(() => {
    try {
      localStorage.setItem(`notera.guitar-task.${family}.v1`, task);
    } catch {
      /* Navigation remains available. */
    }
  }, [task, family]);
  useEffect(() => {
    try {
      localStorage.setItem(guitarProgressKey(family), JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress, family]);
  useEffect(() => {
    nextLock.current = false;
  }, [phase, index]);

  function nextStage(next: Phase, nextQueue: number[][] = []) {
    setPhase(next);
    setQueue(nextQueue);
    setIndex(0);
    setHints(0);
    setRevealed(false);
    heading.current?.focus();
  }
  function start() {
    setTask('recall');
    setCompleted(0);
    nextStage('recall', recallQueue());
  }
  function chooseTask(value: Task) {
    setTask(value);
    setCompleted(0);
    if (value === 'recall') nextStage('recall', recallQueue());
    else {
      setSelected(1);
      nextStage('overview');
    }
  }
  function next() {
    if (phase !== 'recall' || !revealed || nextLock.current) return;
    nextLock.current = true;
    setCompleted((count) => count + 1);
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      setHints(0);
      setRevealed(false);
      heading.current?.focus();
      return;
    }
    nextStage('summary');
  }
  function resetToOverview() {
    setTask('reference');
    setCompleted(0);
    setSelected(1);
    nextStage('overview');
  }
  function changeKey(value: GuitarKey) {
    setProgress((current) => ({ ...current, key: value }));
    setSelected(1);
    setCompleted(0);
  }
  function changeVoicing(root: RootString) {
    setProgress((current) => ({
      ...current,
      overrides: { ...current.overrides, [key]: { ...current.overrides[key], [selected]: root } },
    }));
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        (event.target instanceof Element &&
          event.target.closest('button,select,input,textarea,[contenteditable]'))
      )
        return;
      if (!active) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setRevealed(true);
      }
      if (revealed && event.key === 'Enter') {
        event.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <section
      className={`guitar-practice${seventh ? ' guitar-sevenths' : ''}`}
      aria-label="实琴和弦练习"
    >
      <div className="guitar-scope">
        {familySwitch}
        <label>
          本组调性
          <select
            aria-label="本组调性"
            value={key}
            disabled={active}
            onChange={(e) => {
              changeKey(e.target.value as GuitarKey);
              if (task === 'recall') nextStage('recall', recallQueue());
            }}
          >
            {GUITAR_KEYS.map(([value]) => (
              <option key={value} value={value}>
                {value} 大调
              </option>
            ))}
          </select>
        </label>
        <span>标准调弦 E A D G B E · 根音在第五 / 六弦</span>
        {active && (
          <button className="guitar-text-button" onClick={() => nextStage('summary')}>
            结束本组
          </button>
        )}
      </div>
      <div className="segmented single-chord-tasks" role="group" aria-label="实琴练习内容">
        {(
          [
            ['reference', '指法参考'],
            ['recall', '级数弹奏'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={task === value ? 'active' : ''}
            aria-pressed={task === value}
            onClick={() => chooseTask(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="guitar-layout">
        <div className="guitar-board">
          <div className="guitar-board-header">
            <span>{key} 大调</span>
            <span>
              {active
                ? `级数 ${index + 1} / ${queue.length}`
                : phase === 'summary'
                  ? '练习结束'
                  : `七个顺阶${familyLabel}`}
            </span>
          </div>
          <h2 ref={heading} tabIndex={-1} className="guitar-stage-heading">
            {phase === 'overview'
              ? '先找到这一调的手感。'
              : phase === 'summary'
                ? '本组练习完成'
                : '看到级数，找到和弦。'}
          </h2>

          {phase === 'overview' ? (
            <>
              <p className="guitar-description">
                查看这一调的七个顺阶{familyLabel}。推荐根音位置集中在 {region}，也可以替换按法。
              </p>
              <div className="guitar-overview-start">
                <span>直接开始级数弹奏，或查看这一调的指法。</span>
                <button className="guitar-primary" onClick={start}>
                  开始随机级数 →
                </button>
              </div>
              <div className="guitar-chord-strip" role="group" aria-label="本调七个和弦">
                {chords.map((chord, i) => (
                  <button
                    key={chord.degree}
                    aria-pressed={selected === chord.degree}
                    aria-label={`查看 ${chord.roman} ${chord.symbol} 指法`}
                    onClick={() => setSelected(chord.degree)}
                  >
                    <span>{chord.roman}</span>
                    <strong>{chord.symbol}</strong>
                    <small>
                      {plan[i].rootString} 弦 · {plan[i].rootFret} 品
                    </small>
                  </button>
                ))}
              </div>
              <div className="guitar-voicing-detail">
                <ChordVoicingOptions
                  chord={chords[selected - 1]}
                  chosen={plan[selected - 1]}
                  onPlay={listen}
                />
                <div className="guitar-chord-info">
                  <span>
                    {chords[selected - 1].roman} · 第 {selected} 级
                  </span>
                  <h3>{chords[selected - 1].symbol}</h3>
                  <p>
                    {QUALITY_LABELS[chords[selected - 1].quality]} ·{' '}
                    {chords[selected - 1].tones.map((n) => name(n, false)).join(' / ')}
                  </p>
                  <p className="guitar-root-position">{rootPosition(plan[selected - 1])}</p>
                  <label>
                    本组使用的按法
                    <select
                      aria-label="本组使用的按法"
                      value={plan[selected - 1].rootString}
                      onChange={(e) => changeVoicing(Number(e.target.value) as RootString)}
                    >
                      {([5, 6] as const).map((root) => (
                        <option key={root} value={root}>
                          {rootPosition(voicingFor(chords[selected - 1], root))}
                          {recommended[selected - 1].rootString === root ? ' · 推荐' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {chords[selected - 1].quality === 'm7b5' && (
                    <p className="guitar-description">
                      第 viiø7 级是半减七和弦：减三和弦加上小七度音。× 标记的弦要避开或消音。
                    </p>
                  )}
                  {chords[selected - 1].quality === 'dim' && (
                    <p className="guitar-description">
                      第 vii° 级用独立的减三和弦指法；× 标记的弦要避开或消音。
                    </p>
                  )}
                </div>
              </div>
              {audioError && <p role="status">{audioError}</p>}
              <div className="guitar-bottom">
                <span>参考不计分，随时可以查看。</span>
                {onConnect && (
                  <button className="guitar-text-button" onClick={onConnect}>
                    去练和弦连接 →
                  </button>
                )}
              </div>
            </>
          ) : phase === 'summary' ? (
            <>
              <p className="guitar-description">本组完成 {completed} 题。</p>
              <div className="guitar-bottom guitar-summary-actions">
                <button className="guitar-text-button" onClick={resetToOverview}>
                  返回总览 / 换调
                </button>
                <button className="guitar-primary" onClick={start}>
                  同调再练一组 →
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="guitar-progress"
                role="progressbar"
                aria-label="当前阶段进度"
                aria-valuemin={0}
                aria-valuemax={queue.length}
                aria-valuenow={index}
              >
                <span style={{ width: `${(index / queue.length) * 100}%` }} />
              </div>
              <p className="guitar-description">
                先在吉他上按出来，再扫弦核对；想不起来时逐步看提示。
              </p>
              <div className="guitar-prompt" aria-live="polite">
                {degrees.map((degree, i) => (
                  <div key={`${i}-${degree}`}>
                    <span>{`第 ${degree} 级`}</span>
                    <strong>{chords[degree - 1].roman}</strong>
                  </div>
                ))}
              </div>
              {!revealed ? (
                <div className="guitar-concealed">
                  {hints > 0 && (
                    <div className="guitar-hints" role="status">
                      {degrees.map((degree, i) => (
                        <p key={i}>
                          <b>{chords[degree - 1].roman}</b>　
                          {QUALITY_LABELS[chords[degree - 1].quality]}
                          {hints >= 2 && <> · {chords[degree - 1].symbol}</>}
                          {hints >= 3 && <> · {rootPosition(plan[degree - 1])}</>}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="guitar-bottom">
                    <button
                      className="guitar-secondary"
                      disabled={hints >= 3}
                      onClick={() => setHints((level) => Math.min(3, level + 1))}
                    >
                      {hints === 0 ? '一点提示' : hints < 3 ? '再提示一步' : '提示已展开'}
                    </button>
                    <button className="guitar-primary" onClick={() => setRevealed(true)}>
                      按好了，核对指法
                    </button>
                  </div>
                  <p className="guitar-keyboard-hint">空格揭晓 · Enter 下一题</p>
                </div>
              ) : (
                <>
                  <div
                    className={`guitar-answer ${degrees.length > 1 ? 'guitar-answer-multiple' : ''}`}
                  >
                    {visible.map((degree, i) => (
                      <div className="guitar-answer-chord" key={i}>
                        <h3>{chords[degree - 1].symbol}</h3>
                        <ChordVoicingOptions
                          chord={chords[degree - 1]}
                          chosen={plan[degree - 1]}
                          onPlay={listen}
                        />
                      </div>
                    ))}
                  </div>
                  {audioError && <p role="status">{audioError}</p>}
                  <p className="guitar-self-check">对照指法，逐弦检查声音。</p>
                  <div className="guitar-bottom">
                    <button className="guitar-primary" onClick={next}>
                      {index + 1 === queue.length ? '完成本组' : '下一题'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <aside className="guitar-aside">
          <h3>这一组怎么练</h3>
          <p>查看和弦指法，或直接开始随机级数弹奏。</p>
          <div className="guitar-formula">
            <span>大调{familyLabel}性质</span>
            {seventh ? (
              <dl className="guitar-quality-list">
                {Array.from(new Set(chords.map((chord) => chord.quality))).map((quality) => (
                  <div key={quality}>
                    <dt>{QUALITY_LABELS[quality]}</dt>
                    <dd>
                      {chords
                        .filter((chord) => chord.quality === quality)
                        .map((chord) => chord.roman)
                        .join(' · ')}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <>
                <p>大 · 小 · 小 · 大 · 大 · 小 · 减</p>
                <small>I　ii　iii　IV　V　vi　vii°</small>
              </>
            )}
          </div>
          {storageError && <p role="status">浏览器暂时无法保存设置，当前仍可继续练习。</p>}
          <details className="guitar-plan-explainer">
            <summary>推荐指法怎么选？</summary>
            <p>
              综合考虑较低的品位、七个根音的分布，以及常见和弦连接时的移动距离。可在总览替换某个按法；本组开始后保持固定。
            </p>
          </details>
        </aside>
      </div>
    </section>
  );
}
