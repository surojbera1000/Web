import { useEffect, useMemo, useRef, useState } from 'react';
import type { Message } from '@/types';
import { backend } from '@/services';
import { useChat } from '@/context/ChatContext';
import { useChatMessages } from '@/hooks/useChatMessages';
import { formatLastSeen } from '@/lib/utils';
import { messagePreview } from '@/lib/messagePreview';
import { CloseIcon, ReplyIcon } from '@/components/common/Icon';
import { ChatHeader } from './ChatHeader';
import { PinnedBar } from './PinnedBar';
import { MessageList, type MessageListHandle } from './MessageList';
import { MessageInput, type ComposePayload } from './MessageInput';
import { ChatSearchBar } from './ChatSearchBar';

interface ChatWindowProps {
  onBack: () => void;
  onOpenInfo: () => void;
}

export function ChatWindow({ onBack, onOpenInfo }: ChatWindowProps) {
  const {
    currentUser,
    usersById,
    activeChat,
    activeSummary,
    activePeer,
    activeMembers,
    sendMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    beginForward,
    markChatRead,
  } = useChat();

  const chatId = activeChat?.id ?? null;
  const { messages, typingUserIds } = useChatMessages(chatId);
  const listRef = useRef<MessageListHandle>(null);

  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  // Reset transient state when switching chats.
  useEffect(() => {
    setReplyTarget(null);
    setSearchOpen(false);
    setSearchQuery('');
    setMatchIndex(0);
  }, [chatId]);

  // Keep the open conversation marked as read as new messages stream in.
  useEffect(() => {
    if (chatId) void markChatRead(chatId);
  }, [chatId, messages.length, markChatRead]);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as Message[];
    return messages.filter((m) => m.text.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  useEffect(() => {
    if (matches.length === 0) return;
    const target = matches[matchIndex % matches.length];
    if (target) listRef.current?.jumpTo(target.id);
  }, [matchIndex, matches]);

  if (!activeChat || !activeSummary) return null;
  const isGroup = activeChat.type === 'group';

  const typingNames = typingUserIds
    .filter((id) => id !== currentUser.id)
    .map((id) => usersById[id]?.name.split(' ')[0])
    .filter(Boolean) as string[];

  let statusText: string;
  let statusActive = false;
  if (typingNames.length > 0) {
    statusActive = true;
    statusText = isGroup ? `${typingNames.join(', ')} typing…` : 'typing…';
  } else if (isGroup) {
    const onlineCount = activeMembers.filter((m) => m.online).length;
    statusText = `${activeMembers.length} members${onlineCount ? `, ${onlineCount} online` : ''}`;
  } else if (activePeer) {
    statusActive = activePeer.online;
    statusText = formatLastSeen(activePeer.online, activePeer.lastSeen);
  } else {
    statusText = '';
  }

  function handleSend(payload: ComposePayload) {
    if (!chatId) return;
    const replyTo = replyTarget
      ? {
          messageId: replyTarget.id,
          authorId: replyTarget.senderId,
          authorName:
            replyTarget.senderId === currentUser.id
              ? 'You'
              : usersById[replyTarget.senderId]?.name ?? 'Unknown',
          snippet: messagePreview(replyTarget) || 'Message',
        }
      : undefined;

    void sendMessage({
      chatId,
      text: payload.text,
      type: payload.type,
      attachment: payload.attachment,
      replyTo,
    });
    setReplyTarget(null);
  }

  function handleTogglePin(message: Message) {
    if (!chatId) return;
    if (activeChat!.pinnedMessageIds.includes(message.id)) {
      void unpinMessage(chatId, message.id);
    } else {
      void pinMessage(chatId, message.id);
    }
  }

  const replyAuthor =
    replyTarget &&
    (replyTarget.senderId === currentUser.id
      ? 'You'
      : usersById[replyTarget.senderId]?.name ?? 'Unknown');

  return (
    <div className="flex h-full flex-col">
      {searchOpen ? (
        <ChatSearchBar
          query={searchQuery}
          onChange={(v) => {
            setSearchQuery(v);
            setMatchIndex(0);
          }}
          matchCount={matches.length}
          currentMatch={matches.length ? matchIndex % matches.length : 0}
          onPrev={() => setMatchIndex((i) => (i - 1 + matches.length) % Math.max(1, matches.length))}
          onNext={() => setMatchIndex((i) => (i + 1) % Math.max(1, matches.length))}
          onClose={() => {
            setSearchOpen(false);
            setSearchQuery('');
          }}
        />
      ) : (
        <ChatHeader
          summary={activeSummary}
          statusText={statusText}
          statusActive={statusActive}
          isGroup={isGroup}
          onBack={onBack}
          onOpenInfo={onOpenInfo}
          onToggleSearch={() => setSearchOpen(true)}
        />
      )}

      <PinnedBar
        chat={activeChat}
        messages={messages}
        usersById={usersById}
        currentUserId={currentUser.id}
        onJump={(id) => listRef.current?.jumpTo(id)}
        onUnpin={(id) => void unpinMessage(activeChat!.id, id)}
      />

      <MessageList
        ref={listRef}
        chat={activeChat}
        messages={messages}
        typingUserIds={typingUserIds}
        usersById={usersById}
        currentUserId={currentUser.id}
        onReply={setReplyTarget}
        onForward={(m) => beginForward([m.id], activeChat!.id)}
        onTogglePin={handleTogglePin}
        onDelete={(m) => void deleteMessage(activeChat!.id, m.id)}
      />

      {replyTarget && (
        <div className="flex items-center gap-3 border-t border-black/5 bg-tg-panel-light px-4 py-2 dark:border-white/5 dark:bg-tg-panel-dark">
          <ReplyIcon width={20} height={20} className="shrink-0 text-tg-blue" />
          <div className="min-w-0 flex-1 border-l-2 border-tg-blue pl-2">
            <p className="text-xs font-medium text-tg-blue">Reply to {replyAuthor}</p>
            <p className="truncate text-sm text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
              {messagePreview(replyTarget)}
            </p>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
            aria-label="Cancel reply"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      )}

      <MessageInput
        onSend={handleSend}
        onTyping={(isTyping) => chatId && backend.setTyping(chatId, isTyping)}
      />
    </div>
  );
}
