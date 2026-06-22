import { useEffect, useRef, useState } from 'react';
import { Api } from 'telegram';
import { NewMessage, Raw } from 'telegram/events';
import { useTelegram } from '@/context/TelegramContext';
import { useCallbackRef } from './useCallbackRef';
import { normalizeMessage } from '@/lib/telegram/messages';
import { idToString } from '@/lib/telegram/format';
import type { NormalizedMessage } from '@/lib/telegram/types';

export interface BotConversation {
  chatId: string;
  title: string;
  messages: NormalizedMessage[];
}

export interface BotCallback {
  id: string;
  fromName: string;
  dataText: string;
  raw: Api.UpdateBotCallbackQuery;
}

function senderTitle(message: any, fallback: string): string {
  const s = message?.sender;
  if (s instanceof Api.User) return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username || fallback;
  return fallback;
}

/** Accumulates messages and callback queries a bot receives, in real time. */
export function useBotUpdates() {
  const { client, account } = useTelegram();
  const selfId = account?.id ?? '';
  const [conversations, setConversations] = useState<Record<string, BotConversation>>({});
  const [callbacks, setCallbacks] = useState<BotCallback[]>([]);
  const orderRef = useRef<string[]>([]);

  const addMessage = useCallbackRef((chatId: string, title: string, msg: NormalizedMessage) => {
    setConversations((prev) => {
      const existing = prev[chatId];
      const msgs = existing ? existing.messages.slice() : [];
      if (!msgs.some((m) => m.id === msg.id)) msgs.push(msg);
      msgs.sort((a, b) => a.date - b.date || a.id - b.id);
      if (!orderRef.current.includes(chatId)) orderRef.current.push(chatId);
      return { ...prev, [chatId]: { chatId, title: existing?.title ?? title, messages: msgs } };
    });
  });

  useEffect(() => {
    if (!client) return;
    const newEvent = new NewMessage({});
    const rawEvent = new Raw({});

    const onNew = (event: any) => {
      const m = event.message;
      if (!m) return;
      const chatId = idToString(m.chatId);
      if (!chatId) return;
      addMessage(chatId, senderTitle(m, `Chat ${chatId}`), normalizeMessage(m, chatId, selfId));
    };

    const onRaw = (update: any) => {
      if (update instanceof Api.UpdateBotCallbackQuery) {
        const fromName = idToString(update.userId);
        const dataText = update.data ? Buffer.from(update.data).toString('utf8') : '(no data)';
        setCallbacks((prev) => [
          { id: idToString(update.queryId), fromName: `User ${fromName}`, dataText, raw: update },
          ...prev,
        ].slice(0, 30));
      }
    };

    client.addEventHandler(onNew, newEvent);
    client.addEventHandler(onRaw, rawEvent);
    return () => {
      try {
        client.removeEventHandler(onNew, newEvent);
        client.removeEventHandler(onRaw, rawEvent);
      } catch {
        /* ignore */
      }
    };
  }, [client, selfId, addMessage]);

  const pushOutgoing = useCallbackRef((chatId: string, msg: NormalizedMessage) => {
    addMessage(chatId, conversations[chatId]?.title ?? `Chat ${chatId}`, msg);
  });

  const dismissCallback = useCallbackRef((id: string) => {
    setCallbacks((prev) => prev.filter((c) => c.id !== id));
  });

  const orderedConversations = orderRef.current
    .map((id) => conversations[id])
    .filter(Boolean) as BotConversation[];

  return { conversations: orderedConversations, callbacks, pushOutgoing, dismissCallback };
}
