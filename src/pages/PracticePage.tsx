import { useEffect } from 'react';
import { Heading } from '../components/Heading';
import { PracticeQuestion } from '../components/PracticeQuestion';
import { ExerciseQuestion } from '../components/ExerciseQuestion';
import { FretboardPractice } from '../components/FretboardPractice';
import {
  findExercise,
  KIND_LABELS,
  KINDS,
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  TOPICS,
} from '../lib/exercises';
import { kindStats } from '../lib/practice';
import { interval, name } from '../lib/theory';
import { NOTE_FORMATS } from '../lib/notation';
import type { PracticeController } from '../hooks/usePractice';
import type { Level, Note, NoteFormat } from '../lib/types';

interface PracticePageProps {
  controller: PracticeController;
  play: (notes: Note[]) => Promise<void>;
  format: NoteFormat;
  onFormat: (format: NoteFormat) => void;
}
export function PracticePage({ controller, play, format, onFormat }: PracticePageProps) {
  const { state, dispatch, start, reset, restore } = controller,
    s = state.session,
    progress = state.progress;
  const mode = state.mode ?? 'interval';
  const mistakeCount =
    (mode === 'interval' ? progress.mistakes.length : 0) +
    (progress.exerciseMistakes ?? []).filter((id) => {
      const exercise = findExercise(id);
      return exercise && exercise.kind === mode;
    }).length;
  const stats = kindStats(progress, mode);
  const topic = TOPICS.find((t) => t.modes.includes(mode))!;
  const current = s.queue[s.index];
  const showNotation = current
    ? !current.exercise || current.exercise.kind === 'build-note'
    : mode === 'interval' || mode === 'build-note';
  const hasDifficulty = !['chord-degree', 'chord-tones'].includes(mode);
  const goal = s.queue.length,
    empty = !goal,
    done = s.index >= goal;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        !(e.target instanceof Element) ||
        e.target.closest('select,input,textarea,[contenteditable="true"]') ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        mode === 'fretboard' ||
        empty ||
        done
      )
        return;
      if (/^[1-8]$/.test(e.key) && !s.revealed && !s.queue[s.index].exercise) {
        e.preventDefault();
        dispatch({ type: 'degree', value: Number(e.key) });
      }
      if (e.code === 'Space') {
        e.preventDefault();
        const q = s.queue[s.index];
        const notes = q.exercise
          ? s.revealed
            ? q.exercise.notes
            : q.exercise.listenBefore
          : [q.a, q.b];
        if (notes?.length) void play(notes);
      }
      if (e.key === 'Enter' && !e.target.closest('button')) {
        e.preventDefault();
        dispatch({ type: s.revealed ? 'next' : 'submit', now: performance.now() });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dispatch, play, s, done, empty, mode]);
  const correct = s.results.filter((r) => r.correct).length;
  const average = s.results.length
    ? s.results.reduce((total, r) => total + r.time, 0) / s.results.length / 1000
    : 0;
  return (
    <>
      <Heading
        eyebrow="PRACTICE ROOM"
        description="音程、指板、和弦，逐项练习。每轮 10 题，分别练准确判断与快速定位。"
        side="先练准确，再练熟练"
      >
        乐理练习
      </Heading>
      <div className="topic-tabs" role="group" aria-label="练习专题">
        {TOPICS.map((t, i) => (
          <button
            key={t.label}
            className={topic === t ? 'active' : ''}
            aria-pressed={topic === t}
            onClick={() => {
              if (topic !== t) start('basic', t.modes[0]);
            }}
          >
            <small>0{i + 1}</small>
            {t.label}
          </button>
        ))}
      </div>
      <div className="mode-toolbar">
        <div
          className={topic.modes.length > 1 ? 'segmented' : 'single-mode'}
          role="group"
          aria-label="练习题型"
        >
          {topic.modes.length === 1 ? (
            <span>{MODE_LABELS[mode]}</span>
          ) : (
            topic.modes.map((value) => (
              <button
                key={value}
                className={mode === value ? 'active' : ''}
                aria-pressed={mode === value}
                onClick={() => {
                  if (mode !== value) start('basic', value);
                }}
              >
                {MODE_LABELS[value]}
              </button>
            ))
          )}
        </div>
        <p>切换题型会开始新一轮，已答题目保留记录。</p>
      </div>
      <p className="mode-description">{MODE_DESCRIPTIONS[mode]}</p>
      {mode === 'fretboard' ? (
        <FretboardPractice controller={controller} />
      ) : (
        <div className="practice-layout">
          <section className="practice-board" aria-label={`${MODE_LABELS[mode]}练习`}>
            <div className="practice-bar">
              <span>
                {empty ? '易错复习' : done ? '本轮练习已完成' : `第 ${s.index + 1} / ${goal} 题`}
              </span>
              <select
                id="level"
                aria-label="练习难度"
                value={state.level}
                onChange={(e) => start(e.target.value as Level)}
              >
                <option value="basic">
                  {!hasDifficulty ? '常规练习 · 10 题' : '自然音 · 基础'}
                </option>
                {hasDifficulty && <option value="mixed">升降音 · 进阶</option>}
                <option value="review">易错复习 · {mistakeCount} 题</option>
              </select>
            </div>
            <div className="progress-line">
              <i
                style={{ width: `${goal ? ((s.index + Number(s.revealed)) / goal) * 100 : 0}%` }}
              />
            </div>
            {showNotation && (
              <>
                <div className="notation-toolbar">
                  <span>题目显示</span>
                  <div className="segmented" role="group" aria-label="题目显示形式">
                    {NOTE_FORMATS.map((f) => (
                      <button
                        key={f.value}
                        className={format === f.value ? 'active' : ''}
                        aria-pressed={format === f.value}
                        onClick={() => onFormat(f.value)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="notation-guide">
                  1=C · 固定 Do · C4 为中音，点在下方低八度，点在上方高八度。
                </p>
              </>
            )}
            {empty ? (
              <div className="session-end">
                <h2>还没有易错题</h2>
                <p>当前题型没有待巩固题。答错的题会自动保存在这里。</p>
                <button className="primary" onClick={() => start('basic')}>
                  开始基础练习
                </button>
              </div>
            ) : done ? (
              <div className="session-end">
                <p className="eyebrow" style={{ justifyContent: 'center' }}>
                  ONE STEP CLOSER
                </p>
                <h2>这一轮，完成了。</h2>
                <div className="score-big">
                  {correct}
                  <span> / {s.results.length}</span>
                </div>
                <p>
                  平均每题 {average.toFixed(1)} 秒 · {s.results.filter((r) => r.hint).length}{' '}
                  题使用提示
                  <br />
                  {correct === s.results.length
                    ? '全部回答正确！可以再练一轮，或切换题型继续巩固。'
                    : '答错的题已进入易错复习，再看一次推理就会更清楚。'}
                </p>
                <button className="primary" onClick={() => start()}>
                  再练一轮 →
                </button>
              </div>
            ) : current.exercise ? (
              <ExerciseQuestion session={s} dispatch={dispatch} play={play} format={format} />
            ) : (
              <PracticeQuestion session={s} dispatch={dispatch} play={play} format={format} />
            )}
          </section>
          <aside className="practice-side">
            <h2>
              {MODE_LABELS[mode]}{' '}
              <small style={{ fontSize: 9, color: '#a0aa91' }}>· 本机记录</small>
            </h2>
            <div className="stats">
              <div className="stat">
                <b>
                  {stats.total ? Math.round((stats.correct / stats.total) * 100) : 0}
                  <small style={{ fontSize: 12 }}>%</small>
                </b>
                <span>累计正确率</span>
              </div>
              <div className="stat">
                <b>
                  {stats.total ? (stats.time / stats.total / 1000).toFixed(1) : '—'}
                  <small style={{ fontSize: 12 }}> s</small>
                </b>
                <span>平均作答时间</span>
              </div>
              <div className="stat">
                <b>{stats.total}</b>
                <span>已完成题目</span>
              </div>
              <div className="stat">
                <b>{mistakeCount}</b>
                <span>待巩固易错题</span>
              </div>
            </div>
            <div className="kind-progress">
              <h3>分项进度</h3>
              {KINDS.map((kind) => {
                const part = kindStats(progress, kind);
                const recalls =
                  kind === 'fretboard'
                    ? Object.values(progress.fretboard ?? {}).flat().length +
                      Object.values(progress.sameNote ?? {}).flat().length +
                      (progress.stringIntervals?.length ?? 0)
                    : 0;
                return (
                  <div key={kind} className={kind === mode ? 'current' : ''}>
                    <span>{KIND_LABELS[kind]}</span>
                    <span>
                      {kind === 'fretboard'
                        ? recalls
                          ? `已练 ${recalls} 题`
                          : '尚未练习'
                        : part.total
                          ? `${Math.round((part.correct / part.total) * 100)}% · ${part.total} 题`
                          : '尚未练习'}
                    </span>
                  </div>
                );
              })}
            </div>
            {mode === 'interval' && (
              <div className="practice-tip">
                <p className="eyebrow">A LITTLE REMINDER</p>
                <h3>不要跳过“数音名”这一步。</h3>
                <p>C 到 F♯ 和 C 到 G♭ 都相距 6 个半音，但前者是四度，后者是五度。拼写决定度数。</p>
              </div>
            )}
            <div className="practice-tip">
              <h3>最近的练习</h3>
              {(progress.exerciseHistory ?? [])
                .filter((h) => {
                  const exercise = findExercise(h.id);
                  return exercise && exercise.kind === mode;
                })
                .slice(0, 5)
                .map((h, i) => (
                  <div key={`exercise-${i}`} className="history-row exercise-history">
                    <span>{findExercise(h.id)?.title}</span>
                    <span className={h.correct ? '' : 'wrong-text'}>
                      {h.correct ? '✓' : '待巩固'}
                    </span>
                  </div>
                ))}
              {mode === 'interval' && progress.history.length ? (
                progress.history.slice(0, 5).map((h, i) => (
                  <div key={i} className="history-row">
                    <span>
                      {name(h.a, false)} → {name(h.b, false)}
                    </span>
                    <span>{interval(h.a, h.b).title}</span>
                    <span className={h.correct ? '' : 'wrong-text'}>
                      {h.correct ? '✓' : '待巩固'}
                    </span>
                  </div>
                ))
              ) : !stats.total ? (
                <p className="empty-history">做完第一题，你的进步就从这里开始。</p>
              ) : null}
            </div>
            <div className="record-actions">
              <button className="plain-button" onClick={reset}>
                重置全部记录
              </button>
              {state.backup &&
                (state.backup.total > 0 ||
                  state.backup.stringIntervals?.length ||
                  state.backup.fretboardMemory ||
                  state.backup.fretboard) && (
                  <button className="plain-button" onClick={restore}>
                    恢复上次记录
                  </button>
                )}
            </div>
            <div className="shortcut">
              <kbd>1</kbd> — <kbd>8</kbd> 音程题选度数
              <br />
              <kbd>Space</kbd> 聆听 · <kbd>Enter</kbd> 提交 / 下一题
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
