import { useId } from 'react';
import type { StringQuestion } from '../lib/stringIntervals';

const OPEN_NOTE_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];

export function StringIntervalFretboard({
  from,
  to,
  showOpenNotes = true,
}: StringQuestion & { showOpenNotes?: boolean }) {
  const arrowId = useId();
  const y = (string: number) => 44 + (string - 1) * 32;
  const boardLeft = 90,
    fretWidth = 78,
    markerX = boardLeft + fretWidth * 2.5;
  const route = `M ${markerX + 18} ${y(from)} H ${markerX + 70} V ${y(to)} H ${markerX + 18}`;
  const arrowColor = '#946800';
  return (
    <figure className="string-fretboard">
      <svg
        viewBox="0 0 600 244"
        role="img"
        aria-label={`弦间音程指板：起点 ${from} 弦，终点 ${to} 弦，同在第 3 品`}
      >
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 1 1 L 8 5 L 1 9" fill="none" stroke={arrowColor} strokeWidth="1.5" />
          </marker>
        </defs>
        <rect x={boardLeft} y="28" width={fretWidth * 5} height="192" rx="4" fill="#f5f2e9" />
        <rect x={boardLeft + fretWidth * 2} y="28" width={fretWidth} height="192" fill="#e9efdf" />
        {[0, 1, 2, 3, 4, 5].map((fret) => (
          <line
            key={fret}
            x1={boardLeft + fret * fretWidth}
            x2={boardLeft + fret * fretWidth}
            y1="28"
            y2="220"
            stroke="#c0c5b4"
            strokeWidth={fret === 0 ? 5 : 2}
          />
        ))}
        {[1, 2, 3, 4, 5].map((fret) => (
          <text
            key={fret}
            x={boardLeft + (fret - 0.5) * fretWidth}
            y="17"
            textAnchor="middle"
            className="string-fret-number"
          >
            {fret} 品
          </text>
        ))}
        {[1, 2, 3, 4, 5, 6].map((string) => (
          <g key={string}>
            <text x="75" y={y(string) + 4} textAnchor="end" className="string-board-label">
              {`${string} 弦${showOpenNotes ? ` · ${OPEN_NOTE_NAMES[string - 1]}` : ''}`}
            </text>
            <line
              x1={boardLeft}
              x2="480"
              y1={y(string)}
              y2={y(string)}
              stroke={string === from || string === to ? '#9ca58f' : '#b6bbac'}
              strokeWidth={0.7 + string * 0.3}
            />
          </g>
        ))}
        <path d={route} fill="none" stroke="white" strokeWidth="6" strokeLinejoin="round" />
        <path
          d={route}
          fill="none"
          stroke={arrowColor}
          strokeWidth="3"
          strokeLinejoin="round"
          markerEnd={`url(#${arrowId})`}
        />
        <circle cx={markerX} cy={y(from)} r="14" fill="var(--green)" />
        <text x={markerX} y={y(from) + 4} textAnchor="middle" fill="white" fontSize="11">
          起
        </text>
        <circle cx={markerX} cy={y(to)} r="14" fill="#fff9ed" stroke="#a77943" strokeWidth="2" />
        <text x={markerX} y={y(to) + 4} textAnchor="middle" fill="#8c6335" fontSize="11">
          终
        </text>
        <text x="493" y={y(from) + 4} className="string-board-label">
          起点 · {from} 弦
        </text>
        <text x="493" y={y(to) + 4} className="string-board-label">
          终点 · {to} 弦
        </text>
      </svg>
      <figcaption>
        细弦在上，粗弦在下 · 两个标记位于同一品位{showOpenNotes && ' · 左侧为各弦空弦音名'}
      </figcaption>
    </figure>
  );
}
