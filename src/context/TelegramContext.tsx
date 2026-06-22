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
import { api, clearToken, resetSocket, setToken, type SelfAccount } from '@/lib/api';

export type ConnectionStatus = 'init' | 'unconfigured' | 'awaiting_login' | 'authorized' | 'error';

interface TelegramContextValue {
  status: ConnectionStatus;
  error: string | null;
  account: SelfAccount | null;

  /** Step 1: request an SMS/app login code. Returns whether it went to the app. */
  loginSendCode: (phone: string) => Promise<{ viaApp: boolean }>;
  /** Step 2: confirm the code. Returns { needPassword } if 2FA is enabled. */
  loginConfirmCode: (code: string) => Promise<{ needPassword: boolean }>;
  /** Step 3 (2FA only): confirm the Two-Step Verification password. */
  loginPassword: (password: string) => Promise<void>;
  /** Bot login via BotFather token. */
  loginBot: (botToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TelegramContext = createContext<TelegramContextValue | undefined>(undefined);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('init');
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<SelfAccount | null>(null);
  const loginToken = useRef<string>('');

  // Bootstrap: check server config, then restore session if a token exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { configured } = await api.config();
        if (cancelled) return;
        if (!configured) {
          setStatus('unconfigured');
          return;
        }
        const me = await api.me();
        if (cancelled) return;
        if (me) {
          setAccount(me);
          setStatus('authorized');
        } else {
          setStatus('awaiting_login');
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Cannot reach the server.');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginSendCode = useCallback(async (phone: string) => {
    const r = await api.sendCode(phone);
    loginToken.current = r.token;
    return { viaApp: r.viaApp };
  }, []);

  const loginConfirmCode = useCallback(async (code: string) => {
    const r = await api.confirmCode(loginToken.current, code);
    if (r.needPassword) return { needPassword: true };
    setToken(r.token);
    if (r.user) setAccount(r.user);
    setStatus('authorized');
    return { needPassword: false };
  }, []);

  const loginPassword = useCallback(async (password: string) => {
    const r = await api.confirmPassword(loginToken.current, password);
    setToken(r.token);
    setAccount(r.user);
    setStatus('authorized');
  }, []);

  const loginBot = useCallback(async (botToken: string) => {
    const r = await api.botLogin(botToken);
    setToken(r.token);
    setAccount(r.user);
    setStatus('authorized');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    resetSocket();
    clearToken();
    setAccount(null);
    setStatus('awaiting_login');
  }, []);

  const value = useMemo<TelegramContextValue>(
    () => ({ status, error, account, loginSendCode, loginConfirmCode, loginPassword, loginBot, logout }),
    [status, error, account, loginSendCode, loginConfirmCode, loginPassword, loginBot, logout],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTelegram(): TelegramContextValue {
  const ctx = useContext(TelegramContext);
  if (!ctx) throw new Error('useTelegram must be used within TelegramProvider');
  return ctx;
}
