import { useEffect, useRef, useState } from 'react';
import { AUDIO_FILES, audioPicker, READ_AUDIO } from './localAudio';
import type { AudioFileHandle } from './localAudio';
import { loadSong, newSong, packProject, unpackProject } from './projects';
import type { Song } from './projects';
import { ProjectLibrary } from './ProjectLibrary';
import { SongWorkspace } from './SongWorkspace';
import { useProjectLibrary } from './useProjectLibrary';
import './transcription.css';

type FileAccess = 'permission' | 'pick' | 'checking';

function hasErrorName(error: unknown, name: string) {
  return error instanceof DOMException && error.name === name;
}

export default function ChordTranscription() {
  const {
    loading,
    projects,
    song,
    saveStatus,
    libraryError,
    selectSong,
    updateSong,
    setSongAudio,
    rememberFile,
    removeProject,
  } = useProjectLibrary();
  const audioInput = useRef<HTMLInputElement>(null);
  const attachInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const songHeading = useRef<HTMLHeadingElement>(null);
  const newFileHandles = useRef(new Map<string, AudioFileHandle>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState('');
  const [fileAccess, setFileAccess] = useState<{ id: string; state: FileAccess } | null>(null);
  const [playWhenReady, setPlayWhenReady] = useState<string | null>(null);
  const project = song?.project;
  const id = project?.id;
  const audio = song?.audio;
  const handle = song?.audioHandle;
  const access = fileAccess?.id === id ? fileAccess?.state : handle ? 'checking' : 'pick';

  useEffect(() => {
    songHeading.current?.focus({ preventScroll: true });
  }, [id]);

  useEffect(() => {
    for (const [projectId, pending] of newFileHandles.current) {
      if (!projects.some(({ project }) => project.id === projectId)) continue;
      newFileHandles.current.delete(projectId);
      void rememberFile(projectId, pending).catch(() => {
        if (projectId === id) setFileError('浏览器未能记住歌曲文件，下次可以重新选择。');
      });
    }
  }, [id, projects, rememberFile]);

  useEffect(() => {
    if (!id || audio || !handle) return;
    let active = true;
    setFileAccess({ id, state: 'checking' });
    async function restoreFile(id: string, handle: AudioFileHandle) {
      try {
        const permission = await handle.queryPermission(READ_AUDIO);
        if (!active) return;
        if (permission !== 'granted') {
          setFileAccess({ id, state: permission === 'prompt' ? 'permission' : 'pick' });
          return;
        }
        const file = await handle.getFile();
        if (active) await setSongAudio(id, file);
      } catch {
        if (active) setFileAccess({ id, state: 'pick' });
      }
    }
    void restoreFile(id, handle);
    return () => {
      active = false;
    };
  }, [id, audio, handle, setSongAudio]);

  async function openSong(read: () => Promise<Song>, fallback: string, saved = false) {
    setBusy(true);
    setError('');
    setFileError('');
    try {
      const next = await read();
      if (!saved && next.audioHandle) newFileHandles.current.set(next.project.id, next.audioHandle);
      selectSong(next, saved);
      setPlayWhenReady(null);
      if (next.project.duration > 0) updateSong(next.project.id, {});
    } catch (error) {
      if (!hasErrorName(error, 'AbortError'))
        setError(error instanceof Error ? error.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function openProject(id: string) {
    void openSong(() => loadSong(id), '无法打开这个工程。', true);
  }

  function importAudio() {
    const pick = audioPicker(false);
    if (!pick) {
      audioInput.current?.click();
      return;
    }
    void openSong(async () => {
      try {
        const { file, handle } = await pick();
        if (!file.size) throw new Error('这个音频文件是空的。');
        return { ...(await newSong(file)), audioHandle: handle };
      } catch (error) {
        if (hasErrorName(error, 'SecurityError')) {
          audioInput.current?.click();
          throw new DOMException('Waiting for file selection', 'AbortError');
        }
        throw error;
      }
    }, '无法读取歌曲文件。');
  }

  async function chooseSongFile(file?: File) {
    if (!id) return;
    const pick = file ? null : audioPicker(true);
    if (!file && !pick) {
      attachInput.current?.click();
      return;
    }
    setFileBusy(true);
    setFileError('');
    try {
      const source = file ? { file, handle: undefined } : await pick!();
      if ((await setSongAudio(id, source.file, source.handle)) && source.handle) {
        try {
          await rememberFile(id, source.handle);
        } catch {
          setFileError('浏览器未能记住歌曲文件，下次可以重新选择。');
        }
      }
    } catch (error) {
      if (hasErrorName(error, 'SecurityError')) attachInput.current?.click();
      else if (!hasErrorName(error, 'AbortError')) {
        setFileError(error instanceof Error ? error.message : '无法读取歌曲文件。');
      }
    } finally {
      setFileBusy(false);
    }
  }

  async function permitPlayback() {
    if (!id || !handle) return;
    setFileBusy(true);
    setFileError('');
    try {
      if ((await handle.requestPermission(READ_AUDIO)) !== 'granted') {
        setFileAccess({ id, state: 'pick' });
        return;
      }
      const file = await handle.getFile();
      if (await setSongAudio(id, file)) setPlayWhenReady(id);
    } catch {
      setFileAccess({ id, state: 'pick' });
      setFileError('无法读取上次的歌曲文件，请重新选择。');
    } finally {
      setFileBusy(false);
    }
  }

  function exportProject() {
    if (!song) return;
    const url = URL.createObjectURL(packProject(song));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${song.project.name}.notera`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function closeProject() {
    if (project && project.duration <= 0) newFileHandles.current.delete(project.id);
    selectSong(null);
    setPlayWhenReady(null);
    setFileAccess(null);
    setFileError('');
    setError('');
  }

  const disabled = loading || busy || fileBusy;

  return (
    <section className="transcription" aria-label={song ? '扒歌工作区' : undefined} data-ui>
      <input
        ref={audioInput}
        type="file"
        accept={AUDIO_FILES}
        hidden
        aria-label="本地音频文件"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file?.size) void openSong(() => newSong(file), '无法读取音频。');
          else if (file) setError('这个音频文件是空的。');
        }}
      />
      <input
        ref={attachInput}
        type="file"
        accept={`${AUDIO_FILES},.notera`}
        hidden
        aria-label="重新选择原音频"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void chooseSongFile(file);
        }}
      />
      <input
        ref={projectInput}
        type="file"
        accept=".notera"
        hidden
        aria-label="Notera 工程文件"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void openSong(() => unpackProject(file), '无法导入工程。');
        }}
      />
      {project ? (
        <header className="transcription-header">
          <div className="transcription-song">
            <h2 ref={songHeading} tabIndex={-1} title={project.name}>
              {project.name}
            </h2>
            <p>
              <span title={project.audioName}>{project.audioName}</span>
              {project.duration > 0 && saveStatus !== 'pending' && (
                <span
                  role="status"
                  className={saveStatus === 'error' ? 'transcription-save-error' : undefined}
                >
                  {saveStatus === 'saving'
                    ? '正在保存谱面…'
                    : saveStatus === 'error'
                      ? '谱面自动保存失败，请导出工程'
                      : '谱面已保存'}
                </span>
              )}
            </p>
          </div>
          <div className="transcription-actions transcription-file-actions">
            <button type="button" disabled={disabled} onClick={closeProject}>
              返回工程列表
            </button>
            <button
              type="button"
              disabled={disabled || project.duration <= 0}
              onClick={exportProject}
            >
              导出当前工程
            </button>
          </div>
        </header>
      ) : (
        <ProjectLibrary
          projects={projects}
          loading={loading}
          disabled={disabled}
          onNew={importAudio}
          onImport={() => projectInput.current?.click()}
          onOpen={openProject}
          onDelete={removeProject}
        />
      )}
      {(error || libraryError) && (
        <p className="transcription-feedback" role="alert">
          {error || libraryError}
        </p>
      )}
      {busy && (
        <p className="transcription-feedback" role="status">
          正在打开工程…
        </p>
      )}
      {song && (
        <SongWorkspace
          key={song.project.id}
          song={{ project: song.project, audio: song.audio }}
          onUpdate={updateSong}
          sourcePending={disabled || (!audio && access === 'checking')}
          sourcePermission={!audio && access === 'permission'}
          sourceError={fileError}
          onChooseAudio={() => void chooseSongFile()}
          onPermitAudio={() => void permitPlayback()}
          playOnLoad={playWhenReady === song.project.id}
        />
      )}
    </section>
  );
}
