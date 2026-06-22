import { useMemo, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTelegram } from '@/context/TelegramContext';
import { useTheme } from '@/context/ThemeContext';
import { COUNTRIES, isoToFlag, type Country } from '@/lib/countries';
import { Spinner } from '@/components/common/Spinner';
import { BotIcon, ChevronDownIcon, LockIcon, MoonIcon, SearchIcon, SunIcon, UsersIcon } from '@/components/common/Icon';
import { cn } from '@/lib/telegram/format';

type Tab = 'user' | 'bot';
type Step = 'phone' | 'code' | 'password';

const DEFAULT_COUNTRY = COUNTRIES[0];

export function LoginPanel() {
  const { loginSendCode, loginConfirmCode, loginPassword, loginBot } = useTelegram();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState<Tab>('user');
  const [step, setStep] = useState<Step>('phone');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localNumber, setLocalNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const fullPhone = `${country.dial}${localNumber.replace(/\D/g, '')}`;

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : 'Something went wrong.');
  }

  async function onSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { viaApp } = await loginSendCode(fullPhone);
      setInfo(viaApp ? 'Code sent to your Telegram app.' : 'Code sent via SMS.');
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
      const { needPassword } = await loginConfirmCode(code);
      if (needPassword) {
        setStep('password');
        setInfo('Two-step verification is on. Enter your password.');
      }
    } catch (e) {
      fail(e);
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

  async function onBot(e: FormEvent) {
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

        <div className="mb-6 flex rounded-xl bg-black/5 p-1 dark:bg-white/5">
          <TabButton active={tab === 'user'} onClick={() => { setTab('user'); setError(''); }} icon={<UsersIcon width={18} height={18} />} label="User" />
          <TabButton active={tab === 'bot'} onClick={() => { setTab('bot'); setError(''); }} icon={<BotIcon width={18} height={18} />} label="Login as Bot" />
        </div>

        {tab === 'user' ? (
          <>
            {step === 'phone' && (
              <form onSubmit={onSendCode} className="space-y-4">
                <Header title="Sign in to Telegram" subtitle="Please confirm your country code and enter your phone number." />

                {/* Country selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPickerOpen((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-left outline-none focus:border-tg-blue dark:border-gray-600"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{isoToFlag(country.iso2)}</span>
                      <span>{country.name}</span>
                    </span>
                    <ChevronDownIcon width={18} height={18} className="text-tg-text-secondary" />
                  </button>
                  {pickerOpen && (
                    <CountryPicker
                      onPick={(c) => {
                        setCountry(c);
                        setPickerOpen(false);
                      }}
                      onClose={() => setPickerOpen(false)}
                    />
                  )}
                </div>

                {/* Phone with dial-code prefix */}
                <div className="flex items-center rounded-xl border border-gray-300 focus-within:border-tg-blue dark:border-gray-600">
                  <span className="select-none border-r border-gray-300 px-3 py-3 text-base text-tg-text-secondary-light dark:border-gray-600 dark:text-tg-text-secondary">
                    {country.dial}
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoFocus
                    value={localNumber}
                    onChange={(e) => { setLocalNumber(e.target.value); setError(''); }}
                    placeholder="phone number"
                    className="flex-1 bg-transparent px-3 py-3 text-base outline-none"
                  />
                </div>

                <Submit loading={loading} disabled={localNumber.replace(/\D/g, '').length < 5}>Next</Submit>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={onConfirmCode} className="space-y-4">
                <Header title={fullPhone} subtitle={info || 'Enter the code you received.'} />
                <Field placeholder="Login code" value={code} onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoFocus />
                <Submit loading={loading} disabled={code.length < 5}>Verify</Submit>
                <BackLink onClick={() => { setStep('phone'); setCode(''); setError(''); }}>Wrong number?</BackLink>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={onPassword} className="space-y-4">
                <Header title="Two-Step Verification" subtitle={info || 'Enter your password.'} />
                <Field icon={<LockIcon width={18} height={18} />} placeholder="Password" value={password} onChange={setPassword} type="password" autoFocus />
                <Submit loading={loading} disabled={password.length < 1}>Sign in</Submit>
              </form>
            )}
          </>
        ) : (
          <form onSubmit={onBot} className="space-y-4">
            <Header title="Login as Bot" subtitle="Paste a bot token from @BotFather." />
            <Field icon={<BotIcon width={18} height={18} />} placeholder="123456:ABC-DEF1234..." value={botToken} onChange={setBotToken} autoFocus />
            <Submit loading={loading} disabled={!/^\d+:[\w-]+$/.test(botToken.trim())}>Connect bot</Submit>
          </form>
        )}

        {error && <p className="mt-4 text-center text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function CountryPicker({ onPick, onClose }: { onPick: (c: Country) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.dial.includes(s));
  }, [q]);

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel dark:ring-white/10">
        <div className="relative p-2">
          <SearchIcon width={16} height={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tg-text-secondary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search country"
            className="w-full rounded-lg bg-black/5 py-2 pl-9 pr-3 text-sm outline-none dark:bg-white/5"
          />
        </div>
        <div className="tg-scroll max-h-56 overflow-y-auto pb-1">
          {list.map((c) => (
            <button
              key={c.iso2 + c.dial}
              type="button"
              onClick={() => onPick(c)}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span className="text-xl">{isoToFlag(c.iso2)}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-tg-text-secondary">{c.dial}</span>
            </button>
          ))}
          {list.length === 0 && <p className="px-4 py-4 text-center text-sm text-tg-text-secondary">No match</p>}
        </div>
      </div>
    </>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
        active ? 'bg-white text-tg-blue shadow dark:bg-tg-panel-2 dark:text-white' : 'text-tg-text-secondary-light dark:text-tg-text-secondary',
      )}
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
        className={cn(
          'w-full rounded-xl border border-gray-300 bg-transparent py-3 text-base outline-none transition-colors focus:border-tg-blue dark:border-gray-600',
          icon ? 'pl-11 pr-4' : 'px-4',
        )}
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
