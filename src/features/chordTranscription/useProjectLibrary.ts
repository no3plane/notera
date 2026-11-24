import { useCallback, useEffect, useRef, useState } from 'react';
import { attachAudio, deleteProject, listProjects, saveAudioHandle, saveProject } from './projects';
import type { AudioFileHandle } from './localAudio';
import type { Project, ProjectEntry, Song } from './projects';

type SaveStatus = 'pending' | 'saving' | 'saved' | 'error';

export function useProjectLibrary() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [song, setSong] = useState<Song | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [libraryError, setLibraryError] = useState('');
  const current = useRef<Song | null>(null);
  const revision = useRef(0);
  const rememberedFiles = useRef(new Set<string>());
  const storedProjects = useRef(new Set<string>());
  const removedProjects = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    async function readLibrary() {
      try {
        const saved = await listProjects();
        if (!active) return;
        rememberedFiles.current = new Set(
          saved.filter((entry) => entry.remembersFile).map(({ project }) => project.id),
        );
        storedProjects.current = new Set(saved.map(({ project }) => project.id));
        setProjects(saved);
      } catch {
        if (active) setLibraryError('无法读取工程文件。');
      } finally {
        if (active) setLoading(false);
      }
    }
    void readLibrary();
    return () => {
      active = false;
    };
  }, []);

  const selectSong = useCallback((next: Song | null, saved = false) => {
    revision.current++;
    current.current = next;
    setSong(next);
    setSaveStatus(next && !saved ? 'pending' : 'saved');
  }, []);

  const updateSong = useCallback((id: string, changes: Partial<Project>) => {
    const previous = current.current;
    if (!previous || previous.project.id !== id || removedProjects.current.has(id)) return;
    const next = {
      ...previous,
      project: { ...previous.project, ...changes, updatedAt: Date.now() },
    };
    const serial = ++revision.current;
    current.current = next;
    setSong(next);
    setSaveStatus('saving');
    void saveProject(next.project, storedProjects.current.has(id)).then(
      () => {
        if (revision.current === serial) setSaveStatus('saved');
        if (removedProjects.current.has(id)) return;
        storedProjects.current.add(id);
        setProjects((list) => {
          const existing = list.find(({ project }) => project.id === id);
          if (existing && existing.project.updatedAt > next.project.updatedAt) return list;
          return [
            {
              project: next.project,
              remembersFile: rememberedFiles.current.has(id),
            },
            ...list.filter(({ project }) => project.id !== id),
          ].sort((a, b) => b.project.updatedAt - a.project.updatedAt);
        });
      },
      () => {
        if (revision.current === serial) setSaveStatus('error');
      },
    );
  }, []);

  const rememberFile = useCallback(async (id: string, handle: AudioFileHandle) => {
    if (removedProjects.current.has(id)) return;
    await saveAudioHandle(id, handle);
    if (removedProjects.current.has(id)) return;
    rememberedFiles.current.add(id);
    setProjects((list) =>
      list.map((entry) => (entry.project.id === id ? { ...entry, remembersFile: true } : entry)),
    );
  }, []);

  const setSongAudio = useCallback(async (id: string, file: File, handle?: AudioFileHandle) => {
    const selected = current.current;
    if (selected?.project.id !== id || removedProjects.current.has(id)) return false;
    const resolved = await attachAudio(selected, file);
    const active = current.current;
    if (active?.project.id !== id || removedProjects.current.has(id)) return false;
    const next = { ...active, audio: resolved.audio, audioHandle: handle ?? active.audioHandle };
    current.current = next;
    setSong(next);
    return true;
  }, []);

  const removeProject = useCallback(
    async (id: string) => {
      if (removedProjects.current.has(id)) return;
      removedProjects.current.add(id);
      try {
        await deleteProject(id);
      } catch (error) {
        removedProjects.current.delete(id);
        throw error;
      }
      rememberedFiles.current.delete(id);
      storedProjects.current.delete(id);
      if (current.current?.project.id === id) selectSong(null);
      setProjects((list) => list.filter(({ project }) => project.id !== id));
    },
    [selectSong],
  );

  return {
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
  };
}
