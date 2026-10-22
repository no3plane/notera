import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { Session, PracticeAction } from '../lib/practice';
import type { Note, NoteFormat } from '../lib/types';
import { KIND_LABELS } from '../lib/exercises';
import { NoteDisplay } from './NoteDisplay';
import { Icon } from './Icon';

export function ExerciseQuestion({
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
  const exercise = s.queue[s.index].exercise!;
  const selected = s.selected ?? [];
  const correct = s.results.at(-1)?.correct;
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (s.revealed) feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [s.revealed]);
  const multi = exercise.answer.length > 1;
  const keyboardChoices = exercise.kind === 'chord-tones-forward';
  const audible = s.revealed ? exercise.notes : exercise.listenBefore;
  return (
    <>
      <div className="exercise-heading">
        <p className="exercise-kind">{KIND_LABELS[exercise.kind]}</p>
        <p className="exercise-context">{exercise.context}</p>
        <h2>{exercise.title}</h2>
      </div>
      {exercise.kind === 'build-note' && (
        <div className="question-notes derive-notes">
          <NoteDisplay note={exercise.notes[0]} format={format} showSpelling />
          <span>{exercise.id.endsWith(':-1') ? '↘' : '↗'}</span>
          {s.revealed ? (
            <NoteDisplay note={exercise.notes[1]} format={format} showSpelling />
          ) : (
            <b className="unknown-note">?</b>
          )}
        </div>
      )}
      {audible && audible.length > 0 && (
        <div className="question-sound">
          <button onClick={() => void play(audible)}>
            <Icon name="speaker" />
            {s.revealed ? '听听答案' : exercise.kind === 'build-note' ? '听起点音' : '听听题目'}
          </button>
        </div>
      )}
      <div className="answer-title">
        {multi ? `选择三个构成音 · 已选 ${selected.length} / 3` : '选择答案'}
      </div>
      <div
        className={`exercise-choices ${exercise.kind === 'build-note' ? 'note-choices' : ''}`}
        role="group"
        aria-label={multi ? '选择三个构成音' : '选择答案'}
      >
        {exercise.choices.map((choice) => {
          const chosen = selected.includes(choice);
          const answer = s.revealed && exercise.answer.includes(choice);
          return (
            <button
              key={choice}
              className={`${chosen ? 'selected' : ''} ${answer ? 'answer-correct' : ''} ${s.revealed && chosen && !answer ? 'answer-wrong' : ''}`}
              aria-pressed={chosen}
              aria-label={choice}
              aria-keyshortcuts={keyboardChoices ? choice : undefined}
              disabled={s.revealed || (multi && selected.length === 3 && !chosen)}
              onClick={() => dispatch({ type: 'choice', value: choice })}
            >
              {choice}
            </button>
          );
        })}
      </div>
      {s.revealed ? (
        <div ref={feedback} className={`feedback ${correct ? '' : 'wrong'}`} role="status">
          <strong>
            {correct ? '✓ 回答正确！' : `你选了 ${selected.join(' · ')}。`} 正确答案：
            {exercise.answer.join(' · ')}
          </strong>
          <p>
            {exercise.explanation}
            {s.hint && '（本题使用了提示）'}
          </p>
        </div>
      ) : (
        s.hint && <div className="hint-box">{exercise.hint}</div>
      )}
      <div className="submit-row">
        {s.revealed ? (
          <button
            className="primary"
            data-action="next"
            onClick={() => dispatch({ type: 'next', now: performance.now() })}
          >
            {s.index === s.queue.length - 1 ? '查看本轮结果' : '下一题 →'}
          </button>
        ) : (
          <>
            <button className="plain-button" onClick={() => dispatch({ type: 'hint' })}>
              <Icon name="bulb" />
              给我一点提示
            </button>
            <button
              className="primary"
              data-action="submit"
              disabled={selected.length !== exercise.answer.length}
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
