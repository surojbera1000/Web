// Server-side Telegram (MTProto) layer using GramJS.
// Holds api_id/api_hash, keeps one live client per logged-in session token,
// and exposes plain-JSON helpers consumed by the REST + WebSocket API.

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pkg from 'telegram';
const { TelegramClient, Api } = pkg;
import sessionsPkg from 'telegram/sessions/index.js';
const { StringSession } = sessionsPkg;
import passwordPkg from 'telegram/Password.js';
const { computeCheck } = passwordPkg;
import eventsPkg from 'telegram/events/index.js';
const { NewMessage } = eventsPkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
export function getCreds() {
  const apiId = Number(process.env.TELEGRAM_API_ID || 0);
  const apiHash = String(process.env.TELEGRAM_API_HASH || '');
  return { apiId, apiHash };
}

export function credsConfigured() {
  const { apiId, apiHash } = getCreds();
  return apiId > 0 && apiHash.length >= 8;
}

// ---------------------------------------------------------------------------
// Session persistence (token -> { session, type })
// ---------------------------------------------------------------------------
function loadSessions() {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveSessions(obj) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.error('Failed to persist sessions:', e.message);
  }
}

// In-memory live clients and pending logins.
const active = new Map(); // token -> { client, type }
const pending = new Map(); // token -> { client, phone, phoneCodeHash }

function newClient(sessionStr = '') {
  const { apiId, apiHash } = getCreds();
  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, {
    connectionRetries: 5,
    retryDelay: 1500,
    autoReconnect: true,
    // Server uses plain MTProto over TCP (fast); WSS is only needed in browsers.
  });
  client.setLogLevel?.('error');
  client.__inputs = new Map();
  client.__readState = new Map();
  client.__dialogsLoaded = false;
  return client;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function startLogin(phone) {
  const client = newClient('');
  await client.connect();
  const { apiId, apiHash } = getCreds();
  const result = await client.sendCode({ apiId, apiHash }, phone.trim());
  const token = randomUUID();
  pending.set(token, { client, phone: phone.trim(), phoneCodeHash: result.phoneCodeHash });
  return { token, phoneCodeHash: result.phoneCodeHash, viaApp: result.isCodeViaApp };
}

export async function confirmCode(token, code) {
  const p = pending.get(token);
  if (!p) throw httpError(400, 'LOGIN_EXPIRED', 'Login session expired. Start again.');
  try {
    const res = await p.client.invoke(
      new Api.auth.SignIn({
        phoneNumber: p.phone,
        phoneCodeHash: p.phoneCodeHash,
        phoneCode: code.trim(),
      }),
    );
    return await promoteUser(token, p.client, res);
  } catch (err) {
    if (String(err?.errorMessage || err?.message).includes('SESSION_PASSWORD_NEEDED')) {
      return { needPassword: true, token };
    }
    throw toApiError(err);
  }
}

export async function confirmPassword(token, password) {
  const p = pending.get(token);
  if (!p) throw httpError(400, 'LOGIN_EXPIRED', 'Login session expired. Start again.');
  try {
    const pwd = await p.client.invoke(new Api.account.GetPassword());
    const check = await computeCheck(pwd, password);
    const res = await p.client.invoke(new Api.auth.CheckPassword({ password: check }));
    return await promoteUser(token, p.client, res);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function botLogin(botToken) {
  const client = newClient('');
  await client.connect();
  const { apiId, apiHash } = getCreds();
  try {
    await client.invoke(
      new Api.auth.ImportBotAuthorization({ apiId, apiHash, botAuthToken: botToken.trim(), flags: 0 }),
    );
  } catch (err) {
    throw toApiError(err);
  }
  const token = randomUUID();
  active.set(token, { client, type: 'bot' });
  persist(token, client, 'bot');
  const me = await client.getMe();
  return { token, user: selfUser(me, 'bot') };
}

async function promoteUser(token, client, authResult) {
  pending.delete(token);
  active.set(token, { client, type: 'user' });
  persist(token, client, 'user');
  const user = authResult?.user instanceof Api.User ? authResult.user : await client.getMe();
  return { user: selfUser(user, 'user'), token };
}

function persist(token, client, type) {
  const all = loadSessions();
  all[token] = { session: client.session.save(), type, createdAt: Date.now() };
  saveSessions(all);
}

export async function getClient(token) {
  if (!token) return null;
  const live = active.get(token);
  if (live) return live;
  const all = loadSessions();
  const rec = all[token];
  if (!rec) return null;
  const client = newClient(rec.session);
  try {
    await client.connect();
    if (!(await client.isUserAuthorized())) {
      delete all[token];
      saveSessions(all);
      return null;
    }
  } catch (e) {
    console.error('Reconnect failed:', e.message);
    return null;
  }
  const entry = { client, type: rec.type };
  active.set(token, entry);
  return entry;
}

export async function logout(token) {
  const entry = active.get(token);
  if (entry) {
    try {
      await entry.client.invoke(new Api.auth.LogOut());
    } catch {
      /* ignore */
    }
    try {
      await entry.client.disconnect();
    } catch {
      /* ignore */
    }
    active.delete(token);
  }
  const all = loadSessions();
  delete all[token];
  saveSessions(all);
}

export async function getMe(token) {
  const entry = await getClient(token);
  if (!entry) return null;
  const me = await entry.client.getMe();
  return selfUser(me, entry.type);
}

// ---------------------------------------------------------------------------
// Entity resolution + normalization
// ---------------------------------------------------------------------------
async function ensureDialogsLoaded(client) {
  if (client.__dialogsLoaded) return;
  await loadDialogsInternal(client);
}

async function resolveInput(client, chatId) {
  const cached = client.__inputs.get(chatId);
  if (cached) return cached;
  await ensureDialogsLoaded(client);
  const again = client.__inputs.get(chatId);
  if (again) return again;
  // Fall back to GramJS resolution.
  return client.getInputEntity(chatId);
}

function idStr(id) {
  return id === null || id === undefined ? '' : String(id);
}

function presence(status) {
  if (!status) return { online: false, label: 'last seen recently' };
  if (status instanceof Api.UserStatusOnline) return { online: true, label: 'online' };
  if (status instanceof Api.UserStatusOffline) {
    const was = status.wasOnline ? status.wasOnline * 1000 : 0;
    if (!was) return { online: false, label: 'last seen recently' };
    const mins = Math.floor((Date.now() - was) / 60000);
    if (mins < 1) return { online: false, label: 'last seen just now' };
    if (mins < 60) return { online: false, label: `last seen ${mins} min ago` };
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return { online: false, label: `last seen ${hrs}h ago` };
    return { online: false, label: `last seen ${new Date(was).toLocaleDateString()}` };
  }
  if (status instanceof Api.UserStatusRecently) return { online: false, label: 'last seen recently' };
  return { online: false, label: 'last seen a long time ago' };
}

function normalizeEntity(entity) {
  if (entity instanceof Api.User) {
    const title =
      [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.username || 'Deleted Account';
    const p = presence(entity.status);
    return {
      id: idStr(entity.id),
      kind: entity.bot ? 'bot' : 'user',
      title,
      username: entity.username || undefined,
      verified: entity.verified || undefined,
      online: p.online,
      lastSeenLabel: p.label,
    };
  }
  if (entity instanceof Api.Channel) {
    return {
      id: idStr(entity.id),
      kind: entity.megagroup ? 'group' : 'channel',
      title: entity.title,
      username: entity.username || undefined,
      verified: entity.verified || undefined,
    };
  }
  if (entity instanceof Api.Chat) {
    return { id: idStr(entity.id), kind: 'group', title: entity.title };
  }
  return { id: idStr(entity?.id), kind: 'group', title: 'Unknown' };
}

function preview(message) {
  if (!message) return '';
  if (message instanceof Api.MessageService) return 'service message';
  const text = message.message || '';
  const media = message.media;
  if (media instanceof Api.MessageMediaPhoto) return text ? `🖼 ${text}` : '🖼 Photo';
  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    const attrs = doc instanceof Api.Document ? doc.attributes : [];
    if (attrs.some((a) => a instanceof Api.DocumentAttributeAudio && a.voice)) return '🎤 Voice message';
    if (attrs.some((a) => a instanceof Api.DocumentAttributeVideo)) return '📹 Video';
    if (attrs.some((a) => a instanceof Api.DocumentAttributeSticker)) return '🎟 Sticker';
    return text ? `📎 ${text}` : '📎 Document';
  }
  return text;
}

function extractButtons(message) {
  const markup = message?.replyMarkup;
  if (!(markup instanceof Api.ReplyInlineMarkup)) return undefined;
  return markup.rows.map((row) =>
    row.buttons.map((b) => {
      if (b instanceof Api.KeyboardButtonCallback)
        return { text: b.text, data: Buffer.from(b.data).toString('base64'), kind: 'callback' };
      if (b instanceof Api.KeyboardButtonUrl) return { text: b.text, url: b.url, kind: 'url' };
      return { text: b.text || 'Button', kind: 'other' };
    }),
  );
}

function extractMedia(message) {
  const media = message?.media;
  if (!media) return undefined;
  if (media instanceof Api.MessageMediaPhoto) return { type: 'photo' };
  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    if (!(doc instanceof Api.Document)) return { type: 'document' };
    const attrs = doc.attributes;
    const audio = attrs.find((a) => a instanceof Api.DocumentAttributeAudio);
    const video = attrs.find((a) => a instanceof Api.DocumentAttributeVideo);
    const sticker = attrs.find((a) => a instanceof Api.DocumentAttributeSticker);
    const animated = attrs.find((a) => a instanceof Api.DocumentAttributeAnimated);
    const fileName = attrs.find((a) => a instanceof Api.DocumentAttributeFilename);
    let type = 'document';
    if (audio?.voice) type = 'voice';
    else if (sticker) type = 'sticker';
    else if (animated) type = 'gif';
    else if (video) type = 'video';
    return {
      type,
      fileName: fileName?.fileName,
      size: Number(doc.size || 0),
      mime: doc.mimeType,
      duration: audio?.duration ?? video?.duration,
      width: video?.w,
      height: video?.h,
    };
  }
  return { type: 'other' };
}

function senderName(message) {
  const s = message?.sender;
  if (s instanceof Api.User) return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username || undefined;
  if (s instanceof Api.Channel || s instanceof Api.Chat) return s.title;
  return undefined;
}

function normalizeMessage(message, chatId, selfId, readOutboxMaxId = 0) {
  if (message instanceof Api.MessageService) {
    return { id: message.id, chatId, senderId: '', out: !!message.out, text: 'service message', date: message.date, tick: 'none', service: true };
  }
  const out = !!message.out;
  const id = message.id;
  const tick = out ? (readOutboxMaxId >= id ? 'read' : 'sent') : 'none';
  const fwd = message.fwdFrom instanceof Api.MessageFwdHeader ? message.fwdFrom : undefined;
  return {
    id,
    chatId,
    senderId: out ? selfId : idStr(message.senderId),
    senderName: senderName(message),
    out,
    text: message.message || '',
    date: message.date,
    editDate: message.editDate || undefined,
    tick,
    replyToMsgId: message.replyTo instanceof Api.MessageReplyHeader ? message.replyTo.replyToMsgId : undefined,
    forwardedFrom: fwd?.fromName || (fwd ? 'Forwarded message' : undefined),
    media: extractMedia(message),
    buttons: extractButtons(message),
  };
}

// ---------------------------------------------------------------------------
// Dialogs / messages
// ---------------------------------------------------------------------------
async function loadDialogsInternal(client, limit = 200) {
  const dialogs = await client.getDialogs({ limit });
  const now = Date.now() / 1000;
  const out = [];
  for (const d of dialogs) {
    if (!d.entity) continue;
    const id = idStr(d.id);
    if (d.inputEntity) client.__inputs.set(id, d.inputEntity);
    const inner = d.dialog instanceof Api.Dialog ? d.dialog : undefined;
    const readOutboxMaxId = inner?.readOutboxMaxId ?? 0;
    client.__readState.set(id, readOutboxMaxId);
    const muteUntil = inner?.notifySettings?.muteUntil ?? 0;
    const message = d.message;
    const lastOut = !!message?.out;
    out.push({
      id,
      entity: normalizeEntity(d.entity),
      unreadCount: d.unreadCount ?? 0,
      pinned: !!d.pinned,
      archived: !!d.archived,
      muted: muteUntil > now,
      date: message?.date ?? 0,
      lastMessageText: preview(message),
      lastMessageOut: lastOut,
      lastMessageTick: message ? (lastOut ? (readOutboxMaxId >= message.id ? 'read' : 'sent') : 'none') : 'none',
    });
  }
  client.__dialogsLoaded = true;
  out.sort((a, b) => (a.pinned !== b.pinned ? (a.pinned ? -1 : 1) : b.date - a.date));
  return out;
}

export async function getDialogs(token) {
  const entry = await getClient(token);
  if (!entry) throw httpError(401, 'UNAUTHORIZED', 'Not signed in.');
  return loadDialogsInternal(entry.client);
}

export async function getMessages(token, chatId, limit = 50) {
  const entry = await getClient(token);
  if (!entry) throw httpError(401, 'UNAUTHORIZED', 'Not signed in.');
  const { client } = entry;
  const selfId = idStr((await client.getMe()).id);
  const input = await resolveInput(client, chatId);
  const messages = await client.getMessages(input, { limit });
  const readOutbox = client.__readState.get(chatId) ?? 0;
  const list = messages.map((m) => normalizeMessage(m, chatId, selfId, readOutbox));
  try {
    await client.markAsRead(input);
  } catch {
    /* ignore */
  }
  return list.reverse();
}

export async function sendMessage(token, chatId, text, replyTo) {
  const entry = await getClient(token);
  if (!entry) throw httpError(401, 'UNAUTHORIZED', 'Not signed in.');
  const { client } = entry;
  const selfId = idStr((await client.getMe()).id);
  const input = await resolveInput(client, chatId);
  const sent = await client.sendMessage(input, { message: text, replyTo });
  return normalizeMessage(sent, chatId, selfId, 0);
}

export async function downloadAvatar(token, chatId) {
  const entry = await getClient(token);
  if (!entry) return null;
  const { client } = entry;
  try {
    const target = client.__inputs.get(chatId) || (await resolveInput(client, chatId));
    const buf = await client.downloadProfilePhoto(target);
    if (!buf || buf.length === 0) return null;
    return { buffer: buf, mime: 'image/jpeg' };
  } catch {
    return null;
  }
}

export async function downloadMedia(token, chatId, msgId) {
  const entry = await getClient(token);
  if (!entry) return null;
  const { client } = entry;
  try {
    const input = await resolveInput(client, chatId);
    const msgs = await client.getMessages(input, { ids: [Number(msgId)] });
    const message = msgs?.[0];
    if (!message || !message.media) return null;
    const buf = await client.downloadMedia(message);
    if (!buf || buf.length === 0) return null;
    const media = extractMedia(message);
    const mime = media?.mime || (media?.type === 'photo' ? 'image/jpeg' : 'application/octet-stream');
    return { buffer: buf, mime };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Real-time subscription (returns unsubscribe)
// ---------------------------------------------------------------------------
export async function subscribe(token, onMessage) {
  const entry = await getClient(token);
  if (!entry) return () => {};
  const { client } = entry;
  const selfId = idStr((await client.getMe()).id);
  const event = new NewMessage({});
  const handler = (e) => {
    const m = e.message;
    if (!m) return;
    const chatId = idStr(m.chatId);
    try {
      onMessage(normalizeMessage(m, chatId, selfId, client.__readState.get(chatId) ?? 0));
    } catch {
      /* ignore */
    }
  };
  client.addEventHandler(handler, event);
  return () => {
    try {
      client.removeEventHandler(handler, event);
    } catch {
      /* ignore */
    }
  };
}

function selfUser(user, type) {
  return {
    id: idStr(user.id),
    type,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Telegram User',
    username: user.username || undefined,
    isBot: !!user.bot,
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export function httpError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

function toApiError(err) {
  const msg = String(err?.errorMessage || err?.message || err);
  const flood = /FLOOD_WAIT_(\d+)/.exec(msg);
  if (flood) return httpError(429, 'FLOOD_WAIT', `Too many attempts. Wait ${flood[1]}s and try again.`);
  const map = {
    PHONE_NUMBER_INVALID: 'That phone number is not valid.',
    PHONE_CODE_INVALID: 'The code you entered is incorrect.',
    PHONE_CODE_EXPIRED: 'That code expired. Request a new one.',
    PASSWORD_HASH_INVALID: 'Incorrect password. Try again.',
    ACCESS_TOKEN_INVALID: 'That bot token is invalid.',
    API_ID_INVALID: 'Server API credentials are invalid. Check TELEGRAM_API_ID/HASH.',
  };
  for (const key of Object.keys(map)) if (msg.includes(key)) return httpError(400, key, map[key]);
  return httpError(500, 'TELEGRAM_ERROR', msg);
}
