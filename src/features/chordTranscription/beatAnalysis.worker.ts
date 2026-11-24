import MusicTempo from 'music-tempo';

self.onmessage = ({ data }: MessageEvent<{ pcm: Float32Array; sampleRate: number }>) => {
  try {
    const { pcm, sampleRate } = data;
    const hopSize = Math.round(sampleRate / 100);
    const analysis = new MusicTempo(pcm, {
      bufferSize: 1024,
      hopSize,
      timeStep: hopSize / sampleRate,
      maxBeatInterval: 1.5,
    });
    self.postMessage({ bpm: Number(analysis.tempo), times: analysis.beats });
  } catch {
    self.postMessage({ bpm: null, times: [] });
  }
};
