import { useEffect, useRef } from 'react';
import type { NormalizedMessage } from '@/lib/telegram/types';
import { formatDayDivider } from '@/lib/telegram/format';
import { MessageBubble } from './MessageBubble';

const GROUP_GAP = 5 * 60; // seconds

interface Props {
  messages: NormalizedMessage[];
  isGroup: boolean;
  typingNames: string[];
  onReply: (m: NormalizedMessage) => void;
  onEdit: (m: NormalizedMessage) => void;
  onDelete: (m: NormalizedMessage) => void;
  onForward: (m: NormalizedMessage) => void;
  onPressButton: (m: NormalizedMessage, data: string) => void;
}

export function MessageList({ messages, isGroup, typingNames, onReply, onEdit, onDelete, onForward, onPressButton }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 300;
    const grew = messages.length > prevLen.current;
    prevLen.current = messages.length;
    if (nearBottom || grew) {
      bottomRef.current?.scrollIntoView({ behavior: grew ? 'smooth' : 'auto' });
    }
  }, [messages.length, typingNames.length]);

  return (
    <div ref={scrollRef} className="tg-scroll chat-pattern flex-1 overflow-y-auto py-3">
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const newDay =
          !prev || new Date(prev.date * 1000).toDateString() !== new Date(m.date * 1000).toDateString();
        const sameNext =
          next && next.senderId === m.senderId && !next.service && next.date - m.date < GROUP_GAP &&
          new Date(next.date * 1000).toDateString() === new Date(m.date * 1000).toDateString();
        const samePrev =
          prev && prev.senderId === m.senderId && !prev.service && m.date - prev.date < GROUP_GAP && !newDay;

        return (
          <div key={`${m.id}-${i}`}>
            {newDay && !m.service && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-black/15 px-3 py-1 text-xs font-medium text-white dark:bg-white/10">
                  {formatDayDivider(m.date)}
                </span>
              </div>
            )}
            <MessageBubble
              message={m}
              isGroup={isGroup}
              showSenderName={isGroup && !m.out && !samePrev}
              isTail={!sameNext}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onForward={onForward}
              onPressButton={onPressButton}
            />
          </div>
        );
      })}

      {typingNames.length > 0 && (
        <div className="px-3 pb-2">
          <span className="inline-block rounded-2xl rounded-bl-md bg-tg-bubble-in-light px-4 py-2 text-sm text-tg-text-secondary-light shadow-sm dark:bg-tg-bubble-in dark:text-tg-text-secondary">
            typing…
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
