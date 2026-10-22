import { useEffect, useRef, useState } from 'react';
import type { PracticeController } from '../hooks/usePractice';
import type { Quality } from '../lib/types';
import { StringIntervalFretboard } from './StringIntervalFretboard';
import { AnswerChoices } from './AnswerChoices';
import {
  createStringRound,
  STRING_INTERVAL_DEGREES,
  STRING_PAIRS,
  stringInterval,
  stringStats,
  stringAnswer,
} from '../lib/stringIntervals';
import type { StringAttempt } from '../lib/stringIntervals';

function session() {
  const now = performance.now();
  return {
    questions: createStringRound(),
    index: 0,
    results: [] as StringAttempt[],
    quality: null as Quality | null,
    degree: null as number | null,
    started: now,
    pausedAt: document.hidden ? now : null,
  };
}
const formatTime = (time: number) => `${(time / 1000).toFixed(2)} 秒`;
const accuracy = (stats: ReturnType<typeof stringStats>) =>
  stats.total ? `${Math.round((stats.correct / stats.total) * 100)}%` : '—';
const OPEN_NOTES_KEY = 'notera-string-open-notes';
function readOpenNotesPreference() {
  try {
    return localStorage.getItem(OPEN_NOTES_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function StringIntervalPractice({ controller }: { controller: PracticeController }) {
  const [s, setSession] = useState(session);
  const [showOpenNotes, setShowOpenNotes] = useState(readOpenNotesPreference);
  useEffect(() => {
    try {
      localStorage.setItem(OPEN_NOTES_KEY, String(showOpenNotes));
    } catch {
      // Display preference still works for the current visit.
    }
  }, [showOpenNotes]);
  const locked = useRef(false);
  const serial = useRef(0);
  const done = s.index >= s.questions.length;
  const q = s.questions[Math.min(s.index, s.questions.length - 1)];
  const expected = stringInterval(q);
  const result = s.results[s.index];
  const history = (controller.state.progress.stringIntervals ?? []).filter(
    (attempt) => attempt.rule === 'pitch-class',
  );
  const stats = stringStats(history),
    roundStats = stringStats(s.results);
  const begin = () => {
    locked.current = false;
    setSession(session());
  };
  const answer = (value: string) => {
    if (done || locked.current || !value) return;
    locked.current = true;
    const attempt: StringAttempt = {
      ...q,
      rule: 'pitch-class',
      id: `${Date.now()}:${performance.now()}:${++serial.current}`,
      answer: value,
      correct: value === expected.title,
      time: Math.max(0, (s.pausedAt ?? performance.now()) - s.started),
      date: Date.now(),
    };
    controller.dispatch({ type: 'string-result', attempt });
    setSession((current) => ({ ...current, results: [...current.results, attempt] }));
  };
  const chooseQuality = (quality: Quality) => {
    if (done || locked.current) return;
    setSession((current) => ({ ...current, quality }));
    if (s.degree !== null) answer(stringAnswer(quality, s.degree));
  };
  const chooseDegree = (degree: number) => {
    if (done || locked.current) return;
    setSession((current) => ({ ...current, degree }));
    if (s.quality !== null) answer(stringAnswer(s.quality, degree));
  };
  const next = () => {
    if (!result || done) return;
    locked.current = false;
    const now = performance.now();
    setSession((current) => ({
      ...current,
      index: current.index + 1,
      quality: null,
      degree: null,
      started: now,
      pausedAt: document.hidden ? now : null,
    }));
  };
  useEffect(() => {
    const visibility = () => {
      const now = performance.now();
      const paused = document.hidden;
      setSession((current) => {
        if (current.results[current.index] || current.index >= current.questions.length)
          return current;
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
      if (
        e.key === 'Enter' &&
        result &&
        !done &&
        !(e.target instanceof Element && e.target.closest('button'))
      ) {
        e.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  const weak = STRING_PAIRS.map((pair) => {
    const attempts = history.filter((a) => a.from === pair.from && a.to === pair.to);
    return { ...pair, total: attempts.length, wrong: attempts.filter((a) => !a.correct).length };
  })
    .filter((p) => p.wrong)
    .sort((a, b) => b.wrong - a.wrong)
    .slice(0, 5);
  return (
    <div className="practice-layout fret-layout">
      <section className="practice-board fret-board" aria-label="指板定位练习">
        <div className="practice-bar fret-round-bar">
          <span>{done ? '本轮完成' : `第 ${s.index + 1} / 10 题`}</span>
          <div className="fret-round-actions">
            <label className="string-note-toggle">
              <input
                type="checkbox"
                role="switch"
                checked={showOpenNotes}
                onChange={(event) => setShowOpenNotes(event.target.checked)}
              />
              <span>显示空弦音名</span>
            </label>
            <button className="plain-button" onClick={begin}>
              换一轮
            </button>
          </div>
        </div>
        <div className="progress-line">
          <i style={{ width: `${done ? 100 : (s.index + Number(Boolean(result))) * 10}%` }} />
        </div>
        {done ? (
          <div className="session-end">
            <p className="eyebrow">弦间音程 · 本轮结果</p>
            <h2>这一轮，完成了。</h2>
            <div className="score-big">
              {roundStats.correct}
              <span> / 10</span>
            </div>
            <p>
              首次正确率 {accuracy(roundStats)}
              <br />
              正确题平均反应 {roundStats.correct ? formatTime(roundStats.meanTime) : '—'}
            </p>
            <p>粗弦到细弦、细弦到粗弦各 5 题。以起点为 1，统一向上循环判断音名关系。</p>
            <button className="primary" onClick={begin}>
              再练一轮 →
            </button>
          </div>
        ) : (
          <>
            <div className="string-question">
              <p className="eyebrow">标准调弦 · 同品位 · 音名关系</p>
              <h2>以起点音为 1，终点音是什么音程关系？</h2>
              <p className="string-route" aria-label={`${q.from} 弦到 ${q.to} 弦`}>
                <b>{q.from} 弦</b>
                <span>→</span>
                <b>{q.to} 弦</b>
              </p>
              <StringIntervalFretboard {...q} showOpenNotes={showOpenNotes} />
              <p className="fret-help">以起点为 1，统一向上循环 · 忽略八度，同音名记一度</p>
            </div>
            <AnswerChoices
              degreeOptions={STRING_INTERVAL_DEGREES}
              degree={s.degree}
              quality={s.quality}
              disabled={Boolean(result)}
              onDegree={chooseDegree}
              onQuality={chooseQuality}
            />
            {result ? (
              <div className={`feedback ${result.correct ? '' : 'wrong'}`} role="status">
                <strong>
                  {result.correct ? '✓ 判断正确' : `你选了${result.answer}`}，是
                  {expected.title}。
                </strong>
                <p>
                  以空弦音名为例：{expected.notes}。
                  {expected.degree === 1
                    ? '两根弦音名相同，忽略八度差，按纯一度处理。'
                    : `以起点为 1，向上循环 ${expected.semitones} 个半音，得到${expected.title}。`}
                  两根弦移动到同一品位，音程关系不变。
                  {result.correct && ` 反应 ${formatTime(result.time)}。`}
                </p>
              </div>
            ) : (
              <p className="fret-help">性质、度数各选一个，选齐立即判分；先选哪排都可以。</p>
            )}
            <div className="fret-actions">
              {result && (
                <button className="primary" onClick={next}>
                  {s.index === 9 ? '查看本轮结果' : '下一题 →'}
                </button>
              )}
            </div>
          </>
        )}
      </section>
      <aside className="practice-side fret-side">
        <h2>
          弦间音程 <small>· 本机记录</small>
        </h2>
        <div className="stats">
          <div className="stat">
            <b>{accuracy(stats)}</b>
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
          按新规则单独统计，旧规则记录仍保留。最近记录最多保存 100
          题；后台和反馈阅读时间不计入作答。
        </p>
        <div className="kind-progress">
          <h3>弦间方向进度</h3>
          {(['粗弦 → 细弦', '细弦 → 粗弦'] as const).map((direction, index) => {
            const part = stringStats(history.filter((a) => a.from > a.to === (index === 0)));
            return (
              <div key={direction}>
                <span>{direction}</span>
                <span>
                  {part.total
                    ? `${accuracy(part)} · ${part.total} 题${part.correct ? ` · ${formatTime(part.meanTime)}` : ''}`
                    : '尚未练习'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="kind-progress">
          <h3>待巩固弦对</h3>
          {weak.length ? (
            weak.map((pair) => (
              <div key={`${pair.from}:${pair.to}`}>
                <span>
                  {pair.from} 弦 → {pair.to} 弦
                </span>
                <span>
                  {pair.wrong} / {pair.total} 题答错
                </span>
              </div>
            ))
          ) : (
            <p className="empty-history">
              {stats.total ? '目前没有答错的弦对。' : '完成第一题后，记录会出现在这里。'}
            </p>
          )}
        </div>
        <div className="practice-tip">
          <h3>先熟悉音名关系，再练认音</h3>
          <p>标准调弦从 6 弦到 1 弦为 E A D G B E。题目比较两根弦在同一品位的音，不涉及品位差。</p>
          <p>
            以起点音为 1，统一向上循环，只练一至七度。B → D 是小三度，D → B
            是大六度；同音名按纯一度处理。指板箭头只表示起点和终点的位置。
          </p>
        </div>
        <div className="practice-tip">
          <h3>最近的练习</h3>
          {history.length ? (
            history.slice(0, 5).map((a) => (
              <div className="history-row" key={a.id}>
                <span>
                  {a.from} 弦 → {a.to} 弦 · {stringInterval(a).title}
                </span>
                <span className={a.correct ? '' : 'wrong-text'}>
                  {a.correct ? formatTime(a.time) : '首次有误'}
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
              controller.state.backup.fretboard ||
              controller.state.backup.fretboardMemory) && (
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
