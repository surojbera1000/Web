import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { TelegramClient, Api } from 'telegram';
import { createClient, isConfigured, serializeSession } from '@/lib/telegram/client';
import {
  PasswordNeededError,
  getMe,
  logOut,
  sendLoginCode,
  signInAsBot,
  signInWithCode,
  signInWithPassword,
  type SentCode,
} from '@/lib/telegram/auth';
import {
  getActiveAccountId,
  getAccount,
  listAccounts,
  saveAccount,
  setActiveAccountId,
  deleteAccount,
  type AccountRecord,
} from '@/lib/telegram/session';
import { clearEntityCache } from '@/lib/telegram/entityCache';
import { idToString } from '@/lib/telegram/format';

export type ConnectionStatus =
  | 'init'
  | 'unconfigured'
  | 'connecting'
  | 'awaiting_login'
  | 'authorized'
  | 'error';

export interface SelfAccount {
  id: string;
  type: 'user' | 'bot';
  name: string;
  username?: string;
  isBot: boolean;
}

interface TelegramContextValue {
  status: ConnectionStatus;
  error: string | null;
  client: TelegramClient | null;
  account: SelfAccount | null;
  accounts: AccountRecord[];

  // login
  loginSendCode: (phone: string) => Promise<SentCode>;
  loginConfirmCode: (phone: string, phoneCodeHash: string, code: string) => Promise<void>;
  loginPassword: (password: string) => Promise<void>;
  loginBot: (botToken: string) => Promise<void>;

  // session management
  switchAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  logout: () => Promise<void>;
  beginAddAccount: () => void;
}

const TelegramContext = createContext<TelegramContextValue | undefined>(undefined);

function selfFromUser(user: Api.User, type: 'user' | 'bot'): SelfAccount {
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Telegram User';
  return { id: idToString(user.id), type, name, username: user.username || undefined, isBot: !!user.bot };
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<TelegramClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('init');
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<SelfAccount | null>(null);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  const refreshAccounts = useCallback(async () => {
    setAccounts(await listAccounts());
  }, []);

  /** Disconnect and drop the current client. */
  const teardownClient = useCallback(async () => {
    clearEntityCache();
    const c = clientRef.current;
    clientRef.current = null;
    if (c) {
      try {
        await c.disconnect();
      } catch {
        /* ignore */
      }
    }
  }, []);

  /** Create a fresh, connected client (empty or from a saved session). */
  const connectClient = useCallback(async (sessionString = ''): Promise<TelegramClient> => {
    const client = createClient(sessionString);
    await client.connect();
    clientRef.current = client;
    return client;
  }, []);

  /** Persist the active account + session string. */
  const persistAccount = useCallback(
    async (self: SelfAccount, client: TelegramClient) => {
      const record: AccountRecord = {
        id: self.id,
        type: self.type,
        session: serializeSession(client),
        label: self.name,
        createdAt: Date.now(),
      };
      await saveAccount(record);
      await setActiveAccountId(self.id);
      await refreshAccounts();
    },
    [refreshAccounts],
  );

  const finalizeLogin = useCallback(
    async (user: Api.User, type: 'user' | 'bot') => {
      const client = clientRef.current!;
      const self = selfFromUser(user, type);
      setAccount(self);
      await persistAccount(self, client);
      setStatus('authorized');
      setError(null);
    },
    [persistAccount],
  );

  // ---- Bootstrap on mount ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isConfigured()) {
        setStatus('unconfigured');
        return;
      }
      await refreshAccounts();
      const activeId = await getActiveAccountId();
      const record = activeId ? await getAccount(activeId) : undefined;

      if (record) {
        setStatus('connecting');
        try {
          const client = await connectClient(record.session);
          const authorized = await client.isUserAuthorized();
          if (cancelled) return;
          if (authorized) {
            const me = await getMe(client);
            await persistAccount(selfFromUser(me, record.type), client);
            setAccount(selfFromUser(me, record.type));
            setStatus('authorized');
            return;
          }
        } catch (e) {
          if (cancelled) return;
          console.error('Session restore failed', e);
        }
      }

      // No usable session — open a fresh connection for login.
      try {
        await connectClient('');
        if (!cancelled) setStatus('awaiting_login');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to connect to Telegram.');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Login methods ----
  const ensureClient = useCallback(async (): Promise<TelegramClient> => {
    if (clientRef.current) return clientRef.current;
    return connectClient('');
  }, [connectClient]);

  const loginSendCode = useCallback(
    async (phone: string) => {
      const client = await ensureClient();
      return sendLoginCode(client, phone);
    },
    [ensureClient],
  );

  const loginConfirmCode = useCallback(
    async (phone: string, phoneCodeHash: string, code: string) => {
      const client = await ensureClient();
      try {
        const user = await signInWithCode(client, phone, phoneCodeHash, code);
        await finalizeLogin(user, 'user');
      } catch (e) {
        if (e instanceof PasswordNeededError) throw e; // UI advances to 2FA step
        throw e;
      }
    },
    [ensureClient, finalizeLogin],
  );

  const loginPassword = useCallback(
    async (password: string) => {
      const client = await ensureClient();
      const user = await signInWithPassword(client, password);
      await finalizeLogin(user, 'user');
    },
    [ensureClient, finalizeLogin],
  );

  const loginBot = useCallback(
    async (botToken: string) => {
      const client = await ensureClient();
      const user = await signInAsBot(client, botToken);
      await finalizeLogin(user, 'bot');
    },
    [ensureClient, finalizeLogin],
  );

  // ---- Account/session management ----
  const switchAccount = useCallback(
    async (id: string) => {
      const record = await getAccount(id);
      if (!record) return;
      setStatus('connecting');
      await teardownClient();
      try {
        const client = await connectClient(record.session);
        const me = await getMe(client);
        const self = selfFromUser(me, record.type);
        setAccount(self);
        await setActiveAccountId(id);
        await refreshAccounts();
        setStatus('authorized');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to switch account.');
        setStatus('error');
      }
    },
    [connectClient, refreshAccounts, teardownClient],
  );

  const beginAddAccount = useCallback(() => {
    (async () => {
      await teardownClient();
      await setActiveAccountId(null);
      setAccount(null);
      await connectClient('');
      setStatus('awaiting_login');
    })();
  }, [connectClient, teardownClient]);

  const removeAccount = useCallback(
    async (id: string) => {
      await deleteAccount(id);
      await refreshAccounts();
      if (account?.id === id) {
        await teardownClient();
        const remaining = await listAccounts();
        if (remaining.length > 0) {
          await switchAccount(remaining[0].id);
        } else {
          setAccount(null);
          await connectClient('');
          setStatus('awaiting_login');
        }
      }
    },
    [account, connectClient, refreshAccounts, switchAccount, teardownClient],
  );

  const logout = useCallback(async () => {
    const client = clientRef.current;
    const current = account;
    if (client) await logOut(client);
    if (current) await deleteAccount(current.id);
    await teardownClient();
    await refreshAccounts();
    const remaining = await listAccounts();
    if (remaining.length > 0) {
      await switchAccount(remaining[0].id);
    } else {
      setAccount(null);
      await connectClient('');
      setStatus('awaiting_login');
    }
  }, [account, connectClient, refreshAccounts, switchAccount, teardownClient]);

  const value = useMemo<TelegramContextValue>(
    () => ({
      status,
      error,
      client: clientRef.current,
      account,
      accounts,
      loginSendCode,
      loginConfirmCode,
      loginPassword,
      loginBot,
      switchAccount,
      removeAccount,
      logout,
      beginAddAccount,
    }),
    [
      status,
      error,
      account,
      accounts,
      loginSendCode,
      loginConfirmCode,
      loginPassword,
      loginBot,
      switchAccount,
      removeAccount,
      logout,
      beginAddAccount,
    ],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTelegram(): TelegramContextValue {
  const ctx = useContext(TelegramContext);
  if (!ctx) throw new Error('useTelegram must be used within TelegramProvider');
  return ctx;
}
