import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

export interface ApiCredentials {
  apiId: number;
  apiHash: string;
}

const LS_API_ID = 'tg-api-id';
const LS_API_HASH = 'tg-api-hash';

/**
 * Resolve api_id / api_hash. Credentials entered in the app (localStorage)
 * take precedence; otherwise we fall back to build-time Vite env vars.
 */
export function getApiCredentials(): ApiCredentials {
  let storedId = '';
  let storedHash = '';
  try {
    storedId = localStorage.getItem(LS_API_ID) ?? '';
    storedHash = localStorage.getItem(LS_API_HASH) ?? '';
  } catch {
    /* localStorage may be unavailable */
  }
  const apiId = Number(storedId || import.meta.env.VITE_TELEGRAM_API_ID || 0);
  const apiHash = String(storedHash || import.meta.env.VITE_TELEGRAM_API_HASH || '');
  return { apiId, apiHash };
}

/** Validate a candidate api_id / api_hash pair. */
export function areCredentialsValid(apiId: number, apiHash: string): boolean {
  return Number.isFinite(apiId) && apiId > 0 && /^[a-f0-9]{20,}$/i.test(apiHash.trim());
}

/** Persist API credentials entered through the UI. */
export function saveApiCredentials(apiId: number, apiHash: string): void {
  try {
    localStorage.setItem(LS_API_ID, String(apiId));
    localStorage.setItem(LS_API_HASH, apiHash.trim());
  } catch {
    /* ignore */
  }
}

/** Remove stored API credentials (falls back to env afterwards). */
export function clearApiCredentials(): void {
  try {
    localStorage.removeItem(LS_API_ID);
    localStorage.removeItem(LS_API_HASH);
  } catch {
    /* ignore */
  }
}

/** True only when both credentials are present & plausible. */
export function isConfigured(): boolean {
  const { apiId, apiHash } = getApiCredentials();
  return areCredentialsValid(apiId, apiHash);
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
