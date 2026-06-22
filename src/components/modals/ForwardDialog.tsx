import { useMemo, useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { ForwardIcon, SearchIcon } from '@/components/common/Icon';

export function ForwardDialog() {
  const { forwarding, cancelForward, completeForward, summaries } = useChat();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter((s) => s.displayName.toLowerCase().includes(q));
  }, [summaries, query]);

  const open = forwarding !== null;
  const count = forwarding?.messageIds.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={cancelForward}
      title={`Forward ${count} message${count !== 1 ? 's' : ''}`}
    >
      <div className="px-5 py-4">
        <div className="relative">
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tg-text-secondary-light dark:text-tg-text-secondary-dark"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Forward to…"
            className="w-full rounded-full bg-tg-hover-light py-2.5 pl-10 pr-3 text-sm outline-none dark:bg-tg-hover-dark"
          />
        </div>
      </div>

      <div className="pb-2">
        {filtered.map((s) => (
          <button
            key={s.chat.id}
            onClick={() => void completeForward(s.chat.id)}
            className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark"
          >
            <Avatar name={s.displayName} src={s.avatar} size={46} online={s.online} showStatus={s.chat.type === 'private'} />
            <span className="flex-1 truncate font-medium">{s.displayName}</span>
            <ForwardIcon width={20} height={20} className="text-tg-text-secondary-light dark:text-tg-text-secondary-dark" />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
            No chats found
          </p>
        )}
      </div>
    </Modal>
  );
}
