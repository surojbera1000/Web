import { TelegramClient, Api } from 'telegram';
import type {
  MessageButton,
  NormalizedMedia,
  NormalizedMessage,
  TickState,
} from './types';
import { idToString } from './format';
import { resolveInput, getCachedEntity } from './entityCache';

// ----------------------------------------------------------------------------
// Normalization
// ----------------------------------------------------------------------------

function extractButtons(message: any): MessageButton[][] | undefined {
  const markup = message?.replyMarkup;
  if (!(markup instanceof Api.ReplyInlineMarkup)) return undefined;
  const rows: MessageButton[][] = [];
  for (const row of markup.rows) {
    const btns: MessageButton[] = [];
    for (const b of row.buttons) {
      if (b instanceof Api.KeyboardButtonCallback) {
        btns.push({ text: b.text, data: Buffer.from(b.data).toString('base64'), kind: 'callback' });
      } else if (b instanceof Api.KeyboardButtonUrl) {
        btns.push({ text: b.text, url: b.url, kind: 'url' });
      } else {
        btns.push({ text: (b as any).text ?? 'Button', kind: 'other' });
      }
    }
    rows.push(btns);
  }
  return rows;
}

function extractMedia(message: any): NormalizedMedia | undefined {
  const media = message?.media;
  if (!media) return undefined;

  if (media instanceof Api.MessageMediaPhoto) {
    return { type: 'photo' };
  }
  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    if (!(doc instanceof Api.Document)) return { type: 'document' };
    const attrs = doc.attributes;
    const audio = attrs.find((a: any) => a instanceof Api.DocumentAttributeAudio) as
      | Api.DocumentAttributeAudio
      | undefined;
    const video = attrs.find((a: any) => a instanceof Api.DocumentAttributeVideo) as
      | Api.DocumentAttributeVideo
      | undefined;
    const sticker = attrs.find((a: any) => a instanceof Api.DocumentAttributeSticker);
    const animated = attrs.find((a: any) => a instanceof Api.DocumentAttributeAnimated);
    const fileNameAttr = attrs.find((a: any) => a instanceof Api.DocumentAttributeFilename) as
      | Api.DocumentAttributeFilename
      | undefined;

    let type: NormalizedMedia['type'] = 'document';
    if (audio?.voice) type = 'voice';
    else if (sticker) type = 'sticker';
    else if (animated) type = 'gif';
    else if (video) type = 'video';

    return {
      type,
      fileName: fileNameAttr?.fileName,
      size: Number(doc.size ?? 0),
      mime: doc.mimeType,
      width: video?.w,
      height: video?.h,
      duration: audio?.duration ?? video?.duration,
    };
  }
  return { type: 'other' };
}

function senderNameOf(message: any): string | undefined {
  const s = message?.sender;
  if (!s) return undefined;
  if (s instanceof Api.User) {
    return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username || undefined;
  }
  if (s instanceof Api.Channel || s instanceof Api.Chat) return s.title;
  return undefined;
}

export function normalizeMessage(
  message: any,
  chatId: string,
  selfId: string,
  readOutboxMaxId = 0,
): NormalizedMessage {
  if (message instanceof Api.MessageService) {
    return {
      id: message.id,
      chatId,
      senderId: idToString(message.fromId && (message.fromId as any).userId),
      out: Boolean(message.out),
      text: 'service message',
      date: message.date,
      tick: 'none',
      service: true,
      raw: message,
    };
  }

  const out = Boolean(message.out);
  const id: number = message.id;
  const tick: TickState = out ? (readOutboxMaxId >= id ? 'read' : 'sent') : 'none';
  const fwd = message.fwdFrom instanceof Api.MessageFwdHeader ? message.fwdFrom : undefined;

  return {
    id,
    chatId,
    senderId: out ? selfId : idToString(message.senderId),
    senderName: senderNameOf(message),
    out,
    text: message.message ?? '',
    date: message.date,
    editDate: message.editDate || undefined,
    tick,
    replyToMsgId:
      message.replyTo instanceof Api.MessageReplyHeader ? message.replyTo.replyToMsgId : undefined,
    forwardedFrom: fwd?.fromName || (fwd ? 'Forwarded message' : undefined),
    media: extractMedia(message),
    buttons: extractButtons(message),
    raw: message,
  };
}

// ----------------------------------------------------------------------------
// Reads
// ----------------------------------------------------------------------------

export async function fetchMessages(
  client: TelegramClient,
  chatId: string,
  selfId: string,
  limit = 40,
): Promise<NormalizedMessage[]> {
  const input = await resolveInput(client, chatId);
  const messages = await client.getMessages(input, { limit });

  // readOutboxMaxId tells us which of our outgoing messages have been read.
  let readOutboxMaxId = 0;
  const cached = getCachedEntity(chatId);
  if (cached && typeof (cached as any).readOutboxMaxId === 'number') {
    readOutboxMaxId = (cached as any).readOutboxMaxId;
  }

  const normalized = messages.map((m: any) => normalizeMessage(m, chatId, selfId, readOutboxMaxId));
  // GramJS returns newest-first; render oldest-first.
  return normalized.reverse();
}

// ----------------------------------------------------------------------------
// Writes
// ----------------------------------------------------------------------------

export async function sendTextMessage(
  client: TelegramClient,
  chatId: string,
  text: string,
  selfId: string,
  replyToMsgId?: number,
): Promise<NormalizedMessage> {
  const input = await resolveInput(client, chatId);
  const sent: any = await client.sendMessage(input, {
    message: text,
    replyTo: replyToMsgId,
  });
  return normalizeMessage(sent, chatId, selfId, 0);
}

/** Send a file/photo with optional caption and upload progress. */
export async function sendMediaFile(
  client: TelegramClient,
  chatId: string,
  file: File,
  selfId: string,
  caption = '',
  onProgress?: (ratio: number) => void,
): Promise<NormalizedMessage> {
  const input = await resolveInput(client, chatId);
  const sent: any = await client.sendFile(input, {
    file,
    caption,
    forceDocument: !file.type.startsWith('image/'),
    progressCallback: ((uploaded: any, total: any) => {
      const u = Number(uploaded);
      const t = Number(total);
      if (t > 0) onProgress?.(Math.min(1, u / t));
    }) as any,
  });
  return normalizeMessage(sent, chatId, selfId, 0);
}

export async function editMessage(
  client: TelegramClient,
  chatId: string,
  msgId: number,
  text: string,
): Promise<void> {
  const input = await resolveInput(client, chatId);
  await client.editMessage(input, { message: msgId, text });
}

export async function deleteMessages(
  client: TelegramClient,
  chatId: string,
  ids: number[],
  revoke = true,
): Promise<void> {
  const input = await resolveInput(client, chatId);
  await client.deleteMessages(input, ids, { revoke });
}

export async function forwardMessages(
  client: TelegramClient,
  fromChatId: string,
  ids: number[],
  toChatId: string,
): Promise<void> {
  const fromInput = await resolveInput(client, fromChatId);
  const toInput = await resolveInput(client, toChatId);
  await client.forwardMessages(toInput, { messages: ids, fromPeer: fromInput });
}

export async function setTyping(
  client: TelegramClient,
  chatId: string,
  typing: boolean,
): Promise<void> {
  try {
    const input = await resolveInput(client, chatId);
    await client.invoke(
      new Api.messages.SetTyping({
        peer: input,
        action: typing ? new Api.SendMessageTypingAction() : new Api.SendMessageCancelAction(),
      }),
    );
  } catch {
    /* non-critical */
  }
}

export async function markRead(client: TelegramClient, chatId: string): Promise<void> {
  try {
    const input = await resolveInput(client, chatId);
    if (input instanceof Api.InputPeerChannel) {
      await client.invoke(
        new Api.channels.ReadHistory({
          channel: new Api.InputChannel({
            channelId: input.channelId,
            accessHash: input.accessHash,
          }),
          maxId: 0,
        }),
      );
    } else {
      await client.invoke(new Api.messages.ReadHistory({ peer: input, maxId: 0 }));
    }
  } catch {
    /* non-critical */
  }
}

/** Send a message with an inline keyboard (bot side). */
export async function sendMessageWithButtons(
  client: TelegramClient,
  chatId: string,
  text: string,
  rows: Array<Array<{ text: string; data: string }>>,
  selfId: string,
): Promise<NormalizedMessage> {
  const input = await resolveInput(client, chatId);
  const markup = new Api.ReplyInlineMarkup({
    rows: rows.map(
      (row) =>
        new Api.KeyboardButtonRow({
          buttons: row.map(
            (b) => new Api.KeyboardButtonCallback({ text: b.text, data: Buffer.from(b.data, 'utf8') }),
          ),
        }),
    ),
  });
  const sent: any = await client.sendMessage(input, { message: text, buttons: markup });
  return normalizeMessage(sent, chatId, selfId, 0);
}

/** Answer a callback query received by a bot. */
export async function answerBotCallback(
  client: TelegramClient,
  queryId: any,
  text?: string,
  alert = false,
): Promise<void> {
  await client.invoke(
    new Api.messages.SetBotCallbackAnswer({
      queryId,
      cacheTime: 0,
      message: text,
      alert,
    }),
  );
}

/** Press an inline keyboard button (user side) and return any alert/text. */
export async function pressCallbackButton(
  client: TelegramClient,
  chatId: string,
  msgId: number,
  dataBase64: string,
): Promise<string | undefined> {
  const input = await resolveInput(client, chatId);
  const res = await client.invoke(
    new Api.messages.GetBotCallbackAnswer({
      peer: input,
      msgId,
      data: Buffer.from(dataBase64, 'base64'),
    }),
  );
  return res.message || undefined;
}

// ----------------------------------------------------------------------------
// Media
// ----------------------------------------------------------------------------

function blobUrl(bytes: Uint8Array, mime: string): string {
  return URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
}

export async function downloadAvatar(
  client: TelegramClient,
  chatId: string,
): Promise<string | undefined> {
  try {
    const target = getCachedEntity(chatId) ?? chatId;
    const buf = (await client.downloadProfilePhoto(target)) as Uint8Array | undefined;
    if (!buf || buf.length === 0) return undefined;
    return blobUrl(buf, 'image/jpeg');
  } catch {
    return undefined;
  }
}

export async function downloadMessageMedia(
  client: TelegramClient,
  message: NormalizedMessage,
  onProgress?: (ratio: number) => void,
): Promise<string | undefined> {
  if (!message.raw || !message.media) return undefined;
  try {
    const buf = (await client.downloadMedia(message.raw, {
      progressCallback: (downloaded: any, total: any) => {
        const d = Number(downloaded);
        const t = Number(total);
        if (t > 0) onProgress?.(Math.min(1, d / t));
      },
    })) as Uint8Array | undefined;
    if (!buf || buf.length === 0) return undefined;
    const mime =
      message.media.mime ?? (message.media.type === 'photo' ? 'image/jpeg' : 'application/octet-stream');
    return blobUrl(buf, mime);
  } catch {
    return undefined;
  }
}
