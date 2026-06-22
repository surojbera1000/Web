import { useMemo, useState } from 'react';
import type { NormalizedDialog } from '@/lib/telegram/types';
import { useDialogs } from '@/hooks/useDialogs';
import { Spinner } from '@/components/common/Spinner';
import { ArchiveIcon, BackIcon, MenuIcon } from '@/components/common/Icon';
import { SearchBar } from './SearchBar';
import { AccountMenu } from './AccountMenu';
import { DialogItem } from './DialogItem';

export function Sidebar({
  activeChatId,
  onSelect,
}: {
  activeChatId: string | null;
  onSelect: (dialog: NormalizedDialog) => void;
}) {
  const { dialogs, loading, error } = useDialogs();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const trimmed = query.trim().toLowerCase();

  const { main, archived } = useMemo(() => {
    const m: NormalizedDialog[] = [];
    const a: NormalizedDialog[] = [];
    for (const d of dialogs) (d.archived ? a : m).push(d);
    return { main: m, archived: a };
  }, [dialogs]);

  const source = showArchived ? archived : main;
  const filtered = useMemo(() => {
    if (!trimmed) return source;
    return source.filter(
      (d) =>
        d.entity.title.toLowerCase().includes(trimmed) ||
        d.entity.username?.toLowerCase().includes(trimmed) ||
        d.lastMessageText.toLowerCase().includes(trimmed),
    );
  }, [source, trimmed]);

  return (
    <aside className="relative flex h-full w-full flex-col bg-tg-panel-light dark:bg-tg-panel">
      <div className="flex items-center gap-2 px-3 py-2">
        {showArchived ? (
          <button
            onClick={() => setShowArchived(false)}
            className="rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5"
            aria-label="Back"
          >
            <BackIcon width={22} height={22} />
          </button>
        ) : (
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5"
            aria-label="Menu"
          >
            <MenuIcon width={22} height={22} />
          </button>
        )}
        <SearchBar value={query} onChange={setQuery} placeholder={showArchived ? 'Search archived' : 'Search'} />
      </div>

      <AccountMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="tg-scroll flex-1 overflow-y-auto">
        {!showArchived && archived.length > 0 && !trimmed && (
          <button
            onClick={() => setShowArchived(true)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <span className="flex h-13 w-13 items-center justify-center" style={{ width: 52, height: 52 }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tg-text-secondary/30 text-tg-text-secondary-light dark:text-tg-text-secondary">
                <ArchiveIcon width={24} height={24} />
              </span>
            </span>
            <span className="flex-1 font-medium">Archived Chats</span>
            <span className="rounded-full bg-tg-text-secondary/40 px-2 text-xs text-white">{archived.length}</span>
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={26} className="text-tg-blue" />
          </div>
        ) : error ? (
          <p className="px-4 py-8 text-center text-sm text-red-500">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">
            {trimmed ? 'Nothing found' : showArchived ? 'No archived chats' : 'No chats yet'}
          </p>
        ) : (
          filtered.map((d) => (
            <DialogItem key={d.id} dialog={d} active={d.id === activeChatId} onClick={() => onSelect(d)} />
          ))
        )}
      </div>
    </aside>
  );
}
