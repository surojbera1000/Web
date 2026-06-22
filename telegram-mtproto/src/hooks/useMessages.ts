import { useEffect, useRef, useState } from 'react';
import { Api } from 'telegram';
import { NewMessage, EditedMessage, DeletedMessage, Raw } from 'telegram/events';
import { useTelegram } from '@/context/TelegramContext';
import { useCallbackRef } from './useCallbackRef';
import {
  deleteMessages as apiDelete,
  editMessage as apiEdit,
  fetchMessages,
  forwardMessages as apiForward,
  markRead,
  normalizeMessage,
  sendMediaFile,
  sendTextMessage,
} from '@/lib/telegram/messages';
import { idToString } from '@/lib/telegram/format';
import type { NormalizedMessage } from '@/lib/telegram/types';

export function useMessages(chatId: string | null) {
  const { client, account } = useTelegram();
  const selfId = account?.id ?? '';
  const [messages, setMessages] = useState<NormalizedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const typingTimers = useRef<Map<string, number>>(new Map());

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

  const removeIds = useCallbackRef((ids: number[]) => {
    setMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
  });

  // Initial load + mark read whenever the chat changes.
  useEffect(() => {
    if (!client || !chatId) {
      setMessages([]);
      return;
    }
    let active = true;
    setLoading(true);
    setTypingNames([]);
    void (async () => {
      try {
        const list = await fetchMessages(client, chatId, selfId, 50);
        if (active) setMessages(list);
        await markRead(client, chatId);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [client, chatId, selfId]);

  // Real-time subscriptions for this chat.
  useEffect(() => {
    if (!client || !chatId) return;

    const newMsgEvent = new NewMessage({});
    const editEvent = new EditedMessage({});
    const delEvent = new DeletedMessage({});
    const rawEvent = new Raw({});

    const onNew = (event: any) => {
      const m = event.message;
      if (!m || idToString(m.chatId) !== chatId) return;
      upsert(normalizeMessage(m, chatId, selfId));
      void markRead(client, chatId);
    };
    const onEdit = (event: any) => {
      const m = event.message;
      if (!m || idToString(m.chatId) !== chatId) return;
      upsert(normalizeMessage(m, chatId, selfId));
    };
    const onDelete = (event: any) => {
      const ids: number[] = event.deletedIds ?? [];
      if (ids.length) removeIds(ids);
    };
    const onRaw = (update: any) => {
      if (
        update instanceof Api.UpdateUserTyping ||
        update instanceof Api.UpdateChatUserTyping
      ) {
        const peerId =
          update instanceof Api.UpdateUserTyping
            ? idToString(update.userId)
            : idToString((update as Api.UpdateChatUserTyping).chatId);
        const fromId =
          update instanceof Api.UpdateChatUserTyping ? idToString((update as any).fromId?.userId) : peerId;
        if (peerId !== chatId && fromId !== chatId) return;
        if (!(update.action instanceof Api.SendMessageTypingAction)) return;
        handleTyping(fromId || 'someone');
      }
    };

    function handleTyping(userId: string) {
      const label = 'typing…';
      setTypingNames([label]);
      const timers = typingTimers.current;
      window.clearTimeout(timers.get(userId));
      timers.set(
        userId,
        window.setTimeout(() => {
          timers.delete(userId);
          setTypingNames([]);
        }, 4000),
      );
    }

    client.addEventHandler(onNew, newMsgEvent);
    client.addEventHandler(onEdit, editEvent);
    client.addEventHandler(onDelete, delEvent);
    client.addEventHandler(onRaw, rawEvent);

    return () => {
      try {
        client.removeEventHandler(onNew, newMsgEvent);
        client.removeEventHandler(onEdit, editEvent);
        client.removeEventHandler(onDelete, delEvent);
        client.removeEventHandler(onRaw, rawEvent);
      } catch {
        /* ignore */
      }
    };
  }, [client, chatId, selfId, upsert, removeIds]);

  // Actions
  const send = useCallbackRef(async (text: string, replyToMsgId?: number) => {
    if (!client || !chatId) return;
    const sent = await sendTextMessage(client, chatId, text, selfId, replyToMsgId);
    upsert(sent);
  });

  const sendFile = useCallbackRef(async (file: File) => {
    if (!client || !chatId) return;
    const sent = await sendMediaFile(client, chatId, file, selfId);
    upsert(sent);
  });

  const edit = useCallbackRef(async (msgId: number, text: string) => {
    if (!client || !chatId) return;
    await apiEdit(client, chatId, msgId, text);
  });

  const remove = useCallbackRef(async (msgId: number) => {
    if (!client || !chatId) return;
    removeIds([msgId]);
    await apiDelete(client, chatId, [msgId], true);
  });

  const forwardTo = useCallbackRef(async (msgId: number, toChatId: string) => {
    if (!client || !chatId) return;
    await apiForward(client, chatId, [msgId], toChatId);
  });

  return { messages, loading, typingNames, send, sendFile, edit, remove, forwardTo };
}
