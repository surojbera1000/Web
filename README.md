# Telegram Web (real MTProto, server + client)

A Telegram Web client that connects to **real Telegram servers** using the official **MTProto API** (via [GramJS](https://gram.js.org/)).

It's split into two parts so it's **fast** and so users log in with **just a phone number** (the API key stays hidden on the server, exactly like the official Telegram Web):

```
┌──────────────┐     /api + /ws      ┌──────────────────────┐     MTProto      ┌──────────────┐
│  React app   │  ───────────────▶   │  Node server (GramJS) │  ─────────────▶  │   Telegram   │
│ (browser)    │  ◀───────────────   │  holds api_id/api_hash │  ◀────────────   │   servers    │
└──────────────┘                     └──────────────────────┘                  └──────────────┘
```

- 🔐 **Phone-only login** (code + 2FA) with a **country-code selector** — no API key prompt
- ⚡ **Fast**: heavy MTProto runs on the server; the browser bundle is small
- 💬 Real chats, messages, sending, media, and **live updates** over WebSocket
- 🤖 Optional **bot login** via BotFather token
- 🌑 Telegram-style **dark theme** by default

> Why two parts? Running MTProto **inside the browser** (the old approach) made the bundle huge and the
> login slow/unreliable, and it forced each user to paste an API key. Moving Telegram to a small server
> fixes all of that.

---

## Quick start (single server — recommended for hosting)

This is the setup for running everything on one machine/port (e.g. your VPS on port 8000).

```bash
# 1) Get your Telegram API credentials (once) from https://my.telegram.org -> API development tools
#    You'll get an api_id (number) and api_hash (hex string).

# 2) Configure the server
cd server
cp .env.example .env
#   edit .env:  TELEGRAM_API_ID=...   TELEGRAM_API_HASH=...   PORT=8000
npm install

# 3) Build the frontend (from the repo root)
cd ..
npm install
npm run build         # outputs ./dist , which the server serves

# 4) Start the server (serves the app + API on PORT)
cd server
npm start
```

Open `http://YOUR_SERVER_IP:8000`. Log in with your phone number → enter the code Telegram sends → (2FA password if enabled).

> Tip: run the server under a process manager (pm2/systemd) and ideally behind HTTPS.

---

## Local development (two terminals, hot reload)

```bash
# Terminal 1 — backend on :8000
cd server
cp .env.example .env        # set TELEGRAM_API_ID / TELEGRAM_API_HASH
npm install
npm run dev

# Terminal 2 — frontend on :5173 (proxies /api and /ws to :8000)
npm install
npm run dev
```

Open `http://localhost:5173`.

---

## Project layout

```
.
├── server/                 # Node + Express + GramJS (the MTProto brain)
│   ├── src/index.mjs       # REST + WebSocket API, serves the built frontend
│   ├── src/telegram.mjs    # client/session management, auth, dialogs, messages, media
│   └── .env.example        # TELEGRAM_API_ID / TELEGRAM_API_HASH / PORT
└── src/                    # React frontend (thin client)
    ├── lib/api.ts          # fetch + WebSocket client to the backend
    ├── context/            # Telegram (auth/session) + Theme providers
    ├── hooks/              # useDialogs / useMessages / useAvatar
    └── components/         # auth (phone login + country picker), sidebar, chat, common
```

### How auth works
1. Browser → `POST /api/auth/send-code { phone }` → server asks Telegram for a code, returns a session token.
2. Browser → `POST /api/auth/confirm-code { code }` → on success the server stores the MTProto session; the browser keeps only the opaque token in `localStorage` (so you stay logged in).
3. If 2FA is on → `POST /api/auth/password { password }` (verified via SRP on the server).

The `api_id`/`api_hash` never leave the server.

---

## Features & current limits

**Working:** phone login (+ country selector), 2FA, bot-token login, dialog list (chats/groups/channels), open chat, message history, send text, reply, read receipts/ticks, avatars, media preview/download (photos/video/voice/documents), real-time incoming messages, dark/light theme.

**Not yet wired (server endpoints pending):** editing/deleting/forwarding messages, sending files, typing indicators, inline-button callbacks, and a full bot dashboard. Inline keyboards are rendered read-only (URL buttons open).

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| “Server setup needed” screen | Set `TELEGRAM_API_ID`/`TELEGRAM_API_HASH` in `server/.env` and restart the server. |
| “Can't reach the server” | Make sure the Node server is running and reachable on its port. |
| Login code never arrives | Check the phone number/country code; codes expire fast — request again. |
| `PASSWORD_NEEDED` | Expected — your account has 2FA; enter your password. |
| Reset login | Log out in the app, or delete `server/data/sessions.json` on the server. |

This is an educational client — please respect Telegram's [Terms of Service](https://telegram.org/tos).
