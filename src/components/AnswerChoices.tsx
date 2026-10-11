import { DEGREE_NAMES } from '../lib/theory';
import type { Quality } from '../lib/types';

interface Props {
  degree: number | null;
  quality: Quality | null;
  disabled: boolean;
  onDegree: (value: number) => void;
  onQuality: (value: Quality) => void;
}
export function AnswerChoices({ degree, quality, disabled, onDegree, onQuality }: Props) {
  return (
    <>
      <div className="answer-title">01 / 它是几度？</div>
      <div className="answer-degrees" role="group" aria-label="选择度数">
        {DEGREE_NAMES.map((label, i) => (
          <button
            key={i + 1}
            data-degree={i + 1}
            className={degree === i + 1 ? 'selected' : ''}
            aria-pressed={degree === i + 1}
            disabled={disabled}
            onClick={() => onDegree(i + 1)}
          >
            {label}度
          </button>
        ))}
      </div>
      <div className="answer-title">02 / 它是什么性质？</div>
      <div className="answer-qualities" role="group" aria-label="选择性质">
        {(['纯', '大', '小', '增', '减'] as const).map((value) => (
          <button
            key={value}
            data-quality={value}
            className={quality === value ? 'selected' : ''}
            aria-pressed={quality === value}
            disabled={disabled}
            onClick={() => onQuality(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </>
  );
}
