import { useEffect, useState } from 'react';
import { useTelegram } from '@/context/TelegramContext';
import { downloadAvatar } from '@/lib/telegram/messages';

// Cache resolved avatar object URLs per chat id (per session lifetime).
const avatarCache = new Map<string, string | undefined>();

/** Lazily download and cache a chat/user avatar; returns an object URL or undefined. */
export function useAvatar(chatId: string | undefined): string | undefined {
  const { client } = useTelegram();
  const [src, setSrc] = useState<string | undefined>(chatId ? avatarCache.get(chatId) : undefined);

  useEffect(() => {
    if (!client || !chatId) return;
    if (avatarCache.has(chatId)) {
      setSrc(avatarCache.get(chatId));
      return;
    }
    let active = true;
    void (async () => {
      const url = await downloadAvatar(client, chatId);
      avatarCache.set(chatId, url);
      if (active) setSrc(url);
    })();
    return () => {
      active = false;
    };
  }, [client, chatId]);

  return src;
}
