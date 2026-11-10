import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioContext } from './useAudio';

type Run = { audio: AudioContext | null; timer?: number };
type Position = { phase: 'idle' | 'starting' | 'playing' | 'complete'; beat: number };
const idle: Position = { phase: 'idle', beat: -1 };

function scheduleClick(audio: AudioContext, at: number, downbeat: boolean) {
  const click = audio.createOscillator();
  const volume = audio.createGain();
  click.frequency.value = downbeat ? 1100 : 750;
  volume.gain.setValueAtTime(0.001, at);
  volume.gain.linearRampToValueAtTime(downbeat ? 0.2 : 0.12, at + 0.004);
  volume.gain.exponentialRampToValueAtTime(0.001, at + 0.055);
  click.connect(volume).connect(audio.destination);
  click.start(at);
  click.stop(at + 0.06);
}

export function usePracticeMetronome() {
  const [position, setPosition] = useState<Position>(idle);
  const [notice, setNotice] = useState('');
  const active = useRef<Run | null>(null);
  const release = useCallback(() => {
    const run = active.current;
    active.current = null;
    if (!run) return;
    window.clearTimeout(run.timer);
    void run.audio?.close().catch(() => {});
  }, []);

  const stop = useCallback(() => {
    release();
    setPosition(idle);
    setNotice('');
  }, [release]);

  useEffect(() => {
    function onVisibility() {
      if (document.hidden && active.current) {
        stop();
        setNotice('页面切到后台，节拍已停止。');
      }
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, [release, stop]);

  async function start(bpm: number, beats: number, beatsPerBar: number) {
    if (active.current) return;
    const run: Run = { audio: null };
    active.current = run;
    setPosition({ phase: 'starting', beat: -1 });
    setNotice('');
    const interval = 60 / bpm;
    let now = () => performance.now() / 1000;
    let firstBeat = now();
    try {
      const audio = (run.audio = createAudioContext());
      if (!audio) throw new Error('Web Audio unavailable');
      await audio.resume();
      if (active.current !== run) return;
      const startTime = audio.currentTime + 0.08;
      for (let beat = 0; beat < beats; beat++) {
        scheduleClick(audio, startTime + beat * interval, beat % beatsPerBar === 0);
      }
      now = () => audio.currentTime;
      firstBeat = startTime;
    } catch {
      if (active.current !== run) return;
      void run.audio?.close().catch(() => {});
      run.audio = null;
      firstBeat = now();
      setNotice('节拍声暂不可用，可以跟随画面上的拍点。');
    }
    let lastBeat = -1;
    function tick() {
      if (active.current !== run) return;
      const time = now();
      const beat = Math.floor((time - firstBeat) / interval);
      if (beat >= beats) {
        release();
        setPosition({ phase: 'complete', beat });
        return;
      }
      if (beat >= 0 && beat !== lastBeat) {
        lastBeat = beat;
        setPosition({ phase: 'playing', beat });
      }
      run.timer = window.setTimeout(
        tick,
        Math.max(8, (firstBeat + (beat + 1) * interval - time) * 1000),
      );
    }
    tick();
  }

  return { ...position, notice, start, stop };
}
