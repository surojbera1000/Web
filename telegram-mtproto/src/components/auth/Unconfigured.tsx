export function Unconfigured() {
  return (
    <div className="flex h-full items-center justify-center bg-tg-bg-light px-4 dark:bg-tg-bg">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl dark:bg-tg-panel">
        <div className="mb-4 flex items-center gap-3">
          <img src="/telegram.svg" alt="" className="h-12 w-12" />
          <h1 className="text-xl font-semibold">API credentials required</h1>
        </div>
        <p className="mb-4 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">
          This client connects to Telegram&apos;s real servers via MTProto and needs your own{' '}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">api_id</code> and{' '}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">api_hash</code>.
        </p>
        <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Go to{' '}
            <a className="text-tg-blue hover:underline" href="https://my.telegram.org" target="_blank" rel="noreferrer">
              my.telegram.org
            </a>{' '}
            and sign in.
          </li>
          <li>Open “API development tools” and create an app.</li>
          <li>
            Copy <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env.example</code> to{' '}
            <code className="rounded bg-black/10 px-1 dark:bg-white/10">.env</code> and fill in:
          </li>
        </ol>
        <pre className="overflow-x-auto rounded-xl bg-tg-bg p-4 text-xs text-green-300">
{`VITE_TELEGRAM_API_ID=1234567
VITE_TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef`}
        </pre>
        <p className="mt-4 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">
          Then restart the dev server (<code className="rounded bg-black/10 px-1 dark:bg-white/10">npm run dev</code>).
        </p>
      </div>
    </div>
  );
}
