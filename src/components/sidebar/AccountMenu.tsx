import { useEffect, useRef, type ReactNode } from 'react';
import { useTelegram } from '@/context/TelegramContext';
import { useTheme } from '@/context/ThemeContext';
import { Avatar } from '@/components/common/Avatar';
import { BotIcon, LogoutIcon, MoonIcon, PlusIcon, SunIcon } from '@/components/common/Icon';

export function AccountMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { account, accounts, switchAccount, beginAddAccount, logout } = useTelegram();
  const { theme, toggleTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-3 top-14 z-30 w-72 origin-top-left animate-fade-in overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel dark:ring-white/10"
    >
      {accounts.map((acc) => (
        <button
          key={acc.id}
          onClick={() => {
            if (acc.id !== account?.id) void switchAccount(acc.id);
            onClose();
          }}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
            acc.id === account?.id ? 'bg-black/5 dark:bg-white/5' : ''
          }`}
        >
          <Avatar name={acc.label} src={acc.avatar} size={36} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-medium">
              {acc.type === 'bot' && <BotIcon width={14} height={14} className="opacity-70" />}
              {acc.label}
            </p>
            <p className="truncate text-xs text-tg-text-secondary-light dark:text-tg-text-secondary">
              {acc.type === 'bot' ? 'Bot account' : 'User account'}
            </p>
          </div>
          {acc.id === account?.id && <span className="h-2 w-2 rounded-full bg-tg-blue" />}
        </button>
      ))}

      <div className="my-1 h-px bg-black/5 dark:bg-white/10" />

      <MenuItem icon={<PlusIcon width={20} height={20} />} label="Add account" onClick={() => { beginAddAccount(); onClose(); }} />
      <MenuItem
        icon={theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
        label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        onClick={toggleTheme}
      />
      <MenuItem icon={<LogoutIcon width={20} height={20} />} label="Log out" danger onClick={() => { void logout(); onClose(); }} />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${danger ? 'text-red-500' : ''}`}
    >
      <span className={danger ? 'text-red-500' : 'text-tg-text-secondary-light dark:text-tg-text-secondary'}>{icon}</span>
      {label}
    </button>
  );
}
