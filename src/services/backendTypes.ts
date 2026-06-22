import type {
  Attachment,
  Chat,
  ChatSummary,
  ForwardInfo,
  ID,
  Message,
  MessageType,
  ReplyPreview,
  User,
} from '@/types';

export type Unsubscribe = () => void;

export interface SendMessageInput {
  chatId: ID;
  text: string;
  type?: MessageType;
  attachment?: Attachment;
  replyTo?: ReplyPreview;
  forwardedFrom?: ForwardInfo;
}

/** A verification handle returned when a phone code is requested. */
export interface VerificationHandle {
  verificationId: string;
  /** Mock backends expose the code so the UI can hint it. Never set for real backends. */
  devCode?: string;
}

/**
 * The single contract the UI talks to. Both the in-browser mock backend and the
 * Firebase backend implement this, so swapping is a one-line change.
 */
export interface Backend {
  readonly kind: 'mock' | 'firebase';

  // ---- Auth ----
  getCurrentUser(): User | null;
  onAuthChange(cb: (user: User | null) => void): Unsubscribe;
  sendVerificationCode(phone: string): Promise<VerificationHandle>;
  confirmCode(verificationId: string, code: string): Promise<User>;
  updateProfile(patch: Partial<Pick<User, 'name' | 'bio' | 'avatar'>>): Promise<User>;
  signOut(): Promise<void>;

  // ---- Realtime subscriptions ----
  subscribeUsers(cb: (users: User[]) => void): Unsubscribe;
  /** Emits chat rows decorated with last message, unread count, presence and typing. */
  subscribeChats(cb: (summaries: ChatSummary[]) => void): Unsubscribe;
  subscribeMessages(chatId: ID, cb: (messages: Message[]) => void): Unsubscribe;
  subscribeTyping(chatId: ID, cb: (typingUserIds: ID[]) => void): Unsubscribe;

  // ---- Messaging actions ----
  sendMessage(input: SendMessageInput): Promise<Message>;
  deleteMessage(chatId: ID, messageId: ID): Promise<void>;
  forwardMessages(messageIds: ID[], fromChatId: ID, toChatId: ID): Promise<void>;
  markChatRead(chatId: ID): Promise<void>;
  setTyping(chatId: ID, isTyping: boolean): void;

  // ---- Chat management ----
  createPrivateChat(peerId: ID): Promise<Chat>;
  createGroup(title: string, memberIds: ID[]): Promise<Chat>;
  togglePinChat(chatId: ID): Promise<void>;
  toggleMuteChat(chatId: ID): Promise<void>;
  pinMessage(chatId: ID, messageId: ID): Promise<void>;
  unpinMessage(chatId: ID, messageId: ID): Promise<void>;
}
