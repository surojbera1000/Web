import { useMemo, useState, type ReactNode } from 'react';
import { useChat } from '@/context/ChatContext';
import { Avatar } from '@/components/common/Avatar';
import { ComposeIcon, MenuIcon, UsersIcon } from '@/components/common/Icon';
import { formatLastSeen } from '@/lib/utils';
import { messagePreview } from '@/lib/messagePreview';
import { SearchBar } from './SearchBar';
import { SideMenu } from './SideMenu';
import { ChatListItem } from './ChatListItem';

interface SidebarProps {
  onNewGroup: () => void;
  onOpenProfile: () => void;
}

export function Sidebar({ onNewGroup, onOpenProfile }: SidebarProps) {
  const { summaries, contacts, activeChatId, openChat, openPrivateChat } = useChat();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const trimmed = query.trim().toLowerCase();

  const filteredChats = useMemo(() => {
    if (!trimmed) return summaries;
    return summaries.filter(
      (s) =>
        s.displayName.toLowerCase().includes(trimmed) ||
        messagePreview(s.lastMessage).toLowerCase().includes(trimmed),
    );
  }, [summaries, trimmed]);

  const matchedContacts = useMemo(() => {
    if (!trimmed) return [];
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(trimmed) || c.phone.toLowerCase().includes(trimmed),
    );
  }, [contacts, trimmed]);

  return (
    <aside className="relative flex h-full w-full flex-col bg-tg-sidebar-light dark:bg-tg-sidebar-dark">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-full p-2 text-tg-text-secondary-light transition-colors hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
          aria-label="Menu"
        >
          <MenuIcon width={22} height={22} />
        </button>
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <SideMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewGroup={onNewGroup}
        onOpenProfile={onOpenProfile}
      />

      {/* Body */}
      <div className="tg-scroll flex-1 overflow-y-auto">
        {trimmed ? (
          <SearchResults
            chats={filteredChats}
            contacts={matchedContacts}
            activeChatId={activeChatId}
            onOpenChat={(id) => {
              openChat(id);
              setQuery('');
            }}
            onOpenContact={(peerId) => {
              void openPrivateChat(peerId);
              setQuery('');
            }}
          />
        ) : (
          <div className="py-1">
            {summaries.length === 0 ? (
              <EmptyState />
            ) : (
              filteredChats.map((s) => (
                <ChatListItem
                  key={s.chat.id}
                  summary={s}
                  active={s.chat.id === activeChatId}
                  onClick={() => openChat(s.chat.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating compose button */}
      <div className="absolute bottom-5 right-5">
        {newChatOpen && (
          <NewChatPanel
            onClose={() => setNewChatOpen(false)}
            onNewGroup={() => {
              setNewChatOpen(false);
              onNewGroup();
            }}
            onPickContact={(peerId) => {
              void openPrivateChat(peerId);
              setNewChatOpen(false);
            }}
          />
        )}
        <button
          onClick={() => setNewChatOpen((v) => !v)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-tg-blue text-white shadow-lg transition-all hover:bg-tg-blue-dark active:scale-95"
          aria-label="New chat"
        >
          <ComposeIcon width={24} height={24} />
        </button>
      </div>
    </aside>
  );
}

function SearchResults({
  chats,
  contacts,
  activeChatId,
  onOpenChat,
  onOpenContact,
}: {
  chats: ReturnType<typeof useChat>['summaries'];
  contacts: ReturnType<typeof useChat>['contacts'];
  activeChatId: string | null;
  onOpenChat: (id: string) => void;
  onOpenContact: (peerId: string) => void;
}) {
  if (chats.length === 0 && contacts.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
        Nothing found
      </p>
    );
  }
  return (
    <div className="py-1">
      {chats.length > 0 && (
        <>
          <SectionLabel>Chats</SectionLabel>
          {chats.map((s) => (
            <ChatListItem
              key={s.chat.id}
              summary={s}
              active={s.chat.id === activeChatId}
              onClick={() => onOpenChat(s.chat.id)}
            />
          ))}
        </>
      )}
      {contacts.length > 0 && (
        <>
          <SectionLabel>Contacts</SectionLabel>
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpenContact(c.id)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark"
            >
              <Avatar name={c.name} src={c.avatar} size={46} online={c.online} showStatus />
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
                  {formatLastSeen(c.online, c.lastSeen)}
                </p>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

function NewChatPanel({
  onClose,
  onNewGroup,
  onPickContact,
}: {
  onClose: () => void;
  onNewGroup: () => void;
  onPickContact: (peerId: string) => void;
}) {
  const { contacts } = useChat();
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute bottom-16 right-0 z-20 max-h-[60vh] w-72 animate-fade-in overflow-y-auto rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel-dark dark:ring-white/10 tg-scroll">
        <button
          onClick={onNewGroup}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tg-blue text-white">
            <UsersIcon width={18} height={18} />
          </span>
          New Group
        </button>
        <div className="my-1 h-px bg-black/5 dark:bg-white/10" />
        <p className="px-4 py-1 text-xs font-medium uppercase text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
          Start a chat
        </p>
        {contacts.map((c) => (
          <button
            key={c.id}
            onClick={() => onPickContact(c.id)}
            className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark"
          >
            <Avatar name={c.name} src={c.avatar} size={36} online={c.online} showStatus />
            <span className="truncate text-sm">{c.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
      {children}
    </p>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
      <p className="text-sm">No chats yet.</p>
      <p className="mt-1 text-xs">Tap the compose button to start a conversation.</p>
    </div>
  );
}
