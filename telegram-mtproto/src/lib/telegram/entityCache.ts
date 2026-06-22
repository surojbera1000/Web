import { TelegramClient, Api } from 'telegram';

interface CacheEntry {
  entity: any;
  input?: Api.TypeInputPeer;
}

// Populated when dialogs are fetched so later calls can resolve peers reliably.
const cache = new Map<string, CacheEntry>();

export function rememberEntity(id: string, entity: any, input?: Api.TypeInputPeer): void {
  cache.set(id, { entity, input });
}

export function getCachedEntity(id: string): any | undefined {
  return cache.get(id)?.entity;
}

/** Resolve an input peer for a chat id, preferring the dialog cache. */
export async function resolveInput(
  client: TelegramClient,
  id: string,
): Promise<Api.TypeInputPeer> {
  const cached = cache.get(id);
  if (cached?.input) return cached.input;
  const input = await client.getInputEntity(cached?.entity ?? id);
  const existing = cache.get(id);
  cache.set(id, { entity: existing?.entity ?? input, input });
  return input;
}

export function clearEntityCache(): void {
  cache.clear();
}
