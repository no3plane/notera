import { useCallback, useEffect, useRef, useState } from 'react';
import { ExplorePage } from './pages/ExplorePage';
import { PracticePage } from './pages/PracticePage';
import { LearnPage } from './pages/LearnPage';
import { ConversionPage } from './pages/ConversionPage';
import { useConversion } from './hooks/useConversion';
import { FORMAT_KEY, readNoteFormat } from './lib/notation';
import { useAudio } from './hooks/useAudio';
import { usePractice } from './hooks/usePractice';
import { PRESETS } from './lib/presets';
import type { PresetName } from './lib/presets';
import type { Exploration, NoteFormat, NotePair, Page } from './lib/types';

function pageFromHash(): Page {
  const hash = location.hash.slice(1);
  return hash === 'practice' || hash === 'learn' || hash === 'conversion' ? hash : 'explore';
}
export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [format, setFormat] = useState<NoteFormat>(readNoteFormat);
  useEffect(() => {
    try {
      localStorage.setItem(FORMAT_KEY, format);
    } catch {
      /* The current selection still works without storage. */
    }
  }, [format]);
  const [exploration, setExploration] = useState<Exploration>({
    a: { letter: 'C', acc: 0, octave: 3 },
    b: { letter: 'G', acc: 0, octave: 3 },
    view: 'guitar',
    active: 'a',
    flat: false,
  });
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
  const practice = usePractice(notify, page === 'practice');
  const conversion = useConversion(page === 'conversion');
  const navigate = useCallback((next: Page) => {
    setPage(next);
    location.hash = next;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  useEffect(() => {
    const onHashChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const onExplore = (pair: NotePair) => {
    setExploration((s) => ({ ...s, ...pair, active: 'b' }));
    navigate('explore');
  };
  const preset = (key: PresetName) => {
    const pair = PRESETS[key];
    setExploration((s) => ({ ...s, ...pair, active: 'b', flat: pair.b.acc < 0 }));
    navigate('explore');
  };
  const pages: { page: Page; label: string }[] = [
    { page: 'explore', label: '探索音程' },
    { page: 'practice', label: '反应练习' },
    { page: 'conversion', label: '音符对应' },
    { page: 'learn', label: '学习笔记' },
  ];
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="#explore"
          aria-label="Notera 首页"
          onClick={(e) => {
            e.preventDefault();
            navigate('explore');
          }}
        >
          <span className="brand-icon">♮</span>
          <strong>
            notera<span className="brand-dot">.</span>
          </strong>
          <span className="brand-sub">音程练习室</span>
        </a>
        <nav aria-label="主导航">
          {pages.map((item) => (
            <button
              key={item.page}
              className={`nav-item ${page === item.page ? 'active' : ''}`}
              aria-current={page === item.page ? 'page' : undefined}
              onClick={() => navigate(item.page)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="header-practice" onClick={() => navigate('practice')}>
          <span className="small-pulse" />
          每天练一点 <span>↗</span>
        </button>
      </header>
      <main id="main">
        <div key={page} className="page-enter">
          {page === 'explore' ? (
            <ExplorePage
              state={exploration}
              setState={setExploration}
              navigate={navigate}
              preset={preset}
              play={play}
            />
          ) : page === 'practice' ? (
            <PracticePage
              controller={practice}
              navigate={navigate}
              play={play}
              onExplore={onExplore}
              format={format}
              onFormat={setFormat}
            />
          ) : page === 'conversion' ? (
            <ConversionPage controller={conversion} play={play} navigate={navigate} />
          ) : (
            <LearnPage navigate={navigate} preset={preset} onExplore={onExplore} />
          )}
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
