import { useMemo, useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { CheckIcon, SearchIcon, UsersIcon } from '@/components/common/Icon';
import { cn } from '@/lib/utils';

interface NewGroupModalProps {
  open: boolean;
  onClose: () => void;
}

export function NewGroupModal({ open, onClose }: NewGroupModalProps) {
  const { contacts, createGroup } = useChat();
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, query]);

  function reset() {
    setTitle('');
    setSelected(new Set());
    setQuery('');
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!title.trim() || selected.size === 0) return;
    setSubmitting(true);
    try {
      await createGroup(title.trim(), Array.from(selected));
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Group"
      footer={
        <button
          onClick={handleCreate}
          disabled={!title.trim() || selected.size === 0 || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-tg-blue py-3 font-medium text-white transition hover:bg-tg-blue-dark disabled:opacity-50"
        >
          <UsersIcon width={20} height={20} />
          Create Group{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
      }
    >
      <div className="px-5 py-4">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Group name"
          className="mb-3 w-full rounded-xl border border-gray-300 bg-transparent px-4 py-3 text-base outline-none focus:border-tg-blue dark:border-gray-600"
        />

        <div className="relative mb-1">
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tg-text-secondary-light dark:text-tg-text-secondary-dark"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add members"
            className="w-full rounded-full bg-tg-hover-light py-2.5 pl-10 pr-3 text-sm outline-none dark:bg-tg-hover-dark"
          />
        </div>
      </div>

      <div className="pb-2">
        {filtered.map((c) => {
          const checked = selected.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className="flex w-full items-center gap-3 px-5 py-2 text-left transition-colors hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark"
            >
              <div className="relative">
                <Avatar name={c.name} src={c.avatar} size={44} online={c.online} showStatus />
                {checked && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-tg-blue text-white dark:border-tg-panel-dark">
                    <CheckIcon width={12} height={12} />
                  </span>
                )}
              </div>
              <span className={cn('flex-1 truncate', checked && 'text-tg-blue')}>{c.name}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
            No contacts found
          </p>
        )}
      </div>
    </Modal>
  );
}
