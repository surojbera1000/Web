import { useState, type FormEvent } from 'react';
import { useTelegram } from '@/context/TelegramContext';
import { useTheme } from '@/context/ThemeContext';
import { areCredentialsValid } from '@/lib/telegram/client';
import { Spinner } from '@/components/common/Spinner';
import { MoonIcon, SunIcon } from '@/components/common/Icon';

export function Unconfigured() {
  const { configure } = useTelegram();
  const { theme, toggleTheme } = useTheme();
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const valid = areCredentialsValid(Number(apiId), apiHash);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError('Enter a numeric api_id and a valid api_hash (32 hex characters).');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await configure(Number(apiId), apiHash.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect.');
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-y-auto bg-tg-bg-light px-4 py-8 dark:bg-tg-bg">
      <button
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-full p-2.5 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/10"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <SunIcon width={22} height={22} /> : <MoonIcon width={22} height={22} />}
      </button>

      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl dark:bg-tg-panel">
        <div className="mb-4 flex items-center gap-3">
          <img src="/telegram.svg" alt="" className="h-12 w-12" />
          <h1 className="text-xl font-semibold">Connect your Telegram API key</h1>
        </div>

        <p className="mb-5 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">
          This client connects to Telegram&apos;s real servers via MTProto. Enter your own{' '}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">api_id</code> and{' '}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">api_hash</code> below. They&apos;re
          stored only in this browser.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tg-blue">api_id</span>
            <input
              value={apiId}
              onChange={(e) => setApiId(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              placeholder="1234567"
              className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 outline-none focus:border-tg-blue dark:border-gray-600"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-tg-blue">api_hash</span>
            <input
              value={apiHash}
              onChange={(e) => setApiHash(e.target.value)}
              placeholder="0123456789abcdef0123456789abcdef"
              className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 font-mono text-sm outline-none focus:border-tg-blue dark:border-gray-600"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-blue py-3.5 font-medium text-white transition-all hover:bg-tg-blue-dark active:scale-[0.99] disabled:opacity-60"
          >
            {submitting ? <Spinner size={20} /> : 'Connect'}
          </button>
        </form>

        <details className="mt-5 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">
          <summary className="cursor-pointer font-medium text-tg-blue">Where do I get these?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Go to{' '}
              <a className="text-tg-blue hover:underline" href="https://my.telegram.org" target="_blank" rel="noreferrer">
                my.telegram.org
              </a>{' '}
              and sign in with your phone number.
            </li>
            <li>Open “API development tools” and create an app (any title/short name).</li>
            <li>
              Copy the <strong>App api_id</strong> and <strong>App api_hash</strong> and paste them above.
            </li>
          </ol>
          <p className="mt-2">
            Prefer a file? You can instead set{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">VITE_TELEGRAM_API_ID</code> and{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">VITE_TELEGRAM_API_HASH</code> in a{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env</code> file.
          </p>
        </details>
      </div>
    </div>
  );
}
