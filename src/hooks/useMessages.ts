import { useEffect, useState } from 'react';
import { api, onRealtimeMessage } from '@/lib/api';
import { useCallbackRef } from './useCallbackRef';
import type { NormalizedMessage } from '@/lib/telegram/types';

export function useMessages(chatId: string | null) {
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const upsert = useCallbackRef((msg: NormalizedMessage) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx >= 0) {
        const copy = prev.slice();
        copy[idx] = msg;
        return copy;
      }
      return [...prev, msg].sort((a, b) => a.date - b.date || a.id - b.id);
    });
  });

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const list = await api.messages(chatId, 50);
        if (active) setMessages(list);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load messages.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [chatId]);

  // Real-time: append messages belonging to this chat.
  useEffect(() => {
    if (!chatId) return;
    return onRealtimeMessage((m) => {
      if (m.chatId === chatId) upsert(m);
    });
  }, [chatId, upsert]);

  const send = useCallbackRef(async (text: string, replyTo?: number) => {
    if (!chatId) return;
    const sent = await api.send(chatId, text, replyTo);
    upsert(sent);
  });

  return { messages, loading, error, send };
}
