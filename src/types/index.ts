// =============================================================================
// Core domain types for the Telegram Web clone
// =============================================================================

export type ID = string;

/** Delivery state for an outgoing message (drives the check-mark UI). */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export type MessageType = 'text' | 'file' | 'image' | 'voice' | 'system';

export interface User {
  id: ID;
  name: string;
  phone: string;
  /** Optional avatar URL. When absent we render initials. */
  avatar?: string;
  /** "Online" when true, otherwise we show `lastSeen`. */
  online: boolean;
  /** Epoch ms of the last time the user was seen online. */
  lastSeen: number;
  bio?: string;
}

export interface Attachment {
  id: ID;
  type: 'image' | 'file' | 'voice';
  name: string;
  /** Human-readable size, e.g. "1.4 MB". */
  size?: string;
  /** Object URL / data URL for previews (mock backend). */
  url?: string;
  /** For voice notes: duration in seconds. */
  duration?: number;
  /** For voice notes: a simplified waveform (0..1 amplitudes). */
  waveform?: number[];
}

export interface ReplyPreview {
  messageId: ID;
  authorId: ID;
  authorName: string;
  snippet: string;
}

export interface ForwardInfo {
  originalAuthorId: ID;
  originalAuthorName: string;
}

export interface Message {
  id: ID;
  chatId: ID;
  senderId: ID;
  type: MessageType;
  text: string;
  createdAt: number;
  status: MessageStatus;
  attachment?: Attachment;
  replyTo?: ReplyPreview;
  forwardedFrom?: ForwardInfo;
  edited?: boolean;
}

export type ChatType = 'private' | 'group';

export interface Chat {
  id: ID;
  type: ChatType;
  /** For group chats. For private chats the name is derived from the peer. */
  title?: string;
  avatar?: string;
  /** Participant user IDs (includes the current user). */
  memberIds: ID[];
  /** Pinned message IDs (newest first). */
  pinnedMessageIds: ID[];
  /** Whether the chat itself is pinned to the top of the chat list. */
  pinned: boolean;
  muted: boolean;
  createdAt: number;
  /** Optional group description. */
  about?: string;
}

/** A chat row decorated with everything the sidebar needs to render. */
export interface ChatSummary {
  chat: Chat;
  /** Display name (peer name for private, title for group). */
  displayName: string;
  avatar?: string;
  online: boolean;
  lastMessage?: Message;
  unreadCount: number;
  /** IDs of members currently typing (excluding current user). */
  typingMemberIds: ID[];
}

export type ThemeMode = 'light' | 'dark';

export type BackendKind = 'mock' | 'firebase';
