import {
  onAuthStateChanged,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as fbSignOut,
  type ConfirmationResult,
} from 'firebase/auth';
import {
  ref,
  onValue,
  push,
  set,
  update,
  get,
  remove,
} from 'firebase/database';
import type { Chat, ChatSummary, ID, Message, User } from '@/types';
import { uid } from '@/lib/utils';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { buildSummaries } from './summary';
import type { Backend, SendMessageInput, Unsubscribe, VerificationHandle } from './backendTypes';

type Listener<T> = (value: T) => void;

const RECAPTCHA_CONTAINER_ID = 'recaptcha-container';

/**
 * Firebase implementation of the backend contract using Auth (Phone) and the
 * Realtime Database. Activated automatically when Firebase env vars are set.
 *
 * Expected RTDB layout:
 *   users/{uid}            -> User
 *   chats/{chatId}         -> Chat (memberIds + pinnedMessageIds stored as arrays)
 *   messages/{chatId}/{id} -> Message
 *   typing/{chatId}/{uid}  -> timestamp (key present === typing)
 *   reads/{chatId}/{uid}   -> last-read timestamp
 */
class FirebaseBackend implements Backend {
  readonly kind = 'firebase' as const;

  private currentUser: User | null = null;
  private confirmations = new Map<string, ConfirmationResult>();
  private recaptcha?: RecaptchaVerifier;

  // Local caches kept in sync by root listeners, used to build summaries.
  private usersCache: Record<ID, User> = {};
  private chatsCache: Record<ID, Chat> = {};
  private messagesCache: Record<ID, Message[]> = {};
  private typingCache: Record<ID, ID[]> = {};
  private readsCache: Record<ID, number> = {};

  private chatListeners = new Set<Listener<ChatSummary[]>>();

  constructor() {
    this.initRootListeners();
  }

  private initRootListeners() {
    const db = getFirebaseDb();

    onValue(ref(db, 'users'), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, User>;
      this.usersCache = val;
      this.emitChats();
    });

    onValue(ref(db, 'chats'), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, Chat>;
      this.chatsCache = normalizeChats(val);
      this.emitChats();
    });

    onValue(ref(db, 'messages'), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, Record<ID, Message>>;
      const byChat: Record<ID, Message[]> = {};
      for (const [chatId, msgMap] of Object.entries(val)) {
        byChat[chatId] = Object.values(msgMap).sort((a, b) => a.createdAt - b.createdAt);
      }
      this.messagesCache = byChat;
      this.emitChats();
    });

    onValue(ref(db, 'typing'), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, Record<ID, number>>;
      const out: Record<ID, ID[]> = {};
      for (const [chatId, users] of Object.entries(val)) {
        out[chatId] = Object.keys(users);
      }
      this.typingCache = out;
      this.emitChats();
    });

    onValue(ref(db, 'reads'), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, Record<ID, number>>;
      const out: Record<ID, number> = {};
      const me = this.currentUser?.id;
      for (const [chatId, users] of Object.entries(val)) {
        if (me && users[me] != null) out[chatId] = users[me];
      }
      this.readsCache = out;
      this.emitChats();
    });
  }

  private emitChats() {
    if (!this.currentUser) return;
    const summaries = this.computeSummaries();
    this.chatListeners.forEach((cb) => cb(summaries));
  }

  private computeSummaries(): ChatSummary[] {
    const me = this.currentUser!.id;
    const chats = Object.values(this.chatsCache).filter((c) => c.memberIds?.includes(me));
    return buildSummaries({
      chats,
      messagesByChat: this.messagesCache,
      users: this.usersCache,
      currentUserId: me,
      typingByChat: this.typingCache,
      readStateByChat: this.readsCache,
    });
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthChange(cb: Listener<User | null>): Unsubscribe {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        this.currentUser = null;
        cb(null);
        return;
      }
      const user = await this.ensureProfile(fbUser.uid, fbUser.phoneNumber ?? '');
      this.currentUser = user;
      cb(user);
      this.emitChats();
    });
  }

  private async ensureProfile(uidValue: ID, phone: string): Promise<User> {
    const db = getFirebaseDb();
    const userRef = ref(db, `users/${uidValue}`);
    const snap = await get(userRef);
    if (snap.exists()) {
      const existing = snap.val() as User;
      await update(userRef, { online: true, lastSeen: Date.now() });
      return { ...existing, online: true, lastSeen: Date.now() };
    }
    const user: User = {
      id: uidValue,
      name: phone || 'New User',
      phone,
      online: true,
      lastSeen: Date.now(),
    };
    await set(userRef, user);
    return user;
  }

  private getRecaptcha(): RecaptchaVerifier {
    if (this.recaptcha) return this.recaptcha;
    let container = document.getElementById(RECAPTCHA_CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = RECAPTCHA_CONTAINER_ID;
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.left = '0';
      document.body.appendChild(container);
    }
    this.recaptcha = new RecaptchaVerifier(getFirebaseAuth(), RECAPTCHA_CONTAINER_ID, {
      size: 'invisible',
    });
    return this.recaptcha;
  }

  async sendVerificationCode(phone: string): Promise<VerificationHandle> {
    const auth = getFirebaseAuth();
    const confirmation = await signInWithPhoneNumber(auth, phone, this.getRecaptcha());
    const verificationId = uid('vid_');
    this.confirmations.set(verificationId, confirmation);
    return { verificationId };
  }

  async confirmCode(verificationId: string, code: string): Promise<User> {
    const confirmation = this.confirmations.get(verificationId);
    if (!confirmation) throw new Error('Verification expired. Please request a new code.');
    const credential = await confirmation.confirm(code);
    this.confirmations.delete(verificationId);
    const fbUser = credential.user;
    const user = await this.ensureProfile(fbUser.uid, fbUser.phoneNumber ?? '');
    this.currentUser = user;
    return user;
  }

  async updateProfile(patch: Partial<Pick<User, 'name' | 'bio' | 'avatar'>>): Promise<User> {
    if (!this.currentUser) throw new Error('Not signed in');
    const db = getFirebaseDb();
    await update(ref(db, `users/${this.currentUser.id}`), patch);
    this.currentUser = { ...this.currentUser, ...patch };
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    if (this.currentUser) {
      const db = getFirebaseDb();
      await update(ref(db, `users/${this.currentUser.id}`), {
        online: false,
        lastSeen: Date.now(),
      });
    }
    await fbSignOut(getFirebaseAuth());
    this.currentUser = null;
  }

  // ---------------------------------------------------------------------------
  // Subscriptions
  // ---------------------------------------------------------------------------
  subscribeUsers(cb: Listener<User[]>): Unsubscribe {
    const db = getFirebaseDb();
    return onValue(ref(db, 'users'), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, User>;
      cb(Object.values(val));
    });
  }

  subscribeChats(cb: Listener<ChatSummary[]>): Unsubscribe {
    this.chatListeners.add(cb);
    if (this.currentUser) cb(this.computeSummaries());
    return () => {
      this.chatListeners.delete(cb);
    };
  }

  subscribeMessages(chatId: ID, cb: Listener<Message[]>): Unsubscribe {
    const db = getFirebaseDb();
    return onValue(ref(db, `messages/${chatId}`), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, Message>;
      cb(Object.values(val).sort((a, b) => a.createdAt - b.createdAt));
    });
  }

  subscribeTyping(chatId: ID, cb: Listener<ID[]>): Unsubscribe {
    const db = getFirebaseDb();
    return onValue(ref(db, `typing/${chatId}`), (snap) => {
      const val = (snap.val() ?? {}) as Record<ID, number>;
      cb(Object.keys(val));
    });
  }

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------
  async sendMessage(input: SendMessageInput): Promise<Message> {
    if (!this.currentUser) throw new Error('Not signed in');
    const db = getFirebaseDb();
    const listRef = ref(db, `messages/${input.chatId}`);
    const msgRef = push(listRef);
    const message: Message = {
      id: msgRef.key ?? uid('m_'),
      chatId: input.chatId,
      senderId: this.currentUser.id,
      type: input.type ?? 'text',
      text: input.text,
      createdAt: Date.now(),
      status: 'sent',
      ...(input.attachment ? { attachment: input.attachment } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.forwardedFrom ? { forwardedFrom: input.forwardedFrom } : {}),
    };
    await set(msgRef, message);
    await this.markChatRead(input.chatId);
    return message;
  }

  async deleteMessage(chatId: ID, messageId: ID): Promise<void> {
    const db = getFirebaseDb();
    await remove(ref(db, `messages/${chatId}/${messageId}`));
  }

  async forwardMessages(messageIds: ID[], fromChatId: ID, toChatId: ID): Promise<void> {
    if (!this.currentUser) throw new Error('Not signed in');
    const source = this.messagesCache[fromChatId] ?? [];
    for (const id of messageIds) {
      const original = source.find((m) => m.id === id);
      if (!original) continue;
      const author = this.usersCache[original.senderId];
      await this.sendMessage({
        chatId: toChatId,
        text: original.text,
        type: original.type,
        attachment: original.attachment,
        forwardedFrom: {
          originalAuthorId: original.senderId,
          originalAuthorName: author?.name ?? 'Unknown',
        },
      });
    }
  }

  async markChatRead(chatId: ID): Promise<void> {
    if (!this.currentUser) return;
    const db = getFirebaseDb();
    await set(ref(db, `reads/${chatId}/${this.currentUser.id}`), Date.now());
  }

  setTyping(chatId: ID, isTyping: boolean): void {
    if (!this.currentUser) return;
    const db = getFirebaseDb();
    const typingRef = ref(db, `typing/${chatId}/${this.currentUser.id}`);
    if (isTyping) {
      void set(typingRef, Date.now());
    } else {
      void remove(typingRef);
    }
  }

  // ---------------------------------------------------------------------------
  // Chat management
  // ---------------------------------------------------------------------------
  async createPrivateChat(peerId: ID): Promise<Chat> {
    if (!this.currentUser) throw new Error('Not signed in');
    const me = this.currentUser.id;
    const existing = Object.values(this.chatsCache).find(
      (c) => c.type === 'private' && c.memberIds.includes(me) && c.memberIds.includes(peerId),
    );
    if (existing) return existing;

    const db = getFirebaseDb();
    const chatRef = push(ref(db, 'chats'));
    const chat: Chat = {
      id: chatRef.key ?? uid('c_'),
      type: 'private',
      memberIds: [me, peerId],
      pinnedMessageIds: [],
      pinned: false,
      muted: false,
      createdAt: Date.now(),
    };
    await set(chatRef, chat);
    return chat;
  }

  async createGroup(title: string, memberIds: ID[]): Promise<Chat> {
    if (!this.currentUser) throw new Error('Not signed in');
    const db = getFirebaseDb();
    const members = Array.from(new Set([this.currentUser.id, ...memberIds]));
    const chatRef = push(ref(db, 'chats'));
    const chat: Chat = {
      id: chatRef.key ?? uid('c_'),
      type: 'group',
      title: title.trim() || 'New Group',
      memberIds: members,
      pinnedMessageIds: [],
      pinned: false,
      muted: false,
      createdAt: Date.now(),
    };
    await set(chatRef, chat);
    await this.sendMessage({
      chatId: chat.id,
      text: `${this.currentUser.name} created the group "${chat.title}"`,
      type: 'system',
    });
    return chat;
  }

  async togglePinChat(chatId: ID): Promise<void> {
    const db = getFirebaseDb();
    const chat = this.chatsCache[chatId];
    if (!chat) return;
    await update(ref(db, `chats/${chatId}`), { pinned: !chat.pinned });
  }

  async toggleMuteChat(chatId: ID): Promise<void> {
    const db = getFirebaseDb();
    const chat = this.chatsCache[chatId];
    if (!chat) return;
    await update(ref(db, `chats/${chatId}`), { muted: !chat.muted });
  }

  async pinMessage(chatId: ID, messageId: ID): Promise<void> {
    const db = getFirebaseDb();
    const chat = this.chatsCache[chatId];
    if (!chat) return;
    const pinnedMessageIds = chat.pinnedMessageIds.includes(messageId)
      ? chat.pinnedMessageIds
      : [messageId, ...chat.pinnedMessageIds];
    await update(ref(db, `chats/${chatId}`), { pinnedMessageIds });
  }

  async unpinMessage(chatId: ID, messageId: ID): Promise<void> {
    const db = getFirebaseDb();
    const chat = this.chatsCache[chatId];
    if (!chat) return;
    const pinnedMessageIds = chat.pinnedMessageIds.filter((id) => id !== messageId);
    await update(ref(db, `chats/${chatId}`), { pinnedMessageIds });
  }
}

/** RTDB stores empty arrays as missing; backfill required array fields. */
function normalizeChats(raw: Record<ID, Chat>): Record<ID, Chat> {
  const out: Record<ID, Chat> = {};
  for (const [id, chat] of Object.entries(raw)) {
    out[id] = {
      ...chat,
      memberIds: chat.memberIds ?? [],
      pinnedMessageIds: chat.pinnedMessageIds ?? [],
    };
  }
  return out;
}

export function createFirebaseBackend(): Backend {
  return new FirebaseBackend();
}
