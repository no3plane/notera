import { SAME_ROOT_FORMULAS } from '../lib/chordHarmony';
import { DIATONIC_SUS_LESSONS } from '../lib/diatonicSus';

const cMajor = DIATONIC_SUS_LESSONS[0];

export function DiatonicSusOverview({ onStart }: { onStart: () => void }) {
  return (
    <section
      className="practice-board chord-theory sus-overview"
      aria-labelledby="sus-overview-title"
    >
      <p className="sus-overview-label">练前总览 · 大调七个级数</p>
      <h2 id="sus-overview-title">只用调内音，哪些级数能挂留？</h2>
      <p>
        以和弦根音为 1。先检查调内有没有<strong>纯五度</strong>，再分别检查
        <strong>大二度</strong>和<strong>纯四度</strong>。
      </p>
      <dl className="sus-overview-formulas">
        <div>
          <dt>sus2 · {SAME_ROOT_FORMULAS.sus2}</dt>
          <dd>大二度＋纯五度</dd>
        </div>
        <div>
          <dt>sus4 · {SAME_ROOT_FORMULAS.sus4}</dt>
          <dd>纯四度＋纯五度</dd>
        </div>
      </dl>
      <table className="sus-overview-table">
        <caption>C 大调 · {cMajor.scale.join(' · ')}</caption>
        <thead>
          <tr>
            <th scope="col">级数</th>
            <th scope="col">调内可挂</th>
            <th scope="col">判定依据</th>
          </tr>
        </thead>
        <tbody>
          {cMajor.rows.map((row) => (
            <tr key={row.degree}>
              <th scope="row">
                <strong>{row.roman}</strong>
                <span>{row.symbol}</span>
              </th>
              <td className={row.answer === '两种都行' ? undefined : 'sus-overview-exception'}>
                {row.answer}
              </td>
              <td>{row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sus-overview-start">
        <p>换大调后，级数规律相同。本题按调内音判分，实际编配也可使用调外音。</p>
        <button className="primary" onClick={onStart}>
          开始练习 · 7 题
        </button>
      </div>
    </section>
  );
}
