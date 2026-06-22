import { useMemo, useState } from 'react';
import { useDialogs } from '@/hooks/useDialogs';
import { Avatar } from '@/components/common/Avatar';
import { CloseIcon, ForwardIcon, SearchIcon } from '@/components/common/Icon';

export function ForwardModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (chatId: string) => void }) {
  const { dialogs } = useDialogs();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dialogs;
    return dialogs.filter((d) => d.entity.title.toLowerCase().includes(q));
  }, [dialogs, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-message-in dark:bg-tg-panel">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5">
          <h2 className="text-lg font-semibold">Forward to…</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5">
            <CloseIcon width={20} height={20} />
          </button>
        </div>
        <div className="px-5 py-3">
          <div className="relative">
            <SearchIcon width={18} height={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tg-text-secondary-light dark:text-tg-text-secondary" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-full bg-black/5 py-2.5 pl-10 pr-3 text-sm outline-none dark:bg-white/5" />
          </div>
        </div>
        <div className="tg-scroll flex-1 overflow-y-auto pb-2">
          {filtered.map((d) => (
            <button key={d.id} onClick={() => onPick(d.id)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5">
              <Avatar name={d.entity.title} size={44} online={d.entity.online} showStatus={d.entity.kind === 'user'} />
              <span className="flex-1 truncate font-medium">{d.entity.title}</span>
              <ForwardIcon width={20} height={20} className="text-tg-text-secondary-light dark:text-tg-text-secondary" />
            </button>
          ))}
          {filtered.length === 0 && <p className="px-5 py-6 text-center text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">No chats found</p>}
        </div>
      </div>
    </div>
  );
}
