import { useEffect, useRef, useState } from 'react';
import { Heading } from '../components/Heading';
import { PracticeQuestion } from '../components/PracticeQuestion';
import { ExerciseQuestion } from '../components/ExerciseQuestion';
import { FretboardPractice } from '../components/FretboardPractice';
import { PracticeModeToolbar } from '../components/PracticeModeToolbar';
import { GuitarChordPractice } from '../components/GuitarChordPractice';
import { GuitarSusPractice } from '../components/GuitarSusPractice';
import { DiatonicSusOverview } from '../components/DiatonicSusOverview';
import {
  chordFamilyForMode,
  findExercise,
  isForwardChordMode,
  isGuitarChordMode,
  KIND_LABELS,
  KINDS,
  MODE_DESCRIPTIONS,
  MODE_LABELS,
  modesForTopic,
  TOPICS,
} from '../lib/exercises';
import type { Mode } from '../lib/exercises';
import { kindStats } from '../lib/practice';
import { DIATONIC_SUS_MODE } from '../lib/diatonicSus';
import {
  CHORD_FAMILY_LABELS,
  PRACTICE_CHORD_FAMILIES,
  readChordFamily,
  saveChordFamily,
} from '../lib/chordHarmony';
import type { PracticeChordFamily } from '../lib/chordHarmony';
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
  const guitar = isGuitarChordMode(mode);
  const family = chordFamilyForMode(mode);
  const [preferredFamily, setPreferredFamily] = useState(() => family ?? readChordFamily());
  const [overview, setOverview] = useState(true);
  const topic = TOPICS.find((t) => modesForTopic(t, family ?? 'triad').includes(mode))!;
  const topicModes = modesForTopic(topic, family ?? 'triad');
  const forward = isForwardChordMode(mode);
  const diatonic = mode === DIATONIC_SUS_MODE;
  const showOverview = diatonic && overview;
  function changeMode(value: Mode) {
    setOverview(value === DIATONIC_SUS_MODE);
    start('basic', value);
  }
  function changeFamily(value: PracticeChordFamily) {
    if (value === family) return;
    const nextModes = modesForTopic(topic, value);
    setPreferredFamily(value);
    saveChordFamily(value);
    changeMode(nextModes[topicModes.indexOf(mode)] ?? nextModes[0]);
  }
  const familySwitch = family && (
    <div className="segmented chord-family" role="group" aria-label="和弦类型">
      {PRACTICE_CHORD_FAMILIES.map((value) => (
        <button
          key={value}
          className={family === value ? 'active' : ''}
          aria-pressed={family === value}
          onClick={() => changeFamily(value)}
        >
          {CHORD_FAMILY_LABELS[value]}
        </button>
      ))}
    </div>
  );
  const board = useRef<HTMLElement>(null);
  const mistakeCount =
    (mode === 'interval' ? progress.mistakes.length : 0) +
    (progress.exerciseMistakes ?? []).filter((id) => {
      const exercise = findExercise(id);
      return exercise && exercise.kind === mode;
    }).length;
  const stats = guitar ? { total: 0, correct: 0, time: 0 } : kindStats(progress, mode);
  const current = s.queue[s.index];
  const showNotation = current
    ? !current.exercise || current.exercise.kind === 'build-note'
    : mode === 'interval' || mode === 'build-note';
  const hasDifficulty = !family;
  const goal = s.queue.length,
    empty = !goal,
    done = s.index >= goal;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        !(e.target instanceof Element) ||
        e.repeat ||
        e.isComposing ||
        e.target.closest('select,input,textarea,[contenteditable="true"]') ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        mode === 'fretboard' ||
        guitar ||
        showOverview ||
        empty ||
        done
      )
        return;
      if (/^[1-8]$/.test(e.key) && !s.revealed && !s.queue[s.index].exercise) {
        e.preventDefault();
        dispatch({ type: 'degree', value: Number(e.key) });
      }
      if (/^[1-7]$/.test(e.key) && !s.revealed && forward) {
        e.preventDefault();
        const exercise = s.queue[s.index].exercise!;
        const button = board.current?.querySelector<HTMLButtonElement>(
          `.exercise-choices button[aria-keyshortcuts="${e.key}"]`,
        );
        if (button && !button.disabled) {
          button.focus();
          dispatch({ type: 'choice', value: exercise.choices[Number(e.key) - 1] });
        }
      }
      if (
        e.code === 'Space' &&
        (!e.target.closest('button') || e.target.closest('.exercise-choices'))
      ) {
        e.preventDefault();
        const q = s.queue[s.index];
        const notes = q.exercise
          ? s.revealed
            ? q.exercise.notes
            : q.exercise.listenBefore
          : [q.a, q.b];
        if (notes?.length) void play(notes);
      }
      if (
        e.key === 'Enter' &&
        (!e.target.closest('button') || e.target.closest('.exercise-choices'))
      ) {
        e.preventDefault();
        dispatch({ type: s.revealed ? 'next' : 'submit', now: performance.now() });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dispatch, play, s, done, empty, guitar, forward, showOverview]);
  const correct = s.results.filter((r) => r.correct).length;
  const average = s.results.length
    ? s.results.reduce((total, r) => total + r.time, 0) / s.results.length / 1000
    : 0;
  return (
    <>
      <Heading
        eyebrow={guitar ? '吉他练习室' : 'PRACTICE ROOM'}
        description={
          family === 'sus' && guitar
            ? MODE_DESCRIPTIONS[mode]
            : guitar
              ? '一组一个大调，用第五、六弦根音的固定指法，把级数练到手上。'
              : '音程、指板、和弦，逐项练习；拿起吉他，把乐理练到手上。'
        }
        side="先练准确，再练熟练"
      >
        {guitar ? '实琴和弦' : '乐理练习'}
      </Heading>
      <div className="topic-tabs" role="group" aria-label="练习专题">
        {TOPICS.map((t, i) => (
          <button
            key={t.label}
            className={topic === t ? 'active' : ''}
            aria-pressed={topic === t}
            onClick={() => {
              if (topic !== t) changeMode(modesForTopic(t, preferredFamily)[0]);
            }}
          >
            <small>0{i + 1}</small>
            {t.label}
          </button>
        ))}
      </div>
      {mode !== 'fretboard' && !guitar && (
        <PracticeModeToolbar description={MODE_DESCRIPTIONS[mode]}>
          <div className="practice-mode-groups">
            {familySwitch}
            <div
              className={topicModes.length > 1 ? 'segmented' : 'single-mode'}
              role="group"
              aria-label="练习题型"
            >
              {topicModes.length === 1 ? (
                <span>{MODE_LABELS[mode]}</span>
              ) : (
                topicModes.map((value) => (
                  <button
                    key={value}
                    className={mode === value ? 'active' : ''}
                    aria-pressed={mode === value}
                    onClick={() => {
                      if (mode !== value) changeMode(value);
                    }}
                  >
                    {MODE_LABELS[value]}
                  </button>
                ))
              )}
            </div>
          </div>
        </PracticeModeToolbar>
      )}
      {guitar ? (
        family === 'sus' ? (
          <GuitarSusPractice familySwitch={familySwitch} />
        ) : (
          <GuitarChordPractice key={family} family={family} familySwitch={familySwitch} />
        )
      ) : mode === 'fretboard' ? (
        <FretboardPractice controller={controller} />
      ) : showOverview ? (
        <DiatonicSusOverview
          onStart={() => {
            start('basic');
            setOverview(false);
          }}
        />
      ) : (
        <div className={`practice-layout${family ? ' chord-theory' : ''}`}>
          <section ref={board} className="practice-board" aria-label={`${MODE_LABELS[mode]}练习`}>
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
                  {hasDifficulty ? '自然音 · 基础' : `常规练习 · ${diatonic ? 7 : 10} 题`}
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
                {diatonic && (
                  <button className="plain-button" onClick={() => setOverview(true)}>
                    查看总览
                  </button>
                )}
              </div>
            ) : current.exercise ? (
              <ExerciseQuestion session={s} dispatch={dispatch} play={play} format={format} />
            ) : (
              <PracticeQuestion session={s} dispatch={dispatch} play={play} format={format} />
            )}
          </section>
          <aside className="practice-side">
            {family === 'sus' && !diatonic && (
              <details className="practice-tip">
                <summary>查看挂留和弦示例</summary>
                <p>C–E–G 里的 E 换成 D 就是 Csus2（1–2–5），换成 F 就是 Csus4（1–4–5）。</p>
                <p>C、D、G 以 C 为根音时是 Csus2，以 G 为根音时是 Gsus4。</p>
              </details>
            )}
            <h2>
              {MODE_LABELS[mode]} <small className="practice-local-label">· 本机记录</small>
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
              <h3>分项进度{family ? ` · ${CHORD_FAMILY_LABELS[family]}` : ''}</h3>
              {KINDS.filter((kind) => {
                const kindFamily = chordFamilyForMode(kind);
                return !kindFamily || kindFamily === (family ?? 'triad');
              }).map((kind) => {
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
              {forward ? (
                <>
                  <kbd>1</kbd> — <kbd>7</kbd> 选择构成音，再按取消
                  <br />
                </>
              ) : mode === 'interval' ? (
                <>
                  <kbd>1</kbd> — <kbd>8</kbd> 音程题选度数
                  <br />
                </>
              ) : null}
              {!diatonic && (
                <>
                  <kbd>Space</kbd> 聆听 ·{' '}
                </>
              )}
              <kbd>Enter</kbd> 提交 / 下一题
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
