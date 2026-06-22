import type { NormalizedDialog, NormalizedMessage } from '@/lib/telegram/types';

const TOKEN_KEY = 'tg-session-token';

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export interface SelfAccount {
  id: string;
  type: 'user' | 'bot';
  name: string;
  username?: string;
  isBot: boolean;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers['x-session-token'] = token;
  if (options.body) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Is the backend running?');
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(res.status, err?.code || 'ERROR', err?.message || `Request failed (${res.status}).`);
  }
  return data as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return req<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export const api = {
  config: () => req<{ configured: boolean }>('/api/config'),

  sendCode: (phone: string) =>
    post<{ token: string; phoneCodeHash: string; viaApp: boolean }>('/api/auth/send-code', { phone }),

  confirmCode: (token: string, code: string) =>
    post<{ user?: SelfAccount; needPassword?: boolean; token: string }>('/api/auth/confirm-code', {
      token,
      code,
    }),

  confirmPassword: (token: string, password: string) =>
    post<{ user: SelfAccount; token: string }>('/api/auth/password', { token, password }),

  botLogin: (botToken: string) =>
    post<{ token: string; user: SelfAccount }>('/api/auth/bot', { botToken }),

  logout: () => post<{ ok: boolean }>('/api/auth/logout', {}),

  me: async (): Promise<SelfAccount | null> => {
    try {
      const { user } = await req<{ user: SelfAccount }>('/api/me');
      return user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },

  dialogs: () => req<{ dialogs: NormalizedDialog[] }>('/api/dialogs').then((r) => r.dialogs),

  messages: (chatId: string, limit = 50) =>
    req<{ messages: NormalizedMessage[] }>(
      `/api/messages?chatId=${encodeURIComponent(chatId)}&limit=${limit}`,
    ).then((r) => r.messages),

  send: (chatId: string, text: string, replyTo?: number) =>
    post<{ message: NormalizedMessage }>('/api/messages/send', { chatId, text, replyTo }).then((r) => r.message),

  avatarUrl: (chatId: string) =>
    `/api/avatar?chatId=${encodeURIComponent(chatId)}&token=${encodeURIComponent(getToken())}`,

  mediaUrl: (chatId: string, msgId: number) =>
    `/api/media?chatId=${encodeURIComponent(chatId)}&msgId=${msgId}&token=${encodeURIComponent(getToken())}`,
};

/** Open the realtime WebSocket; calls onMessage for each incoming message. */
export function openSocket(onMessage: (m: NormalizedMessage) => void): WebSocket {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(getToken())}`);
  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.type === 'message' && data.message) onMessage(data.message as NormalizedMessage);
    } catch {
      /* ignore */
    }
  };
  return ws;
}

// --- Shared socket hub: one connection, many subscribers, auto-reconnect ---
type MsgListener = (m: NormalizedMessage) => void;
const listeners = new Set<MsgListener>();
let socket: WebSocket | null = null;
let reconnectTimer: number | undefined;

function ensureSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  socket = openSocket((m) => listeners.forEach((cb) => cb(m)));
  socket.onclose = () => {
    socket = null;
    if (listeners.size > 0) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(ensureSocket, 3000);
    }
  };
}

/** Subscribe to realtime messages; returns an unsubscribe function. */
export function onRealtimeMessage(cb: MsgListener): () => void {
  listeners.add(cb);
  ensureSocket();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && socket) {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      socket = null;
    }
  };
}

/** Tear down the socket (e.g. on logout / account change). */
export function resetSocket(): void {
  listeners.clear();
  window.clearTimeout(reconnectTimer);
  if (socket) {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
    socket = null;
  }
}
