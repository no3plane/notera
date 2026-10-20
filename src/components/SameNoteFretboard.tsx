import { useId } from 'react';
import type { CSSProperties } from 'react';
import { samePoint } from '../lib/fretboard';
import type { FretPoint } from '../lib/fretboard';
import { sameNoteName } from '../lib/sameNote';
import type { SameNoteQuestion } from '../lib/sameNote';
import { positionLabel } from './Fretboard';

export function SameNoteFretboard({
  question: q,
  selected,
  reveal,
  resolved,
  onSelect,
}: {
  question: SameNoteQuestion;
  selected: FretPoint | null;
  reveal: boolean;
  resolved: boolean;
  onSelect: (point: FretPoint) => void;
}) {
  const arrow = useId();
  const frets = Array.from({ length: 5 }, (_, i) => q.startFret + i);
  const x = (p: FretPoint) => (p.fret - q.startFret + 0.5) * 100;
  const y = (p: FretPoint) => (p.string - 0.5) * 49;
  const shift = q.target.fret - q.reference.fret;
  const shiftLabel = shift === 0 ? '同品位' : `${shift > 0 ? '+' : '−'}${Math.abs(shift)} 品`;
  return (
    <figure className="fret-figure same-note-figure">
      <div role="group" aria-label="同音搬运指板">
        <div className="fret-grid-header" aria-hidden="true">
          <span />
          {frets.map((fret) => (
            <span key={fret}>{fret} 品</span>
          ))}
        </div>
        <div className="same-note-surface">
          {[1, 2, 3, 4, 5, 6].map((string) => (
            <div
              key={string}
              className={`fret-row ${string === q.target.string ? 'is-target-string' : ''}`}
              role="group"
              aria-label={`${string}弦`}
              style={{ '--string-weight': `${0.7 + string * 0.2}px` } as CSSProperties}
            >
              <span className="fret-string-label">{string}弦</span>
              {frets.map((fret) => {
                const point = { string, fret };
                const reference = samePoint(point, q.reference);
                const target = reveal && samePoint(point, q.target);
                const wrong = Boolean(
                  selected && samePoint(point, selected) && !samePoint(point, q.target),
                );
                const note = reference || target ? sameNoteName(q.reference) : wrong ? '×' : '';
                return (
                  <button
                    key={fret}
                    type="button"
                    className={`fret-cell ${reference ? 'is-reference' : ''} ${target ? 'is-target' : ''} ${wrong ? 'is-wrong' : ''}`}
                    aria-label={`${positionLabel(point)}${reference ? `，参照音 ${note}` : target ? `，答案 ${note}` : wrong ? '，错误落点' : ''}`}
                    disabled={string !== q.target.string || resolved}
                    onClick={() => onSelect(point)}
                  >
                    {note && <span className="fret-note">{note}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {reveal && (
            <svg
              className="same-note-route"
              viewBox="0 0 500 294"
              preserveAspectRatio="none"
              role="img"
              aria-label={`移动路径：${positionLabel(q.reference)}到${positionLabel(q.target)}，${shiftLabel}`}
            >
              <defs>
                <marker
                  id={arrow}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </marker>
              </defs>
              <path
                d={`M ${x(q.reference)} ${y(q.reference)} L ${x(q.target)} ${y(q.target)}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 4"
                markerEnd={`url(#${arrow})`}
              />
              <text
                x={(x(q.reference) + x(q.target)) / 2 + 15}
                y={(y(q.reference) + y(q.target)) / 2 - 8}
                className="same-note-shift"
              >
                {shiftLabel}
              </text>
            </svg>
          )}
        </div>
      </div>
      <figcaption>
        <span className="fret-legend" /> 已知音 · 高亮行为目标弦 · 细弦在上，粗弦在下 · 向右品号增加
      </figcaption>
    </figure>
  );
}
