import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';

import {
  credsConfigured,
  startLogin,
  confirmCode,
  confirmPassword,
  botLogin,
  logout,
  getMe,
  getDialogs,
  getMessages,
  sendMessage,
  downloadAvatar,
  downloadMedia,
  subscribe,
} from './telegram.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', '..', 'dist');
const PORT = Number(process.env.PORT || 8000);

const app = express();
app.use(express.json({ limit: '1mb' }));

const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));

const tokenOf = (req) => req.headers['x-session-token'] || req.query.token || '';

// Wrap async handlers so thrown errors become clean JSON responses.
const h = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: { code: err.code || 'ERROR', message: err.message } });
  });
};

const requireConfigured = (req, res, next) => {
  if (!credsConfigured()) {
    return res
      .status(503)
      .json({ error: { code: 'NOT_CONFIGURED', message: 'Server is missing TELEGRAM_API_ID / TELEGRAM_API_HASH.' } });
  }
  next();
};

// ---- Health / config ----
app.get('/api/config', (_req, res) => res.json({ configured: credsConfigured() }));

// ---- Auth ----
app.post('/api/auth/send-code', requireConfigured, h(async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) throw badRequest('Phone number is required.');
  res.json(await startLogin(phone));
}));

app.post('/api/auth/confirm-code', requireConfigured, h(async (req, res) => {
  const { token, code } = req.body || {};
  if (!token || !code) throw badRequest('token and code are required.');
  res.json(await confirmCode(token, code));
}));

app.post('/api/auth/password', requireConfigured, h(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) throw badRequest('token and password are required.');
  res.json(await confirmPassword(token, password));
}));

app.post('/api/auth/bot', requireConfigured, h(async (req, res) => {
  const { botToken } = req.body || {};
  if (!botToken) throw badRequest('botToken is required.');
  res.json(await botLogin(botToken));
}));

app.post('/api/auth/logout', h(async (req, res) => {
  await logout(tokenOf(req));
  res.json({ ok: true });
}));

// ---- Data ----
app.get('/api/me', h(async (req, res) => {
  const user = await getMe(tokenOf(req));
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not signed in.' } });
  res.json({ user });
}));

app.get('/api/dialogs', h(async (req, res) => {
  res.json({ dialogs: await getDialogs(tokenOf(req)) });
}));

app.get('/api/messages', h(async (req, res) => {
  const { chatId, limit } = req.query;
  if (!chatId) throw badRequest('chatId is required.');
  res.json({ messages: await getMessages(tokenOf(req), String(chatId), Number(limit) || 50) });
}));

app.post('/api/messages/send', h(async (req, res) => {
  const { chatId, text, replyTo } = req.body || {};
  if (!chatId || !text) throw badRequest('chatId and text are required.');
  res.json({ message: await sendMessage(tokenOf(req), String(chatId), text, replyTo) });
}));

// ---- Media proxies (token via query so <img>/<video> can load them) ----
app.get('/api/avatar', h(async (req, res) => {
  const { chatId } = req.query;
  const result = await downloadAvatar(tokenOf(req), String(chatId));
  if (!result) return res.status(404).end();
  res.setHeader('Content-Type', result.mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.end(result.buffer);
}));

app.get('/api/media', h(async (req, res) => {
  const { chatId, msgId } = req.query;
  const result = await downloadMedia(tokenOf(req), String(chatId), String(msgId));
  if (!result) return res.status(404).end();
  res.setHeader('Content-Type', result.mime);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.end(result.buffer);
}));

// ---- Static frontend (built) + SPA fallback ----
app.use(express.static(DIST_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } });
  res.sendFile(path.join(DIST_DIR, 'index.html'), (err) => {
    if (err) res.status(200).send('Frontend not built yet. Run `npm run build` in the project root.');
  });
});

function badRequest(message) {
  const e = new Error(message);
  e.status = 400;
  e.code = 'BAD_REQUEST';
  return e;
}

// ---- HTTP + WebSocket server ----
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token') || '';
  let unsubscribe = () => {};
  try {
    unsubscribe = await subscribe(token, (message) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'message', message }));
    });
    ws.send(JSON.stringify({ type: 'ready' }));
  } catch (e) {
    ws.send(JSON.stringify({ type: 'error', message: e.message }));
  }
  const ping = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
  }, 30000);
  ws.on('close', () => {
    clearInterval(ping);
    unsubscribe();
  });
});

server.listen(PORT, () => {
  console.log(`\n  Telegram web server running on http://localhost:${PORT}`);
  if (!credsConfigured()) {
    console.log('  ⚠  TELEGRAM_API_ID / TELEGRAM_API_HASH not set — copy server/.env.example to server/.env\n');
  } else {
    console.log('  ✓ API credentials loaded. Serving frontend from /dist if built.\n');
  }
});
