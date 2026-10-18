import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import { DEGREE_NAMES, letterPath } from '../lib/theory';
import type { PracticeAction, Session } from '../lib/practice';
import type { Note, NoteFormat } from '../lib/types';
import { NoteDisplay } from './NoteDisplay';
import { AnswerChoices } from './AnswerChoices';
import { Icon } from './Icon';

export function PracticeQuestion({
  session: s,
  dispatch,
  play,
  format,
}: {
  session: Session;
  dispatch: Dispatch<PracticeAction>;
  play: (notes: Note[]) => Promise<void>;
  format: NoteFormat;
}) {
  const q = s.queue[s.index],
    r = q.result,
    feedback = useRef<HTMLDivElement>(null);
  const correct = s.results.at(-1)?.correct;
  useEffect(() => {
    if (s.revealed) feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [s.revealed]);
  return (
    <>
      <p className="question-label">这两个音，构成什么音程？</p>
      <div className={`question-notes ${format === 'piano' ? 'question-keyboards' : ''}`}>
        <NoteDisplay note={q.a} format={format} showSpelling />
        <span>→</span>
        <NoteDisplay note={q.b} format={format} showSpelling />
      </div>
      <div className="question-sound">
        <button onClick={() => void play([q.a, q.b])}>
          <Icon name="speaker" />
          听听这两个音
        </button>
      </div>
      <AnswerChoices
        degree={s.degree}
        quality={s.quality}
        disabled={s.revealed}
        onDegree={(value) => dispatch({ type: 'degree', value })}
        onQuality={(value) => dispatch({ type: 'quality', value })}
      />
      {s.revealed ? (
        <div ref={feedback} className={`feedback ${correct ? '' : 'wrong'}`} role="status">
          <strong>
            {correct
              ? '✓ 判断正确！'
              : `再看一眼：你选了${s.quality}${DEGREE_NAMES[(s.degree ?? 1) - 1]}度。`}{' '}
            {r.title} · {r.semitones} 个半音
          </strong>
          <p>
            {letterPath(q.a, q.b).join(' → ')}，共 {r.degree} 个音名。{r.perfect ? '纯' : '大'}
            {DEGREE_NAMES[r.degree - 1]}度的标准距离是 {r.baseline} 个半音；这里
            {r.delta === 0 ? '距离相同' : `相差 ${r.delta > 0 ? '+' : ''}${r.delta} 个半音`}，所以是
            {r.title}。{s.hint && '（本题使用了提示）'}
          </p>
        </div>
      ) : (
        s.hint && (
          <div className="hint-box">
            先忽略升降号：{letterPath(q.a, q.b).join(' → ')}
            。把首尾都算进去，再对照这个度数的标准半音数。
          </div>
        )
      )}
      <div className="submit-row">
        {s.revealed ? (
          <>
            <button
              className="primary"
              data-action="next"
              onClick={() => dispatch({ type: 'next', now: performance.now() })}
            >
              {s.index === s.queue.length - 1 ? '查看本轮结果' : '下一题 →'}
            </button>
          </>
        ) : (
          <>
            <button className="plain-button" onClick={() => dispatch({ type: 'hint' })}>
              <Icon name="bulb" />
              给我一点提示
            </button>
            <button
              className="primary"
              data-action="submit"
              disabled={!s.degree || !s.quality}
              onClick={() => dispatch({ type: 'submit', now: performance.now() })}
            >
              确认答案 ↗
            </button>
          </>
        )}
      </div>
    </>
  );
}
