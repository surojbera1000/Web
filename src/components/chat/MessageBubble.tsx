import { useState, type MouseEvent } from 'react';
import type { Message, User } from '@/types';
import {
  CheckDoubleIcon,
  CheckIcon,
  ForwardIcon,
  PinIcon,
  ReplyIcon,
  TrashIcon,
} from '@/components/common/Icon';
import { Avatar } from '@/components/common/Avatar';
import { avatarGradient, cn, formatTime } from '@/lib/utils';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { FileAttachment, ImageAttachment, VoiceMessage } from './MessageAttachments';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isGroup: boolean;
  sender?: User;
  showSenderName: boolean;
  isTail: boolean;
  isPinned: boolean;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onTogglePin: (message: Message) => void;
  onDelete: (message: Message) => void;
  onJumpTo: (messageId: string) => void;
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\uFE0F|\u200D|\s){1,8}$/u;

export function MessageBubble({
  message,
  isOwn,
  isGroup,
  sender,
  showSenderName,
  isTail,
  isPinned,
  onReply,
  onForward,
  onTogglePin,
  onDelete,
  onJumpTo,
}: MessageBubbleProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  if (message.type === 'system') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-black/20 px-3 py-1 text-xs text-white dark:bg-white/15">
          {message.text}
        </span>
      </div>
    );
  }

  const isEmojiOnly = message.type === 'text' && EMOJI_ONLY.test(message.text.trim());

  function openMenu(e: MouseEvent) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }

  const menuItems: MenuItem[] = [
    { label: 'Reply', icon: <ReplyIcon width={18} height={18} />, onClick: () => onReply(message) },
    { label: 'Forward', icon: <ForwardIcon width={18} height={18} />, onClick: () => onForward(message) },
    {
      label: isPinned ? 'Unpin' : 'Pin',
      icon: <PinIcon width={18} height={18} />,
      onClick: () => onTogglePin(message),
    },
    ...(message.type === 'text'
      ? [
          {
            label: 'Copy Text',
            icon: <CopyGlyph />,
            onClick: () => void navigator.clipboard?.writeText(message.text),
          },
        ]
      : []),
    {
      label: 'Delete',
      icon: <TrashIcon width={18} height={18} />,
      danger: true,
      onClick: () => onDelete(message),
    },
  ];

  const senderColor = avatarGradient(sender?.name ?? message.senderId);

  return (
    <div
      className={cn('group flex items-end gap-2 px-3', isTail ? 'mb-2' : 'mb-0.5', isOwn ? 'justify-end' : 'justify-start')}
    >
      {/* Avatar gutter for incoming group messages (only on the tail). */}
      {isGroup && !isOwn && (
        <div className="w-8 shrink-0 self-end">
          {isTail && <Avatar name={sender?.name ?? '?'} src={sender?.avatar} size={32} />}
        </div>
      )}

      <div className={cn('flex max-w-[75%] flex-col', isOwn ? 'items-end' : 'items-start')}>
        {isEmojiOnly ? (
          <div
            onContextMenu={openMenu}
            className="animate-message-in cursor-default text-5xl leading-none"
          >
            {message.text}
            <div className={cn('mt-1 flex items-center gap-1', isOwn ? 'justify-end' : 'justify-start')}>
              <MetaRow message={message} isOwn={isOwn} muted />
            </div>
          </div>
        ) : (
          <div
            onContextMenu={openMenu}
            className={cn(
              'animate-message-in relative cursor-default px-3 py-2 text-[15px] leading-snug shadow-sm',
              isOwn
                ? 'bg-tg-bubble-out-light text-black dark:bg-tg-bubble-out-dark dark:text-white'
                : 'bg-tg-bubble-in-light text-black dark:bg-tg-bubble-in-dark dark:text-white',
              'rounded-2xl',
              isTail && (isOwn ? 'rounded-br-md' : 'rounded-bl-md'),
            )}
          >
            {showSenderName && !isOwn && (
              <p className={cn('mb-0.5 bg-gradient-to-br bg-clip-text text-sm font-medium text-transparent', senderColor)}>
                {sender?.name ?? 'Unknown'}
              </p>
            )}

            {message.forwardedFrom && (
              <div className="mb-1 text-xs">
                <p className="text-tg-text-secondary-light dark:text-tg-text-secondary-dark">Forwarded from</p>
                <p className="font-medium text-tg-blue">{message.forwardedFrom.originalAuthorName}</p>
              </div>
            )}

            {message.replyTo && (
              <button
                onClick={() => onJumpTo(message.replyTo!.messageId)}
                className="mb-1.5 flex w-full flex-col rounded-md border-l-2 border-tg-blue bg-black/5 px-2 py-1 text-left dark:bg-white/10"
              >
                <span className="text-xs font-medium text-tg-blue">{message.replyTo.authorName}</span>
                <span className="truncate text-xs text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
                  {message.replyTo.snippet}
                </span>
              </button>
            )}

            {message.type === 'image' && message.attachment && (
              <div className={cn(message.text ? 'mb-1.5' : '')}>
                <ImageAttachment attachment={message.attachment} />
              </div>
            )}
            {message.type === 'file' && message.attachment && (
              <FileAttachment attachment={message.attachment} outgoing={isOwn} />
            )}
            {message.type === 'voice' && message.attachment && (
              <VoiceMessage attachment={message.attachment} outgoing={isOwn} />
            )}

            {message.text && message.type !== 'voice' && (
              <span className="whitespace-pre-wrap break-words">{message.text}</span>
            )}

            <span className="float-right ml-2 mt-1 inline-flex translate-y-0.5 items-center gap-1">
              <MetaRow message={message} isOwn={isOwn} />
            </span>
          </div>
        )}
      </div>

      {/* Hover action: quick reply */}
      <button
        onClick={() => onReply(message)}
        className={cn(
          'mb-1 self-end rounded-full p-1.5 text-tg-text-secondary-light opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:text-tg-text-secondary-dark dark:hover:bg-white/10',
          isOwn ? 'order-first' : '',
        )}
        aria-label="Reply"
      >
        <ReplyIcon width={16} height={16} />
      </button>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
}

function MetaRow({ message, isOwn, muted = false }: { message: Message; isOwn: boolean; muted?: boolean }) {
  return (
    <>
      <span
        className={cn(
          'text-[11px]',
          muted
            ? 'rounded-full bg-black/30 px-1.5 py-0.5 text-white'
            : isOwn
              ? 'text-black/45 dark:text-white/55'
              : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark',
        )}
      >
        {message.edited ? 'edited ' : ''}
        {formatTime(message.createdAt)}
      </span>
      {isOwn && !muted && <StatusTicks status={message.status} />}
    </>
  );
}

function StatusTicks({ status }: { status: Message['status'] }) {
  if (status === 'sending') {
    return <CheckIcon width={15} height={15} className="text-black/40 dark:text-white/50" />;
  }
  if (status === 'sent') {
    return <CheckIcon width={15} height={15} className="text-black/45 dark:text-white/60" />;
  }
  const read = status === 'read';
  return (
    <CheckDoubleIcon
      width={16}
      height={16}
      className={read ? 'text-tg-blue dark:text-tg-send' : 'text-black/45 dark:text-white/60'}
    />
  );
}

function CopyGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
