import { useCallback, useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { TimeRange } from './score';

export function usePlayback(audio: Blob | null, position: number) {
  const container = useRef<HTMLDivElement>(null);
  const start = useRef(position);
  const wave = useRef<WaveSurfer | null>(null);
  const loop = useRef<TimeRange | null>(null);
  const [decoded, setDecoded] = useState<AudioBuffer | null>(null);
  const [wrapper, setWrapper] = useState<HTMLElement | null>(null);
  const [time, setTime] = useState(position);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [playError, setPlayError] = useState('');
  const [commitPosition, setCommitPosition] = useState(position);

  const stopLoop = useCallback(() => {
    loop.current = null;
    setLooping(false);
  }, []);

  const startPlaying = useCallback((player: WaveSurfer) => {
    setPlayError('');
    void player.play().catch(() => {
      if (wave.current === player) setPlayError('无法播放音频，请再点击一次播放。');
    });
  }, []);

  useEffect(() => {
    start.current = position;
  }, [position]);

  useEffect(() => {
    if (!audio || !container.current) return;
    setDecoded(null);
    setWrapper(null);
    setDuration(0);
    setPlaying(false);
    setLoadError('');
    setPlayError('');
    stopLoop();
    const compact = window.matchMedia('(max-width: 560px)');
    const player = WaveSurfer.create({
      container: container.current,
      height: compact.matches ? 80 : 112,
      waveColor: '#98aaa0',
      progressColor: '#397454',
      cursorColor: '#244d38',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      sampleRate: 22050,
      dragToSeek: true,
      autoCenter: false,
    });
    const resizeWaveform = () => player.setOptions({ height: compact.matches ? 80 : 112 });
    compact.addEventListener('change', resizeWaveform);
    wave.current = player;
    const unsubscribe = [
      player.on('timeupdate', (current) => {
        const region = loop.current;
        if (region && current >= region.end && player.isPlaying()) {
          player.setTime(region.start);
          return;
        }
        setTime((previous) => (Math.abs(previous - current) < 0.028 ? previous : current));
      }),
      player.on('interaction', (current) => {
        const region = loop.current;
        if (region && (current < region.start || current >= region.end)) stopLoop();
        setTime(current);
        setCommitPosition(current);
      }),
      player.on('play', () => setPlaying(true)),
      player.on('pause', () => {
        setPlaying(false);
        setCommitPosition(player.getCurrentTime());
      }),
      player.on('finish', () => {
        const region = loop.current;
        if (region) {
          player.setTime(region.start);
          startPlaying(player);
        } else {
          setTime(player.getDuration());
          setCommitPosition(0);
        }
      }),
      player.on('error', () => {
        setLoadError('无法读取音频，请换一个浏览器支持的音频文件。');
      }),
    ];
    void player
      .loadBlob(audio)
      .then(() => {
        if (wave.current !== player) return;
        const buffer = player.getDecodedData();
        if (!buffer || !player.getDuration()) {
          setLoadError('无法读取音频数据。');
          return;
        }
        setDuration(player.getDuration());
        const position = Math.min(start.current, player.getDuration());
        if (position > 0) player.setTime(position);
        setTime(position);
        setWrapper(player.getWrapper());
        setDecoded(buffer);
      })
      .catch(() => {
        if (wave.current === player) setLoadError('无法读取音频，请换一个浏览器支持的音频文件。');
      });
    return () => {
      wave.current = null;
      compact.removeEventListener('change', resizeWaveform);
      unsubscribe.forEach((off) => off());
      player.destroy();
    };
  }, [audio, startPlaying, stopLoop]);

  const seek = useCallback(
    (seconds: number) => {
      const player = wave.current;
      if (!player?.getDuration()) return;
      const next = Math.max(0, Math.min(seconds, player.getDuration()));
      const region = loop.current;
      if (region && (next < region.start || next >= region.end)) stopLoop();
      player.setTime(next);
      setTime(next);
      setCommitPosition(next);
    },
    [stopLoop],
  );

  const toggle = useCallback(() => {
    const player = wave.current;
    if (!player?.getDuration()) return;
    if (player.isPlaying()) player.pause();
    else {
      const region = loop.current;
      const current = player.getCurrentTime();
      if (region && (current < region.start || current >= region.end)) player.setTime(region.start);
      startPlaying(player);
    }
  }, [startPlaying]);

  function startLoop(range: TimeRange) {
    const player = wave.current;
    if (!player?.getDuration()) return;
    loop.current = range;
    setLooping(true);
    seek(range.start);
    startPlaying(player);
  }

  const syncLoop = useCallback(
    (range: TimeRange | null) => {
      const player = wave.current;
      if (!loop.current || !player) return;
      if (!range) {
        stopLoop();
        return;
      }
      loop.current = range;
      const current = player.getCurrentTime();
      if (current < range.start || current >= range.end) seek(range.start);
    },
    [seek, stopLoop],
  );

  const setSpeed = useCallback((speed: number) => {
    wave.current?.setPlaybackRate(speed, true);
  }, []);

  function setZoom(factor: number) {
    const player = wave.current;
    if (!player?.getDuration() || !container.current) return;
    const width = container.current.clientWidth;
    player.zoom(factor === 1 ? 0 : (width / player.getDuration()) * factor);
    if (factor > 1)
      player.setScrollTime(
        Math.max(0, player.getCurrentTime() - player.getDuration() / factor / 2),
      );
  }

  return {
    container,
    decoded,
    duration,
    wrapper,
    time,
    playing,
    looping,
    loadError,
    playError,
    commitPosition,
    seek,
    toggle,
    startLoop,
    stopLoop,
    syncLoop,
    setSpeed,
    setZoom,
  };
}
