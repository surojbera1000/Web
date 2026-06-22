// Plain, UI-friendly shapes normalized from GramJS `Api.*` objects.

export type EntityKind = 'user' | 'bot' | 'group' | 'channel';

export type TickState = 'none' | 'sending' | 'sent' | 'read';

export interface NormalizedEntity {
  id: string;
  kind: EntityKind;
  title: string;
  username?: string;
  verified?: boolean;
  /** present for user/bot entities */
  online?: boolean;
  lastSeenLabel?: string;
}

export interface MessageButton {
  text: string;
  /** raw callback data (base64) for KeyboardButtonCallback */
  data?: string;
  url?: string;
  kind: 'callback' | 'url' | 'other';
}

export interface NormalizedMedia {
  type: 'photo' | 'video' | 'document' | 'voice' | 'sticker' | 'gif' | 'other';
  fileName?: string;
  size?: number;
  mime?: string;
  /** resolved object URL once downloaded */
  url?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface NormalizedMessage {
  id: number;
  chatId: string;
  senderId: string;
  senderName?: string;
  out: boolean;
  text: string;
  date: number; // epoch seconds
  editDate?: number;
  tick: TickState;
  replyToMsgId?: number;
  forwardedFrom?: string;
  media?: NormalizedMedia;
  /** inline keyboard rows (bot messages) */
  buttons?: MessageButton[][];
  service?: boolean;
  /** the underlying GramJS message, kept for on-demand media download (not persisted) */
  raw?: any;
}

export interface NormalizedDialog {
  id: string;
  entity: NormalizedEntity;
  unreadCount: number;
  pinned: boolean;
  archived: boolean;
  muted: boolean;
  date: number;
  lastMessageText: string;
  lastMessageOut: boolean;
  lastMessageTick: TickState;
}
