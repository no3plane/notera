import type { CSSProperties, Ref } from 'react';
import { changedStrings, SUS_GUITAR_GROUPS } from '../lib/guitarSusChords';
import type { SusGuitarRoot, SusGuitarShape } from '../lib/guitarSusChords';
import { name } from '../lib/theory';
import { ChordDiagram } from './ChordDiagram';
import './guitarSusReference.css';

const SECTIONS = [
  { quality: 'major', origins: ['major', 'minor'], title: '三和弦', retained: '根音、五音不变' },
  { quality: '7', origins: ['7', 'm7'], title: '小七音挂留', retained: '根音、五音、小七音不变' },
  { quality: 'maj7', origins: ['maj7'], title: '大七音挂留', retained: '根音、五音、大七音不变' },
] as const;

function Arrow({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`sus-reference-arrow is-${side}`} aria-hidden="true">
      <span>{side === 'left' ? '挂二' : '挂四'}</span>
      <svg viewBox="0 0 48 24" fill="none">
        <path d={side === 'left' ? 'M42 12H6M13 5l-7 7 7 7' : 'M6 12h36M35 5l7 7-7 7'} />
      </svg>
    </div>
  );
}

function Shape({
  shape,
  movingStrings,
  onListen,
}: {
  shape: SusGuitarShape;
  movingStrings: number[];
  onListen: (shape: SusGuitarShape) => void;
}) {
  return (
    <div className="sus-reference-shape">
      <h4>{shape.symbol}</h4>
      <p className="sus-reference-formula">{shape.formula}</p>
      <ChordDiagram chord={shape} voicing={shape.voicing} movingStrings={movingStrings} compact />
      <p className="sus-reference-tones">
        {shape.tones.map((note) => name(note, false)).join(' · ')}
      </p>
      <button
        className="guitar-text-button guitar-listen"
        aria-label={`试听 ${shape.symbol}`}
        onClick={() => onListen(shape)}
      >
        试听
      </button>
    </div>
  );
}

export function GuitarSusReference({
  root,
  headingRef,
  returning,
  onPractice,
  onListen,
}: {
  root: SusGuitarRoot;
  headingRef: Ref<HTMLHeadingElement>;
  returning: boolean;
  onPractice: () => void;
  onListen: (shape: SusGuitarShape) => void;
}) {
  return (
    <div className="sus-reference">
      <div className="sus-reference-header">
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="guitar-stage-heading">
            {root} 型挂留全览
          </h2>
          <p>三音换成二音或四音，沿箭头挂留，反向弹回原和弦。</p>
        </div>
        <button className="guitar-primary" onClick={onPractice}>
          {returning ? '返回当前题' : '开始看题按弦 →'}
        </button>
      </div>
      <p className="sus-reference-hint">{SUS_GUITAR_GROUPS[root].major.comparisonHint}</p>
      <div className="sus-reference-bands">
        {SECTIONS.map(({ quality, origins, title, retained }) => {
          const { comparison } = SUS_GUITAR_GROUPS[root][quality];
          const [sus2, , sus4] = comparison;
          const sources = origins.map((origin) => SUS_GUITAR_GROUPS[root][origin].comparison[1]);
          const movingStrings = changedStrings([sus2, ...sources, sus4]);
          return (
            <section className="sus-reference-band" key={quality} aria-label={title}>
              <div className="sus-reference-band-heading">
                <h3>{title}</h3>
                <span>{retained}</span>
              </div>
              <div
                className="sus-reference-flow"
                role="group"
                aria-label={`${sources.map((source) => source.symbol).join('、')} 的挂留关系：挂二 ${sus2.symbol}，挂四 ${sus4.symbol}`}
                style={{ '--sus-source-width': `${sources.length}fr` } as CSSProperties}
              >
                <div className="sus-reference-sources">
                  <p className="sus-reference-source-label">
                    原和弦{sources.length > 1 ? ' · 共用两侧挂留' : ''}
                  </p>
                  <div className="sus-reference-source-shapes">
                    {sources.map((shape) => (
                      <Shape
                        key={shape.symbol}
                        shape={shape}
                        movingStrings={movingStrings}
                        onListen={onListen}
                      />
                    ))}
                  </div>
                </div>
                <Arrow side="left" />
                <div className="sus-reference-target is-second">
                  <Shape shape={sus2} movingStrings={movingStrings} onListen={onListen} />
                </div>
                <Arrow side="right" />
                <div className="sus-reference-target is-fourth">
                  <Shape shape={sus4} movingStrings={movingStrings} onListen={onListen} />
                </div>
                <div className="sus-reference-branch" aria-hidden="true">
                  <svg viewBox="0 0 400 60" fill="none" preserveAspectRatio="none">
                    <path d="M200 0v16M100 16h200M100 16v36m-7-7 7 7 7-7M300 16v36m-7-7 7 7 7-7" />
                  </svg>
                  <span className="is-second">挂二</span>
                  <span className="is-fourth">挂四</span>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <p className="guitar-sus-legend">
        下排音级按 6 → 1 弦排列 · R 为根音 · 绿线为变化弦
        <br />
        圆内为手指编号 · × 不弹 · ○ 空弦
      </p>
    </div>
  );
}
