import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTelegram } from '@/context/TelegramContext';
import { useTheme } from '@/context/ThemeContext';
import { PasswordNeededError } from '@/lib/telegram/auth';
import { Spinner } from '@/components/common/Spinner';
import { BotIcon, LockIcon as _Lock, MoonIcon, PhoneIcon, SunIcon, UsersIcon } from '@/components/common/Icon';

type Tab = 'user' | 'bot';
type Step = 'phone' | 'code' | 'password';

export function LoginPanel() {
  const { loginSendCode, loginConfirmCode, loginPassword, loginBot, resetCredentials } = useTelegram();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState<Tab>('user');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : 'Something went wrong.');
  }

  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const sent = await loginSendCode(phone);
      setPhoneCodeHash(sent.phoneCodeHash);
      setInfo(sent.isCodeViaApp ? 'Code sent to your Telegram app.' : 'Code sent via SMS.');
      setStep('code');
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginConfirmCode(phone, phoneCodeHash, code);
      // success → context becomes authorized
    } catch (e) {
      if (e instanceof PasswordNeededError) {
        setStep('password');
        setInfo('Two-step verification is enabled. Enter your password.');
      } else {
        fail(e);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginPassword(password);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  async function onBotLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginBot(botToken);
    } catch (e) {
      fail(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-full items-center justify-center bg-tg-bg-light px-4 dark:bg-tg-bg">
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-full p-2.5 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/10"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <SunIcon width={22} height={22} /> : <MoonIcon width={22} height={22} />}
      </button>

      <div className="w-full max-w-sm animate-fade-in">
        <img src="/telegram.svg" alt="Telegram" className="mx-auto mb-6 h-24 w-24 drop-shadow-lg" />

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-black/5 p-1 dark:bg-white/5">
          <TabButton active={tab === 'user'} onClick={() => { setTab('user'); setError(''); }} icon={<UsersIcon width={18} height={18} />} label="User" />
          <TabButton active={tab === 'bot'} onClick={() => { setTab('bot'); setError(''); }} icon={<BotIcon width={18} height={18} />} label="Login as Bot" />
        </div>

        {tab === 'user' ? (
          <>
            {step === 'phone' && (
              <form onSubmit={onSendCode} className="space-y-4">
                <Header title="Sign in to Telegram" subtitle="Enter your phone number in international format." />
                <Field icon={<PhoneIcon width={18} height={18} />} placeholder="+1 415 555 0123" value={phone} onChange={setPhone} type="tel" autoFocus />
                <Submit loading={loading} disabled={phone.replace(/\D/g, '').length < 6}>Next</Submit>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={onConfirmCode} className="space-y-4">
                <Header title={phone} subtitle={info || 'Enter the code you received.'} />
                <Field placeholder="Login code" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus />
                <Submit loading={loading} disabled={code.length < 5}>Verify</Submit>
                <BackLink onClick={() => { setStep('phone'); setCode(''); setError(''); }}>Wrong number?</BackLink>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={onPassword} className="space-y-4">
                <Header title="Two-Step Verification" subtitle={info || 'Enter your password.'} />
                <Field icon={<_Lock width={18} height={18} />} placeholder="Password" value={password} onChange={setPassword} type="password" autoFocus />
                <Submit loading={loading} disabled={password.length < 1}>Sign in</Submit>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={onBotLogin} className="space-y-4">
            <Header title="Login as Bot" subtitle="Paste a bot token from @BotFather." />
            <Field icon={<BotIcon width={18} height={18} />} placeholder="123456:ABC-DEF1234..." value={botToken} onChange={setBotToken} autoFocus />
            <Submit loading={loading} disabled={!/^\d+:[\w-]+$/.test(botToken.trim())}>Connect bot</Submit>
            <p className="text-center text-xs text-tg-text-secondary-light dark:text-tg-text-secondary">
              The bot dashboard lets you view incoming messages and reply, including inline keyboards.
            </p>
          </form>
        )}

        {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}

        <button
          type="button"
          onClick={() => void resetCredentials()}
          className="mt-6 block w-full text-center text-xs text-tg-text-secondary-light hover:underline dark:text-tg-text-secondary"
        >
          Use a different API key
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
        active ? 'bg-white text-tg-blue shadow dark:bg-tg-panel-2 dark:text-white' : 'text-tg-text-secondary-light dark:text-tg-text-secondary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">{subtitle}</p>
    </div>
  );
}

function Field({
  icon,
  value,
  onChange,
  ...rest
}: {
  icon?: ReactNode;
  value: string;
  onChange: (v: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-text-secondary-light dark:text-tg-text-secondary">
          {icon}
        </span>
      )}
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-gray-300 bg-transparent py-3 text-base outline-none transition-colors focus:border-tg-blue dark:border-gray-600 ${icon ? 'pl-11 pr-4' : 'px-4'}`}
      />
    </div>
  );
}

function Submit({ loading, disabled, children }: { loading: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-blue py-3.5 font-medium text-white transition-all hover:bg-tg-blue-dark active:scale-[0.99] disabled:opacity-60"
    >
      {loading ? <Spinner size={20} /> : children}
    </button>
  );
}

function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-center text-sm font-medium text-tg-blue hover:underline">
      {children}
    </button>
  );
}
