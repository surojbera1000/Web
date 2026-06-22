import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ChatSummary } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import {
  BackIcon,
  MoreIcon,
  MuteIcon,
  PinIcon,
  SearchIcon,
  UsersIcon,
} from '@/components/common/Icon';
import { cn } from '@/lib/utils';
import { useChat } from '@/context/ChatContext';

interface ChatHeaderProps {
  summary: ChatSummary;
  statusText: string;
  statusActive: boolean;
  isGroup: boolean;
  onBack: () => void;
  onOpenInfo: () => void;
  onToggleSearch: () => void;
}

export function ChatHeader({
  summary,
  statusText,
  statusActive,
  isGroup,
  onBack,
  onOpenInfo,
  onToggleSearch,
}: ChatHeaderProps) {
  const { togglePinChat, toggleMuteChat } = useChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { chat, displayName, avatar, online } = summary;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="flex items-center gap-2 border-b border-black/5 bg-tg-panel-light px-2 py-2 dark:border-white/5 dark:bg-tg-panel-dark sm:px-4">
      <button
        onClick={onBack}
        className="rounded-full p-2 text-tg-text-secondary-light hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark md:hidden"
        aria-label="Back"
      >
        <BackIcon width={24} height={24} />
      </button>

      <button onClick={onOpenInfo} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar name={displayName} src={avatar} size={42} online={online} showStatus={!isGroup} />
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{displayName}</p>
          <p
            className={cn(
              'truncate text-sm leading-tight',
              statusActive
                ? 'text-tg-blue'
                : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark',
            )}
          >
            {statusText}
          </p>
        </div>
      </button>

      <button
        onClick={onToggleSearch}
        className="rounded-full p-2 text-tg-text-secondary-light hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
        aria-label="Search messages"
      >
        <SearchIcon width={22} height={22} />
      </button>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-full p-2 text-tg-text-secondary-light hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
          aria-label="More"
        >
          <MoreIcon width={22} height={22} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-12 z-30 w-56 animate-fade-in overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel-dark dark:ring-white/10">
            <HeaderMenuItem
              icon={<UsersIcon width={19} height={19} />}
              label={isGroup ? 'Group Info' : 'Contact Info'}
              onClick={() => {
                onOpenInfo();
                setMenuOpen(false);
              }}
            />
            <HeaderMenuItem
              icon={<PinIcon width={19} height={19} />}
              label={chat.pinned ? 'Unpin from top' : 'Pin to top'}
              onClick={() => {
                void togglePinChat(chat.id);
                setMenuOpen(false);
              }}
            />
            <HeaderMenuItem
              icon={<MuteIcon width={19} height={19} />}
              label={chat.muted ? 'Unmute' : 'Mute'}
              onClick={() => {
                void toggleMuteChat(chat.id);
                setMenuOpen(false);
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}

function HeaderMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark"
    >
      <span className="text-tg-text-secondary-light dark:text-tg-text-secondary-dark">{icon}</span>
      {label}
    </button>
  );
}
