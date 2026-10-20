import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { PracticeController } from '../hooks/usePractice';
import { samePoint } from '../lib/fretboard';
import type { FretPoint } from '../lib/fretboard';
import {
  createSameNoteRound,
  SAME_NOTE_LABELS,
  SAME_NOTE_STAGES,
  sameNoteDemo,
  sameNoteExplanation,
  sameNoteName,
  sameNoteRule,
  sameNoteStats,
} from '../lib/sameNote';
import type { SameNoteAttempt, SameNoteStage } from '../lib/sameNote';
import { positionLabel } from './Fretboard';
import { SameNoteFretboard } from './SameNoteFretboard';

function session(stage: SameNoteStage, demo = false) {
  const now = performance.now();
  return {
    stage,
    demo,
    questions: createSameNoteRound(stage),
    index: 0,
    results: [] as SameNoteAttempt[],
    selected: null as FretPoint | null,
    hint: false,
    shownAnswer: false,
    resolved: false,
    started: now,
    pausedAt: document.hidden ? now : null,
  };
}
const timeLabel = (time: number) => `${(time / 1000).toFixed(2)} 秒`;
const accuracy = (stats: ReturnType<typeof sameNoteStats>) =>
  stats.total ? `${Math.round((stats.independent / stats.total) * 100)}%` : '—';

export function SameNotePractice({
  controller,
  modeTabs,
}: {
  controller: PracticeController;
  modeTabs: ReactNode;
}) {
  const [s, setSession] = useState(() => session('basic', true));
  const first = useRef<SameNoteAttempt | null>(null);
  const serial = useRef(0);
  const done = !s.demo && s.index >= s.questions.length;
  const q = s.demo ? sameNoteDemo(s.stage) : s.questions[Math.min(s.index, s.questions.length - 1)];
  const note = sameNoteName(q.reference);
  const result = s.results[s.index];
  const history = controller.state.progress.sameNote?.[s.stage] ?? [];
  const stats = sameNoteStats(history),
    roundStats = sameNoteStats(s.results);
  const reveal = s.demo || s.shownAnswer || s.resolved;
  const begin = (stage = s.stage, demo = false) => {
    first.current = null;
    setSession(session(stage, demo));
  };
  const answer = (point: FretPoint) => {
    if (
      done ||
      s.demo ||
      s.resolved ||
      point.string !== q.target.string ||
      !Number.isInteger(point.fret) ||
      point.fret < q.startFret ||
      point.fret >= q.startFret + 5
    )
      return;
    const correct = samePoint(point, q.target);
    let attempt: SameNoteAttempt | null = null;
    if (!first.current) {
      const date = Date.now();
      attempt = {
        ...q,
        stage: s.stage,
        id: `${date}:${performance.now()}:${++serial.current}`,
        answer: point,
        correct,
        hint: s.hint,
        shownAnswer: false,
        time: Math.max(0, (s.pausedAt ?? performance.now()) - s.started),
        date,
      };
      first.current = attempt;
      controller.dispatch({ type: 'same-note-result', attempt });
    }
    setSession((current) => ({
      ...current,
      selected: point,
      resolved: correct,
      results: attempt ? [...current.results, attempt] : current.results,
    }));
  };
  const showAnswer = () => {
    if (!result || s.resolved || s.shownAnswer) return;
    controller.dispatch({ type: 'same-note-reveal', stage: s.stage, id: result.id });
    setSession((current) => ({
      ...current,
      shownAnswer: true,
      results: current.results.map((a) => (a.id === result.id ? { ...a, shownAnswer: true } : a)),
    }));
  };
  const next = () => {
    if (done || !s.resolved) return;
    first.current = null;
    const now = performance.now();
    setSession((current) => ({
      ...current,
      index: current.index + 1,
      selected: null,
      hint: false,
      shownAnswer: false,
      resolved: false,
      started: now,
      pausedAt: document.hidden ? now : null,
    }));
  };
  useEffect(() => {
    const visibility = () => {
      const now = performance.now();
      setSession((current) => {
        if (
          current.demo ||
          current.results[current.index] ||
          current.index >= current.questions.length
        )
          return current;
        if (document.hidden && current.pausedAt === null) return { ...current, pausedAt: now };
        if (!document.hidden && current.pausedAt !== null)
          return { ...current, started: current.started + now - current.pausedAt, pausedAt: null };
        return current;
      });
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key !== 'Enter' ||
        e.repeat ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (e.target instanceof Element &&
          e.target.closest('button,select,input,textarea,[contenteditable="true"]'))
      )
        return;
      if (!done && s.resolved) {
        e.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  return (
    <div className="practice-layout fret-layout">
      <section className="practice-board fret-board" aria-label="同音搬运练习">
        <div className="fret-mode-bar same-note-mode-bar">
          {modeTabs}
          <select
            aria-label="同音搬运阶段"
            value={s.stage}
            onChange={(e) => begin(e.target.value as SameNoteStage, true)}
          >
            {SAME_NOTE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {SAME_NOTE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>
        <div className="fret-round-bar">
          <span>
            {s.demo ? '先看一题示范 · 不计分' : done ? '本轮完成' : `第 ${s.index + 1} / 10 题`}
          </span>
          {!s.demo && (
            <button className="plain-button" onClick={() => begin()}>
              换一轮
            </button>
          )}
        </div>
        <div className="progress-line">
          <i
            style={{ width: `${done ? 100 : s.demo ? 0 : (s.index + Number(s.resolved)) * 10}%` }}
          />
        </div>
        {done ? (
          <div className="session-end">
            <p className="eyebrow">同音搬运 · 本轮结果</p>
            <h2>这一轮，完成了。</h2>
            <div className="score-big">
              {roundStats.independent}
              <span> / 10</span>
            </div>
            <p>
              独立首次正确率 {accuracy(roundStats)}
              <br />
              独立答对平均反应 {roundStats.independent ? timeLabel(roundStats.meanTime) : '—'}
            </p>
            <p>
              首次答错 {roundStats.wrong} 题 · 使用提示 {roundStats.hints} 题
            </p>
            <div className="same-note-review">
              <h3>本轮形状回顾</h3>
              {[...new Set(s.questions.map(sameNoteRule))].map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
              {s.results.filter((a) => !a.correct).length > 0 && (
                <>
                  <h3>首次答错题</h3>
                  {s.results
                    .filter((a) => !a.correct)
                    .map((a) => (
                      <p key={a.id}>
                        {positionLabel(a.reference)} {sameNoteName(a.reference)} →{' '}
                        {positionLabel(a.target)}；首次点在第 {a.answer.fret} 品
                        {a.shownAnswer ? ' · 已查看答案' : ''}
                      </p>
                    ))}
                </>
              )}
            </div>
            <button className="primary" onClick={() => begin()}>
              再练一轮 →
            </button>
          </div>
        ) : (
          <>
            <div className="fret-question-cue">
              <div className="fret-known">
                <span>已知音</span>
                <b>{note}</b>
                <small>{positionLabel(q.reference)}</small>
              </div>
              <div className="fret-request">
                <p>在 {q.target.string} 弦找到</p>
                <strong>{note}</strong>
                <small>点击同音名位置，可以相差八度</small>
              </div>
            </div>
            <SameNoteFretboard
              question={q}
              selected={s.selected}
              reveal={reveal}
              resolved={s.demo || s.resolved}
              onSelect={answer}
            />
            {reveal ? (
              <div className={`feedback ${result && !result.correct ? 'wrong' : ''}`} role="status">
                <strong>
                  {s.demo
                    ? '示范：'
                    : s.resolved
                      ? result?.correct
                        ? result.hint
                          ? '✓ 借助提示找到了：'
                          : '✓ 独立找到了：'
                        : s.shownAnswer
                          ? '已按答案找到，首次落点有误：'
                          : '已纠正，首次落点有误：'
                      : '答案：'}
                  {positionLabel(q.reference)} {note} → {positionLabel(q.target)} {note}
                </strong>
                <p>
                  {sameNoteRule(q)}
                  {sameNoteExplanation(q)}
                </p>
                {s.shownAnswer && !s.resolved && <p>点击指板上标出的 {note}，完成本题。</p>}
                {result?.correct && !result.hint && <p>反应 {timeLabel(result.time)}。</p>}
              </div>
            ) : result ? (
              <div className="feedback wrong" role="status">
                <strong>这个位置不是 {note}，再想想该向哪边移动。</strong>
                <p>首次落点已记错，继续在 {q.target.string} 弦寻找；纠正不重复计分。</p>
              </div>
            ) : (
              <p className="fret-help">
                只在高亮弦点击。同音名位置只有一个，先想移动形状，再落点。
              </p>
            )}
            {s.hint && !reveal && (
              <div className="hint-box" role="note">
                {sameNoteRule(q)}
                {!result && '本题标记为借助提示。'}
              </div>
            )}
            <div className="fret-actions">
              {s.demo ? (
                <button className="primary" onClick={() => begin()}>
                  开始练习 →
                </button>
              ) : (
                <>
                  {!s.resolved && !s.shownAnswer && !s.hint && (
                    <button
                      className="plain-button"
                      onClick={() => setSession((current) => ({ ...current, hint: true }))}
                    >
                      提示
                    </button>
                  )}
                  {result && !s.resolved && !s.shownAnswer && (
                    <button className="plain-button" onClick={showAnswer}>
                      显示答案
                    </button>
                  )}
                  {s.resolved && (
                    <button className="primary" onClick={next}>
                      {s.index === 9 ? '查看本轮结果' : '下一题 →'}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </section>
      <aside className="practice-side fret-side">
        <h2>
          同音搬运 <small>· {SAME_NOTE_LABELS[s.stage]} · 本机记录</small>
        </h2>
        <div className="stats">
          <div className="stat">
            <b>{accuracy(stats)}</b>
            <span>独立首次正确率</span>
          </div>
          <div className="stat">
            <b>
              {stats.independent ? (stats.meanTime / 1000).toFixed(2) : '—'}
              <small> s</small>
            </b>
            <span>独立答对平均反应</span>
          </div>
          <div className="stat">
            <b>{stats.total}</b>
            <span>已练题目</span>
          </div>
          <div className="stat">
            <b>{stats.wrong}</b>
            <span>首次答错题目</span>
          </div>
        </div>
        <p className="fret-stats-note">
          使用提示 {stats.hints} 题。各阶段分别保留最近 100
          题；独立首次正确率按全部首次作答题目计算，使用提示答对不计为独立答对。
        </p>
        <div className="kind-progress">
          <h3>待巩固弦对</h3>
          {stats.weak.length ? (
            stats.weak.map((pair) => (
              <div key={pair.label}>
                <span>{pair.label}</span>
                <span>
                  {pair.wrong} / {pair.total} 题答错 · {pair.assisted} 题提示
                </span>
              </div>
            ))
          ) : (
            <p className="empty-history">
              {stats.total ? '目前没有待巩固弦对。' : '完成第一题后，记录会出现在这里。'}
            </p>
          )}
        </div>
        <div className="practice-tip">
          <h3>先搬同音，再推附近</h3>
          <p>
            从已知位置找到目标弦上的同音名。熟悉这些形状后，就能用它作为参照，继续推导附近的音。
          </p>
          <p>标准调弦 E A D G B E · 第 1–12 品 · 不含空弦。</p>
        </div>
        <div className="practice-tip">
          <h3>最近的练习</h3>
          {history.length ? (
            history.slice(0, 5).map((a) => (
              <div className="history-row" key={a.id}>
                <span>
                  {a.reference.string} 弦 → {a.target.string} 弦 · {sameNoteName(a.reference)}
                </span>
                <span className={a.correct && !a.hint ? '' : 'wrong-text'}>
                  {!a.correct
                    ? a.shownAnswer
                      ? '有误 · 已看答案'
                      : '首次有误'
                    : a.hint
                      ? '借助提示'
                      : timeLabel(a.time)}
                </span>
              </div>
            ))
          ) : (
            <p>每轮只练当前阶段。</p>
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
          {controller.state.backup && (
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
