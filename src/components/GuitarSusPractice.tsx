import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAudio } from '../hooks/useAudio';
import { useChordRecall } from '../hooks/useChordRecall';
import { voicingNotes } from '../lib/guitarChords';
import { connectionStorageKey, readConnectionProgress } from '../lib/connectionPractice';
import {
  changedStrings,
  readSusGuitarProgress,
  SUS_GUITAR_GROUPS,
  SUS_GUITAR_PROGRESS_KEY,
  SUS_GUITAR_ROOTS,
  susGuitarTasks,
  susTaskName,
} from '../lib/guitarSusChords';
import type { SusGuitarRoot } from '../lib/guitarSusChords';
import { name } from '../lib/theory';
import { ChordDiagram } from './ChordDiagram';
import './guitarChords.css';

export function GuitarSusPractice({
  familySwitch,
  initialTask,
  onTaskChange,
}: {
  familySwitch?: ReactNode;
  initialTask?: 'reference' | 'recall';
  onTaskChange?: (task: 'reference' | 'recall') => void;
}) {
  const [progress, setProgress] = useState(readSusGuitarProgress);
  const [task, setTask] = useState(initialTask ?? 'reference');
  const [referenceOpen, setReferenceOpen] = useState(false);
  const recall = useChordRecall(4);
  const [storageError, setStorageError] = useState(false);
  const [audioError, setAudioError] = useState('');
  const play = useAudio(setAudioError);
  const heading = useRef<HTMLHeadingElement>(null);
  const { root } = progress;
  const { comparison, comparisonHint } = SUS_GUITAR_GROUPS[root];
  const [, major, sus4] = comparison;
  const overview = task === 'reference' || referenceOpen;
  const sequence = susGuitarTasks(root)[recall.item];
  const movingStrings = changedStrings(overview ? comparison : sequence);
  const shapes = overview ? comparison : recall.revealed ? sequence : [];

  useEffect(() => {
    try {
      localStorage.setItem(SUS_GUITAR_PROGRESS_KEY, JSON.stringify(progress));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [progress]);

  function start() {
    if (!overview) return;
    if (referenceOpen) {
      setReferenceOpen(false);
    } else if (onTaskChange) {
      onTaskChange('recall');
    } else {
      setTask('recall');
      recall.reset();
    }
    heading.current?.focus();
  }
  function next() {
    if (overview || !recall.revealed) return;
    recall.next();
    setAudioError('');
    heading.current?.focus();
  }

  useEffect(() => {
    if (overview) return;
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
        recall.reveal();
      }
      if (recall.revealed && event.key === 'Enter') {
        event.preventDefault();
        next();
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
            onChange={(event) => {
              const nextRoot = event.target.value as SusGuitarRoot;
              setProgress((current) => ({ ...current, root: nextRoot }));
              recall.reset();
              setReferenceOpen(false);
              setAudioError('');
              try {
                const connection = readConnectionProgress('sus');
                connection.settings.key = nextRoot;
                localStorage.setItem(connectionStorageKey('sus'), JSON.stringify(connection));
              } catch {
                setStorageError(true);
              }
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
      {!onTaskChange && (
        <div className="segmented single-chord-tasks" role="group" aria-label="实琴练习内容">
          <button
            className={task === 'reference' ? 'active' : ''}
            aria-pressed={task === 'reference'}
            onClick={() => {
              setTask('reference');
              setReferenceOpen(false);
              recall.reset();
            }}
          >
            指法参考
          </button>
          <button
            className={task === 'recall' ? 'active' : ''}
            aria-pressed={task === 'recall'}
            onClick={start}
          >
            看题按弦
          </button>
        </div>
      )}
      <div className="guitar-layout">
        <div className="guitar-board">
          <div className="guitar-board-header">
            <span>
              {root} 型 · 第 {major.voicing.rootString} 弦根音
            </span>
            <span>{overview ? '三个和弦' : `本轮已练 ${recall.index} / 4 次切换`}</span>
          </div>
          <div className="guitar-stage-toolbar">
            <h2 ref={heading} tabIndex={-1} className="guitar-stage-heading">
              {overview ? `对照 ${root} 型的三种按法` : '按顺序换一次和弦'}
            </h2>
            {!overview && (
              <button
                className="guitar-text-button"
                onClick={() => {
                  setReferenceOpen(true);
                  setAudioError('');
                  heading.current?.focus();
                }}
              >
                查看本组指法
              </button>
            )}
          </div>
          {overview && (
            <>
              <p className="guitar-description">
                从 {root} 出发，分别换到 {comparison[0].symbol} 和 {sus4.symbol}，再弹回 {root}。
                {comparisonHint}
              </p>
              <div className="guitar-overview-start">
                <span>4 种切换各练一次后自动继续，随时可以换组。</span>
                <button className="guitar-primary" onClick={start}>
                  {referenceOpen ? '返回当前题' : '开始看题按弦 →'}
                </button>
              </div>
            </>
          )}
          {!overview && (
            <>
              <p className="guitar-description">
                先在吉他上弹出两个和弦，留意哪些弦上的按法发生变化。
              </p>
              <p className="guitar-sus-sequence" aria-live="polite">
                {susTaskName(sequence)}
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
          {!overview &&
            (recall.revealed ? (
              <>
                <p className="guitar-self-check">对照指法，检查变化弦的声音。</p>
                <div className="guitar-bottom">
                  <button className="guitar-primary" onClick={next}>
                    下一题
                  </button>
                </div>
              </>
            ) : (
              <div className="guitar-bottom">
                <span>空格揭晓 · Enter 下一题</span>
                <button className="guitar-primary" onClick={recall.reveal}>
                  弹好了，核对指法
                </button>
              </div>
            ))}
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
          {storageError && <p role="status">浏览器暂时无法保存设置，当前仍可继续练习。</p>}
        </aside>
      </div>
    </section>
  );
}
