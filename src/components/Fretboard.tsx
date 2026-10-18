import type { CSSProperties } from 'react';
import { degreeAt, samePoint } from '../lib/fretboard';
import type { FretPoint, FretQuestion } from '../lib/fretboard';
export const positionLabel = (point: FretPoint) => `${point.string}弦 · 第${point.fret}品`;

export function Fretboard({
  question: q,
  selected,
  answered,
  resolved,
  showTarget,
  onSelect,
}: {
  question: FretQuestion;
  selected: FretPoint | null;
  answered: boolean;
  resolved: boolean;
  showTarget: boolean;
  onSelect: (point: FretPoint) => void;
}) {
  const frets = Array.from({ length: 5 }, (_, i) => q.startFret + i);
  return (
    <figure className="fret-figure">
      <div className="fret-grid" role="group" aria-label="练习指板">
        <div className="fret-grid-header" aria-hidden="true">
          <span />
          {frets.map((fret) => (
            <span key={fret}>{fret} 品</span>
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((string) => (
          <div
            key={string}
            className={`fret-row ${q.mode === 'locate' && string === q.target.string ? 'is-target-string' : ''}`}
            role="group"
            aria-label={`${string}弦`}
            style={{ '--string-weight': `${0.7 + string * 0.2}px` } as CSSProperties}
          >
            <span className="fret-string-label">{string}弦</span>
            {frets.map((fret) => {
              const point = { string, fret };
              const reference = samePoint(point, q.reference);
              const target = samePoint(point, q.target);
              const chosen = Boolean(selected && samePoint(point, selected));
              const incorrect = chosen && !target;
              const visibleTarget = target && (q.mode === 'recognize' || showTarget || resolved);
              const degree = reference
                ? q.reference.degree
                : target && (q.mode === 'recognize' ? answered : showTarget || resolved)
                  ? q.target.degree
                  : chosen
                    ? degreeAt(q.tonic, point)
                    : undefined;
              const clickable = q.mode === 'locate' && string === q.target.string && !resolved;
              return (
                <button
                  key={fret}
                  type="button"
                  className={`fret-cell ${reference ? 'is-reference' : ''} ${visibleTarget ? 'is-target' : ''} ${chosen ? 'is-chosen' : ''} ${incorrect ? 'is-wrong' : ''}`}
                  aria-label={`${positionLabel(point)}${reference ? `，参照音 ${degree}` : degree ? `，${degree}` : target && q.mode === 'recognize' ? '，待判断位置' : ''}`}
                  disabled={!clickable}
                  onClick={() => onSelect(point)}
                >
                  {(degree || visibleTarget) && <span className="fret-note">{degree ?? '?'}</span>}
                  {incorrect && <small>当前落点</small>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <figcaption>
        <span className="fret-legend" /> 已知参照音
        {q.mode === 'recognize' ? ' · 问号处为本题位置' : ` · 仅需在 ${q.target.string} 弦找音`} ·
        向右每品升高一个半音
      </figcaption>
    </figure>
  );
}
