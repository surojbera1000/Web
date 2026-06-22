import { useEffect, useState } from 'react';
import type { NormalizedDialog, NormalizedMessage } from '@/lib/telegram/types';
import { useMessages } from '@/hooks/useMessages';
import { useAvatar } from '@/hooks/useAvatar';
import { Avatar } from '@/components/common/Avatar';
import { Spinner } from '@/components/common/Spinner';
import { BackIcon, CloseIcon, ReplyIcon } from '@/components/common/Icon';
import { cn } from '@/lib/telegram/format';
import { MessageList } from './MessageList';
import { Composer } from './Composer';

export function ChatView({ dialog, onBack }: { dialog: NormalizedDialog; onBack: () => void }) {
  const { messages, loading, error, send } = useMessages(dialog.id);
  const avatar = useAvatar(dialog.id);
  const [replyTo, setReplyTo] = useState<NormalizedMessage | null>(null);

  useEffect(() => setReplyTo(null), [dialog.id]);

  const isGroup = dialog.entity.kind === 'group' || dialog.entity.kind === 'channel';
  let status = '';
  if (dialog.entity.kind === 'user' || dialog.entity.kind === 'bot') status = dialog.entity.lastSeenLabel ?? '';
  else if (dialog.entity.kind === 'channel') status = 'channel';
  else status = 'group';

  function handleSend(text: string) {
    void send(text, replyTo?.id);
    setReplyTo(null);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-black/5 bg-tg-panel-light px-2 py-2 dark:border-tg-divider dark:bg-tg-panel sm:px-4">
        <button onClick={onBack} className="rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5 md:hidden" aria-label="Back">
          <BackIcon width={24} height={24} />
        </button>
        <Avatar name={dialog.entity.title} src={avatar} size={42} online={dialog.entity.online} showStatus={dialog.entity.kind === 'user'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{dialog.entity.title}</p>
          <p className={cn('truncate text-sm leading-tight', dialog.entity.online ? 'text-tg-blue' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
            {status}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="chat-pattern flex flex-1 items-center justify-center">
          <Spinner size={26} className="text-tg-blue" />
        </div>
      ) : error ? (
        <div className="chat-pattern flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <MessageList messages={messages} isGroup={isGroup} onReply={setReplyTo} />
      )}

      {replyTo && (
        <div className="flex items-center gap-3 border-t border-black/5 bg-tg-panel-light px-4 py-2 dark:border-tg-divider dark:bg-tg-panel">
          <ReplyIcon width={20} height={20} className="shrink-0 text-tg-blue" />
          <div className="min-w-0 flex-1 border-l-2 border-tg-blue pl-2">
            <p className="text-xs font-medium text-tg-blue">Reply to {replyTo.senderName ?? (replyTo.out ? 'yourself' : dialog.entity.title)}</p>
            <p className="truncate text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">{replyTo.text || 'media'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      )}

      <Composer onSendText={handleSend} />
    </div>
  );
}
