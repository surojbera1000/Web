import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@/types';
import { backend } from '@/services';
import type { VerificationHandle } from '@/services';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  sendCode: (phone: string) => Promise<VerificationHandle>;
  verifyCode: (verificationId: string, code: string) => Promise<User>;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'bio' | 'avatar'>>) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => backend.getCurrentUser());
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = backend.onAuthChange((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const sendCode = useCallback((phone: string) => backend.sendVerificationCode(phone), []);
  const verifyCode = useCallback(
    (verificationId: string, code: string) => backend.confirmCode(verificationId, code),
    [],
  );
  const updateProfile = useCallback(
    (patch: Partial<Pick<User, 'name' | 'bio' | 'avatar'>>) => backend.updateProfile(patch),
    [],
  );
  const signOut = useCallback(() => backend.signOut(), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, sendCode, verifyCode, updateProfile, signOut }),
    [user, initializing, sendCode, verifyCode, updateProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
