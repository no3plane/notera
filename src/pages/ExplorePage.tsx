import type { Dispatch, SetStateAction } from 'react';
import { Heading } from '../components/Heading';
import { Icon } from '../components/Icon';
import { Guitar, Piano, SemitoneStairs } from '../components/Instruments';
import { IntervalExplanation } from '../components/IntervalExplanation';
import { NotePicker } from '../components/NotePicker';
import {
  DEGREE_NAMES,
  fromMidi,
  interval,
  letterPath,
  makeQuestion,
  midi,
  name,
} from '../lib/theory';
import type { Exploration, InstrumentView, Note, NoteKey, Page } from '../lib/types';
import type { PresetName } from '../lib/presets';

interface Props {
  state: Exploration;
  setState: Dispatch<SetStateAction<Exploration>>;
  navigate: (page: Page) => void;
  preset: (name: PresetName) => void;
  play: (notes: Note[], simultaneous?: boolean) => Promise<void>;
}
export function ExplorePage({ state, setState, navigate, preset, play }: Props) {
  const r = interval(state.a, state.b),
    path = letterPath(state.a, state.b);
  const changeNote = (key: NoteKey, note: Note) =>
    setState((s) => ({ ...s, [key]: note, active: key }));
  const pick = (pitch: number) => {
    const previous = state[state.active];
    const note = pitch === midi(previous) ? previous : fromMidi(pitch, state.flat);
    changeNote(state.active, note);
    void play([note]);
  };
  const views: { view: InstrumentView; label: string }[] = [
    { view: 'guitar', label: '吉他指板' },
    { view: 'piano', label: '钢琴键盘' },
    { view: 'steps', label: '半音阶梯' },
  ];
  const instrumentProps = { a: state.a, b: state.b, flat: state.flat, onPick: pick };
  return (
    <>
      <Heading
        eyebrow="THE INTERVAL LAB"
        description="从指板上的距离，到音名之间的关系。动手选两个音，发现音程的规律。"
      >
        两个音之间，<em>是什么关系？</em>
      </Heading>
      <section className="workspace" aria-label="音程探索工作区">
        <div className="explorer">
          <div className="workspace-top">
            <div className="segmented" role="group" aria-label="可视化方式">
              {views.map(({ view, label }) => (
                <button
                  key={view}
                  className={state.view === view ? 'active' : ''}
                  aria-pressed={state.view === view}
                  onClick={() => setState((s) => ({ ...s, view }))}
                >
                  <Icon name={view} />
                  {label}
                </button>
              ))}
            </div>
            <button
              className="plain-button"
              onClick={() => {
                const q = makeQuestion('mixed');
                setState((s) => ({ ...s, a: q.a, b: q.b }));
              }}
            >
              <Icon name="shuffle" />
              换一组音
            </button>
          </div>
          <div className="visual-heading">
            <h2>
              {
                {
                  guitar: '把音程放到指板上',
                  piano: '在琴键上看见距离',
                  steps: '每一步，都是一个半音',
                }[state.view]
              }
            </h2>
            <span>
              {state.view === 'guitar'
                ? '标准调弦 · E A D G B E'
                : state.view === 'piano'
                  ? '白键与黑键之间，都是半音'
                  : '音高距离 ≠ 音名数量'}
            </span>
          </div>
          <div className="instrument-shell">
            {state.view === 'guitar' ? (
              <Guitar {...instrumentProps} />
            ) : state.view === 'piano' ? (
              <Piano {...instrumentProps} />
            ) : (
              <SemitoneStairs {...instrumentProps} />
            )}
            <div className="note-selector-strip">
              <span>
                点击{state.view === 'guitar' ? '指板' : state.view === 'piano' ? '琴键' : '音点'}
                设置
              </span>
              {(['a', 'b'] as const).map((key) => (
                <button
                  key={key}
                  className={state.active === key ? 'active' : ''}
                  onClick={() => setState((s) => ({ ...s, active: key }))}
                >
                  <i className="legend-dot" />
                  {key === 'a' ? '起始音' : '目标音'} {name(state[key])}
                </button>
              ))}
            </div>
          </div>
          <div className="visual-foot">
            <p>
              {state.view === 'guitar'
                ? '同一根弦上，相邻两品相差一个半音。'
                : state.view === 'piano'
                  ? '相邻两个琴键相差一个半音，包括黑键。'
                  : '数的是移动步数，不是音点数量。'}
            </p>
            <div className="legend">
              <span>
                <i />
                起始音
              </span>
              <span>
                <i />
                目标音
              </span>
            </div>
          </div>
          <div className="step-panel">
            <p className="section-label">先看音名 · 首尾都要数</p>
            <div className="letter-flow">
              {path.map((letter, i) => (
                <div
                  key={i}
                  className={`letter-node ${i === 0 ? 'endpoint' : ''} ${i === path.length - 1 ? 'endpoint end' : ''}`}
                >
                  <b>{letter}</b>
                  <small>第 {i + 1} 个</small>
                </div>
              ))}
            </div>
            <p className="step-note">
              {name(r.low, false)} 到 {name(r.high, false)}，经过 <strong>{r.degree} 个音名</strong>
              ，所以是 <strong>{DEGREE_NAMES[r.degree - 1] || r.degree}度</strong>。
              {r.descending && '（当前为下行音程）'}
            </p>
          </div>
        </div>
        <aside className="inspector">
          <div className="inspector-heading">
            选择两个音 <small>YOUR NOTES</small>
          </div>
          <div className="note-inputs">
            <NotePicker
              note={state.a}
              noteKey="a"
              active={state.active === 'a'}
              onChange={(note) => changeNote('a', note)}
            />
            <button
              className="swap"
              aria-label="交换两个音"
              onClick={() => setState((s) => ({ ...s, a: s.b, b: s.a }))}
            >
              ⇄
            </button>
            <NotePicker
              note={state.b}
              noteKey="b"
              active={state.active === 'b'}
              onChange={(note) => changeNote('b', note)}
            />
          </div>
          <div className="result" aria-live="polite">
            <p className="result-label">这两个音构成</p>
            <h2 className="result-title">{r.title}</h2>
            <div className="result-meta">
              <b>{r.short}</b>
              <span>{r.semitones} 个半音</span>
              <span>·</span>
              <span>{r.semitones === 0 ? '同音高' : r.descending ? '下行' : '上行'}</span>
            </div>
            <div className="sound-buttons">
              <button onClick={() => void play([state.a, state.b])}>
                <Icon name="play" />
                依次聆听
              </button>
              <button onClick={() => void play([state.a, state.b], true)}>
                <Icon name="speaker" />
                同时聆听
              </button>
            </div>
            {state.b.acc !== 0 && (
              <button
                className="respell"
                onClick={() => {
                  const b = fromMidi(midi(state.b), state.b.acc > 0);
                  setState((s) => ({ ...s, b, flat: b.acc < 0 }));
                }}
              >
                等音换写 → {name(fromMidi(midi(state.b), state.b.acc > 0))} ↗
              </button>
            )}
          </div>
          <div className="reasoning">
            <IntervalExplanation a={state.a} b={state.b} />
          </div>
          <div className="rule-chip">
            <Icon name="bulb" />
            {r.degree > 8
              ? '这是复音程；一至八度练习请缩小八度范围。'
              : r.quality.startsWith('重')
                ? '这是重增或重减音程，进阶拼写也会遇到。'
                : '升降号改变半音距离，不改变字母音名。'}
          </div>
        </aside>
      </section>
      <section className="below">
        <div className="guide">
          <div className="guide-header">
            <h2>试一试，发现一点规律</h2>
            <button onClick={() => navigate('learn')}>查看音程笔记 ↗</button>
          </div>
          <div className="preset-row">
            <button className="preset" onClick={() => preset('third')}>
              <small>01 / 大与小</small>
              <b>C → E♭</b>
              <span className="preset-arrow">↗</span>
              <p>少一个半音，会发生什么？</p>
            </button>
            <button className="preset" onClick={() => preset('enharmonic')}>
              <small>02 / 同音，异名</small>
              <b>C → F♯</b>
              <span className="preset-arrow">↗</span>
              <p>换成 G♭，还是同一个音程吗？</p>
            </button>
            <button className="preset" onClick={() => preset('augmented')}>
              <small>03 / 纯与增</small>
              <b>C → G♯</b>
              <span className="preset-arrow">↗</span>
              <p>纯五度，再往前走一品。</p>
            </button>
          </div>
        </div>
        <div className="practice-callout">
          <div>
            <h3>看懂了？练到一眼认出。</h3>
            <p>10 道小练习，让判断越来越快。</p>
          </div>
          <button
            className="round-arrow"
            aria-label="开始反应练习"
            onClick={() => navigate('practice')}
          >
            ↗
          </button>
        </div>
      </section>
    </>
  );
}
