export interface BeatAnalysis {
  bpm: number | null;
  times: number[];
}

export function analyzeBeats(audio: AudioBuffer, signal: AbortSignal): Promise<BeatAnalysis> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const worker = new Worker(new URL('./beatAnalysis.worker.ts', import.meta.url), {
      type: 'module',
    });
    const finish = () => {
      worker.terminate();
      signal.removeEventListener('abort', abort);
    };
    const abort = () => {
      finish();
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
    worker.onmessage = ({ data }: MessageEvent<BeatAnalysis>) => {
      finish();
      resolve(data);
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || '节拍分析无法启动。'));
    };
    const pcm = new Float32Array(audio.length);
    for (let channel = 0; channel < audio.numberOfChannels; channel++) {
      const samples = audio.getChannelData(channel);
      for (let i = 0; i < pcm.length; i++) pcm[i] += samples[i] / audio.numberOfChannels;
    }
    try {
      worker.postMessage({ pcm, sampleRate: audio.sampleRate }, [pcm.buffer]);
    } catch (error) {
      finish();
      reject(error);
    }
  });
}
