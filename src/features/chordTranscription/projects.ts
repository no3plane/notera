import { METERS, MIN_BEAT_GAP } from './score';
import type { Beat, Score } from './score';
import type { AudioFileHandle } from './localAudio';

export interface Project extends Score {
  id: string;
  name: string;
  audioName: string;
  audioFingerprint: string;
  duration: number;
  bpm: number | null;
  analysisDone: boolean;
  speed: number;
  position: number;
  updatedAt: number;
}

export interface Song {
  project: Project;
  audio: Blob | null;
  audioHandle?: AudioFileHandle;
}

export interface ProjectEntry {
  project: Project;
  remembersFile: boolean;
}

export const SPEEDS = [0.5, 0.65, 0.75, 0.85, 1, 1.15, 1.25, 1.5];

export async function newSong(file: File): Promise<Song> {
  return {
    project: {
      id: newId(),
      name: file.name.replace(/\.[^.]+$/, '') || file.name,
      audioName: file.name,
      audioFingerprint: await fingerprintAudio(file),
      duration: 0,
      bpm: null,
      analysisDone: false,
      meter: '4/4',
      firstBeat: null,
      beats: [],
      speed: 1,
      position: 0,
      updatedAt: Date.now(),
    },
    audio: file,
  };
}

async function fingerprintAudio(audio: Blob): Promise<string> {
  const size = 16 * 1024;
  const chunks =
    audio.size <= size * 3
      ? [audio]
      : [
          audio.slice(0, size),
          audio.slice(Math.floor((audio.size - size) / 2), Math.floor((audio.size + size) / 2)),
          audio.slice(audio.size - size),
        ];
  const samples = await Promise.all(chunks.map((chunk) => chunk.arrayBuffer()));
  let hash = 2166136261;
  for (const sample of samples) {
    for (const byte of new Uint8Array(sample)) {
      hash = Math.imul(hash ^ byte, 16777619);
    }
  }
  return `${audio.size}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function attachAudio(song: Song, file: File): Promise<Song> {
  const bundled = file.name.toLowerCase().endsWith('.notera') ? await unpackProject(file) : null;
  const audio = bundled ? bundled.audio : file;
  if (!audio?.size) throw new Error('请选择原音频或含音频的工程文件。');
  const fingerprint = bundled?.project.audioFingerprint ?? (await fingerprintAudio(audio));
  const { project } = song;
  if (project.audioFingerprint !== fingerprint) {
    throw new Error(`这个文件与工程记录的音频不符。请选择「${project.audioName}」。`);
  }
  return { ...song, audio };
}

function newId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join('-');
}

const MAGIC = 'NOTERA1\n';
const HEADER_LENGTH = MAGIC.length + 4;

export function packProject({ audio, project }: Pick<Song, 'audio' | 'project'>): Blob {
  const header = new TextEncoder().encode(
    JSON.stringify({ project, audioType: audio?.type ?? null }),
  );
  const prefix = new Uint8Array(HEADER_LENGTH);
  prefix.set(new TextEncoder().encode(MAGIC));
  new DataView(prefix.buffer).setUint32(MAGIC.length, header.length);
  return new Blob(audio ? [prefix, header, audio] : [prefix, header], {
    type: 'application/octet-stream',
  });
}

export async function unpackProject(file: Blob): Promise<Song> {
  const invalid = () => new Error('无法读取此工程，请选择 Notera 导出的工程文件。');
  const prefix = await file.slice(0, HEADER_LENGTH).arrayBuffer();
  if (
    prefix.byteLength !== HEADER_LENGTH ||
    new TextDecoder().decode(prefix.slice(0, MAGIC.length)) !== MAGIC
  )
    throw invalid();
  const audioStart = HEADER_LENGTH + new DataView(prefix).getUint32(MAGIC.length);
  if (audioStart > file.size) throw invalid();
  let data: { project?: unknown; audioType?: unknown } | null;
  try {
    data = JSON.parse(await file.slice(HEADER_LENGTH, audioStart).text());
  } catch {
    throw invalid();
  }
  if (!data || !validProject(data.project)) throw invalid();
  if (audioStart === file.size ? data.audioType !== null : typeof data.audioType !== 'string') {
    throw invalid();
  }
  const audio =
    typeof data.audioType === 'string' ? file.slice(audioStart, file.size, data.audioType) : null;
  if (audio && data.project.audioFingerprint !== (await fingerprintAudio(audio))) {
    throw invalid();
  }
  return {
    project: {
      ...data.project,
      id: newId(),
      updatedAt: Date.now(),
    },
    audio,
  };
}

function isAudioFingerprint(value: unknown): value is string {
  return typeof value === 'string' && /^\d+:[0-9a-f]{8}$/.test(value);
}

function validProject(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Project;
  if (
    typeof p.name !== 'string' ||
    !p.name ||
    typeof p.audioName !== 'string' ||
    !isAudioFingerprint(p.audioFingerprint) ||
    !Number.isFinite(p.duration) ||
    p.duration <= 0 ||
    !Object.hasOwn(METERS, p.meter) ||
    !SPEEDS.includes(p.speed) ||
    !Number.isFinite(p.position) ||
    p.position < 0 ||
    p.position > p.duration ||
    typeof p.analysisDone !== 'boolean' ||
    (p.bpm !== null && (!Number.isFinite(p.bpm) || p.bpm <= 0)) ||
    !Array.isArray(p.beats)
  ) {
    return false;
  }
  const ids = new Set<number>();
  let lastTime = -Infinity;
  for (const beat of p.beats as Beat[]) {
    if (
      !beat ||
      !Number.isSafeInteger(beat.id) ||
      beat.id <= 0 ||
      ids.has(beat.id) ||
      !Number.isFinite(beat.time) ||
      beat.time < 0 ||
      beat.time >= p.duration ||
      beat.time - lastTime < MIN_BEAT_GAP ||
      typeof beat.chord !== 'string'
    )
      return false;
    ids.add(beat.id);
    lastTime = beat.time;
  }
  return p.firstBeat === null || ids.has(p.firstBeat);
}

let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('notera-transcription', 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audioHandles')) db.createObjectStore('audioHandles');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  }).catch((error: unknown) => {
    database = undefined;
    throw error;
  }));
}

function read<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listProjects(): Promise<ProjectEntry[]> {
  const db = await openDatabase();
  const transaction = db.transaction(['projects', 'audioHandles']);
  const [projects, handleKeys] = await Promise.all([
    read<Project[]>(transaction.objectStore('projects').getAll()),
    read(transaction.objectStore('audioHandles').getAllKeys()),
  ]);
  const remembered = new Set(handleKeys);
  return projects
    .filter((project) => isAudioFingerprint(project.audioFingerprint))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((project) => ({
      project,
      remembersFile: remembered.has(project.id),
    }));
}

export async function loadSong(id: string): Promise<Song> {
  const db = await openDatabase();
  const transaction = db.transaction(['projects', 'audioHandles']);
  const [project, audioHandle] = await Promise.all([
    read<Project | undefined>(transaction.objectStore('projects').get(id)),
    read<AudioFileHandle | undefined>(transaction.objectStore('audioHandles').get(id)),
  ]);
  if (!project || !isAudioFingerprint(project.audioFingerprint)) {
    throw new Error('无法读取此工程。');
  }
  return { project, audio: null, audioHandle };
}

async function writeStores(stores: string[], write: (transaction: IDBTransaction) => void) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(stores, 'readwrite');
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error);
    write(transaction);
  });
}

export function saveProject(project: Project, existing: boolean) {
  return writeStores(['projects'], (transaction) => {
    const projects = transaction.objectStore('projects');
    if (!existing) {
      projects.put(project);
      return;
    }
    const entry = projects.getKey(project.id);
    entry.onsuccess = () => {
      if (entry.result === undefined) transaction.abort();
      else projects.put(project);
    };
  });
}

export function saveAudioHandle(id: string, handle: AudioFileHandle) {
  return writeStores(['projects', 'audioHandles'], (transaction) => {
    const entry = transaction.objectStore('projects').getKey(id);
    entry.onsuccess = () => {
      try {
        if (entry.result === undefined) transaction.abort();
        else transaction.objectStore('audioHandles').put(handle, id);
      } catch {
        transaction.abort();
      }
    };
  });
}

export async function deleteProject(id: string) {
  const db = await openDatabase();
  const stores = ['projects', 'audioHandles'];
  if (db.objectStoreNames.contains('audio')) stores.push('audio');
  await writeStores(stores, (transaction) => {
    for (const store of stores) transaction.objectStore(store).delete(id);
  });
}
