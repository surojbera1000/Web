import type { NormalizedDialog } from '@/lib/telegram/types';
import { Avatar } from '@/components/common/Avatar';
import { Ticks } from '@/components/common/Ticks';
import { BotIcon, PinIcon, VerifiedIcon } from '@/components/common/Icon';
import { cn, formatDialogTime } from '@/lib/telegram/format';
import { useAvatar } from '@/hooks/useAvatar';

export function DialogItem({
  dialog,
  active,
  onClick,
}: {
  dialog: NormalizedDialog;
  active: boolean;
  onClick: () => void;
}) {
  const avatar = useAvatar(dialog.id);
  const { entity, unreadCount, lastMessageText, lastMessageOut, lastMessageTick } = dialog;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        active ? 'bg-tg-active text-white' : 'hover:bg-black/5 dark:hover:bg-white/5',
      )}
    >
      <Avatar name={entity.title} src={avatar} size={52} online={entity.online} showStatus={entity.kind === 'user'} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {entity.kind === 'bot' && <BotIcon width={15} height={15} className="shrink-0 opacity-70" />}
            <span className="truncate font-medium">{entity.title}</span>
            {entity.verified && <VerifiedIcon width={15} height={15} className="shrink-0" />}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {lastMessageOut && <Ticks state={lastMessageTick} size={15} />}
            <span className={cn('text-xs', active ? 'text-white/70' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
              {formatDialogTime(dialog.date)}
            </span>
          </div>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm', active ? 'text-white/80' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
            {lastMessageText || 'No messages yet'}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {dialog.pinned && unreadCount === 0 && (
              <PinIcon width={15} height={15} className={active ? 'text-white/70' : 'text-tg-text-secondary-light dark:text-tg-text-secondary'} />
            )}
            {unreadCount > 0 && (
              <span className={cn('flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium text-white', dialog.muted ? 'bg-gray-400 dark:bg-gray-500' : 'bg-tg-blue')}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
