import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Chat, ID, Message, User } from '@/types';
import { cn, formatDayDivider } from '@/lib/utils';
import { Avatar } from '@/components/common/Avatar';
import { MessageBubble } from './MessageBubble';
import { TypingDots } from './TypingDots';

interface MessageListProps {
  chat: Chat;
  messages: Message[];
  typingUserIds: ID[];
  usersById: Record<ID, User>;
  currentUserId: ID;
  onReply: (message: Message) => void;
  onForward: (message: Message) => void;
  onTogglePin: (message: Message) => void;
  onDelete: (message: Message) => void;
}

export interface MessageListHandle {
  jumpTo: (messageId: string) => void;
}

const GROUP_GAP_MS = 5 * 60 * 1000;

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(function MessageList(
  {
    chat,
    messages,
    typingUserIds,
    usersById,
    currentUserId,
    onReply,
    onForward,
    onTogglePin,
    onDelete,
  },
  ref,
) {
  const isGroup = chat.type === 'group';
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Auto-scroll to the newest message when the count grows or the chat changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 250;
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUserIds.length]);

  const jumpTo = useCallback((messageId: string) => {
    const node = itemRefs.current.get(messageId);
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(messageId);
    window.setTimeout(() => setHighlightId(null), 1500);
  }, []);

  useImperativeHandle(ref, () => ({ jumpTo }), [jumpTo]);

  const typingUsers = typingUserIds
    .filter((id) => id !== currentUserId)
    .map((id) => usersById[id])
    .filter(Boolean) as User[];

  return (
    <div ref={scrollRef} className="tg-scroll chat-pattern flex-1 overflow-y-auto py-3">
      {messages.map((message, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const isOwn = message.senderId === currentUserId;
        const sender = usersById[message.senderId];

        const newDay =
          !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();

        const sameSenderAsPrev =
          prev && prev.senderId === message.senderId && prev.type !== 'system' &&
          message.createdAt - prev.createdAt < GROUP_GAP_MS && !newDay;

        const sameSenderAsNext =
          next && next.senderId === message.senderId && next.type !== 'system' &&
          next.createdAt - message.createdAt < GROUP_GAP_MS &&
          new Date(next.createdAt).toDateString() === new Date(message.createdAt).toDateString();

        const isTail = !sameSenderAsNext;
        const showSenderName = isGroup && !isOwn && !sameSenderAsPrev;

        return (
          <div key={message.id}>
            {newDay && message.type !== 'system' && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-black/15 px-3 py-1 text-xs font-medium text-white dark:bg-white/10">
                  {formatDayDivider(message.createdAt)}
                </span>
              </div>
            )}
            <div
              ref={(node) => {
                if (node) itemRefs.current.set(message.id, node);
                else itemRefs.current.delete(message.id);
              }}
              className={cn(
                'transition-colors duration-700',
                highlightId === message.id && 'rounded-lg bg-tg-blue/15',
              )}
            >
              <MessageBubble
                message={message}
                isOwn={isOwn}
                isGroup={isGroup}
                sender={sender}
                showSenderName={showSenderName}
                isTail={isTail}
                isPinned={chat.pinnedMessageIds.includes(message.id)}
                onReply={onReply}
                onForward={onForward}
                onTogglePin={onTogglePin}
                onDelete={onDelete}
                onJumpTo={jumpTo}
              />
            </div>
          </div>
        );
      })}

      {typingUsers.length > 0 && (
        <div className="flex items-end gap-2 px-3 pb-2">
          {isGroup && (
            <div className="w-8 shrink-0">
              <Avatar name={typingUsers[0].name} src={typingUsers[0].avatar} size={32} />
            </div>
          )}
          <div className="rounded-2xl rounded-bl-md bg-tg-bubble-in-light px-4 py-3 text-tg-text-secondary-light shadow-sm dark:bg-tg-bubble-in-dark dark:text-tg-text-secondary-dark">
            <TypingDots />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
});
