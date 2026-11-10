import { useEffect, useRef, useState } from 'react';
import { usePracticeMetronome } from '../hooks/usePracticeMetronome';
import { shuffle } from '../lib/exercises';
import { SUS_GUITAR_GROUPS } from '../lib/guitarSusChords';
import type { SusGuitarRoot } from '../lib/guitarSusChords';

const beats = [1, 2, 3, 4] as const;
const tempos = [40, 50, 60, 70, 80, 90, 100, 110, 120];
const loops = 4;
const cueLead = 2;
const timings = [
  [1, 2],
  [1, 3],
  [2, 3],
  [2, 4],
  [3, 4],
] as const;
type Cue = { chord: string; enter: number; release: number };

export function GuitarSusConnection({ root }: { root: SusGuitarRoot }) {
  const { progression, comparison } = SUS_GUITAR_GROUPS[root];
  const [sus2, , sus4] = comparison;
  const [tempo, setTempo] = useState(60);
  const [cues, setCues] = useState<Cue[]>([]);
  const { phase, beat, notice, start, stop } = usePracticeMetronome();
  const board = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const active = phase === 'starting' || phase === 'playing';
  const complete = phase === 'complete';
  const playingBeat = phase === 'playing' ? beat - beats.length : -1;
  const countIn = phase === 'playing' && playingBeat < 0;
  const loopLength = progression.length * beats.length;
  const loop = Math.floor(playingBeat / loopLength);
  const offset = playingBeat % loopLength;
  const bar = Math.floor(offset / beats.length);
  const beatInBar = phase === 'playing' ? (beat % beats.length) + 1 : 0;
  const target = progression.findIndex((chord) => chord === root);
  const targetBeat = target * beats.length;
  const cue =
    offset >= targetBeat - cueLead && offset < targetBeat + beats.length ? cues[loop] : undefined;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const panel = board.current;
    if (
      (active || complete) &&
      panel &&
      panel.getBoundingClientRect().bottom > window.innerHeight
    ) {
      panel.scrollIntoView({ block: 'start' });
    }
  }, [active, complete]);

  function toggle() {
    if (active) {
      stop();
      return;
    }
    setCues(
      shuffle(
        [sus2.symbol, sus4.symbol].flatMap((chord) =>
          shuffle(timings)
            .slice(0, loops / 2)
            .map(([enter, release]) => ({ chord, enter, release })),
        ),
      ),
    );
    void start(tempo, beats.length + loops * loopLength, beats.length);
  }

  return (
    <section
      className="guitar-board guitar-connection"
      aria-label="挂留和弦连接练习"
      data-playing={active || undefined}
      ref={board}
    >
      <div className="guitar-board-header">
        <span>{root} 组 · 和弦连接</span>
        <span>4/4 拍 · 每个和弦一小节</span>
      </div>
      <h2 ref={heading} tabIndex={-1} className="guitar-stage-heading">
        跟着四小节谱换和弦
      </h2>
      <div className="guitar-loop-controls">
        <label>
          速度
          <select
            value={tempo}
            disabled={active}
            onChange={(event) => setTempo(Number(event.target.value))}
          >
            {tempos.map((value) => (
              <option key={value} value={value}>
                {value} BPM
              </option>
            ))}
          </select>
        </label>
        <button className={active ? 'guitar-secondary' : 'guitar-primary'} onClick={toggle}>
          {active ? '停止节拍' : complete ? '再练一轮' : '开始连接'}
        </button>
      </div>
      {!active && !complete && (
        <p className="guitar-description">到 {root} 小节前两拍，谱上会标出挂上和回原的位置。</p>
      )}
      <p className="guitar-loop-announcement" role="status">
        {cue && `第 ${cue.enter} 拍换 ${cue.chord}，第 ${cue.release} 拍回 ${root}`}
      </p>
      <p className="guitar-loop-status" role="status">
        {phase === 'starting'
          ? '准备开始'
          : countIn
            ? '预数四拍'
            : loop >= 0
              ? `第 ${loop + 1} / ${loops} 圈 · 第 ${bar + 1} 小节`
              : complete
                ? '本轮连接完成'
                : `共 ${loops} 圈 · 开始前预数四拍`}
      </p>
      <table className="guitar-loop-score" aria-label="四小节节拍谱">
        <thead>
          <tr>
            <th scope="col">小节</th>
            {beats.map((value) => (
              <th
                key={value}
                scope="col"
                aria-current={countIn && value === beatInBar ? 'step' : undefined}
              >
                {value}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {progression.map((chord, i) => {
            const rowCue = i === target ? cue : undefined;
            return (
              <tr
                key={i}
                data-current={bar === i || undefined}
                data-target={i === target || undefined}
              >
                <th scope="row" aria-label={`第 ${i + 1} 小节 ${chord}`}>
                  <small>{i + 1}</small>
                  <strong>{chord}</strong>
                </th>
                {beats.map((value) => {
                  const suspended =
                    rowCue !== undefined && value >= rowCue.enter && value < rowCue.release;
                  const action =
                    rowCue?.enter === value ? '挂上' : rowCue?.release === value ? '回原' : '';
                  const sounding = suspended ? rowCue.chord : chord;
                  const showChord = value === 1 || Boolean(action);
                  return (
                    <td
                      key={value}
                      aria-current={bar === i && value === beatInBar ? 'step' : undefined}
                      aria-label={`第 ${value} 拍，${action || (showChord ? '弹' : '延续')} ${sounding}`}
                      data-suspended={suspended || undefined}
                    >
                      {showChord ? <strong>{sounding}</strong> : <span aria-hidden="true">·</span>}
                      {action && <small>{action}</small>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="guitar-loop-key">· 延续前一拍</p>
      {notice && (
        <p className="guitar-description" role="status">
          {notice}
        </p>
      )}
      {complete && (
        <div className="guitar-loop-review" aria-label="本轮连接自评">
          {[
            ['steady', '挂上和回来时，拍子稳住了吗？', '稳住了', '有停拍'],
            ['entry', '下一个和弦接在第一拍了吗？', '接上了', '有抢拍或拖拍'],
          ].map(([id, question, yes, no]) => (
            <fieldset key={id}>
              <legend>{question}</legend>
              <label>
                <input type="radio" name={id} value="yes" />
                {yes}
              </label>
              <label>
                <input type="radio" name={id} value="no" />
                {no}
              </label>
            </fieldset>
          ))}
        </div>
      )}
    </section>
  );
}
