// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { beatIndexAt, detectedBeats, measuresFor } from '../src/features/chordTranscription/score';
import {
  attachAudio,
  newSong,
  packProject,
  unpackProject,
} from '../src/features/chordTranscription/projects';
import {
  phaseForDownbeat,
  previewHalfTempo,
  restoreHalfTempoBeats,
} from '../src/features/chordTranscription/halfTempo';
import type { ChordDecision } from '../src/features/chordTranscription/halfTempo';

describe('chord transcription score', () => {
  it('preserves non-uniform timestamps and written chords when regrouping measures', () => {
    const beats = detectedBeats([0.1, 0.7, 1.32, 1.82, 2.39, 2.9, 3.45], 4);
    beats[3].chord = 'G/B';
    const regrouped = measuresFor({ beats, firstBeat: beats[2].id, meter: '3/4' }, 4);
    expect(regrouped.map((measure) => [measure.number, measure.start, measure.end])).toEqual([
      [0, 0.1, 1.32],
      [1, 1.32, 2.9],
      [2, 2.9, 4],
    ]);
    expect(regrouped[1].beats[1]).toEqual(beats[3]);
    expect(beatIndexAt(beats, 0.09)).toBe(-1);
    expect(beats[beatIndexAt(beats, 1.84)]).toEqual(beats[3]);
  });
});

describe('half-tempo calibration', () => {
  it('previews both phases using the existing uneven timestamps and keeps the downbeat by default', () => {
    const beats = detectedBeats([0.12, 0.4, 0.71, 0.98, 1.32, 1.62, 1.94], 3);
    const anchor = beats[3].id;
    expect(phaseForDownbeat(beats, anchor)).toBe(1);
    const anchored = previewHalfTempo(beats, anchor, 1, new Map());
    const alternative = previewHalfTempo(beats, anchor, 0, new Map());
    expect(anchored.beats).toEqual([beats[1], beats[3], beats[5]]);
    expect(anchored.firstBeat).toBe(anchor);
    expect(alternative.beats).toEqual([beats[0], beats[2], beats[4], beats[6]]);
    expect(alternative.firstBeat).toBe(beats[4].id);
  });

  it('requires individual decisions, reserves blank destinations, and restores moved notes on undo', () => {
    const beats = detectedBeats([0.12, 0.4, 0.71, 0.98, 1.32, 1.62, 1.94], 3);
    beats[1].chord = 'Cmaj7';
    beats[3].chord = 'iiø7';
    beats[4].chord = 'G/B';
    beats[5].chord = 'Dm';
    const [early, cm, shared, ii, occupied, dm, late] = beats.map((beat) => beat.id);
    const choices = new Map<number, ChordDecision>([
      [cm, shared],
      [ii, shared],
      [dm, 'remove'],
    ]);
    const conflict = previewHalfTempo(beats, null, 0, choices);
    expect(conflict.conflicts.map(({ decision }) => decision)).toEqual([
      shared,
      undefined,
      'remove',
    ]);
    expect(conflict.conflicts[1].destinations).toEqual([]);

    choices.set(cm, early);
    const resolved = previewHalfTempo(beats, null, 0, choices);
    expect(resolved.conflicts.map(({ decision }) => decision)).toEqual([early, shared, 'remove']);
    expect(resolved.beats.map(({ id, chord }) => [id, chord])).toEqual([
      [early, 'Cmaj7'],
      [shared, 'iiø7'],
      [occupied, 'G/B'],
      [late, ''],
    ]);
    const editedAfterApplying = resolved.beats.map((beat) =>
      beat.id === late || beat.id === early ? { ...beat, chord: 'Am' } : beat,
    );
    expect(restoreHalfTempoBeats(beats, editedAfterApplying, resolved.movedChords)).toEqual([
      { ...beats[0], chord: 'Am' },
      ...beats.slice(1, -1),
      { ...beats[6], chord: 'Am' },
    ]);
  });
});

describe('chord transcription project file', () => {
  it('round trips the audio bytes and score, assigning a separate library ID', async () => {
    const file = new File([new Uint8Array([23, 25, 227, 0])], '听写.mp3', { type: 'audio/mpeg' });
    const song = await newSong(file);
    song.project.duration = 2;
    song.project.analysisDone = true;
    song.project.beats = detectedBeats([0.35, 0.99], 2);
    song.project.beats[1].chord = 'iiø7';
    song.project.firstBeat = song.project.beats[1].id;

    const restored = await unpackProject(packProject(song));
    expect(restored.project.id).not.toBe(song.project.id);
    expect(restored.project).toEqual({
      ...song.project,
      id: restored.project.id,
      updatedAt: restored.project.updatedAt,
    });
    expect(restored.audio?.type).toBe(file.type);
    expect(await restored.audio?.arrayBuffer()).toEqual(await file.arrayBuffer());
    await expect(unpackProject(packProject(song).slice(0, 15))).rejects.toThrow('无法读取此工程');
  });

  it('relinks a score-only project to matching bytes without replacing the saved transcription', async () => {
    const file = new File([new Uint8Array([23, 25, 227, 0])], '原录音.mp3', { type: 'audio/mpeg' });
    const song = await newSong(file);
    song.project.duration = 2;
    song.project.analysisDone = true;
    song.project.beats = [{ id: 1, time: 0.25, chord: 'Cmaj7' }];
    const score = await unpackProject(packProject({ ...song, audio: null }));
    expect(score.audio).toBeNull();
    expect(score.project.audioName).toBe(file.name);

    const wrongFile = new File([new Uint8Array([21, 25, 227, 0])], file.name);
    await expect(attachAudio(score, wrongFile)).rejects.toThrow('与工程记录的音频不符');
    const renamed = new File([file], '改过文件名.mp3');
    const relinked = await attachAudio(score, renamed);
    expect(relinked.project).toEqual(score.project);
    expect(relinked.audio).toBe(renamed);

    const bundle = new File([packProject(song)], '备份.notera');
    const fromBundle = await attachAudio(score, bundle);
    expect(fromBundle.project).toEqual(score.project);
    expect(await fromBundle.audio?.arrayBuffer()).toEqual(await file.arrayBuffer());
  });
});
