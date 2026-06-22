import type { Chat, Message, User } from '@/types';
import { generateWaveform } from '@/lib/utils';

// The current (logged-in) user always has this stable id in the mock backend.
export const CURRENT_USER_ID = 'u_me';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = Date.now();

export const seedCurrentUser: User = {
  id: CURRENT_USER_ID,
  name: 'You',
  phone: '+1 555 000 0000',
  online: true,
  lastSeen: now,
  bio: 'Building cool things with React ✨',
};

export const seedContacts: User[] = [
  {
    id: 'u_anna',
    name: 'Anna Petrova',
    phone: '+1 555 100 0001',
    online: true,
    lastSeen: now,
    bio: 'Designer @ Studio',
  },
  {
    id: 'u_marco',
    name: 'Marco Rossi',
    phone: '+1 555 100 0002',
    online: false,
    lastSeen: now - 12 * MIN,
    bio: 'Coffee. Code. Repeat.',
  },
  {
    id: 'u_sara',
    name: 'Sara Lee',
    phone: '+1 555 100 0003',
    online: true,
    lastSeen: now,
  },
  {
    id: 'u_dmitry',
    name: 'Dmitry Volkov',
    phone: '+1 555 100 0004',
    online: false,
    lastSeen: now - 3 * HOUR,
    bio: 'Backend wizard 🧙',
  },
  {
    id: 'u_priya',
    name: 'Priya Nair',
    phone: '+1 555 100 0005',
    online: false,
    lastSeen: now - 1 * DAY,
  },
  {
    id: 'u_tom',
    name: 'Tom Becker',
    phone: '+1 555 100 0006',
    online: true,
    lastSeen: now,
  },
];

export const seedUsers: User[] = [seedCurrentUser, ...seedContacts];

export const seedChats: Chat[] = [
  {
    id: 'c_anna',
    type: 'private',
    memberIds: [CURRENT_USER_ID, 'u_anna'],
    pinnedMessageIds: ['m_anna_3'],
    pinned: true,
    muted: false,
    createdAt: now - 5 * DAY,
  },
  {
    id: 'c_design',
    type: 'group',
    title: 'Design Team 🎨',
    about: 'Where pixels come to life.',
    memberIds: [CURRENT_USER_ID, 'u_anna', 'u_sara', 'u_tom'],
    pinnedMessageIds: [],
    pinned: false,
    muted: false,
    createdAt: now - 20 * DAY,
  },
  {
    id: 'c_marco',
    type: 'private',
    memberIds: [CURRENT_USER_ID, 'u_marco'],
    pinnedMessageIds: [],
    pinned: false,
    muted: false,
    createdAt: now - 8 * DAY,
  },
  {
    id: 'c_sara',
    type: 'private',
    memberIds: [CURRENT_USER_ID, 'u_sara'],
    pinnedMessageIds: [],
    pinned: false,
    muted: true,
    createdAt: now - 2 * DAY,
  },
  {
    id: 'c_dmitry',
    type: 'private',
    memberIds: [CURRENT_USER_ID, 'u_dmitry'],
    pinnedMessageIds: [],
    pinned: false,
    muted: false,
    createdAt: now - 30 * DAY,
  },
];

export const seedMessages: Message[] = [
  // ---- Anna (private) ----
  {
    id: 'm_anna_1',
    chatId: 'c_anna',
    senderId: 'u_anna',
    type: 'text',
    text: 'Hey! Did you get a chance to look at the new mockups? 👀',
    createdAt: now - 2 * HOUR,
    status: 'read',
  },
  {
    id: 'm_anna_2',
    chatId: 'c_anna',
    senderId: CURRENT_USER_ID,
    type: 'text',
    text: 'Yes! They look amazing. The new color palette is 🔥',
    createdAt: now - 2 * HOUR + 3 * MIN,
    status: 'read',
  },
  {
    id: 'm_anna_3',
    chatId: 'c_anna',
    senderId: 'u_anna',
    type: 'text',
    text: 'Let\u2019s ship the redesign on Friday. Pinning this so we don\u2019t forget 📌',
    createdAt: now - 110 * MIN,
    status: 'read',
  },
  {
    id: 'm_anna_4',
    chatId: 'c_anna',
    senderId: 'u_anna',
    type: 'voice',
    text: '',
    createdAt: now - 40 * MIN,
    status: 'read',
    attachment: {
      id: 'a_anna_voice',
      type: 'voice',
      name: 'Voice message',
      duration: 14,
      waveform: generateWaveform(30),
    },
  },
  {
    id: 'm_anna_5',
    chatId: 'c_anna',
    senderId: CURRENT_USER_ID,
    type: 'text',
    text: 'Got it, sounds like a plan! 🚀',
    createdAt: now - 38 * MIN,
    status: 'delivered',
    replyTo: {
      messageId: 'm_anna_4',
      authorId: 'u_anna',
      authorName: 'Anna Petrova',
      snippet: 'Voice message',
    },
  },

  // ---- Design Team (group) ----
  {
    id: 'm_design_1',
    chatId: 'c_design',
    senderId: 'u_tom',
    type: 'text',
    text: 'Morning team! Standup in 10 minutes ☕',
    createdAt: now - 5 * HOUR,
    status: 'read',
  },
  {
    id: 'm_design_2',
    chatId: 'c_design',
    senderId: 'u_sara',
    type: 'text',
    text: 'On my way!',
    createdAt: now - 5 * HOUR + 2 * MIN,
    status: 'read',
  },
  {
    id: 'm_design_3',
    chatId: 'c_design',
    senderId: 'u_anna',
    type: 'image',
    text: 'Here\u2019s the latest hero section',
    createdAt: now - 4 * HOUR,
    status: 'read',
    attachment: {
      id: 'a_design_img',
      type: 'image',
      name: 'hero-section.png',
      size: '1.2 MB',
      url: 'https://picsum.photos/seed/telegramhero/640/360',
    },
  },
  {
    id: 'm_design_4',
    chatId: 'c_design',
    senderId: CURRENT_USER_ID,
    type: 'text',
    text: 'Love it 😍 ship it!',
    createdAt: now - 3 * HOUR,
    status: 'read',
  },

  // ---- Marco (private) ----
  {
    id: 'm_marco_1',
    chatId: 'c_marco',
    senderId: 'u_marco',
    type: 'text',
    text: 'Are we still on for lunch tomorrow?',
    createdAt: now - 1 * DAY,
    status: 'read',
  },
  {
    id: 'm_marco_2',
    chatId: 'c_marco',
    senderId: CURRENT_USER_ID,
    type: 'text',
    text: 'Absolutely. 12:30 at the usual place?',
    createdAt: now - 1 * DAY + 5 * MIN,
    status: 'read',
  },
  {
    id: 'm_marco_3',
    chatId: 'c_marco',
    senderId: 'u_marco',
    type: 'file',
    text: '',
    createdAt: now - 20 * HOUR,
    status: 'read',
    attachment: {
      id: 'a_marco_file',
      type: 'file',
      name: 'Q3-roadmap.pdf',
      size: '847 KB',
    },
  },

  // ---- Sara (private) ----
  {
    id: 'm_sara_1',
    chatId: 'c_sara',
    senderId: 'u_sara',
    type: 'text',
    text: 'Happy Friday! 🎉',
    createdAt: now - 26 * HOUR,
    status: 'read',
  },

  // ---- Dmitry (private) ----
  {
    id: 'm_dmitry_1',
    chatId: 'c_dmitry',
    senderId: 'u_dmitry',
    type: 'text',
    text: 'Deployed the new API to staging. Can you test the auth flow?',
    createdAt: now - 4 * HOUR,
    status: 'read',
  },
  {
    id: 'm_dmitry_2',
    chatId: 'c_dmitry',
    senderId: CURRENT_USER_ID,
    type: 'text',
    text: 'On it 👍',
    createdAt: now - 3.5 * HOUR,
    status: 'sent',
  },
];

/** Canned auto-replies the mock backend uses to feel "alive". */
export const autoReplies: string[] = [
  'Got it! 👍',
  'Haha that\u2019s great 😄',
  'Sounds good to me.',
  'Let me check and get back to you.',
  'Interesting, tell me more!',
  'Perfect, thanks! 🙏',
  'I\u2019ll take a look shortly.',
  '👍',
  'Absolutely!',
  'On my way 🚶',
];
