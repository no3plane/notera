import { useEffect, useRef, useState } from 'react';
import type { Project, ProjectEntry } from './projects';

const projectDate = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

interface ProjectLibraryProps {
  projects: ProjectEntry[];
  loading: boolean;
  disabled: boolean;
  onNew: () => void;
  onImport: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ProjectLibrary({
  projects,
  loading,
  disabled,
  onNew,
  onImport,
  onOpen,
  onDelete,
}: ProjectLibraryProps) {
  const [target, setTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (target && !dialog.current?.open) dialog.current?.showModal();
  }, [target]);

  function dismiss() {
    dialog.current?.close();
    setTarget(null);
    deleteButton.current?.focus();
  }

  async function confirmDelete() {
    if (!target || deleting) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete(target.id);
      dialog.current?.close();
      setTarget(null);
      heading.current?.focus();
    } catch {
      setError('删除未完成，请重试。');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="transcription-library" aria-labelledby="transcription-library-heading">
      <header className="transcription-library-toolbar">
        <h2 id="transcription-library-heading" ref={heading} tabIndex={-1}>
          工程文件
        </h2>
        <div className="transcription-actions transcription-file-actions">
          <button
            type="button"
            className="transcription-primary"
            disabled={disabled}
            onClick={onNew}
          >
            打开新歌
          </button>
          <button type="button" disabled={disabled} onClick={onImport}>
            导入工程
          </button>
        </div>
      </header>
      {loading ? (
        <p className="transcription-library-empty" role="status">
          正在读取工程文件…
        </p>
      ) : projects.length === 0 ? (
        <p className="transcription-library-empty">还没有保存的工程。</p>
      ) : (
        <ul className="transcription-project-list">
          {projects.map(({ project, remembersFile }) => (
            <li key={project.id}>
              <button
                type="button"
                className="transcription-project-open"
                disabled={disabled}
                onClick={() => onOpen(project.id)}
              >
                <span className="transcription-project-name">
                  <strong>{project.name}</strong>
                  <span>{project.audioName}</span>
                </span>
                <span className="transcription-project-status">
                  <span>{remembersFile ? '已记住文件' : '需选文件'}</span>
                  <time dateTime={new Date(project.updatedAt).toISOString()}>
                    {projectDate.format(project.updatedAt)}
                  </time>
                </span>
              </button>
              <button
                type="button"
                className="transcription-project-delete"
                aria-label={`删除「${project.name}」`}
                disabled={disabled}
                onClick={(event) => {
                  deleteButton.current = event.currentTarget;
                  setError('');
                  setTarget(project);
                }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
      {target && (
        <dialog
          ref={dialog}
          className="transcription-delete-dialog"
          aria-labelledby="transcription-delete-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!deleting) dismiss();
          }}
        >
          <h3 id="transcription-delete-title">删除「{target.name}」？</h3>
          <p>将删除这份谱面和练习进度。设备上的歌曲文件会保留。</p>
          {error && (
            <p className="transcription-save-error" role="alert">
              {error}
            </p>
          )}
          <div className="transcription-actions">
            <button type="button" autoFocus disabled={deleting} onClick={dismiss}>
              取消
            </button>
            <button
              type="button"
              className="transcription-delete-confirm"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? '正在删除…' : '删除记录'}
            </button>
          </div>
        </dialog>
      )}
    </section>
  );
}
