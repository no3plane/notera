import { DEGREE_NAMES } from '../lib/theory';
import type { Quality } from '../lib/types';

interface Props {
  degreeOptions?: readonly { degree: number; label: string }[];
  degree: number | null;
  quality: Quality | null;
  disabled: boolean;
  onDegree: (value: number) => void;
  onQuality: (value: Quality) => void;
}
const DEFAULT_DEGREES = DEGREE_NAMES.map((label, i) => ({ degree: i + 1, label }));
export function AnswerChoices({
  degreeOptions = DEFAULT_DEGREES,
  degree,
  quality,
  disabled,
  onDegree,
  onQuality,
}: Props) {
  return (
    <>
      <div className="answer-title">01 / 它是几度？</div>
      <div
        className="answer-degrees"
        role="group"
        aria-label="选择度数"
        style={{ gridTemplateColumns: `repeat(${degreeOptions.length}, minmax(0, 1fr))` }}
      >
        {degreeOptions.map(({ degree: value, label }) => (
          <button
            key={value}
            data-degree={value}
            className={degree === value ? 'selected' : ''}
            aria-pressed={degree === value}
            disabled={disabled}
            onClick={() => onDegree(value)}
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
