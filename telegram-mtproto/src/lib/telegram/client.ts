import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export interface ApiCredentials {
  apiId: number;
  apiHash: string;
}

/** Read api_id / api_hash from Vite env. */
export function getApiCredentials(): ApiCredentials {
  const apiId = Number(import.meta.env.VITE_TELEGRAM_API_ID ?? 0);
  const apiHash = String(import.meta.env.VITE_TELEGRAM_API_HASH ?? '');
  return { apiId, apiHash };
}

/** True only when both credentials are present & plausible. */
export function isConfigured(): boolean {
  const { apiId, apiHash } = getApiCredentials();
  return Number.isFinite(apiId) && apiId > 0 && apiHash.length >= 8;
}

/**
 * Build a GramJS client from an optional saved session string.
 * The client is NOT connected yet — call `client.connect()` afterwards.
 */
export function createClient(sessionString = ''): TelegramClient {
  const { apiId, apiHash } = getApiCredentials();
  const session = new StringSession(sessionString);

  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    retryDelay: 2000,
    autoReconnect: true,
    useWSS: true,
    // Quieten GramJS' verbose internal logging in the browser console.
    baseLogger: undefined,
  });

  // Reduce noise; flip to 'debug' when diagnosing connection issues.
  try {
    client.setLogLevel('error' as never);
  } catch {
    /* setLogLevel signature varies across versions; ignore if unavailable */
  }

  return client;
}

/** Serialize the current session to a string for persistence. */
export function serializeSession(client: TelegramClient): string {
  return client.session.save() as unknown as string;
}
