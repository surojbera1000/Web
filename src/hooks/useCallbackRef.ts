import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Returns a stable function identity that always invokes the latest callback.
 * Useful for event handlers inside effects without re-subscribing.
 */
export function useCallbackRef<Args extends any[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => R {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: Args) => ref.current(...args), []);
}
