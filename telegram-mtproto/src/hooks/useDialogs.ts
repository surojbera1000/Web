import { useCallbackRef } from './useCallbackRef';
import { useEffect, useRef, useState } from 'react';
import { NewMessage } from 'telegram/events';
import { useTelegram } from '@/context/TelegramContext';
import { fetchDialogs } from '@/lib/telegram/dialogs';
import type { NormalizedDialog } from '@/lib/telegram/types';

/** Live list of dialogs, refreshed (debounced) when new messages arrive. */
export function useDialogs() {
  const { client } = useTelegram();
  const [dialogs, setDialogs] = useState<NormalizedDialog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number>();

  const refresh = useCallbackRef(async () => {
    if (!client) return;
    try {
      const list = await fetchDialogs(client);
      setDialogs(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chats.');
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (!client) return;
    setLoading(true);
    void refresh();

    const event = new NewMessage({});
    const handler = () => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => void refresh(), 600);
    };
    client.addEventHandler(handler, event);
    return () => {
      window.clearTimeout(debounceRef.current);
      try {
        client.removeEventHandler(handler, event);
      } catch {
        /* ignore */
      }
    };
  }, [client, refresh]);

  return { dialogs, loading, error, refresh };
}
