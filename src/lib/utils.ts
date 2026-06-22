// =============================================================================
// Small, dependency-free helpers used across the app.
// =============================================================================

/** Generate a reasonably unique id without external deps. */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rand}`;
}

/** Initials from a display name, e.g. "John Appleseed" -> "JA". */
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

/** Stable gradient class for an id/name so avatars keep a consistent color. */
export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

const pad = (n: number) => n.toString().padStart(2, '0');

/** "14:05" style clock time. */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Relative-ish label for chat list rows: time today, weekday this week, else date. */
export function formatChatListTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(ts);

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
}

/** "last seen recently" style presence label. */
export function formatLastSeen(online: boolean, lastSeen: number): string {
  if (online) return 'online';
  const diff = Date.now() - lastSeen;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'last seen just now';
  if (mins < 60) return `last seen ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `last seen ${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'last seen yesterday';
  return `last seen ${new Date(lastSeen).toLocaleDateString()}`;
}

/** Day separator label inside the chat ("Today", "Yesterday", or a date). */
export function formatDayDivider(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDay) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/** Format a seconds count as m:ss for voice notes / recording timer. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** Format bytes into a short human readable size. */
export function formatBytes(bytes: number): string {
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

/** Deterministic-ish fake waveform for the voice message UI. */
export function generateWaveform(bars = 28): number[] {
  return Array.from({ length: bars }, (_, i) => {
    const base = Math.sin(i * 0.7) * 0.5 + 0.5;
    const jitter = Math.random() * 0.4;
    return Math.min(1, Math.max(0.15, base * 0.7 + jitter));
  });
}

/** Conditionally join class names. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Normalize a phone string for comparisons. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
