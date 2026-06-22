import { useEffect, useState } from 'react';
import type { NormalizedDialog, NormalizedMessage } from '@/lib/telegram/types';
import { useTelegram } from '@/context/TelegramContext';
import { useMessages } from '@/hooks/useMessages';
import { useAvatar } from '@/hooks/useAvatar';
import { setTyping, pressCallbackButton } from '@/lib/telegram/messages';
import { Avatar } from '@/components/common/Avatar';
import { Spinner } from '@/components/common/Spinner';
import { BackIcon, CloseIcon, ReplyIcon } from '@/components/common/Icon';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ForwardModal } from './ForwardModal';
import { cn } from '@/lib/telegram/format';

export function ChatView({ dialog, onBack }: { dialog: NormalizedDialog; onBack: () => void }) {
  const { client } = useTelegram();
  const { messages, loading, typingNames, send, sendFile, edit, remove, forwardTo } = useMessages(dialog.id);
  const avatar = useAvatar(dialog.id);

  const [replyTo, setReplyTo] = useState<NormalizedMessage | null>(null);
  const [editing, setEditing] = useState<NormalizedMessage | null>(null);
  const [forwarding, setForwarding] = useState<NormalizedMessage | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setReplyTo(null);
    setEditing(null);
  }, [dialog.id]);

  const isGroup = dialog.entity.kind === 'group' || dialog.entity.kind === 'channel';

  let status = '';
  if (typingNames.length > 0) status = 'typing…';
  else if (dialog.entity.kind === 'user' || dialog.entity.kind === 'bot') status = dialog.entity.lastSeenLabel ?? '';
  else if (dialog.entity.kind === 'channel') status = 'channel';
  else status = 'group';

  function handleSend(text: string) {
    void send(text, replyTo?.id);
    setReplyTo(null);
  }

  function handleSaveEdit(text: string) {
    if (editing) void edit(editing.id, text);
    setEditing(null);
  }

  async function handlePressButton(m: NormalizedMessage, data: string) {
    if (!client) return;
    try {
      const answer = await pressCallbackButton(client, dialog.id, m.id, data);
      if (answer) {
        setToast(answer);
        window.setTimeout(() => setToast(null), 3000);
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-black/5 bg-tg-panel-light px-2 py-2 dark:border-tg-divider dark:bg-tg-panel sm:px-4">
        <button onClick={onBack} className="rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5 md:hidden" aria-label="Back">
          <BackIcon width={24} height={24} />
        </button>
        <Avatar name={dialog.entity.title} src={avatar} size={42} online={dialog.entity.online} showStatus={dialog.entity.kind === 'user'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{dialog.entity.title}</p>
          <p className={cn('truncate text-sm leading-tight', typingNames.length || dialog.entity.online ? 'text-tg-blue' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
            {status}
          </p>
        </div>
      </header>

      {/* Messages */}
      {loading ? (
        <div className="chat-pattern flex flex-1 items-center justify-center">
          <Spinner size={26} className="text-tg-blue" />
        </div>
      ) : (
        <MessageList
          messages={messages}
          isGroup={isGroup}
          typingNames={typingNames}
          onReply={setReplyTo}
          onEdit={setEditing}
          onDelete={(m) => void remove(m.id)}
          onForward={setForwarding}
          onPressButton={handlePressButton}
        />
      )}

      {/* Reply bar */}
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

      <Composer
        onSendText={handleSend}
        onTyping={(t) => client && void setTyping(client, dialog.id, t)}
        onSendFile={(f) => void sendFile(f)}
        editingText={editing?.text ?? null}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditing(null)}
      />

      <ForwardModal
        open={forwarding !== null}
        onClose={() => setForwarding(null)}
        onPick={(toChatId) => {
          if (forwarding) void forwardTo(forwarding.id, toChatId);
          setForwarding(null);
          setToast('Message forwarded');
          window.setTimeout(() => setToast(null), 2000);
        }}
      />

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
