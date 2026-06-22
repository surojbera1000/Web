import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Chat, ChatSummary, ID, Message, User } from '@/types';
import { backend, type SendMessageInput } from '@/services';
import { useAuth } from './AuthContext';

interface ForwardState {
  messageIds: ID[];
  fromChatId: ID;
}

interface ChatContextValue {
  currentUser: User;
  summaries: ChatSummary[];
  usersById: Record<ID, User>;
  contacts: User[];

  activeChatId: ID | null;
  activeChat: Chat | null;
  activeSummary: ChatSummary | null;
  /** Resolved members of the active chat (excluding helpers). */
  activeMembers: User[];
  /** The peer in a private chat (undefined for groups). */
  activePeer: User | null;

  openChat: (chatId: ID) => void;
  closeChat: () => void;
  openPrivateChat: (peerId: ID) => Promise<void>;
  createGroup: (title: string, memberIds: ID[]) => Promise<void>;

  sendMessage: (input: SendMessageInput) => Promise<Message>;
  deleteMessage: (chatId: ID, messageId: ID) => Promise<void>;
  markChatRead: (chatId: ID) => Promise<void>;
  togglePinChat: (chatId: ID) => Promise<void>;
  toggleMuteChat: (chatId: ID) => Promise<void>;
  pinMessage: (chatId: ID, messageId: ID) => Promise<void>;
  unpinMessage: (chatId: ID, messageId: ID) => Promise<void>;

  // Forwarding flow (pick target chat in a dialog).
  forwarding: ForwardState | null;
  beginForward: (messageIds: ID[], fromChatId: ID) => void;
  cancelForward: () => void;
  completeForward: (toChatId: ID) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [usersById, setUsersById] = useState<Record<ID, User>>({});
  const [activeChatId, setActiveChatId] = useState<ID | null>(null);
  const [forwarding, setForwarding] = useState<ForwardState | null>(null);

  useEffect(() => {
    const unsubUsers = backend.subscribeUsers((users) => {
      setUsersById(Object.fromEntries(users.map((u) => [u.id, u])));
    });
    const unsubChats = backend.subscribeChats(setSummaries);
    return () => {
      unsubUsers();
      unsubChats();
    };
  }, []);

  const openChat = useCallback((chatId: ID) => {
    setActiveChatId(chatId);
    void backend.markChatRead(chatId);
  }, []);

  const closeChat = useCallback(() => setActiveChatId(null), []);

  const openPrivateChat = useCallback(async (peerId: ID) => {
    const chat = await backend.createPrivateChat(peerId);
    setActiveChatId(chat.id);
    void backend.markChatRead(chat.id);
  }, []);

  const createGroup = useCallback(async (title: string, memberIds: ID[]) => {
    const chat = await backend.createGroup(title, memberIds);
    setActiveChatId(chat.id);
  }, []);

  const sendMessage = useCallback((input: SendMessageInput) => backend.sendMessage(input), []);
  const deleteMessage = useCallback(
    (chatId: ID, messageId: ID) => backend.deleteMessage(chatId, messageId),
    [],
  );
  const markChatRead = useCallback((chatId: ID) => backend.markChatRead(chatId), []);
  const togglePinChat = useCallback((chatId: ID) => backend.togglePinChat(chatId), []);
  const toggleMuteChat = useCallback((chatId: ID) => backend.toggleMuteChat(chatId), []);
  const pinMessage = useCallback(
    (chatId: ID, messageId: ID) => backend.pinMessage(chatId, messageId),
    [],
  );
  const unpinMessage = useCallback(
    (chatId: ID, messageId: ID) => backend.unpinMessage(chatId, messageId),
    [],
  );

  const beginForward = useCallback((messageIds: ID[], fromChatId: ID) => {
    setForwarding({ messageIds, fromChatId });
  }, []);
  const cancelForward = useCallback(() => setForwarding(null), []);
  const completeForward = useCallback(
    async (toChatId: ID) => {
      if (!forwarding) return;
      await backend.forwardMessages(forwarding.messageIds, forwarding.fromChatId, toChatId);
      setForwarding(null);
      setActiveChatId(toChatId);
    },
    [forwarding],
  );

  const activeSummary = useMemo(
    () => summaries.find((s) => s.chat.id === activeChatId) ?? null,
    [summaries, activeChatId],
  );
  const activeChat = activeSummary?.chat ?? null;

  const activeMembers = useMemo(() => {
    if (!activeChat) return [];
    return activeChat.memberIds.map((id) => usersById[id]).filter(Boolean) as User[];
  }, [activeChat, usersById]);

  const activePeer = useMemo(() => {
    if (!activeChat || activeChat.type !== 'private' || !user) return null;
    const peerId = activeChat.memberIds.find((id) => id !== user.id);
    return peerId ? usersById[peerId] ?? null : null;
  }, [activeChat, usersById, user]);

  const contacts = useMemo(
    () => Object.values(usersById).filter((u) => u.id !== user?.id),
    [usersById, user],
  );

  if (!user) return null;

  const value: ChatContextValue = {
    currentUser: user,
    summaries,
    usersById,
    contacts,
    activeChatId,
    activeChat,
    activeSummary,
    activeMembers,
    activePeer,
    openChat,
    closeChat,
    openPrivateChat,
    createGroup,
    sendMessage,
    deleteMessage,
    markChatRead,
    togglePinChat,
    toggleMuteChat,
    pinMessage,
    unpinMessage,
    forwarding,
    beginForward,
    cancelForward,
    completeForward,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
