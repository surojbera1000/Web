import { TelegramClient, Api } from 'telegram';
import type { NormalizedDialog, NormalizedEntity, TickState } from './types';
import { idToString, presenceFromStatus } from './format';
import { rememberEntity } from './entityCache';

/** Normalize any chat-like entity into a flat shape for the UI. */
export function normalizeEntity(entity: any): NormalizedEntity {
  if (entity instanceof Api.User) {
    const name =
      [entity.firstName, entity.lastName].filter(Boolean).join(' ') ||
      entity.username ||
      'Deleted Account';
    const presence = presenceFromStatus(entity.status);
    return {
      id: idToString(entity.id),
      kind: entity.bot ? 'bot' : 'user',
      title: name,
      username: entity.username || undefined,
      verified: entity.verified || undefined,
      online: presence.online,
      lastSeenLabel: presence.label,
    };
  }
  if (entity instanceof Api.Channel) {
    return {
      id: idToString(entity.id),
      kind: entity.megagroup ? 'group' : 'channel',
      title: entity.title,
      username: entity.username || undefined,
      verified: entity.verified || undefined,
    };
  }
  if (entity instanceof Api.Chat) {
    return { id: idToString(entity.id), kind: 'group', title: entity.title };
  }
  return { id: idToString(entity?.id), kind: 'group', title: 'Unknown' };
}

/** Short preview text for a dialog's last message. */
export function messagePreview(message: any): string {
  if (!message) return '';
  if (message instanceof Api.MessageService) return 'service message';
  const text: string = message.message ?? '';
  const media = message.media;
  if (media instanceof Api.MessageMediaPhoto) return text ? `🖼 ${text}` : '🖼 Photo';
  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    const attrs = doc instanceof Api.Document ? doc.attributes : [];
    if (attrs.some((a: any) => a instanceof Api.DocumentAttributeAudio && a.voice)) return '🎤 Voice message';
    if (attrs.some((a: any) => a instanceof Api.DocumentAttributeVideo)) return '📹 Video';
    if (attrs.some((a: any) => a instanceof Api.DocumentAttributeSticker)) return '🎟 Sticker';
    return text ? `📎 ${text}` : '📎 Document';
  }
  return text;
}

function tickFor(out: boolean, msgId: number, readOutboxMaxId: number): TickState {
  if (!out) return 'none';
  return readOutboxMaxId >= msgId ? 'read' : 'sent';
}

/** Fetch and normalize all dialogs (UI splits archived vs. main). */
export async function fetchDialogs(client: TelegramClient, limit = 200): Promise<NormalizedDialog[]> {
  const dialogs = await client.getDialogs({ limit });
  const now = Date.now() / 1000;
  const out: NormalizedDialog[] = [];

  for (const d of dialogs) {
    if (!d.entity) continue;
    const id = idToString(d.id);
    rememberEntity(id, d.entity, d.inputEntity);
    const inner = d.dialog instanceof Api.Dialog ? d.dialog : undefined;
    const readOutboxMaxId = inner?.readOutboxMaxId ?? 0;
    const muteUntil = inner?.notifySettings?.muteUntil ?? 0;
    const message: any = d.message;
    const lastOut = Boolean(message?.out);

    out.push({
      id,
      entity: normalizeEntity(d.entity),
      unreadCount: d.unreadCount ?? 0,
      pinned: Boolean(d.pinned),
      archived: Boolean(d.archived),
      muted: muteUntil > now,
      date: message?.date ?? 0,
      lastMessageText: messagePreview(message),
      lastMessageOut: lastOut,
      lastMessageTick: message ? tickFor(lastOut, message.id, readOutboxMaxId) : 'none',
    });
  }

  return out.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.date - a.date;
  });
}
