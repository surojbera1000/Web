import { useEffect, useRef, useState } from 'react';
import { api, onRealtimeMessage } from '@/lib/api';
import { useCallbackRef } from './useCallbackRef';
import type { NormalizedDialog } from '@/lib/telegram/types';

/** Live list of dialogs, refreshed (debounced) when new messages arrive. */
export function useDialogs() {
  const [dialogs, setDialogs] = useState<NormalizedDialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<number>();

  const refresh = useCallbackRef(async () => {
    try {
      const list = await api.dialogs();
      setDialogs(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chats.');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    setLoading(true);
    void refresh();
    const unsub = onRealtimeMessage(() => {
      window.clearTimeout(debounce.current);
      debounce.current = window.setTimeout(() => void refresh(), 500);
    });
    return () => {
      window.clearTimeout(debounce.current);
      unsub();
    };
  }, [refresh]);

  return { dialogs, loading, error, refresh };
}
