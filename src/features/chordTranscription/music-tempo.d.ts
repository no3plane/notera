declare module 'music-tempo' {
  export default class MusicTempo {
    constructor(
      pcm: Float32Array,
      options: { bufferSize: number; hopSize: number; timeStep: number; maxBeatInterval: number },
    );
    tempo: string | number;
    beats: number[];
  }
}
