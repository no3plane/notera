import { DEGREE_NAMES, interval, letterPath } from '../lib/theory';
import type { NotePair } from '../lib/types';

export function IntervalExplanation({ a, b }: NotePair) {
  const r = interval(a, b),
    degree = DEGREE_NAMES[r.degree - 1] || r.degree;
  return (
    <>
      <div className="reason">
        <span className="reason-number">1</span>
        <div>
          <strong>数音名，确定度数</strong>
          <p>
            {letterPath(a, b).join(' → ')}，首尾都算
            <br />共 <b>{r.degree}</b> 个音名，所以是 <b>{degree}度</b>。
          </p>
        </div>
      </div>
      <div className="reason">
        <span className="reason-number">2</span>
        <div>
          <strong>数半音，确定性质</strong>
          <p>
            {r.perfect ? '纯' : '大'}
            {degree}度为 {r.baseline} 个半音
            <br />
            这里是 <b>{r.semitones}</b> 个
            {r.delta === 0
              ? '，正好是'
              : `，${r.delta > 0 ? '多' : '少'} ${Math.abs(r.delta)} 个，是`}{' '}
            <b>
              {r.quality}
              {degree}度
            </b>
            。
          </p>
        </div>
      </div>
    </>
  );
}
