import { useEffect } from 'react';
import { Heading } from '../components/Heading';
import { PracticeQuestion } from '../components/PracticeQuestion';
import { interval, name } from '../lib/theory';
import { NOTE_FORMATS } from '../lib/notation';
import type { PracticeController } from '../hooks/usePractice';
import type { Level, Note, NoteFormat, NotePair, Page } from '../lib/types';

export function PracticePage({
  controller,
  navigate,
  play,
  onExplore,
  format,
  onFormat,
}: {
  controller: PracticeController;
  navigate: (page: Page) => void;
  play: (notes: Note[], simultaneous?: boolean) => Promise<void>;
  onExplore: (pair: NotePair) => void;
  format: NoteFormat;
  onFormat: (format: NoteFormat) => void;
}) {
  const { state, dispatch, start, reset, restore } = controller,
    s = state.session,
    stats = state.progress;
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
        empty ||
        done
      )
        return;
      if (/^[1-8]$/.test(e.key) && !s.revealed) {
        e.preventDefault();
        dispatch({ type: 'degree', value: Number(e.key) });
      }
      if (e.code === 'Space') {
        e.preventDefault();
        const q = s.queue[s.index];
        void play([q.a, q.b]);
      }
      if (e.key === 'Enter' && !e.target.closest('button')) {
        e.preventDefault();
        dispatch({ type: s.revealed ? 'next' : 'submit', now: performance.now() });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dispatch, play, s, done, empty]);
  const correct = s.results.filter((r) => r.correct).length;
  const average = s.results.length
    ? s.results.reduce((total, r) => total + r.time, 0) / s.results.length / 1000
    : 0;
  return (
    <>
      <Heading
        eyebrow="BUILD YOUR INTUITION"
        description="先确定度数，再判断性质。常规练习每轮 10 题，易错复习只练待巩固题。"
        side="准确优先，速度会慢慢跟上"
      >
        从慢慢推算，<em>到一眼认出。</em>
      </Heading>
      <div className="practice-layout">
        <section className="practice-board" aria-label="音程反应练习">
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
              <option value="basic">自然音 · 基础</option>
              <option value="mixed">升降音 · 进阶</option>
              <option value="review">易错复习 · {stats.mistakes.length} 题</option>
            </select>
          </div>
          <div className="progress-line">
            <i style={{ width: `${goal ? (s.index / goal) * 100 : 0}%` }} />
          </div>
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
          {empty ? (
            <div className="session-end">
              <h2>还没有易错题</h2>
              <p>先完成一轮练习，答错的题会自动保存在这里。</p>
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
                  ? '全部判断正确！试试升降音，或再练一轮。'
                  : '答错的题已进入易错复习，再看一次推理就会更清楚。'}
              </p>
              <button className="primary" onClick={() => start()}>
                再练一轮 →
              </button>
            </div>
          ) : (
            <PracticeQuestion
              session={s}
              dispatch={dispatch}
              play={play}
              onExplore={onExplore}
              format={format}
            />
          )}
        </section>
        <aside className="practice-side">
          <h2>
            你的练习足迹 <small style={{ fontSize: 9, color: '#a0aa91' }}>· 本机记录</small>
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
              <b>{stats.mistakes.length}</b>
              <span>待巩固易错题</span>
            </div>
          </div>
          <div className="practice-tip">
            <p className="eyebrow">A LITTLE REMINDER</p>
            <h3>不要跳过“数音名”这一步。</h3>
            <p>C 到 F♯ 和 C 到 G♭ 都相距 6 个半音，但前者是四度，后者是五度。拼写决定度数。</p>
            <button className="plain-button" onClick={() => navigate('learn')}>
              去笔记里看看 ↗
            </button>
          </div>
          <div className="practice-tip">
            <h3>最近的练习</h3>
            {stats.history.length ? (
              stats.history.slice(0, 5).map((h, i) => (
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
            ) : (
              <p className="empty-history">做完第一题，你的进步就从这里开始。</p>
            )}
          </div>
          <div className="record-actions">
            <button className="plain-button" onClick={reset}>
              重置记录
            </button>
            {state.backup && state.backup.total > 0 && (
              <button className="plain-button" onClick={restore}>
                恢复上次记录
              </button>
            )}
          </div>
          <div className="shortcut">
            <kbd>1</kbd> — <kbd>8</kbd> 选度数
            <br />
            <kbd>Space</kbd> 聆听 · <kbd>Enter</kbd> 提交 / 下一题
          </div>
        </aside>
      </div>
    </>
  );
}
