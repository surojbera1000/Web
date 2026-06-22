import { useRef, useState, type FormEvent, type InputHTMLAttributes, type RefObject } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { isMockBackend } from '@/services';
import { cn } from '@/lib/utils';
import { MoonIcon, SunIcon } from '@/components/common/Icon';

type Step = 'phone' | 'code';

export function LoginPage() {
  const { sendCode, verifyCode } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (phone.replace(/\D/g, '').length < 6) {
      setError('Please enter a valid phone number.');
      return;
    }
    setLoading(true);
    try {
      const handle = await sendCode(phone);
      setVerificationId(handle.verificationId);
      setDevCode(handle.devCode);
      setStep('code');
      setTimeout(() => codeInputRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send the code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyCode(verificationId, code);
      // On success, AuthContext flips the user and the app routes away.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.');
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 5);
    setCode(digits);
    setError('');
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-tg-bg-light px-4 py-10 dark:bg-tg-bg-dark">
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-full p-2.5 text-tg-text-secondary-light transition-colors hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <SunIcon width={22} height={22} /> : <MoonIcon width={22} height={22} />}
      </button>

      <div className="w-full max-w-sm animate-fade-in text-center">
        <img
          src="/telegram.svg"
          alt="Telegram"
          className="mx-auto mb-6 h-28 w-28 drop-shadow-lg"
          draggable={false}
        />

        {step === 'phone' ? (
          <>
            <h1 className="mb-2 text-2xl font-semibold">Sign in to Telegram</h1>
            <p className="mb-8 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
              Please confirm your country code and enter your phone number.
            </p>

            <form onSubmit={handleSendCode} className="space-y-4 text-left">
              <FloatingInput
                label="Phone number"
                type="tel"
                inputMode="tel"
                autoFocus
                value={phone}
                onChange={(v) => {
                  setPhone(v);
                  setError('');
                }}
                placeholder="+1 555 000 0000"
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-blue py-3.5 font-medium text-white transition-all hover:bg-tg-blue-dark active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? <Spinner /> : 'Next'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-semibold tracking-wide">{phone}</h1>
            <button
              onClick={() => {
                setStep('phone');
                setCode('');
                setError('');
              }}
              className="mb-6 text-sm font-medium text-tg-blue hover:underline"
            >
              Wrong number?
            </button>
            <p className="mb-6 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
              We&apos;ve sent you a verification code. Enter it below to continue.
            </p>

            <form onSubmit={handleVerify} className="space-y-4 text-left">
              <CodeBoxes
                value={code}
                onChange={handleCodeChange}
                inputRef={codeInputRef}
              />

              {devCode && (
                <p className="rounded-lg bg-tg-active-light px-3 py-2 text-center text-sm text-tg-blue-dark dark:bg-tg-hover-dark dark:text-tg-send">
                  Demo mode — use code <span className="font-semibold">{devCode}</span>
                </p>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.length < 5}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-blue py-3.5 font-medium text-white transition-all hover:bg-tg-blue-dark active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? <Spinner /> : 'Verify'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
        {label}
      </span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-base outline-none transition-colors focus:border-tg-blue dark:border-gray-600 dark:focus:border-tg-blue"
      />
    </label>
  );
}

function CodeBoxes({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
}) {
  const boxes = Array.from({ length: 5 });
  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        autoComplete="one-time-code"
        className="absolute inset-0 h-full w-full opacity-0"
        aria-label="Verification code"
      />
      <div className="flex justify-between gap-2">
        {boxes.map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex h-14 flex-1 items-center justify-center rounded-xl border text-2xl font-semibold transition-all',
              value.length === i
                ? 'border-tg-blue ring-2 ring-tg-blue/30'
                : 'border-gray-300 dark:border-gray-600',
            )}
          >
            {value[i] ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}
