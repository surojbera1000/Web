import { useMemo, useState } from 'react';
import type { Chat, ID, Message, User } from '@/types';
import { CloseIcon, PinIcon } from '@/components/common/Icon';
import { messagePreview } from '@/lib/messagePreview';

interface PinnedBarProps {
  chat: Chat;
  messages: Message[];
  usersById: Record<ID, User>;
  currentUserId: ID;
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export function PinnedBar({
  chat,
  messages,
  usersById,
  currentUserId,
  onJump,
  onUnpin,
}: PinnedBarProps) {
  const pinned = useMemo(
    () =>
      chat.pinnedMessageIds
        .map((id) => messages.find((m) => m.id === id))
        .filter(Boolean) as Message[],
    [chat.pinnedMessageIds, messages],
  );
  const [index, setIndex] = useState(0);

  if (pinned.length === 0) return null;

  const safeIndex = index % pinned.length;
  const current = pinned[safeIndex];
  const author =
    current.senderId === currentUserId
      ? 'You'
      : usersById[current.senderId]?.name ?? 'Unknown';

  return (
    <div className="flex items-center gap-3 border-b border-black/5 bg-tg-panel-light px-3 py-2 dark:border-white/5 dark:bg-tg-panel-dark">
      <button
        onClick={() => {
          onJump(current.id);
          if (pinned.length > 1) setIndex((i) => i + 1);
        }}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <PinIcon width={18} height={18} className="shrink-0 text-tg-blue" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-tg-blue">
            Pinned Message{pinned.length > 1 ? ` ${safeIndex + 1}/${pinned.length}` : ''}
          </p>
          <p className="truncate text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
            <span className="font-medium">{author}: </span>
            {messagePreview(current)}
          </p>
        </div>
      </button>
      <button
        onClick={() => onUnpin(current.id)}
        className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
        aria-label="Unpin"
      >
        <CloseIcon width={18} height={18} />
      </button>
    </div>
  );
}
