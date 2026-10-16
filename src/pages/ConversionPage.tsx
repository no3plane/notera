import { useEffect, useRef, useState } from 'react';
import { Heading } from '../components/Heading';
import { Icon } from '../components/Icon';
import { NoteDisplay, NoteKeyboard } from '../components/NoteDisplay';
import { NOTE_FORMATS, notationLabel } from '../lib/notation';
import { LETTERS, midi } from '../lib/theory';
import type { ConversionController } from '../hooks/useConversion';
import type { ConversionSettings } from '../lib/conversion';
import type { Note, Page } from '../lib/types';

const label = (value: string) => NOTE_FORMATS.find((f) => f.value === value)?.label;
export function ConversionPage({
  controller,
  play,
  navigate,
}: {
  controller: ConversionController;
  play: (notes: Note[], simultaneous?: boolean) => Promise<void>;
  navigate: (page: Page) => void;
}) {
  const { session: s, dispatch } = controller;
  const [reference, setReference] = useState(false);
  const next = useRef<HTMLButtonElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const q = s.queue[s.index];
  const result = s.results[s.index];
  const done = s.index >= s.queue.length;
  const correct = s.results.filter((r) => r.correct).length;
  const average = s.results.length
    ? s.results.reduce((sum, r) => sum + r.time, 0) / s.results.length / 1000
    : 0;
  const streak = s.results.reduce((count, r) => (r.correct ? count + 1 : 0), 0);
  const start = (settings = s.settings) =>
    dispatch({ type: 'start', settings, now: performance.now() });
  const update = (key: 'source' | 'target', value: ConversionSettings['source']) => {
    const settings = { ...s.settings, [key]: value };
    if (settings.source !== 'any' && settings.source === settings.target)
      settings[key === 'source' ? 'target' : 'source'] = 'any';
    start(settings);
  };
  useEffect(() => {
    if (result) {
      next.current?.focus({ preventScroll: true });
      feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [result]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        done ||
        e.repeat ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        !(e.target instanceof Element) ||
        e.target.closest('select,input,textarea,[contenteditable="true"]')
      )
        return;
      if (!result && q.target !== 'piano' && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        dispatch({ type: 'answer', note: q.choices[Number(e.key) - 1], now: performance.now() });
      } else if (e.code === 'Space' && !e.target.closest('button,[role="button"]')) {
        e.preventDefault();
        void play([q.note]);
      } else if (result && e.key === 'Enter' && !e.target.closest('button')) {
        e.preventDefault();
        dispatch({ type: 'next', now: performance.now() });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dispatch, done, play, q, result]);
  return (
    <>
      <Heading
        eyebrow="CONNECT THE NOTES"
        description="在音名、简谱、唱名与琴键之间互相转换。每轮 12 题，选答案即判定。"
        side="先认准，再加快"
      >
        同一个音，<em>四种表达。</em>
      </Heading>
      <div className="practice-layout">
        <section className="practice-board conversion-board" aria-label="音符对应练习">
          <div className="practice-bar">
            <span>{done ? '本轮练习已完成' : `第 ${s.index + 1} / ${s.queue.length} 题`}</span>
            <select
              aria-label="音符范围"
              value={s.settings.level}
              onChange={(e) =>
                start({ ...s.settings, level: e.target.value as ConversionSettings['level'] })
              }
            >
              <option value="natural">自然音 · 基础</option>
              <option value="sharp">升号 · 进阶</option>
              <option value="flat">降号 · 进阶</option>
            </select>
          </div>
          <div className="progress-line">
            <i style={{ width: `${(s.index / s.queue.length) * 100}%` }} />
          </div>
          <div className="conversion-settings">
            <label>
              题目形式
              <select
                aria-label="题目形式"
                value={s.settings.source}
                onChange={(e) => update('source', e.target.value as ConversionSettings['source'])}
              >
                <option value="any">随机形式</option>
                {NOTE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <span aria-hidden="true">→</span>
            <label>
              作答形式
              <select
                aria-label="作答形式"
                value={s.settings.target}
                onChange={(e) => update('target', e.target.value as ConversionSettings['target'])}
              >
                <option value="any">随机形式</option>
                {NOTE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="notation-guide">
            1=C · 固定 Do · 音域 C4–B4
            {s.settings.level !== 'natural' &&
              ` · 黑键统一用${s.settings.level === 'sharp' ? '升' : '降'}号`}
            <br />
            切换范围或形式会开始新一轮。
          </p>
          {done ? (
            <div className="session-end">
              <p className="eyebrow" style={{ justifyContent: 'center' }}>
                CONNECTIONS MADE
              </p>
              <h2>又熟悉了一点。</h2>
              <div className="score-big">
                {correct}
                <span> / {s.queue.length}</span>
              </div>
              <p>
                正确率 {Math.round((correct / s.queue.length) * 100)}% · 平均每题{' '}
                {average.toFixed(1)} 秒<br />
                {correct === s.queue.length
                  ? '全部对应正确，试着换个方向，或加入升降音。'
                  : '回看下面的错题，再练一轮。'}
              </p>
              {s.results.some((r) => !r.correct) && (
                <div className="conversion-review">
                  {s.results.map(
                    (r, i) =>
                      !r.correct && (
                        <div className="conversion-review-row" key={i}>
                          <span>
                            {label(s.queue[i].source)} → {label(s.queue[i].target)}
                          </span>
                          <NoteDisplay note={s.queue[i].note} format="name" />
                          <span>
                            误选 <NoteDisplay note={r.answer} format="name" />
                          </span>
                        </div>
                      ),
                  )}
                </div>
              )}
              <button className="primary" onClick={() => start()}>
                再练一轮 →
              </button>
            </div>
          ) : (
            <>
              <p className="question-label">
                看{label(q.source)}，
                {q.target === 'piano' ? '点击对应的琴键' : `选出对应的${label(q.target)}`}。
              </p>
              <div className="conversion-prompt" key={s.index}>
                <NoteDisplay note={q.note} format={q.source} />
              </div>
              <div className="question-sound">
                <button onClick={() => void play([q.note])}>
                  <Icon name="speaker" />
                  听听这个音
                </button>
              </div>
              <div className="conversion-answer" aria-label={`用${label(q.target)}作答`}>
                <p className="answer-caption">
                  {q.target === 'piano' ? '在键盘上作答' : `选择${label(q.target)}`}
                </p>
                {q.target === 'piano' ? (
                  <NoteKeyboard
                    note={q.note}
                    selected={result ? midi(result.answer) : null}
                    correct={result ? midi(q.note) : undefined}
                    onPick={(note) => dispatch({ type: 'answer', note, now: performance.now() })}
                    disabled={!!result}
                    naturalOnly={s.settings.level === 'natural'}
                    flat={s.settings.level === 'flat'}
                  />
                ) : (
                  <div className="conversion-choices">
                    {q.choices.map((note, i) => (
                      <button
                        key={midi(note)}
                        aria-label={`选项 ${i + 1}：${notationLabel(note, q.target === 'piano' ? 'name' : q.target)}`}
                        className={
                          result
                            ? midi(note) === midi(q.note)
                              ? 'choice-correct'
                              : midi(note) === midi(result.answer)
                                ? 'choice-wrong'
                                : ''
                            : ''
                        }
                        disabled={!!result}
                        onClick={() => dispatch({ type: 'answer', note, now: performance.now() })}
                      >
                        <small>{i + 1}</small>
                        <NoteDisplay note={note} format={q.target} />
                        {result && midi(note) === midi(q.note) && (
                          <span className="choice-mark">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {result && (
                <div
                  ref={feedback}
                  className={`feedback ${result.correct ? '' : 'wrong'}`}
                  role="status"
                >
                  <strong>
                    {result.correct ? '✓ 对应正确！' : '再记一次这个对应。'} ·{' '}
                    {(result.time / 1000).toFixed(1)} 秒
                  </strong>
                  <div className="note-equivalents">
                    {NOTE_FORMATS.map((f) => (
                      <div key={f.value}>
                        <small>{f.label}</small>
                        <NoteDisplay note={q.note} format={f.value} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="submit-row">
                <span className="notation-guide">
                  {result ? '把四种表达连在一起记。' : '选答案即判定，准确后再追求速度。'}
                </span>
                {result && (
                  <button
                    className="primary"
                    ref={next}
                    onClick={() => dispatch({ type: 'next', now: performance.now() })}
                  >
                    {s.index === s.queue.length - 1 ? '查看本轮结果' : '下一题 →'}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
        <aside className="practice-side">
          <h2>本轮表现</h2>
          <div className="stats">
            <div className="stat">
              <b>
                {s.results.length ? Math.round((correct / s.results.length) * 100) : 0}
                <small>%</small>
              </b>
              <span>本轮正确率</span>
            </div>
            <div className="stat">
              <b>
                {s.results.length ? average.toFixed(1) : '—'}
                <small> s</small>
              </b>
              <span>平均作答时间</span>
            </div>
            <div className="stat">
              <b>
                {s.results.length}
                <small> / 12</small>
              </b>
              <span>已完成题目</span>
            </div>
            <div className="stat">
              <b>{streak}</b>
              <span>当前连续答对</span>
            </div>
          </div>
          <div className="practice-tip">
            <p className="eyebrow">ONE NOTE, FOUR WAYS</p>
            <h3>先把七个自然音连起来。</h3>
            <p>
              C 对应 1、Do；从 C 开始向右数白键，依次是 D、E、F、G、A、B。琴键左下方的 C4
              是位置参照。
            </p>
            <p>这里使用固定 Do：C 始终对应 Do。简谱以 1=C 为准，换调时对应关系会随之改变。</p>
          </div>
          <div className="practice-tip">
            <button
              className="reference-toggle"
              aria-expanded={reference}
              aria-controls="note-reference"
              onClick={() => setReference((v) => !v)}
            >
              {reference ? '收起' : '展开'}自然音对照表 <span>{reference ? '−' : '+'}</span>
            </button>
            {reference && (
              <table className="interval-table note-reference" id="note-reference">
                <thead>
                  <tr>
                    <th>音名</th>
                    <th>简谱</th>
                    <th>唱名</th>
                  </tr>
                </thead>
                <tbody>
                  {LETTERS.map((letter) => (
                    <tr key={letter}>
                      {(['name', 'numbered', 'solfege'] as const).map((format) => (
                        <td key={format}>
                          <NoteDisplay note={{ letter, acc: 0, octave: 4 }} format={format} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="practice-tip">
            <h3>对应熟练了，再判断音程。</h3>
            <p>把识音变成直觉，就能把注意力留给两个音的关系。</p>
            <button className="plain-button" onClick={() => navigate('practice')}>
              去练习音程 ↗
            </button>
          </div>
          <div className="shortcut">
            <kbd>1</kbd> — <kbd>4</kbd> 选择答案
            <br />
            <kbd>Enter</kbd> 下一题 · 琴键支持点击或 Tab 后 Enter
          </div>
        </aside>
      </div>
    </>
  );
}
