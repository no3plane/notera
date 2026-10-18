import { useCallback, useEffect, useReducer } from 'react';
import { BACKUP_KEY, emptyProgress, readProgress, writeProgress } from '../lib/progress';
import { createSession, practiceReducer } from '../lib/practice';
import type { PracticeState } from '../lib/practice';
import type { Level } from '../lib/types';

export function usePractice(notify: (message: string) => void) {
  const [state, dispatch] = useReducer(practiceReducer, undefined, (): PracticeState => {
    const progress = readProgress() ?? emptyProgress();
    return {
      level: 'basic',
      progress,
      backup: readProgress(BACKUP_KEY),
      session: createSession('basic', progress.mistakes),
    };
  });
  useEffect(() => {
    if (!writeProgress(state.progress)) notify('浏览器未允许保存；本次练习仍可继续。');
  }, [state.progress, notify]);
  useEffect(() => {
    if (state.backup && !writeProgress(state.backup, BACKUP_KEY)) notify('浏览器未允许保存备份。');
  }, [state.backup, notify]);
  useEffect(() => {
    const updateTimer = () =>
      dispatch({ type: !document.hidden ? 'resume' : 'pause', now: performance.now() });
    updateTimer();
    document.addEventListener('visibilitychange', updateTimer);
    return () => document.removeEventListener('visibilitychange', updateTimer);
  }, []);
  const start = useCallback(
    (level: Level = state.level) =>
      dispatch({ type: 'session', level, session: createSession(level, state.progress.mistakes) }),
    [state.level, state.progress.mistakes],
  );
  const reset = useCallback(() => {
    dispatch({ type: 'reset', session: createSession(state.level, []) });
    notify('练习记录已重置，可随时恢复上次记录。');
  }, [state.level, notify]);
  const restore = useCallback(() => {
    if (!state.backup) return;
    dispatch({ type: 'restore', session: createSession(state.level, state.backup.mistakes) });
    notify('已恢复上次记录。');
  }, [state.backup, state.level, notify]);
  return { state, dispatch, start, reset, restore };
}
export type PracticeController = ReturnType<typeof usePractice>;
