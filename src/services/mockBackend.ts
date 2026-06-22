import type { Chat, ChatSummary, ID, Message, User } from '@/types';
import { uid, normalizePhone } from '@/lib/utils';
import {
  autoReplies,
  CURRENT_USER_ID,
  seedChats,
  seedCurrentUser,
  seedMessages,
  seedUsers,
} from '@/data/seed';
import { buildSummaries } from './summary';
import type { Backend, SendMessageInput, Unsubscribe, VerificationHandle } from './backendTypes';

// The fixed code accepted by the mock backend (any 5-digit code also works).
const MOCK_CODE = '12345';
const STORAGE_KEY = 'tg-clone-mock-state-v1';
const SESSION_KEY = 'tg-clone-session-v1';

interface PersistedState {
  users: Record<ID, User>;
  chats: Record<ID, Chat>;
  messages: Record<ID, Message[]>;
  readState: Record<ID, number>;
}

type Listener<T> = (value: T) => void;

/**
 * A self-contained, in-browser realtime backend. It persists to localStorage,
 * simulates delivery/read receipts, typing indicators, and canned auto-replies
 * so the app feels alive with zero external services.
 */
class MockBackend implements Backend {
  readonly kind = 'mock' as const;

  private users: Record<ID, User> = {};
  private chats: Record<ID, Chat> = {};
  private messages: Record<ID, Message[]> = {};
  private readState: Record<ID, number> = {};
  private typing: Record<ID, Set<ID>> = {};

  private currentUser: User | null = null;

  private authListeners = new Set<Listener<User | null>>();
  private userListeners = new Set<Listener<User[]>>();
  private chatListeners = new Set<Listener<ChatSummary[]>>();
  private messageListeners = new Map<ID, Set<Listener<Message[]>>>();
  private typingListeners = new Map<ID, Set<Listener<ID[]>>>();

  constructor() {
    this.load();
    this.restoreSession();
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------
  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        this.users = parsed.users ?? {};
        this.chats = parsed.chats ?? {};
        this.messages = parsed.messages ?? {};
        this.readState = parsed.readState ?? {};
        return;
      }
    } catch {
      /* fall through to seeding */
    }
    this.seed();
  }

  private seed() {
    this.users = Object.fromEntries(seedUsers.map((u) => [u.id, { ...u }]));
    this.chats = Object.fromEntries(seedChats.map((c) => [c.id, { ...c }]));
    this.messages = {};
    for (const m of seedMessages) {
      (this.messages[m.chatId] ??= []).push({ ...m });
    }
    for (const list of Object.values(this.messages)) {
      list.sort((a, b) => a.createdAt - b.createdAt);
    }
    // Mark all seeded conversations as read initially.
    this.readState = {};
    for (const chatId of Object.keys(this.chats)) {
      const list = this.messages[chatId] ?? [];
      this.readState[chatId] = list.length ? list[list.length - 1].createdAt : 0;
    }
    this.persist();
  }

  private persist() {
    const state: PersistedState = {
      users: this.users,
      chats: this.chats,
      messages: this.messages,
      readState: this.readState,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage might be full or unavailable; ignore for the demo */
    }
  }

  private restoreSession() {
    try {
      const id = localStorage.getItem(SESSION_KEY);
      if (id && this.users[id]) {
        this.currentUser = this.users[id];
      }
    } catch {
      /* ignore */
    }
  }

  // ---------------------------------------------------------------------------
  // Emitters
  // ---------------------------------------------------------------------------
  private emitAuth() {
    this.authListeners.forEach((cb) => cb(this.currentUser));
  }

  private emitUsers() {
    const list = Object.values(this.users);
    this.userListeners.forEach((cb) => cb(list));
  }

  private emitChats() {
    if (!this.currentUser) return;
    const summaries = this.computeSummaries();
    this.chatListeners.forEach((cb) => cb(summaries));
  }

  private emitMessages(chatId: ID) {
    const list = [...(this.messages[chatId] ?? [])];
    this.messageListeners.get(chatId)?.forEach((cb) => cb(list));
  }

  private emitTyping(chatId: ID) {
    const list = Array.from(this.typing[chatId] ?? []);
    this.typingListeners.get(chatId)?.forEach((cb) => cb(list));
  }

  private computeSummaries(): ChatSummary[] {
    const me = this.currentUser!.id;
    const chats = Object.values(this.chats).filter((c) => c.memberIds.includes(me));
    const typingByChat: Record<ID, ID[]> = {};
    for (const [chatId, set] of Object.entries(this.typing)) {
      typingByChat[chatId] = Array.from(set);
    }
    return buildSummaries({
      chats,
      messagesByChat: this.messages,
      users: this.users,
      currentUserId: me,
      typingByChat,
      readStateByChat: this.readState,
    });
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthChange(cb: Listener<User | null>): Unsubscribe {
    this.authListeners.add(cb);
    cb(this.currentUser);
    return () => this.authListeners.delete(cb);
  }

  async sendVerificationCode(phone: string): Promise<VerificationHandle> {
    await delay(600);
    const verificationId = uid('vid_');
    // Stash the phone against the verification id for confirmation.
    pendingVerifications.set(verificationId, normalizePhone(phone));
    return { verificationId, devCode: MOCK_CODE };
  }

  async confirmCode(verificationId: string, code: string): Promise<User> {
    await delay(500);
    const phone = pendingVerifications.get(verificationId);
    if (!phone) throw new Error('Verification expired. Please request a new code.');
    // Accept the canonical mock code or any 5-digit code for convenience.
    if (code !== MOCK_CODE && !/^\d{5}$/.test(code)) {
      throw new Error('Invalid code. Try 12345.');
    }
    pendingVerifications.delete(verificationId);

    // Reuse the stable current user, updating the phone they signed in with.
    const existing = this.users[CURRENT_USER_ID] ?? { ...seedCurrentUser };
    const user: User = { ...existing, phone, online: true, lastSeen: Date.now() };
    this.users[user.id] = user;
    this.currentUser = user;
    try {
      localStorage.setItem(SESSION_KEY, user.id);
    } catch {
      /* ignore */
    }
    this.persist();
    this.emitAuth();
    this.emitUsers();
    this.emitChats();
    return user;
  }

  async updateProfile(patch: Partial<Pick<User, 'name' | 'bio' | 'avatar'>>): Promise<User> {
    if (!this.currentUser) throw new Error('Not signed in');
    const updated = { ...this.currentUser, ...patch };
    this.users[updated.id] = updated;
    this.currentUser = updated;
    this.persist();
    this.emitAuth();
    this.emitUsers();
    this.emitChats();
    return updated;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    this.emitAuth();
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------
  subscribeUsers(cb: Listener<User[]>): Unsubscribe {
    this.userListeners.add(cb);
    cb(Object.values(this.users));
    return () => this.userListeners.delete(cb);
  }

  subscribeChats(cb: Listener<ChatSummary[]>): Unsubscribe {
    this.chatListeners.add(cb);
    if (this.currentUser) cb(this.computeSummaries());
    return () => this.chatListeners.delete(cb);
  }

  subscribeMessages(chatId: ID, cb: Listener<Message[]>): Unsubscribe {
    let set = this.messageListeners.get(chatId);
    if (!set) {
      set = new Set();
      this.messageListeners.set(chatId, set);
    }
    set.add(cb);
    cb([...(this.messages[chatId] ?? [])]);
    return () => {
      set!.delete(cb);
    };
  }

  subscribeTyping(chatId: ID, cb: Listener<ID[]>): Unsubscribe {
    let set = this.typingListeners.get(chatId);
    if (!set) {
      set = new Set();
      this.typingListeners.set(chatId, set);
    }
    set.add(cb);
    cb(Array.from(this.typing[chatId] ?? []));
    return () => {
      set!.delete(cb);
    };
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------
  async sendMessage(input: SendMessageInput): Promise<Message> {
    if (!this.currentUser) throw new Error('Not signed in');
    const message: Message = {
      id: uid('m_'),
      chatId: input.chatId,
      senderId: this.currentUser.id,
      type: input.type ?? 'text',
      text: input.text,
      createdAt: Date.now(),
      status: 'sending',
      attachment: input.attachment,
      replyTo: input.replyTo,
      forwardedFrom: input.forwardedFrom,
    };
    (this.messages[input.chatId] ??= []).push(message);
    // Sender has implicitly read their own chat up to now.
    this.readState[input.chatId] = message.createdAt;
    this.persist();
    this.emitMessages(input.chatId);
    this.emitChats();

    this.simulateOutgoingLifecycle(message);
    return message;
  }

  /** sending -> sent -> delivered, then a typing peer + auto reply marks it read. */
  private simulateOutgoingLifecycle(message: Message) {
    const setStatus = (status: Message['status']) => {
      const list = this.messages[message.chatId];
      const target = list?.find((m) => m.id === message.id);
      if (!target) return;
      target.status = status;
      this.persist();
      this.emitMessages(message.chatId);
      this.emitChats();
    };

    setTimeout(() => setStatus('sent'), 400);
    setTimeout(() => setStatus('delivered'), 900);

    const chat = this.chats[message.chatId];
    if (!chat) return;

    // Pick a peer to "respond" (private chats and groups both work).
    const peerId = chat.memberIds.find((id) => id !== this.currentUser!.id);
    if (!peerId) return;

    // Peer reads the message shortly after delivery.
    setTimeout(() => {
      setStatus('read');
      // Then starts typing...
      this.startTyping(message.chatId, peerId);
    }, 1600);

    // ...and replies (only for text messages, ~70% of the time).
    if (message.type === 'text' && Math.random() < 0.75) {
      setTimeout(() => {
        this.stopTyping(message.chatId, peerId);
        this.injectIncoming(message.chatId, peerId);
      }, 3200);
    } else {
      setTimeout(() => this.stopTyping(message.chatId, peerId), 2600);
    }
  }

  private injectIncoming(chatId: ID, senderId: ID) {
    const text = autoReplies[Math.floor(Math.random() * autoReplies.length)];
    const message: Message = {
      id: uid('m_'),
      chatId,
      senderId,
      type: 'text',
      text,
      createdAt: Date.now(),
      status: 'delivered',
    };
    (this.messages[chatId] ??= []).push(message);
    this.persist();
    this.emitMessages(chatId);
    this.emitChats();
  }

  async deleteMessage(chatId: ID, messageId: ID): Promise<void> {
    const list = this.messages[chatId];
    if (!list) return;
    this.messages[chatId] = list.filter((m) => m.id !== messageId);
    const chat = this.chats[chatId];
    if (chat) {
      chat.pinnedMessageIds = chat.pinnedMessageIds.filter((id) => id !== messageId);
    }
    this.persist();
    this.emitMessages(chatId);
    this.emitChats();
  }

  async forwardMessages(messageIds: ID[], fromChatId: ID, toChatId: ID): Promise<void> {
    if (!this.currentUser) throw new Error('Not signed in');
    const source = this.messages[fromChatId] ?? [];
    for (const id of messageIds) {
      const original = source.find((m) => m.id === id);
      if (!original) continue;
      const originalAuthor = this.users[original.senderId];
      const forwarded: Message = {
        id: uid('m_'),
        chatId: toChatId,
        senderId: this.currentUser.id,
        type: original.type,
        text: original.text,
        createdAt: Date.now(),
        status: 'sent',
        attachment: original.attachment,
        forwardedFrom: {
          originalAuthorId: original.senderId,
          originalAuthorName: originalAuthor?.name ?? 'Unknown',
        },
      };
      (this.messages[toChatId] ??= []).push(forwarded);
    }
    this.readState[toChatId] = Date.now();
    this.persist();
    this.emitMessages(toChatId);
    this.emitChats();
  }

  async markChatRead(chatId: ID): Promise<void> {
    this.readState[chatId] = Date.now();
    this.persist();
    this.emitChats();
  }

  setTyping(_chatId: ID, _isTyping: boolean): void {
    // In a single-user demo the current user's typing isn't broadcast anywhere.
    // The method exists to satisfy the contract and to wire real backends.
  }

  private startTyping(chatId: ID, userId: ID) {
    (this.typing[chatId] ??= new Set()).add(userId);
    this.emitTyping(chatId);
    this.emitChats();
  }

  private stopTyping(chatId: ID, userId: ID) {
    this.typing[chatId]?.delete(userId);
    this.emitTyping(chatId);
    this.emitChats();
  }

  // ---------------------------------------------------------------------------
  // Chat management
  // ---------------------------------------------------------------------------
  async createPrivateChat(peerId: ID): Promise<Chat> {
    if (!this.currentUser) throw new Error('Not signed in');
    const me = this.currentUser.id;
    // Reuse an existing private chat with this peer if one exists.
    const existing = Object.values(this.chats).find(
      (c) =>
        c.type === 'private' &&
        c.memberIds.includes(me) &&
        c.memberIds.includes(peerId),
    );
    if (existing) return existing;

    const chat: Chat = {
      id: uid('c_'),
      type: 'private',
      memberIds: [me, peerId],
      pinnedMessageIds: [],
      pinned: false,
      muted: false,
      createdAt: Date.now(),
    };
    this.chats[chat.id] = chat;
    this.messages[chat.id] = [];
    this.readState[chat.id] = Date.now();
    this.persist();
    this.emitChats();
    return chat;
  }

  async createGroup(title: string, memberIds: ID[]): Promise<Chat> {
    if (!this.currentUser) throw new Error('Not signed in');
    const members = Array.from(new Set([this.currentUser.id, ...memberIds]));
    const chat: Chat = {
      id: uid('c_'),
      type: 'group',
      title: title.trim() || 'New Group',
      memberIds: members,
      pinnedMessageIds: [],
      pinned: false,
      muted: false,
      createdAt: Date.now(),
    };
    this.chats[chat.id] = chat;
    this.messages[chat.id] = [
      {
        id: uid('m_'),
        chatId: chat.id,
        senderId: this.currentUser.id,
        type: 'system',
        text: `${this.currentUser.name} created the group "${chat.title}"`,
        createdAt: Date.now(),
        status: 'read',
      },
    ];
    this.readState[chat.id] = Date.now();
    this.persist();
    this.emitChats();
    this.emitMessages(chat.id);
    return chat;
  }

  async togglePinChat(chatId: ID): Promise<void> {
    const chat = this.chats[chatId];
    if (!chat) return;
    chat.pinned = !chat.pinned;
    this.persist();
    this.emitChats();
  }

  async toggleMuteChat(chatId: ID): Promise<void> {
    const chat = this.chats[chatId];
    if (!chat) return;
    chat.muted = !chat.muted;
    this.persist();
    this.emitChats();
  }

  async pinMessage(chatId: ID, messageId: ID): Promise<void> {
    const chat = this.chats[chatId];
    if (!chat) return;
    if (!chat.pinnedMessageIds.includes(messageId)) {
      chat.pinnedMessageIds = [messageId, ...chat.pinnedMessageIds];
    }
    this.persist();
    this.emitChats();
    this.emitMessages(chatId);
  }

  async unpinMessage(chatId: ID, messageId: ID): Promise<void> {
    const chat = this.chats[chatId];
    if (!chat) return;
    chat.pinnedMessageIds = chat.pinnedMessageIds.filter((id) => id !== messageId);
    this.persist();
    this.emitChats();
    this.emitMessages(chatId);
  }
}

const pendingVerifications = new Map<string, string>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockBackend = new MockBackend();
