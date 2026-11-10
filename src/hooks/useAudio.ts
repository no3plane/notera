import { useCallback, useEffect, useRef } from 'react';
import { midi } from '../lib/theory';
import type { Note } from '../lib/types';

export function createAudioContext() {
  const Audio =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Audio ? new Audio() : null;
}

export function useAudio(notify: (message: string) => void) {
  const context = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      void context.current?.close();
      context.current = null;
    },
    [],
  );
  return useCallback(
    async (notes: Note[], mode: 'sequence' | 'strum' = 'sequence') => {
      try {
        const audio = (context.current ??= createAudioContext());
        if (!audio) {
          notify('当前浏览器不支持音频播放。');
          return;
        }
        await audio.resume();
        const start = audio.currentTime + 0.04;
        const spacing = mode === 'strum' ? 0.03 : 0.55;
        const volume = mode === 'strum' ? 0.45 / Math.max(1, notes.length) : 0.18;
        notes.forEach((note, i) => {
          const time = start + i * spacing;
          const frequency = 440 * 2 ** ((midi(note) - 69) / 12);
          [1, 2, 3, 4].forEach((harmonic, j) => {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency * harmonic;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(volume / harmonic ** 2, time + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.25 - j * 0.12);
            oscillator.connect(gain).connect(audio.destination);
            oscillator.start(time);
            oscillator.stop(time + 1.35);
          });
        });
      } catch {
        notify('无法播放声音，请检查浏览器音频权限。');
      }
    },
    [notify],
  );
}
