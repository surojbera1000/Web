import { Api } from 'telegram';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-[#ff885e] to-[#ff516a]',
  'from-[#ffcd6a] to-[#ffa85c]',
  'from-[#82b1ff] to-[#665fff]',
  'from-[#a0de7e] to-[#54cb68]',
  'from-[#53edd6] to-[#28c9b7]',
  'from-[#72d5fd] to-[#2a9ef1]',
  'from-[#e0a2f3] to-[#d669ed]',
];

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const pad = (n: number) => n.toString().padStart(2, '0');

/** epoch seconds -> "14:05" */
export function formatTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** dialog list timestamp: time today, weekday this week, else date */
export function formatDialogTime(epochSeconds: number): string {
  if (!epochSeconds) return '';
  const d = new Date(epochSeconds * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(epochSeconds);
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}

export function formatDayDivider(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startToday - startDay) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** Build a presence label + online flag from an Api.User status. */
export function presenceFromStatus(status?: Api.TypeUserStatus): {
  online: boolean;
  label: string;
} {
  if (!status) return { online: false, label: 'last seen recently' };
  if (status instanceof Api.UserStatusOnline) return { online: true, label: 'online' };
  if (status instanceof Api.UserStatusOffline) {
    const was = status.wasOnline ? status.wasOnline * 1000 : 0;
    if (!was) return { online: false, label: 'last seen recently' };
    const diff = Date.now() - was;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return { online: false, label: 'last seen just now' };
    if (mins < 60) return { online: false, label: `last seen ${mins} min ago` };
    const hours = Math.floor(mins / 60);
    if (hours < 24) return { online: false, label: `last seen ${hours}h ago` };
    return { online: false, label: `last seen ${new Date(was).toLocaleDateString()}` };
  }
  if (status instanceof Api.UserStatusRecently) return { online: false, label: 'last seen recently' };
  if (status instanceof Api.UserStatusLastWeek) return { online: false, label: 'last seen within a week' };
  if (status instanceof Api.UserStatusLastMonth) return { online: false, label: 'last seen within a month' };
  return { online: false, label: 'last seen a long time ago' };
}

/** Safely stringify a GramJS BigInteger-ish id. */
export function idToString(id: unknown): string {
  if (id === null || id === undefined) return '';
  return String(id);
}
