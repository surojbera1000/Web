# Telegram Web Clone

A feature-rich **Telegram Web** clone built with **React + TypeScript + Tailwind CSS**, with a pluggable backend: it runs **out of the box** on an in-browser mock realtime backend, and switches to **Firebase** (Phone Auth + Realtime Database) automatically when you provide credentials.

> The UI closely follows Telegram's design language — sidebar chat list, message bubbles with tails, read receipts, typing indicators, dark/light themes and smooth animations.

---

## ✨ Features

**Core**
- 📱 Phone-number login with a verification-code step
- 💬 Real-time messaging with optimistic send + delivery lifecycle
- 👥 Contact list with online / last-seen presence
- 🫧 Chat window with grouped message bubbles and day separators
- 🔤 Text, emoji and file-sharing support
- 🌗 Dark / Light mode toggle (persisted)
- 📐 Responsive layout — single-pane on mobile, two-pane on desktop

**UI / UX**
- 🔍 Search for chats & contacts (sidebar) and within a conversation
- ⌨️ Live typing indicators
- ✓✓ Read receipts (single / double / blue double check marks)
- 🖼 Profile-picture avatars with colored initials fallback
- 🎞 Message send/receive animations

**Extras**
- 👨‍👩‍👧 Group chat creation
- 🎤 Voice-message recording UI (visual only — no microphone access) with animated waveform playback
- ↩️ Reply and ➡️ forward messages
- 📌 Pinned messages section with a jump-to bar
- 🗂 Per-chat pin/mute, message delete & copy

---

## 🧱 Tech Stack

| Area        | Choice                                  |
|-------------|------------------------------------------|
| Framework   | React 18 + TypeScript                    |
| Styling     | Tailwind CSS v3 (custom Telegram palette)|
| Build tool  | Vite 5                                    |
| Backend     | Firebase (Auth + Realtime DB) **or** built-in mock |

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (runs with the mock backend by default)
npm run dev
```

Open the printed local URL. On the login screen, enter **any phone number** and use the verification code **`12345`** (shown as a hint in demo mode).

> 💡 The mock backend persists to `localStorage` and simulates the other person reading your messages, typing, and replying — so the app feels alive without any server.

### Production build

```bash
npm run build      # type-check + bundle to /dist
npm run preview    # preview the production build
```

---

## 🔌 Using a real Firebase backend (optional)

1. Create a Firebase project and enable:
   - **Authentication → Sign-in method → Phone**
   - **Realtime Database**
2. Copy `.env.example` to `.env` and fill in your config:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. Restart the dev server. The app auto-detects the credentials and uses Firebase.

You can force a backend explicitly with `VITE_BACKEND=mock` or `VITE_BACKEND=firebase`.

### Suggested Realtime Database structure

```
users/{uid}            -> User profile
chats/{chatId}         -> Chat (memberIds[], pinnedMessageIds[])
messages/{chatId}/{id} -> Message
typing/{chatId}/{uid}  -> timestamp (presence === typing)
reads/{chatId}/{uid}   -> last-read timestamp
```

---

## 🗂 Project Structure

```
src/
├── components/
│   ├── auth/            # LoginPage (phone + code)
│   ├── chat/            # ChatWindow, MessageList, MessageBubble, input, voice, emoji…
│   ├── sidebar/         # Sidebar, ChatListItem, search, menus
│   ├── modals/          # NewGroup, Profile, Forward, Info
│   ├── common/          # Avatar, Modal, Icon set
│   └── ChatApp.tsx      # Responsive two-pane shell
├── context/             # Theme, Auth, Chat providers
├── hooks/               # useChatMessages
├── services/            # Backend abstraction (mock + firebase) + summary builder
├── lib/                 # firebase init, utils, message preview
├── data/                # mock seed users/chats/messages
└── types/               # shared domain types
```

### Architecture note: the backend abstraction

All UI talks to a single `Backend` interface (`src/services/backendTypes.ts`). Two implementations satisfy it:

- `mockBackend` — in-browser, `localStorage`-persisted, simulates realtime.
- `FirebaseBackend` — Firebase Auth + Realtime Database.

`src/services/index.ts` picks one at startup, so swapping backends never touches component code.

---

## ⚠️ Notes & Limitations

- The voice recorder is a **visual simulation** — it does not record audio.
- File attachments are previewed locally via object URLs (not uploaded) in mock mode.
- Phone auth in mock mode accepts any 5-digit code (canonical: `12345`).
