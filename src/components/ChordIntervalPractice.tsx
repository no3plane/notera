import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { PracticeChordFamily } from '../lib/chordHarmony';
import {
  CHORD_INTERVAL_CHOICES,
  CHORD_INTERVAL_LABELS,
  chordIntervalFrame,
  chordIntervalQuestions,
  chordIntervalStorageKey,
  intervalAnswersComplete,
  intervalAnswersCorrect,
  newChordIntervalSession,
  readChordIntervalSession,
} from '../lib/chordIntervals';
import type {
  ChordIntervalQuestion,
  ChordIntervalRole,
  ChordIntervalSession,
} from '../lib/chordIntervals';
import './chordIntervals.css';

export function ChordIntervalPractice({
  family = 'triad',
  familySwitch,
}: {
  family?: PracticeChordFamily;
  familySwitch?: ReactNode;
}) {
  const questions = useMemo(() => chordIntervalQuestions(family), [family]);
  const [session, setSession] = useState(() => readChordIntervalSession(family, questions));
  const question = questions.find((item) => item.id === session.questionId)!;
  const sessions = useRef(new Map<string, ChordIntervalSession>());
  const chordTabs = [...questions].sort((a, b) => b.voicing.rootString - a.voicing.rootString);
  const { start, frets } = chordIntervalFrame(question.voicing);
  const complete = intervalAnswersComplete(question, session.answers);
  const correct = intervalAnswersCorrect(question, session.answers);
  const choices = CHORD_INTERVAL_CHOICES[family];

  useEffect(() => {
    sessions.current.set(session.questionId, session);
    try {
      localStorage.setItem(chordIntervalStorageKey(family), JSON.stringify(session));
    } catch {
      // Practice remains usable when browser storage is unavailable.
    }
  }, [family, session]);

  function choose(role: ChordIntervalRole) {
    setSession((current) => {
      const answers = [...current.answers];
      answers[current.active] = role;
      const next = question.answers.findIndex((answer, i) => answer !== null && !answers[i]);
      return { ...current, answers, checked: false, active: next < 0 ? current.active : next };
    });
  }

  function selectQuestion(item: ChordIntervalQuestion) {
    if (item.id === question.id) return;
    sessions.current.set(session.questionId, session);
    setSession(sessions.current.get(item.id) ?? newChordIntervalSession(item));
  }

  function submit() {
    if (!complete) return;
    if (session.checked && correct) {
      setSession(newChordIntervalSession(question));
    } else {
      setSession((current) => ({ ...current, checked: true }));
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey ||
        (event.target instanceof Element &&
          event.target.closest('button,select,input,textarea,[contenteditable]'))
      )
        return;
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const description = question.voicing.frets
    .map((fret, i) => `第${6 - i}弦${fret === null ? '不弹' : fret === 0 ? '空弦' : `${fret}品`}`)
    .join('，');
  return (
    <section className="chord-interval-practice" aria-label="指型音程练习">
      {familySwitch && <div className="chord-interval-scope">{familySwitch}</div>}
      <div className="chord-interval-stage">
        <div
          className="chord-interval-tabs"
          role="group"
          aria-label="选择和弦"
          style={
            {
              '--interval-group-tabs': chordTabs.length / 2,
            } as CSSProperties
          }
        >
          {([6, 5] as const).map((rootString) => (
            <div className="chord-interval-tab-group" key={rootString}>
              {chordTabs
                .filter((item) => item.voicing.rootString === rootString)
                .map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={item.id === question.id}
                    onClick={() => selectQuestion(item)}
                  >
                    {item.symbol}
                  </button>
                ))}
            </div>
          ))}
        </div>
        <div
          className="chord-interval-neck"
          role="group"
          aria-label={`${question.symbol} 指板：${description}`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={`wire-${i}`}
              className={`chord-interval-wire${i === 0 && start === 1 ? ' is-nut' : ''}`}
              style={{ top: `calc(56px + ${i} * var(--interval-fret-step))` }}
              aria-hidden="true"
            />
          ))}
          {frets.map((fret, i) => (
            <span
              className="chord-interval-fret"
              key={fret}
              style={{ top: `calc(56px + ${i + 0.5} * var(--interval-fret-step))` }}
              aria-hidden="true"
            >
              {fret}
            </span>
          ))}
          {question.voicing.frets.map((fret, i) => {
            const position: CSSProperties = {
              left: `calc(24px + (100% - 24px) * ${(i + 0.5) / 6})`,
            };
            const answer = session.answers[i];
            const result = session.checked
              ? answer === question.answers[i]
                ? 'correct'
                : 'wrong'
              : undefined;
            return (
              <div key={i}>
                <span
                  className="chord-interval-string"
                  style={{ ...position, width: `${2.3 - i * 0.26}px` }}
                  aria-hidden="true"
                />
                {fret === null ? (
                  <span
                    className="chord-interval-muted"
                    style={{ ...position, top: 28 }}
                    aria-label={`第${6 - i}弦不弹`}
                  >
                    ×
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`chord-interval-point${fret > 0 ? ' is-fretted' : ''}`}
                    style={{
                      ...position,
                      top:
                        fret === 0
                          ? 28
                          : `calc(56px + ${fret - start + 0.5} * var(--interval-fret-step))`,
                    }}
                    aria-label={`第${6 - i}弦，${answer ?? '未填写'}${result ? `，${result === 'correct' ? '正确' : '需修改'}` : ''}`}
                    aria-pressed={session.active === i}
                    data-result={result}
                    onClick={() => setSession((current) => ({ ...current, active: i }))}
                  >
                    {answer ?? '?'}
                    {result && (
                      <span className="chord-interval-mark" aria-hidden="true">
                        {result === 'correct' ? '✓' : '×'}
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="chord-interval-choices"
          style={{ '--interval-choice-count': choices.length } as CSSProperties}
          role="group"
          aria-label="选择音程"
        >
          {choices.map((role) => (
            <button
              type="button"
              key={role}
              aria-label={`${role}，${CHORD_INTERVAL_LABELS[role]}`}
              aria-pressed={session.answers[session.active] === role}
              onClick={() => choose(role)}
            >
              {role}
            </button>
          ))}
        </div>
        <div className="chord-interval-actions">
          <div role="status" aria-live="polite" className="chord-interval-result">
            {session.checked &&
              (correct
                ? '全部正确 ✓'
                : question.answers
                    .flatMap((role, i) =>
                      role !== null && role !== session.answers[i]
                        ? [`${6 - i}弦：${session.answers[i]} → ${role}`]
                        : [],
                    )
                    .join('；'))}
          </div>
          <button type="button" className="primary" disabled={!complete} onClick={submit}>
            {session.checked && correct ? '再练一次' : '检查答案'}
          </button>
        </div>
      </div>
    </section>
  );
}
