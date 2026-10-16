import { useEffect, useReducer } from 'react';
import { conversionReducer, createConversionSession } from '../lib/conversion';

export function useConversion(active: boolean) {
  const [session, dispatch] = useReducer(conversionReducer, undefined, () =>
    createConversionSession(),
  );
  useEffect(() => {
    const updateTimer = () =>
      dispatch({ type: active && !document.hidden ? 'resume' : 'pause', now: performance.now() });
    updateTimer();
    document.addEventListener('visibilitychange', updateTimer);
    return () => document.removeEventListener('visibilitychange', updateTimer);
  }, [active]);
  return { session, dispatch };
}
export type ConversionController = ReturnType<typeof useConversion>;
