import type { ChatSummary } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import {
  CheckDoubleIcon,
  CheckIcon,
  MuteIcon,
  PinIcon,
} from '@/components/common/Icon';
import { cn, formatChatListTime } from '@/lib/utils';
import { messagePreview } from '@/lib/messagePreview';
import { useChat } from '@/context/ChatContext';

interface ChatListItemProps {
  summary: ChatSummary;
  active: boolean;
  onClick: () => void;
}

export function ChatListItem({ summary, active, onClick }: ChatListItemProps) {
  const { currentUser, usersById } = useChat();
  const { chat, displayName, avatar, online, lastMessage, unreadCount, typingMemberIds } = summary;

  const isOwnLast = lastMessage?.senderId === currentUser.id;
  const showTyping = typingMemberIds.length > 0;

  // For group chats, prefix the sender's first name on the last message.
  let preview = messagePreview(lastMessage);
  if (chat.type === 'group' && lastMessage && lastMessage.type !== 'system') {
    const senderName = isOwnLast
      ? 'You'
      : usersById[lastMessage.senderId]?.name.split(' ')[0] ?? 'Someone';
    preview = `${senderName}: ${preview}`;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        active
          ? 'bg-tg-active-light dark:bg-tg-active-dark'
          : 'hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark',
      )}
    >
      <Avatar name={displayName} src={avatar} size={52} online={online} showStatus />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <span
              className={cn(
                'truncate font-medium',
                active ? 'text-black dark:text-white' : 'text-black dark:text-white',
              )}
            >
              {displayName}
            </span>
            {chat.muted && (
              <MuteIcon
                width={15}
                height={15}
                className="shrink-0 text-tg-text-secondary-light dark:text-tg-text-secondary-dark"
              />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isOwnLast && lastMessage && !showTyping && (
              <StatusTick read={lastMessage.status === 'read'} delivered={lastMessage.status !== 'sending'} />
            )}
            <span
              className={cn(
                'text-xs',
                active
                  ? 'text-black/60 dark:text-white/60'
                  : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark',
              )}
            >
              {lastMessage ? formatChatListTime(lastMessage.createdAt) : ''}
            </span>
          </div>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm',
              showTyping
                ? 'text-tg-blue'
                : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark',
            )}
          >
            {showTyping ? 'typing…' : preview || 'No messages yet'}
          </span>

          <div className="flex shrink-0 items-center gap-1">
            {chat.pinned && unreadCount === 0 && (
              <PinIcon
                width={15}
                height={15}
                className="text-tg-text-secondary-light dark:text-tg-text-secondary-dark"
              />
            )}
            {unreadCount > 0 && (
              <span
                className={cn(
                  'flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium text-white',
                  chat.muted ? 'bg-gray-400 dark:bg-gray-500' : 'bg-tg-blue',
                )}
              >
                {unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusTick({ read, delivered }: { read: boolean; delivered: boolean }) {
  const color = read ? 'text-tg-blue' : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark';
  if (!delivered) {
    return <CheckIcon width={15} height={15} className="text-tg-text-secondary-light opacity-50 dark:text-tg-text-secondary-dark" />;
  }
  return read ? (
    <CheckDoubleIcon width={16} height={16} className={color} />
  ) : (
    <CheckDoubleIcon width={16} height={16} className="text-tg-text-secondary-light dark:text-tg-text-secondary-dark" />
  );
}
