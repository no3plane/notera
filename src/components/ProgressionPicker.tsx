import { useId, useRef, useState } from 'react';
import { CHORD_PROGRESSIONS, PROGRESSION_GROUPS, progressionCode } from '../lib/chordProgressions';
import type { ProgressionGroup } from '../lib/chordProgressions';
import { connectionChordsInKey } from '../lib/connectionPractice';
import type { ChordFamily } from '../lib/chordHarmony';
import type { GuitarKey } from '../lib/guitarChords';
import { songsForProgression } from '../lib/progressionSongs';

export function ProgressionPicker({
  value,
  onChange,
  disabled,
  chordKey,
  family,
  showNames,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  chordKey: GuitarKey;
  family: ChordFamily;
  showNames: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<ProgressionGroup | '全部'>('全部');
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = CHORD_PROGRESSIONS[value];
  const selectedSongs = songsForProgression(selected);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="progression-picker"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <button
        className="progression-trigger"
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-label={`选择和弦进行，当前 ${selected.minor ? '小调 ' : ''}${progressionCode(selected)}`}
        aria-expanded={open && !disabled}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span className="progression-trigger-label">和弦进行</span>
        <strong>{progressionCode(selected)}</strong>
        <span>{selected.description}</span>
        <span className="progression-trigger-action">
          {open && !disabled ? '收起' : '更换'}{' '}
          <span aria-hidden="true">{open && !disabled ? '−' : '+'}</span>
        </span>
      </button>
      {open && !disabled && (
        <section id={id} className="progression-library" aria-label="和弦进行库">
          <div className="progression-filters" role="group" aria-label="进行分类">
            {(['全部', ...PROGRESSION_GROUPS] as const).map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={group === item}
                onClick={() => setGroup(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="progression-options" role="group" aria-label="选择进行">
            {CHORD_PROGRESSIONS.map((pattern, index) => {
              if (group !== '全部' && pattern.group !== group) return null;
              const chords = connectionChordsInKey(chordKey, family, pattern.minor);
              const code = progressionCode(pattern);
              const songs = songsForProgression(pattern);
              return (
                <button
                  type="button"
                  className="progression-option"
                  key={index}
                  aria-label={`${pattern.minor ? '小调 ' : ''}${code} ${pattern.description}`}
                  aria-pressed={index === value}
                  onClick={() => {
                    onChange(index);
                    close();
                  }}
                >
                  <span className="progression-option-heading">
                    <strong>{code}</strong>
                    <span>{pattern.description}</span>
                  </span>
                  {showNames && (
                    <span className="progression-option-chords">
                      {pattern.degrees.map((degree) => chords[degree - 1].symbol).join(' → ')}
                    </span>
                  )}
                  {songs.length > 0 && (
                    <span className="progression-option-songs">
                      {songs.map((song) => (
                        <span key={song.title}>
                          《{song.title}》<small>{song.artist}</small>
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
      {selectedSongs.length > 0 && (
        <details className="progression-song-reference" key={value}>
          <summary>
            中文歌例 · {selectedSongs.map((song) => `《${song.title}》`).join('、')}
          </summary>
          <p>对应歌曲中的局部进行；谱例的节奏、转位和七和弦配法可能与本练习不同。</p>
          <ul>
            {selectedSongs.map((song) => (
              <li key={song.title}>
                <div className="progression-song-title">
                  <strong>《{song.title}》</strong>
                  <span>{song.artist}</span>
                  <a
                    href={song.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`查看《${song.title}》${song.artist}的参考谱例`}
                  >
                    查看谱例 ↗
                  </a>
                </div>
                <span>{song.section}</span>
                {showNames && <span className="progression-song-chords">{song.chords}</span>}
                {showNames && song.note && <small>{song.note}</small>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
