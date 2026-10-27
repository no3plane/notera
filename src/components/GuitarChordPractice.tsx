import { useEffect, useMemo, useRef, useState } from 'react';
import { ChordVoicingOptions } from './ChordVoicingOptions';
import { useAudio } from '../hooks/useAudio';
import {
  CHORD_DEGREES,
  GUITAR_KEYS,
  GUITAR_PROGRESS_KEY,
  PROGRESSIONS,
  QUALITY_LABELS,
  chordsInKey,
  pendingDegrees,
  readGuitarProgress,
  recallQueue,
  recommendedVoicings,
  rootPosition,
  voicingFor,
  voicingNotes,
} from '../lib/guitarChords';
import { name } from '../lib/theory';
import type {
  ChordAttempt,
  ChordVoicing,
  GuitarKey,
  Rating,
  RootString,
} from '../lib/guitarChords';
import './guitarChords.css';

type Phase = 'overview' | 'recall' | 'connect' | 'review' | 'summary';
const PHASES = [
  ['overview', '熟悉这一调'],
  ['recall', '随机级数'],
  ['connect', '和弦连接'],
  ['review', '卡点复练'],
] as const;
const RATING_LABELS = { easy: '顺利', slow: '想了一会', missed: '没按出来' };

export function GuitarChordPractice() {
  const [progress, setProgress] = useState(readGuitarProgress);
  const [storageError, setStorageError] = useState(false);
  const key = progress.key;
  const [phase, setPhase] = useState<Phase>('overview');
  const [queue, setQueue] = useState<number[][]>([]);
  const [index, setIndex] = useState(0);
  const [hints, setHints] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(1);
  const [round, setRound] = useState<ChordAttempt[]>([]);
  const [audioError, setAudioError] = useState('');
  const play = useAudio(setAudioError);
  const heading = useRef<HTMLHeadingElement>(null);
  const gradeLock = useRef(false);
  const chords = useMemo(() => chordsInKey(key), [key]);
  const recommended = useMemo(() => recommendedVoicings(chords), [chords]);
  const plan = chords.map((chord, i) => {
    const root = progress.overrides[key]?.[chord.degree];
    return root ? voicingFor(chord, root) : recommended[i];
  });
  const active = phase !== 'overview' && phase !== 'summary';
  const degrees = queue[index] ?? [];
  const waiting = pendingDegrees(progress.attempts, key);
  const keyAttempts = progress.attempts.filter((attempt) => attempt.key === key);
  const independent = keyAttempts.filter((a) => a.rating === 'easy' && a.hints === 0).length;
  const visible = phase === 'overview' ? [selected] : degrees;
  const positions = plan.map((v) => v.rootFret);
  const region = `${Math.min(...positions)}–${Math.max(...positions)} 品`;
  function listen(voicing: ChordVoicing) {
    setAudioError('');
    void play(voicingNotes(voicing));
  }

  useEffect(() => {
    try {
      localStorage.setItem(GUITAR_PROGRESS_KEY, JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress]);
  useEffect(() => {
    gradeLock.current = false;
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
    setRound([]);
    nextStage('recall', recallQueue());
  }
  function grade(rating: Rating) {
    if (phase === 'overview' || phase === 'summary' || !revealed || gradeLock.current) return;
    gradeLock.current = true;
    const attempt: ChordAttempt = { key, degrees, rating, hints, phase, at: Date.now() };
    const attempts = [...progress.attempts, attempt].slice(-500);
    const results = [...round, attempt];
    setProgress((current) => ({ ...current, attempts }));
    setRound(results);
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      setHints(0);
      setRevealed(false);
      heading.current?.focus();
      return;
    }
    if (phase === 'recall') nextStage('connect', PROGRESSIONS);
    else if (phase === 'connect') {
      const review = pendingDegrees(attempts, key).map((degree) => [degree]);
      nextStage(review.length ? 'review' : 'summary', review);
    } else nextStage('summary');
  }
  function resetToOverview() {
    setRound([]);
    setSelected(1);
    nextStage('overview');
  }
  function changeKey(value: GuitarKey) {
    setProgress((current) => ({ ...current, key: value }));
    setSelected(1);
    setRound([]);
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
      if (revealed && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        grade((['easy', 'slow', 'missed'] as const)[Number(event.key) - 1]);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <section className="guitar-practice" aria-label="实琴和弦练习">
      <div className="guitar-scope">
        <label>
          本组调性
          <select
            aria-label="本组调性"
            value={key}
            disabled={phase !== 'overview'}
            onChange={(e) => changeKey(e.target.value as GuitarKey)}
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
      <ol className="guitar-steps" aria-label="本组练习步骤">
        {PHASES.map(([value, label], i) => (
          <li
            key={value}
            aria-current={phase === value ? 'step' : undefined}
            className={phase === value ? 'current' : ''}
          >
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="guitar-layout">
        <div className="guitar-board">
          <div className="guitar-board-header">
            <span>{key} 大调</span>
            <span>
              {active
                ? `${phase === 'recall' ? '级数' : phase === 'connect' ? '连接' : '复练'} ${index + 1} / ${queue.length}`
                : phase === 'summary'
                  ? '本组记录'
                  : '七个顺阶三和弦'}
            </span>
          </div>
          <h2 ref={heading} tabIndex={-1} className="guitar-stage-heading">
            {phase === 'overview'
              ? '先找到这一调的手感。'
              : phase === 'summary'
                ? '把这一组，留在手上。'
                : phase === 'connect'
                  ? '把这些级数连起来弹。'
                  : phase === 'review'
                    ? '再给这个级数一次机会。'
                    : '看到级数，找到和弦。'}
          </h2>

          {phase === 'overview' ? (
            <>
              <p className="guitar-description">
                按 I → vii° 顺着弹一遍。本组推荐根音位置集中在 {region}
                ，同时展示第五、六弦根音的按法供你对照。
              </p>
              <div className="guitar-overview-start">
                <span>熟悉后开始，共 7 道级数题。</span>
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
                    {CHORD_DEGREES[selected - 1]} · 第 {selected} 级
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
                  {chords[selected - 1].quality === 'dim' && (
                    <p className="guitar-description">
                      第 vii° 级用独立的减三和弦指法；× 标记的弦要避开或消音。
                    </p>
                  )}
                </div>
              </div>
              {audioError && <p role="status">{audioError}</p>}
              <div className="guitar-bottom">
                <span>顺着弹过一遍，就可以开始。</span>
                <button className="guitar-text-button" onClick={start}>
                  准备好了，开始 →
                </button>
              </div>
            </>
          ) : phase === 'summary' ? (
            <>
              <p className="guitar-description">
                本组共完成 {round.length} 次自评。
                {round.length
                  ? '每一次卡住，都给下次练习留下了方向。'
                  : '可以返回总览，准备好后再开始。'}
              </p>
              <div className="guitar-summary-stats">
                {(['easy', 'slow', 'missed'] as const).map((rating) => (
                  <div key={rating}>
                    <span>{RATING_LABELS[rating]}</span>
                    <b>{round.filter((a) => a.rating === rating).length}</b>
                  </div>
                ))}
              </div>
              <div className="guitar-summary-review">
                <h3>下次继续巩固</h3>
                <p>
                  {waiting.length
                    ? waiting
                        .map((d) => `${CHORD_DEGREES[d - 1]} · ${chords[d - 1].symbol}`)
                        .join('　 /　 ')
                    : round.length
                      ? '当前调没有待巩固的级数。可以同调再练，或换一个调。'
                      : '完成自评后，这里会留下需要复练的级数。'}
                </p>
              </div>
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
                {phase === 'connect'
                  ? '按顺序转换，每个和弦扫一次，先求干净、连贯。'
                  : '先在吉他上按出来，再扫弦核对；想不起来时逐步看提示。'}
              </p>
              <div className="guitar-prompt" aria-live="polite">
                {degrees.map((degree, i) => (
                  <div key={`${i}-${degree}`}>
                    <span>{phase === 'connect' ? `${i + 1}` : `第 ${degree} 级`}</span>
                    <strong>{CHORD_DEGREES[degree - 1]}</strong>
                  </div>
                ))}
              </div>
              {!revealed ? (
                <div className="guitar-concealed">
                  {hints > 0 && (
                    <div className="guitar-hints" role="status">
                      {degrees.map((degree, i) => (
                        <p key={i}>
                          <b>{CHORD_DEGREES[degree - 1]}</b>　
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
                  <p className="guitar-keyboard-hint">空格揭晓 · 揭晓后按 1 / 2 / 3 自评</p>
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
                  <p className="guitar-self-check">
                    这些按法都可以。逐弦检查声音，再评价刚才的表现；选择后进入下一题。
                  </p>
                  <div className="guitar-rating" role="group" aria-label="本题自评">
                    {(['easy', 'slow', 'missed'] as const).map((rating, i) => (
                      <button key={rating} onClick={() => grade(rating)}>
                        <span>{i + 1}</span>
                        {RATING_LABELS[rating]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <aside className="guitar-aside">
          <h3>这一组怎么练</h3>
          <p>调性固定，指法固定。先认级数，再找根音，最后让手落到位。</p>
          <div className="guitar-formula">
            <span>大调和弦性质</span>
            <p>大 · 小 · 小 · 大 · 大 · 小 · 减</p>
            <small>I　ii　iii　IV　V　vi　vii°</small>
          </div>
          <h3>{key} 大调的积累</h3>
          <dl className="guitar-key-stats">
            <div>
              <dt>已练自评</dt>
              <dd>{keyAttempts.length} 次</dd>
            </div>
            <div>
              <dt>无提示且顺利</dt>
              <dd>{independent} 次</dd>
            </div>
            <div>
              <dt>待巩固级数</dt>
              <dd>{waiting.length} 个</dd>
            </div>
          </dl>
          <p className="guitar-save-note" role="status">
            {storageError
              ? '浏览器暂时无法保存，当前仍可继续练习。'
              : '记录与指法偏好自动保存在本机。'}
          </p>
          <details className="guitar-plan-explainer">
            <summary>推荐指法怎么选？</summary>
            <p>
              综合考虑较低的品位、七个根音的分布，以及常见和弦连接时的移动距离。可在总览替换某个按法；本组开始后保持固定。
            </p>
          </details>
          <p className="guitar-self-note">拿着吉他自行核对，无需麦克风。这里的记录来自你的自评。</p>
        </aside>
      </div>
    </section>
  );
}
