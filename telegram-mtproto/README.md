# Telegram Web (MTProto / GramJS)

A Telegram Web client built on Telegram's **official MTProto API** via **[GramJS](https://gram.js.org/)** — not the Bot API for user sessions. It connects to **real Telegram servers**: no mock data.

- 🔐 Real user authentication: phone number → login code → 2FA password (SRP)
- 🤖 **Login as Bot** using a Bot API token (separate mode + bot dashboard)
- 💬 Real dialogs, messages, sending, and live updates
- 🌑 Telegram-style **dark theme** by default
- 💾 Session persistence via IndexedDB (you stay logged in)

> ⚠️ **You must supply your own Telegram API credentials** (`api_id` / `api_hash`). See setup below.

---

## 1. Get your API credentials

1. Visit **https://my.telegram.org** and sign in with your phone number.
2. Open **API development tools**.
3. Create an app (any title / short name). You will receive:
   - **`api_id`** — a number
   - **`api_hash`** — a 32-character hex string

## 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_TELEGRAM_API_ID=1234567
VITE_TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef
```

## 3. Install & run

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173).

---

## Logging in

### As a user
1. Enter your phone number in international format (e.g. `+14155550123`).
2. Telegram sends a login code (in the Telegram app or via SMS). Enter it.
3. If you have **Two-Step Verification** enabled, enter your password — it's verified locally using SRP and never sent in plaintext.

### As a bot
1. Switch to the **Login as Bot** tab.
2. Paste a bot token from [@BotFather](https://t.me/BotFather) (e.g. `123456:ABC-DEF...`).
3. You'll land on the **Bot Dashboard**: bot info, incoming updates, and the ability to reply, including rendering inline keyboards and handling callback queries.

You can switch between accounts from the account menu; each session is cached separately in IndexedDB.

---

## How it works

```
src/
├── lib/telegram/
│   ├── client.ts      # GramJS TelegramClient factory + connection lifecycle
│   ├── session.ts     # IndexedDB-backed StringSession persistence
│   ├── auth.ts        # sendCode / signIn / 2FA (SRP) / bot login / logout
│   ├── dialogs.ts     # fetch + normalize dialogs (chats, groups, channels)
│   ├── messages.ts    # fetch/send messages, media download, ticks
│   └── format.ts      # presence, time, entity helpers
├── context/
│   ├── TelegramContext.tsx  # client + account state + login methods
│   └── ThemeContext.tsx     # dark-by-default theme
├── components/
│   ├── auth/          # LoginPanel (phone/code/2FA) + BotLogin tab
│   ├── sidebar/       # DialogList, DialogItem, SearchBar, archived toggle
│   ├── chat/          # ChatView, MessageList, MessageBubble, Composer, ticks
│   ├── bot/           # BotDashboard, inline keyboards, callback handling
│   └── common/        # Avatar, Icon, Spinner
└── hooks/             # useDialogs, useMessages, useUpdates
```

The UI talks only to the GramJS client; all data is fetched live from Telegram.

---

## Notes, limits & gotchas

- **Browser MTProto**: GramJS connects over WebSocket. Node primitives (`Buffer`, `process`) are polyfilled via `vite-plugin-node-polyfills`.
- **Rate limits**: Telegram returns `FLOOD_WAIT_X` errors; the client surfaces the wait time and the UI shows a friendly message. Don't spam the login endpoint.
- **`api_id`/`api_hash`** live in the client bundle (unavoidable for any web client). Use credentials you're comfortable exposing; protect your 2FA password.
- **Voice/video message recording** is presented as UI only (browser recording is out of scope); receiving/playing media works via the API.
- **Stickers/GIFs**: emoji picker is fully functional; sticker/GIF panels are scaffolded against the API and documented inline where they need further wiring.
- This is an educational client. Respect Telegram's [Terms of Service](https://telegram.org/tos) and API rules.

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `API_ID_INVALID` | Double-check `.env` values and restart `npm run dev`. |
| Stuck "Connecting…" | Check network/WebSocket access; some networks block Telegram DCs. |
| `PHONE_CODE_INVALID` | Re-request the code; codes expire quickly. |
| `SESSION_PASSWORD_NEEDED` | Expected — it means 2FA is on; enter your password. |
| Reset everything | Clear the site's IndexedDB (`telegram-web` database) and reload. |
