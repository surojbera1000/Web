import { TelegramClient, Api } from 'telegram';
import { computeCheck } from 'telegram/Password';
import { getApiCredentials } from './client';

/** Thrown by signIn when the account has Two-Step Verification enabled. */
export class PasswordNeededError extends Error {
  constructor() {
    super('SESSION_PASSWORD_NEEDED');
    this.name = 'PasswordNeededError';
  }
}

/** A normalized, user-friendly Telegram API error. */
export class TelegramAuthError extends Error {
  readonly code: string;
  readonly floodWaitSeconds?: number;
  constructor(code: string, message: string, floodWaitSeconds?: number) {
    super(message);
    this.name = 'TelegramAuthError';
    this.code = code;
    this.floodWaitSeconds = floodWaitSeconds;
  }
}

function rawMessage(err: unknown): string {
  if (!err) return '';
  const anyErr = err as any;
  return String(anyErr.errorMessage ?? anyErr.message ?? anyErr.code ?? err);
}

/** Convert any GramJS/RPC error into a friendly TelegramAuthError. */
export function normalizeError(err: unknown): TelegramAuthError {
  const msg = rawMessage(err);

  const flood = /FLOOD_WAIT_(\d+)/.exec(msg);
  if (flood) {
    const seconds = Number(flood[1]);
    return new TelegramAuthError(
      'FLOOD_WAIT',
      `Too many attempts. Please wait ${seconds}s before trying again.`,
      seconds,
    );
  }

  const map: Record<string, string> = {
    PHONE_NUMBER_INVALID: 'That phone number is not valid.',
    PHONE_CODE_INVALID: 'The code you entered is incorrect.',
    PHONE_CODE_EXPIRED: 'That code expired. Please request a new one.',
    PHONE_NUMBER_BANNED: 'This phone number is banned from Telegram.',
    PASSWORD_HASH_INVALID: 'Incorrect password. Please try again.',
    API_ID_INVALID: 'Invalid API credentials. Check your .env api_id/api_hash.',
    AUTH_KEY_UNREGISTERED: 'Session expired. Please log in again.',
    ACCESS_TOKEN_INVALID: 'That bot token is invalid.',
    ACCESS_TOKEN_EXPIRED: 'That bot token has expired or was revoked.',
  };
  for (const key of Object.keys(map)) {
    if (msg.includes(key)) return new TelegramAuthError(key, map[key]);
  }
  return new TelegramAuthError('UNKNOWN', msg || 'Something went wrong. Please try again.');
}

export interface SentCode {
  phoneCodeHash: string;
  isCodeViaApp: boolean;
}

/** Step 1: request a login code for a phone number. */
export async function sendLoginCode(client: TelegramClient, phone: string): Promise<SentCode> {
  const { apiId, apiHash } = getApiCredentials();
  try {
    const result = await client.sendCode({ apiId, apiHash }, phone.trim());
    return { phoneCodeHash: result.phoneCodeHash, isCodeViaApp: result.isCodeViaApp };
  } catch (err) {
    throw normalizeError(err);
  }
}

/**
 * Step 2: sign in with the received code.
 * Throws {@link PasswordNeededError} when 2FA is enabled.
 */
export async function signInWithCode(
  client: TelegramClient,
  phone: string,
  phoneCodeHash: string,
  code: string,
): Promise<Api.User> {
  try {
    const result = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone.trim(),
        phoneCodeHash,
        phoneCode: code.trim(),
      }),
    );
    return extractUser(result);
  } catch (err) {
    if (rawMessage(err).includes('SESSION_PASSWORD_NEEDED')) {
      throw new PasswordNeededError();
    }
    throw normalizeError(err);
  }
}

/** Step 3 (only if 2FA): verify the Two-Step Verification password via SRP. */
export async function signInWithPassword(
  client: TelegramClient,
  password: string,
): Promise<Api.User> {
  try {
    const pwd = await client.invoke(new Api.account.GetPassword());
    const check = await computeCheck(pwd, password);
    const result = await client.invoke(new Api.auth.CheckPassword({ password: check }));
    return extractUser(result);
  } catch (err) {
    throw normalizeError(err);
  }
}

/** Log in as a bot using a BotFather token. */
export async function signInAsBot(client: TelegramClient, botToken: string): Promise<Api.User> {
  const { apiId, apiHash } = getApiCredentials();
  try {
    await client.invoke(
      new Api.auth.ImportBotAuthorization({
        apiId,
        apiHash,
        botAuthToken: botToken.trim(),
        flags: 0,
      }),
    );
    return (await client.getMe()) as Api.User;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function getMe(client: TelegramClient): Promise<Api.User> {
  return (await client.getMe()) as Api.User;
}

export async function logOut(client: TelegramClient): Promise<void> {
  try {
    await client.invoke(new Api.auth.LogOut());
  } catch {
    /* best effort */
  }
}

function extractUser(result: Api.auth.TypeAuthorization): Api.User {
  if (result instanceof Api.auth.Authorization && result.user instanceof Api.User) {
    return result.user;
  }
  throw new TelegramAuthError('SIGN_IN_FAILED', 'Sign-in did not return a user.');
}
