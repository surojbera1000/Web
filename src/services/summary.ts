import type { Chat, ChatSummary, ID, Message, User } from '@/types';

interface BuildArgs {
  chats: Chat[];
  messagesByChat: Record<ID, Message[]>;
  users: Record<ID, User>;
  currentUserId: ID;
  typingByChat: Record<ID, ID[]>;
  /** Last-read timestamp per chat for the current user. */
  readStateByChat: Record<ID, number>;
}

/** Resolve the display name + avatar + presence for a chat row. */
export function resolveChatIdentity(
  chat: Chat,
  users: Record<ID, User>,
  currentUserId: ID,
): { displayName: string; avatar?: string; online: boolean } {
  if (chat.type === 'group') {
    return { displayName: chat.title ?? 'Group', avatar: chat.avatar, online: false };
  }
  const peerId = chat.memberIds.find((id) => id !== currentUserId);
  const peer = peerId ? users[peerId] : undefined;
  return {
    displayName: peer?.name ?? 'Unknown',
    avatar: peer?.avatar,
    online: peer?.online ?? false,
  };
}

/** Turn raw state into the decorated, sorted list the sidebar renders. */
export function buildSummaries({
  chats,
  messagesByChat,
  users,
  currentUserId,
  typingByChat,
  readStateByChat,
}: BuildArgs): ChatSummary[] {
  const summaries: ChatSummary[] = chats.map((chat) => {
    const msgs = messagesByChat[chat.id] ?? [];
    const lastMessage = msgs.length ? msgs[msgs.length - 1] : undefined;
    const lastRead = readStateByChat[chat.id] ?? 0;

    const unreadCount = msgs.reduce((acc, m) => {
      if (m.senderId !== currentUserId && m.createdAt > lastRead) return acc + 1;
      return acc;
    }, 0);

    const typingMemberIds = (typingByChat[chat.id] ?? []).filter((id) => id !== currentUserId);
    const identity = resolveChatIdentity(chat, users, currentUserId);

    return {
      chat,
      displayName: identity.displayName,
      avatar: identity.avatar,
      online: identity.online,
      lastMessage,
      unreadCount,
      typingMemberIds,
    };
  });

  // Sort: pinned chats first, then by last activity (newest first).
  return summaries.sort((a, b) => {
    if (a.chat.pinned !== b.chat.pinned) return a.chat.pinned ? -1 : 1;
    const at = a.lastMessage?.createdAt ?? a.chat.createdAt;
    const bt = b.lastMessage?.createdAt ?? b.chat.createdAt;
    return bt - at;
  });
}
