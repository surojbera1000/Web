import { api } from '@/lib/api';

/** Returns the backend avatar URL for a chat (the <img> handles 404 → initials). */
export function useAvatar(chatId: string | undefined): string | undefined {
  if (!chatId) return undefined;
  return api.avatarUrl(chatId);
}
