import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAudio } from '../hooks/useAudio';
import { RATING_LABELS, voicingNotes } from '../lib/guitarChords';
import type { Rating } from '../lib/guitarChords';
import {
  changedStrings,
  readSusGuitarProgress,
  SUS_GUITAR_GROUPS,
  SUS_GUITAR_PROGRESS_KEY,
  SUS_GUITAR_ROOTS,
  susGuitarQueue,
  susTaskName,
} from '../lib/guitarSusChords';
import type { SusGuitarProgress, SusGuitarRoot } from '../lib/guitarSusChords';
import { name } from '../lib/theory';
import { ChordDiagram } from './ChordDiagram';
import { GuitarSusConnection } from './GuitarSusConnection';
import './guitarChords.css';

const ratings = ['easy', 'slow', 'missed'] as const;
type Round = {
  queue: ReturnType<typeof susGuitarQueue>;
  ratings: Rating[];
  revealed: boolean;
};

export function GuitarSusPractice({ familySwitch }: { familySwitch: ReactNode }) {
  const [{ progress, round }, setPractice] = useState<{
    progress: SusGuitarProgress;
    round: Round | null;
  }>(() => ({ progress: readSusGuitarProgress(), round: null }));
  const [showConnection, setShowConnection] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [audioError, setAudioError] = useState('');
  const play = useAudio(setAudioError);
  const heading = useRef<HTMLHeadingElement>(null);
  const { root, attempts } = progress;
  const { comparison, comparisonHint } = SUS_GUITAR_GROUPS[root];
  const [, major, sus4] = comparison;
  const index = round?.ratings.length ?? 0;
  const task = round?.queue[index];
  const movingStrings = changedStrings(task ?? comparison);
  const phase = !round ? 'compare' : task ? 'switch' : 'summary';
  const shapes = !round ? comparison : task && round.revealed ? task : [];
  const rootAttempts = attempts.filter((attempt) => attempt.root === root);
  const toPractice = round?.ratings.flatMap((rating, i) =>
    rating === 'easy' ? [] : [susTaskName(round.queue[i])],
  );

  useEffect(() => {
    try {
      localStorage.setItem(SUS_GUITAR_PROGRESS_KEY, JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress]);

  function start() {
    const queue = susGuitarQueue(root);
    setPractice((current) => ({ ...current, round: { queue, ratings: [], revealed: false } }));
    heading.current?.focus();
  }
  function reveal() {
    setPractice((current) => {
      if (!current.round || current.round !== round || current.round.revealed) return current;
      return { ...current, round: { ...current.round, revealed: true } };
    });
  }
  function grade(rating: Rating) {
    if (!task || !round?.revealed) return;
    const attempt = { root, rating };
    setPractice((current) => {
      if (current.round !== round) return current;
      return {
        progress: {
          ...current.progress,
          attempts: [...current.progress.attempts, attempt].slice(-500),
        },
        round: { ...round, ratings: [...round.ratings, rating], revealed: false },
      };
    });
    heading.current?.focus();
  }

  useEffect(() => {
    if (!task || showConnection) return;
    function onKey(event: KeyboardEvent) {
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
      if (event.code === 'Space') {
        event.preventDefault();
        reveal();
      }
      if (round?.revealed && /^[1-3]$/.test(event.key)) {
        event.preventDefault();
        grade(ratings[Number(event.key) - 1]);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <section className="guitar-practice guitar-sus" aria-label="实琴挂留和弦练习">
      <div className="guitar-scope">
        {familySwitch}
        <label>
          开放指法组
          <select
            value={root}
            disabled={!showConnection && round !== null}
            onChange={(event) => {
              const nextRoot = event.target.value as SusGuitarRoot;
              setPractice((current) => ({
                round: null,
                progress: { ...current.progress, root: nextRoot },
              }));
            }}
          >
            {SUS_GUITAR_ROOTS.map((value) => (
              <option key={value} value={value}>
                {value} 组
              </option>
            ))}
          </select>
        </label>
        <span>标准调弦 E A D G B E</span>
      </div>
      <div className="segmented guitar-sus-views" role="group" aria-label="挂留练习类型">
        <button
          className={!showConnection ? 'active' : ''}
          aria-pressed={!showConnection}
          onClick={() => setShowConnection(false)}
        >
          指法与切换
        </button>
        <button
          className={showConnection ? 'active' : ''}
          aria-pressed={showConnection}
          onClick={() => setShowConnection(true)}
        >
          和弦连接
        </button>
      </div>
      {showConnection ? (
        <GuitarSusConnection key={root} root={root} />
      ) : (
        <>
          <ol className="guitar-steps" aria-label="本组练习步骤">
            {(
              [
                ['compare', '跟弹对照'],
                ['switch', '随机切换'],
                ['summary', '本组自评'],
              ] as const
            ).map(([step, label], i) => (
              <li
                key={step}
                className={phase === step ? 'current' : undefined}
                aria-current={phase === step ? 'step' : undefined}
              >
                <span>{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div className="guitar-layout">
            <div className="guitar-board">
              <div className="guitar-board-header">
                <span>
                  {root} 型 · 第 {major.voicing.rootString} 弦根音
                </span>
                <span>
                  {round && task
                    ? `第 ${index + 1} / ${round.queue.length} 题`
                    : round
                      ? '本组记录'
                      : '三个和弦'}
                </span>
              </div>
              <h2 ref={heading} tabIndex={-1} className="guitar-stage-heading">
                {phase === 'compare'
                  ? `对照 ${root} 型的三种按法`
                  : phase === 'switch'
                    ? '按顺序换一次和弦'
                    : '本组练习完成'}
              </h2>
              {!round && (
                <>
                  <p className="guitar-description">
                    从 {root} 出发，分别换到 {comparison[0].symbol} 和 {sus4.symbol}，再弹回 {root}
                    。{comparisonHint}
                  </p>
                  <div className="guitar-overview-start">
                    <span>4 次随机切换，熟悉同根音的三种按法。</span>
                    <button className="guitar-primary" onClick={start}>
                      开始随机切换 →
                    </button>
                  </div>
                </>
              )}
              {task && (
                <>
                  <p className="guitar-description">
                    先在吉他上弹出两个和弦，留意哪些弦上的按法发生变化。
                  </p>
                  <p className="guitar-sus-sequence" aria-live="polite">
                    {susTaskName(task)}
                  </p>
                </>
              )}
              {shapes.length > 0 && (
                <>
                  <div className="guitar-sus-voicings">
                    {shapes.map((shape) => (
                      <div className="guitar-sus-shape" key={shape.symbol}>
                        <h3>{shape.symbol}</h3>
                        <p>{shape.tones.map((note) => name(note, false)).join(' · ')}</p>
                        <ChordDiagram
                          chord={shape}
                          voicing={shape.voicing}
                          movingStrings={
                            comparison.some((item) => item === shape) ? movingStrings : undefined
                          }
                          compact
                        />
                        <button
                          className="guitar-text-button guitar-listen"
                          aria-label={`试听 ${shape.symbol}`}
                          onClick={() => {
                            setAudioError('');
                            void play(voicingNotes(shape.voicing), 'strum');
                          }}
                        >
                          试听
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="guitar-sus-legend">
                    下排音级 6 → 1 弦 · R 为根音（1）
                    <br />
                    绿线为变化弦 · 圆内标指法 · × 不弹 · ○ 空弦
                  </p>
                  {audioError && <p role="status">{audioError}</p>}
                </>
              )}
              {task &&
                (round?.revealed ? (
                  <>
                    <p className="guitar-self-check">核对指法后，评价刚才的表现。</p>
                    <div className="guitar-rating" role="group" aria-label="本题自评">
                      {ratings.map((rating, i) => (
                        <button key={rating} onClick={() => grade(rating)}>
                          <span>{i + 1}</span>
                          {RATING_LABELS[rating]}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="guitar-bottom">
                    <span>空格揭晓 · 揭晓后按 1 / 2 / 3 自评</span>
                    <button className="guitar-primary" onClick={reveal}>
                      弹好了，核对指法
                    </button>
                  </div>
                ))}
              {round && !task && (
                <>
                  <div className="guitar-summary-stats">
                    {ratings.map((rating) => (
                      <div key={rating}>
                        <span>{RATING_LABELS[rating]}</span>
                        <b>{round.ratings.filter((value) => value === rating).length}</b>
                      </div>
                    ))}
                  </div>
                  <div className="guitar-summary-review">
                    <h3>待巩固的转换</h3>
                    {toPractice?.length ? (
                      <ul>
                        {toPractice.map((value) => (
                          <li key={value}>{value}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>本组每题都弹得顺利。</p>
                    )}
                  </div>
                  <div className="guitar-bottom guitar-summary-actions">
                    <button
                      className="guitar-text-button"
                      onClick={() => {
                        setPractice((current) => ({ ...current, round: null }));
                        heading.current?.focus();
                      }}
                    >
                      返回对照 / 换组
                    </button>
                    <button className="guitar-secondary" onClick={start}>
                      同组再练一次 →
                    </button>
                    <button className="guitar-primary" onClick={() => setShowConnection(true)}>
                      进入和弦连接 →
                    </button>
                  </div>
                </>
              )}
            </div>
            <aside className="guitar-aside">
              <h3>保留根音和五音</h3>
              <p>对照按法，找出实际发出二音、三音或四音的弦。</p>
              <div className="guitar-formula">
                <span>以 {root} 为根音</span>
                <dl className="guitar-quality-list">
                  {comparison.map((shape) => (
                    <div key={shape.symbol}>
                      <dt>{shape.symbol}</dt>
                      <dd>{shape.formula}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <h3>{root} 组的积累</h3>
              <dl className="guitar-key-stats">
                <div>
                  <dt>已练自评</dt>
                  <dd>{rootAttempts.length} 次</dd>
                </div>
                <div>
                  <dt>顺利</dt>
                  <dd>{rootAttempts.filter((attempt) => attempt.rating === 'easy').length} 次</dd>
                </div>
              </dl>
              <p className="guitar-save-note" role="status">
                {storageError
                  ? '浏览器暂时无法保存，当前仍可继续练习。'
                  : '自评记录自动保存在本机。'}
              </p>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
