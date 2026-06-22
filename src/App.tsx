import { useTelegram } from '@/context/TelegramContext';
import { Spinner } from '@/components/common/Spinner';
import { LoginPanel } from '@/components/auth/LoginPanel';
import { Unconfigured } from '@/components/auth/Unconfigured';
import { MainLayout } from '@/components/MainLayout';
import { BotDashboard } from '@/components/bot/BotDashboard';

export default function App() {
  const { status, error, account } = useTelegram();

  if (status === 'init' || status === 'connecting') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-tg-bg-light text-tg-text-secondary dark:bg-tg-bg">
        <img src="/telegram.svg" alt="" className="h-20 w-20 opacity-90" />
        <Spinner size={26} className="text-tg-blue" />
        <p className="text-sm">{status === 'connecting' ? 'Connecting to Telegram…' : 'Starting…'}</p>
      </div>
    );
  }

  if (status === 'unconfigured') return <Unconfigured />;

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-medium text-red-500">Connection error</p>
        <p className="max-w-md text-sm text-tg-text-secondary">{error}</p>
        <button
          onClick={() => location.reload()}
          className="mt-2 rounded-xl bg-tg-blue px-5 py-2.5 font-medium text-white hover:bg-tg-blue-dark"
        >
          Reload
        </button>
      </div>
    );
  }

  if (status === 'awaiting_login') return <LoginPanel />;

  // authorized
  if (account?.isBot) return <BotDashboard />;
  return <MainLayout />;
}
