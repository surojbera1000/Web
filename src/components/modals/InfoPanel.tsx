import type { ReactNode } from 'react';
import { useChat } from '@/context/ChatContext';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { PhoneIcon, UsersIcon } from '@/components/common/Icon';
import { formatLastSeen } from '@/lib/utils';

interface InfoPanelProps {
  open: boolean;
  onClose: () => void;
}

export function InfoPanel({ open, onClose }: InfoPanelProps) {
  const { activeChat, activeSummary, activePeer, activeMembers, currentUser } = useChat();

  if (!activeChat || !activeSummary) return null;
  const isGroup = activeChat.type === 'group';

  return (
    <Modal open={open} onClose={onClose} title={isGroup ? 'Group Info' : 'Contact Info'}>
      <div className="flex flex-col items-center px-5 py-6 text-center">
        <Avatar
          name={activeSummary.displayName}
          src={activeSummary.avatar}
          size={96}
          online={activeSummary.online}
          showStatus={!isGroup}
        />
        <h3 className="mt-4 text-xl font-semibold">{activeSummary.displayName}</h3>
        {isGroup ? (
          <p className="text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
            {activeMembers.length} members
          </p>
        ) : (
          <p className="text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
            {activePeer ? formatLastSeen(activePeer.online, activePeer.lastSeen) : ''}
          </p>
        )}
      </div>

      {!isGroup && activePeer && (
        <div className="px-5 pb-5">
          {activePeer.bio && (
            <InfoRow icon={<UsersIcon width={20} height={20} />} value={activePeer.bio} label="Bio" />
          )}
          <InfoRow icon={<PhoneIcon width={20} height={20} />} value={activePeer.phone} label="Phone" />
        </div>
      )}

      {isGroup && (
        <div className="pb-3">
          {activeChat.about && (
            <p className="px-5 pb-3 text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
              {activeChat.about}
            </p>
          )}
          <p className="px-5 py-1 text-xs font-semibold uppercase text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
            {activeMembers.length} Members
          </p>
          {activeMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-2">
              <Avatar name={m.name} src={m.avatar} size={42} online={m.online} showStatus />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {m.id === currentUser.id ? 'You' : m.name}
                </p>
                <p className="truncate text-xs text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
                  {formatLastSeen(m.online, m.lastSeen)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function InfoRow({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl px-2 py-3">
      <span className="text-tg-text-secondary-light dark:text-tg-text-secondary-dark">{icon}</span>
      <div className="min-w-0">
        <p className="truncate">{value}</p>
        <p className="text-xs text-tg-text-secondary-light dark:text-tg-text-secondary-dark">{label}</p>
      </div>
    </div>
  );
}
