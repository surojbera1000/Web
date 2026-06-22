import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { isMockBackend } from '@/services';
import {
  LogoutIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UsersIcon,
} from '@/components/common/Icon';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onNewGroup: () => void;
  onOpenProfile: () => void;
}

export function SideMenu({ open, onClose, onNewGroup, onOpenProfile }: SideMenuProps) {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute left-3 top-14 z-30 w-60 origin-top-left animate-fade-in overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel-dark dark:ring-white/10"
    >
      <MenuItem
        icon={<UsersIcon width={20} height={20} />}
        label="New Group"
        onClick={() => {
          onNewGroup();
          onClose();
        }}
      />
      <MenuItem
        icon={<SettingsIcon width={20} height={20} />}
        label="My Profile"
        onClick={() => {
          onOpenProfile();
          onClose();
        }}
      />
      <MenuItem
        icon={theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
        label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        onClick={toggleTheme}
      />
      <div className="my-1 h-px bg-black/5 dark:bg-white/10" />
      <MenuItem
        icon={<LogoutIcon width={20} height={20} />}
        label="Log Out"
        danger
        onClick={() => {
          void signOut();
          onClose();
        }}
      />
      {isMockBackend && (
        <p className="px-4 pb-1 pt-2 text-[11px] leading-tight text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
          Demo mode · data stored locally
        </p>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark ${
        danger ? 'text-red-500' : ''
      }`}
    >
      <span className={danger ? 'text-red-500' : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark'}>
        {icon}
      </span>
      {label}
    </button>
  );
}
