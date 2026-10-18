import { useCallback, useEffect, useRef } from 'react';
import { midi } from '../lib/theory';
import type { Note } from '../lib/types';

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
    async (notes: Note[]) => {
      try {
        const Audio =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Audio) {
          notify('当前浏览器不支持音频播放。');
          return;
        }
        context.current ??= new Audio();
        const audio = context.current;
        await audio.resume();
        const start = audio.currentTime + 0.04;
        notes.forEach((note, i) => {
          const time = start + i * 0.55;
          const frequency = 440 * 2 ** ((midi(note) - 69) / 12);
          [1, 2, 3, 4].forEach((harmonic, j) => {
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency * harmonic;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.18 / harmonic ** 2, time + 0.008);
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
