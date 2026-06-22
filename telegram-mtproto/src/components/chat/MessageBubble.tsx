import { useState, type MouseEvent } from 'react';
import type { NormalizedMessage } from '@/lib/telegram/types';
import { cn, formatTime } from '@/lib/telegram/format';
import { Ticks } from '@/components/common/Ticks';
import { EditIcon, ForwardIcon, ReplyIcon, TrashIcon } from '@/components/common/Icon';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { MessageMedia } from './MessageMedia';

interface Props {
  message: NormalizedMessage;
  isGroup: boolean;
  showSenderName: boolean;
  isTail: boolean;
  onReply: (m: NormalizedMessage) => void;
  onEdit: (m: NormalizedMessage) => void;
  onDelete: (m: NormalizedMessage) => void;
  onForward: (m: NormalizedMessage) => void;
  onPressButton: (m: NormalizedMessage, dataBase64: string) => void;
}

export function MessageBubble({
  message,
  isGroup,
  showSenderName,
  isTail,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onPressButton,
}: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const isOwn = message.out;

  if (message.service) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-white dark:bg-white/15">{message.text}</span>
      </div>
    );
  }

  function openMenu(e: MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const items: MenuItem[] = [
    { label: 'Reply', icon: <ReplyIcon width={18} height={18} />, onClick: () => onReply(message) },
    { label: 'Forward', icon: <ForwardIcon width={18} height={18} />, onClick: () => onForward(message) },
    ...(isOwn && message.text
      ? [{ label: 'Edit', icon: <EditIcon width={18} height={18} />, onClick: () => onEdit(message) }]
      : []),
    ...(message.text
      ? [{ label: 'Copy Text', onClick: () => void navigator.clipboard?.writeText(message.text) }]
      : []),
    { label: 'Delete', icon: <TrashIcon width={18} height={18} />, danger: true, onClick: () => onDelete(message) },
  ];

  return (
    <div className={cn('group flex px-3', isTail ? 'mb-2' : 'mb-0.5', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[78%] flex-col', isOwn ? 'items-end' : 'items-start')}>
        <div
          onContextMenu={openMenu}
          className={cn(
            'animate-message-in relative cursor-default px-3 py-1.5 text-[15px] leading-snug shadow-sm',
            isOwn ? 'bg-tg-bubble-out-light dark:bg-tg-bubble-out' : 'bg-tg-bubble-in-light dark:bg-tg-bubble-in',
            'rounded-2xl',
            isTail && (isOwn ? 'rounded-br-md' : 'rounded-bl-md'),
          )}
        >
          {showSenderName && !isOwn && (
            <p className="mb-0.5 text-sm font-medium text-tg-blue dark:text-[#6ab7ff]">{message.senderName ?? 'Unknown'}</p>
          )}

          {message.forwardedFrom && (
            <div className="mb-1 text-xs">
              <p className="text-tg-text-secondary-light dark:text-tg-text-secondary">Forwarded from</p>
              <p className="font-medium text-tg-blue dark:text-[#6ab7ff]">{message.forwardedFrom}</p>
            </div>
          )}

          {message.media && (
            <div className={cn(message.text ? 'mb-1.5' : '')}>
              <MessageMedia message={message} outgoing={isOwn} />
            </div>
          )}

          {message.text && <span className="whitespace-pre-wrap break-words">{message.text}</span>}

          <span className="float-right ml-2 mt-1 inline-flex translate-y-0.5 items-center gap-1">
            <span className={cn('text-[11px]', isOwn ? 'text-black/45 dark:text-white/55' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
              {message.editDate ? 'edited ' : ''}
              {formatTime(message.date)}
            </span>
            {isOwn && <Ticks state={message.tick} size={15} />}
          </span>
        </div>

        {/* Inline keyboard (bot messages) */}
        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-1 w-full max-w-sm space-y-1">
            {message.buttons.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.map((b, bi) => (
                  <button
                    key={bi}
                    onClick={() => {
                      if (b.kind === 'url' && b.url) window.open(b.url, '_blank', 'noreferrer');
                      else if (b.kind === 'callback' && b.data) onPressButton(message, b.data);
                    }}
                    className="flex-1 rounded-lg bg-black/10 px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    {b.text}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={() => setMenu(null)} />}
    </div>
  );
}
