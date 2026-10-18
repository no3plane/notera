import { useCallback, useEffect, useRef, useState } from 'react';
import { PracticePage } from './pages/PracticePage';
import { FORMAT_KEY, readNoteFormat } from './lib/notation';
import { useAudio } from './hooks/useAudio';
import { usePractice } from './hooks/usePractice';
import type { NoteFormat } from './lib/types';

export default function App() {
  const [format, setFormat] = useState<NoteFormat>(readNoteFormat);
  useEffect(() => {
    try {
      localStorage.setItem(FORMAT_KEY, format);
    } catch {
      /* The current selection still works without storage. */
    }
  }, [format]);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  const play = useAudio(notify);
  const practice = usePractice(notify);
  useEffect(() => {
    const normalizeHash = () => {
      if (location.hash !== '#practice') {
        history.replaceState(null, '', `${location.pathname}${location.search}#practice`);
      }
    };
    normalizeHash();
    window.addEventListener('hashchange', normalizeHash);
    return () => window.removeEventListener('hashchange', normalizeHash);
  }, []);
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#practice" aria-label="Notera 首页">
          <span className="brand-icon">♮</span>
          <strong>
            notera<span className="brand-dot">.</span>
          </strong>
          <span className="brand-sub">乐理练习室</span>
        </a>
        <span className="practice-label">乐理练习</span>
      </header>
      <main id="main">
        <div className="page-enter">
          <PracticePage controller={practice} play={play} format={format} onFormat={setFormat} />
        </div>
      </main>
      <footer>
        <span>
          NOTERA <span className="footer-dot">/</span> 让乐理，变得触手可及。
        </span>
        <span>
          为每一个正在学吉他的你 <span className="footer-note">♫</span>
        </span>
      </footer>
      <div id="toast" className={toast ? 'visible' : ''} role="status">
        {toast}
      </div>
    </>
  );
}
