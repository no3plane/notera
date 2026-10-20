import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StringIntervalPractice } from './StringIntervalPractice';
import { SameNotePractice } from './SameNotePractice';
import type { PracticeController } from '../hooks/usePractice';
import { Fretboard, positionLabel } from './Fretboard';
import {
  allowedDegrees,
  createFretRound,
  degreeAt,
  FRET_LEVEL_LABELS,
  FRET_MODE_LABELS,
  fretStats,
  isFretAnswerCorrect,
  progressKey,
} from '../lib/fretboard';
import type {
  FretAttempt,
  FretDegree,
  FretLevel,
  FretMode,
  FretPoint,
  FretQuestion,
} from '../lib/fretboard';

interface FretSession {
  mode: FretMode;
  level: FretLevel;
  questions: FretQuestion[];
  index: number;
  result: FretAttempt | null;
  results: FretAttempt[];
  selected: FretPoint | FretDegree | null;
  resolved: boolean;
  showTarget: boolean;
  started: number;
  pausedAt: number | null;
}
function session(mode: FretMode, level: FretLevel): FretSession {
  const now = performance.now();
  return {
    mode,
    level,
    questions: createFretRound(mode, level),
    index: 0,
    result: null,
    results: [],
    selected: null,
    resolved: false,
    showTarget: false,
    started: now,
    pausedAt: document.hidden ? now : null,
  };
}
export function FretboardPractice({ controller }: { controller: PracticeController }) {
  const [mode, setMode] = useState<'strings' | 'same-note' | FretMode>('strings');
  const modeTabs = (
    <div className="segmented" role="group" aria-label="指板题型">
      {(['strings', 'same-note', 'recognize', 'locate'] as const).map((value) => (
        <button
          key={value}
          className={mode === value ? 'active' : ''}
          aria-pressed={mode === value}
          onClick={() => setMode(value)}
        >
          {value === 'strings'
            ? '弦间音程'
            : value === 'same-note'
              ? '同音搬运'
              : FRET_MODE_LABELS[value]}
        </button>
      ))}
    </div>
  );
  return mode === 'strings' ? (
    <StringIntervalPractice controller={controller} modeTabs={modeTabs} />
  ) : mode === 'same-note' ? (
    <SameNotePractice controller={controller} modeTabs={modeTabs} />
  ) : (
    <FretPositionPractice
      key={mode}
      controller={controller}
      initialMode={mode}
      modeTabs={modeTabs}
    />
  );
}
function FretPositionPractice({
  controller,
  initialMode,
  modeTabs,
}: {
  controller: PracticeController;
  initialMode: FretMode;
  modeTabs: ReactNode;
}) {
  const [s, setSession] = useState<FretSession>(() => session(initialMode, 'natural'));
  const locked = useRef<number | null>(null);
  const serial = useRef(0);
  const { mode, level, index, result, selected, resolved, showTarget } = s;
  const done = index >= s.questions.length;
  const q = s.questions[Math.min(index, s.questions.length - 1)];
  const history = controller.state.progress.fretboard?.[progressKey(mode, level)] ?? [];
  const stats = fretStats(history);
  const roundStats = fretStats(s.results);
  const selectedPoint = selected && typeof selected === 'object' ? selected : null;
  const selectedDegree = typeof selected === 'string' ? selected : null;
  const begin = (nextMode = mode, nextLevel = level) => {
    locked.current = null;
    setSession(session(nextMode, nextLevel));
  };
  const answer = (value: FretDegree | FretPoint) => {
    if (done || resolved) return;
    if (
      mode === 'recognize'
        ? typeof value !== 'string' || !allowedDegrees(level).includes(value)
        : typeof value !== 'object' ||
          value.string !== q.target.string ||
          value.fret < q.startFret ||
          value.fret >= q.startFret + 5
    )
      return;
    const correct = isFretAnswerCorrect(q, value);
    let attempt: FretAttempt | null = null;
    if (locked.current !== index) {
      locked.current = index;
      const date = Date.now();
      attempt = {
        ...q,
        id: `${date}:${performance.now()}:${++serial.current}`,
        level,
        answer: value,
        correct,
        time: Math.max(0, (s.pausedAt ?? performance.now()) - s.started),
        date,
      };
      controller.dispatch({ type: 'fret-result', attempt });
    }
    setSession((current) => {
      if (current.index !== index || current.resolved) return current;
      return {
        ...current,
        selected: value,
        result: current.result ?? attempt,
        results: attempt ? [...current.results, attempt] : current.results,
        resolved: mode === 'recognize' || correct,
      };
    });
  };
  const next = () => {
    if (!resolved) return;
    locked.current = null;
    const now = performance.now();
    setSession((current) => ({
      ...current,
      index: current.index + 1,
      result: null,
      selected: null,
      resolved: false,
      showTarget: false,
      started: now,
      pausedAt: document.hidden ? now : null,
    }));
  };
  useEffect(() => {
    const visibility = () => {
      const now = performance.now();
      const paused = document.hidden;
      setSession((current) => {
        if (current.result || current.index >= current.questions.length) return current;
        if (paused && current.pausedAt === null) return { ...current, pausedAt: now };
        if (!paused && current.pausedAt !== null)
          return { ...current, started: current.started + now - current.pausedAt, pausedAt: null };
        return current;
      });
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (e.target instanceof Element &&
          e.target.closest('select,input,textarea,[contenteditable="true"]'))
      )
        return;
      if (!done && !result && mode === 'recognize' && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        answer(e.key as FretDegree);
      }
      if (
        e.key === 'Enter' &&
        resolved &&
        !(e.target instanceof Element && e.target.closest('button'))
      ) {
        e.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  const weak = stats.byDegree.filter((d) => d.wrong).sort((a, b) => b.wrong - a.wrong);
  const nextLabel =
    index === 9 ? '查看本轮结果' : mode === 'locate' ? `从 ${q.target.degree} 继续 →` : '下一题 →';
  const formatTime = (time: number) => `${(time / 1000).toFixed(2)} 秒`;
  return (
    <div className="practice-layout fret-layout">
      <section className="practice-board fret-board" aria-label="指板定位练习">
        <div className="fret-mode-bar">
          {modeTabs}
          <select
            aria-label="指板难度"
            value={level}
            onChange={(e) => begin(mode, e.target.value as FretLevel)}
          >
            {(['natural', 'chromatic'] as const).map((value) => (
              <option value={value} key={value}>
                {FRET_LEVEL_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="fret-round-bar">
          <span>{done ? '本轮完成' : `第 ${index + 1} / 10 题`}</span>
          <button className="plain-button" onClick={() => begin()}>
            换一轮
          </button>
        </div>
        <div className="progress-line">
          <i style={{ width: `${done ? 100 : (index + Number(resolved)) * 10}%` }} />
        </div>
        {done ? (
          <div className="session-end">
            <p className="eyebrow">{FRET_MODE_LABELS[mode]} · 本轮结果</p>
            <h2>这一轮，完成了。</h2>
            <div className="score-big">
              {roundStats.correct}
              <span> / 10</span>
            </div>
            <p>
              首次正确率 {roundStats.correct * 10}%<br />
              正确题平均反应 {roundStats.correct ? formatTime(roundStats.meanTime) : '—'}
            </p>
            <p>
              {mode === 'locate'
                ? '找错后修正不重复计分；每题只记录首次落点。'
                : '每题只记录第一次判断。'}
              继续保持准确，再逐步缩短反应时间。
            </p>
            <button className="primary" onClick={() => begin()}>
              再练一轮 →
            </button>
          </div>
        ) : (
          <>
            <div className="fret-question-cue">
              <div className="fret-known">
                <span>已知参照</span>
                <b>{q.reference.degree}</b>
                <small>{positionLabel(q.reference)}</small>
              </div>
              <div className="fret-request">
                <p>
                  {mode === 'recognize' ? '问号位置，是几级？' : `在 ${q.target.string} 弦找到`}
                </p>
                {mode === 'locate' && <strong>{q.target.degree}</strong>}
                {mode === 'recognize' && <small>直接选择级数，也可按 1–7</small>}
              </div>
              {mode === 'recognize' && (
                <div
                  className={`fret-degree-choices ${level === 'chromatic' ? 'is-chromatic' : ''}`}
                  role="group"
                  aria-label="选择指板级数"
                >
                  {allowedDegrees(level).map((degree) => (
                    <button
                      key={degree}
                      disabled={Boolean(result)}
                      aria-pressed={selectedDegree === degree}
                      className={`${result && degree === q.target.degree ? 'is-correct' : ''} ${result && degree === selectedDegree && !result.correct ? 'is-wrong' : ''}`}
                      onClick={() => answer(degree)}
                    >
                      {degree}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Fretboard
              question={q}
              selected={selectedPoint}
              answered={Boolean(result)}
              resolved={resolved}
              showTarget={showTarget}
              onSelect={answer}
            />
            {result ? (
              <div className={`feedback ${result.correct ? '' : 'wrong'}`} role="status">
                <strong>
                  {mode === 'recognize'
                    ? result.correct
                      ? `✓ 判断正确，是 ${q.target.degree}。`
                      : `你选了 ${result.answer}，这里是 ${q.target.degree}。`
                    : resolved
                      ? result.correct
                        ? `✓ 找到了 ${q.target.degree}。`
                        : `已找到 ${q.target.degree}，本题首次落点有误。`
                      : `这格是 ${selectedPoint ? degreeAt(q.tonic, selectedPoint) : ''}，要找的是 ${q.target.degree}。`}
                </strong>
                <p>
                  {mode === 'locate'
                    ? resolved
                      ? `下一题只保留你刚找到的 ${q.target.degree}，从这个位置继续找音。`
                      : `继续在 ${q.target.string} 弦找 ${q.target.degree}。首次落点已记错，修正不会增加答题次数。`
                    : `${positionLabel(q.target)}是 ${q.target.degree}。下一题仍只给一个 1 作参照。`}
                  {result.correct && ` 反应 ${formatTime(result.time)}。`}
                </p>
              </div>
            ) : (
              <p className="fret-help">
                {mode === 'recognize'
                  ? '绿色数字为参照音，问号为待判断位置。整图答案不展开。'
                  : '只在高亮的目标弦落点。找对后，当前位置成为下一题的参照；本轮调性保持不变。'}
              </p>
            )}
            <div className="fret-actions">
              {result && !resolved && !showTarget && (
                <button
                  className="plain-button"
                  onClick={() => setSession((current) => ({ ...current, showTarget: true }))}
                >
                  显示目标位置
                </button>
              )}
              {showTarget && !resolved && <span>点击指板上标出的 {q.target.degree} 继续。</span>}
              {resolved && (
                <button className="primary" onClick={next}>
                  {nextLabel}
                </button>
              )}
            </div>
          </>
        )}
      </section>
      <aside className="practice-side fret-side">
        <h2>
          {FRET_MODE_LABELS[mode]}{' '}
          <small>· {level === 'natural' ? '自然级数' : '全部半音'} · 本机记录</small>
        </h2>
        <div className="stats">
          <div className="stat">
            <b>{stats.total ? `${Math.round((stats.correct / stats.total) * 100)}%` : '—'}</b>
            <span>首次正确率</span>
          </div>
          <div className="stat">
            <b>
              {stats.correct ? (stats.meanTime / 1000).toFixed(2) : '—'}
              <small> s</small>
            </b>
            <span>正确题平均反应</span>
          </div>
          <div className="stat">
            <b>{stats.total}</b>
            <span>已练题目</span>
          </div>
          <div className="stat">
            <b>{stats.total - stats.correct}</b>
            <span>首次答错题目</span>
          </div>
        </div>
        <p className="fret-stats-note">
          每个题型、难度分别保存最近 100 题。只计首次作答，修正与看反馈的时间不计入下一题。
        </p>
        <div className="kind-progress">
          <h3>待巩固级数</h3>
          {weak.length ? (
            weak.map((d) => (
              <div key={d.degree}>
                <span>{d.degree}</span>
                <span>
                  {d.wrong} / {d.total} 题答错
                </span>
              </div>
            ))
          ) : (
            <p className="empty-history">
              {stats.total ? '目前没有答错的级数。' : '完成第一题后，记录会出现在这里。'}
            </p>
          )}
        </div>
        <div className="practice-tip">
          <h3>{mode === 'locate' ? '从当前音，找到下一个音' : '看到位置，直接认出级数'}</h3>
          <p>
            {mode === 'locate'
              ? '每轮从任意级数起步，不固定回到 1。目标弦内只有一个正确位置；参照音与目标音跨弦出现。'
              : '每轮给一个 1，随机指出不同位置。五品窗口和参照位置会换，逐步减少对固定图形的依赖。'}
          </p>
          <p>标准调弦 E A D G B E。变化音统一记作 ♭2、♭3、♯4、♭6、♭7。</p>
        </div>
        <div className="practice-tip">
          <h3>最近的练习</h3>
          {history.length ? (
            history.slice(0, 5).map((attempt) => (
              <div className="history-row" key={attempt.id}>
                <span>
                  {attempt.reference.degree} → {attempt.target.degree} · {attempt.target.string}弦
                </span>
                <span className={attempt.correct ? '' : 'wrong-text'}>
                  {attempt.correct ? formatTime(attempt.time) : '首次有误'}
                </span>
              </div>
            ))
          ) : (
            <p>每轮只练当前题型。</p>
          )}
        </div>
        <div className="record-actions">
          <button
            className="plain-button"
            onClick={() => {
              controller.reset();
              begin();
            }}
          >
            重置全部记录
          </button>
          {controller.state.backup &&
            (controller.state.backup.total > 0 ||
              controller.state.backup.stringIntervals?.length ||
              controller.state.backup.sameNote ||
              controller.state.backup.fretboardMemory ||
              controller.state.backup.fretboard) && (
              <button
                className="plain-button"
                onClick={() => {
                  controller.restore();
                  begin();
                }}
              >
                恢复上次记录
              </button>
            )}
        </div>
      </aside>
    </div>
  );
}
