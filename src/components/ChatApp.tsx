import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { cn } from '@/lib/utils';
import { Sidebar } from './sidebar/Sidebar';
import { ChatWindow } from './chat/ChatWindow';
import { EmptyState } from './chat/EmptyState';
import { NewGroupModal } from './modals/NewGroupModal';
import { ProfileModal } from './modals/ProfileModal';
import { ForwardDialog } from './modals/ForwardDialog';
import { InfoPanel } from './modals/InfoPanel';

export function ChatApp() {
  const { activeChatId, closeChat } = useChat();
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar: full width on mobile, fixed column on desktop. */}
      <div
        className={cn(
          'h-full w-full shrink-0 border-r border-black/5 dark:border-white/5 md:flex md:w-[26rem] lg:w-[28rem]',
          activeChatId ? 'hidden md:block' : 'block',
        )}
      >
        <Sidebar onNewGroup={() => setNewGroupOpen(true)} onOpenProfile={() => setProfileOpen(true)} />
      </div>

      {/* Conversation pane. */}
      <div className={cn('h-full flex-1', activeChatId ? 'block' : 'hidden md:block')}>
        {activeChatId ? (
          <ChatWindow onBack={closeChat} onOpenInfo={() => setInfoOpen(true)} />
        ) : (
          <EmptyState />
        )}
      </div>

      <NewGroupModal open={newGroupOpen} onClose={() => setNewGroupOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <InfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} />
      <ForwardDialog />
    </div>
  );
}
