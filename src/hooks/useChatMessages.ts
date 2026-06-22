import { useEffect, useState } from 'react';
import type { ID, Message } from '@/types';
import { backend } from '@/services';

/** Subscribe to the live message list + typing user ids for a chat. */
export function useChatMessages(chatId: ID | null): {
  messages: Message[];
  typingUserIds: ID[];
} {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<ID[]>([]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setTypingUserIds([]);
      return;
    }
    const unsubMessages = backend.subscribeMessages(chatId, setMessages);
    const unsubTyping = backend.subscribeTyping(chatId, setTypingUserIds);
    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [chatId]);

  return { messages, typingUserIds };
}
