import { useEffect, useRef, useState } from 'react';
import { Api } from 'telegram';
import { useTelegram } from '@/context/TelegramContext';
import { useTheme } from '@/context/ThemeContext';
import { useBotUpdates } from '@/hooks/useBotUpdates';
import {
  answerBotCallback,
  sendMessageWithButtons,
  sendTextMessage,
} from '@/lib/telegram/messages';
import { Avatar } from '@/components/common/Avatar';
import { AccountMenu } from '@/components/sidebar/AccountMenu';
import { BotIcon, MenuIcon, MoonIcon, SendIcon, SunIcon } from '@/components/common/Icon';
import { cn, formatTime } from '@/lib/telegram/format';

export function BotDashboard() {
  const { client, account } = useTelegram();
  const { theme, toggleTheme } = useTheme();
  const { conversations, callbacks, pushOutgoing, dismissCallback } = useBotUpdates();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [text, setText] = useState('');
  const [withButtons, setWithButtons] = useState(false);
  const [commands, setCommands] = useState<{ command: string; description: string }[]>([]);

  const selected = conversations.find((c) => c.chatId === selectedId) ?? conversations[0] ?? null;
  const selfId = account?.id ?? '';

  // Best-effort: fetch the bot's registered commands.
  useEffect(() => {
    if (!client) return;
    void (async () => {
      try {
        const res: any = await client.invoke(
          new Api.bots.GetBotCommands({ scope: new Api.BotCommandScopeDefault(), langCode: '' }),
        );
        setCommands((res ?? []).map((c: any) => ({ command: c.command, description: c.description })));
      } catch {
        /* commands are optional */
      }
    })();
  }, [client]);

  async function handleSend() {
    const t = text.trim();
    if (!t || !client || !selected) return;
    setText('');
    try {
      if (withButtons) {
        const msg = await sendMessageWithButtons(
          client,
          selected.chatId,
          t,
          [
            [
              { text: '👍 Yes', data: 'yes' },
              { text: '👎 No', data: 'no' },
            ],
            [{ text: 'ℹ️ More info', data: 'info' }],
          ],
          selfId,
        );
        pushOutgoing(selected.chatId, msg);
      } else {
        const msg = await sendTextMessage(client, selected.chatId, t, selfId);
        pushOutgoing(selected.chatId, msg);
      }
    } catch {
      /* ignore send failure */
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left: bot info + conversations */}
      <aside className="flex h-full w-80 shrink-0 flex-col border-r border-black/5 bg-tg-panel-light dark:border-tg-divider dark:bg-tg-panel">
        <div className="relative flex items-center gap-2 px-3 py-2">
          <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5">
            <MenuIcon width={22} height={22} />
          </button>
          <span className="font-semibold">Bot Dashboard</span>
          <button onClick={toggleTheme} className="ml-auto rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary dark:hover:bg-white/5">
            {theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
          </button>
          <AccountMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>

        {/* Bot info card */}
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-xl bg-black/5 p-3 dark:bg-white/5">
          <Avatar name={account?.name ?? 'Bot'} size={48} />
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate font-medium">
              <BotIcon width={16} height={16} className="opacity-70" />
              {account?.name}
            </p>
            {account?.username && <p className="truncate text-sm text-tg-blue">@{account.username}</p>}
            <p className="truncate text-xs text-tg-text-secondary-light dark:text-tg-text-secondary">ID: {account?.id}</p>
          </div>
        </div>

        {commands.length > 0 && (
          <div className="mx-3 mb-3 rounded-xl bg-black/5 p-3 dark:bg-white/5">
            <p className="mb-1 text-xs font-semibold uppercase text-tg-text-secondary-light dark:text-tg-text-secondary">Commands</p>
            {commands.map((c) => (
              <div key={c.command} className="text-sm">
                <span className="text-tg-blue">/{c.command}</span>{' '}
                <span className="text-tg-text-secondary-light dark:text-tg-text-secondary">{c.description}</span>
              </div>
            ))}
          </div>
        )}

        <p className="px-4 py-1 text-xs font-semibold uppercase text-tg-text-secondary-light dark:text-tg-text-secondary">Conversations</p>
        <div className="tg-scroll flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">
              Waiting for messages… Send a message to your bot in Telegram and it will appear here.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.chatId}
                onClick={() => setSelectedId(c.chatId)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  selected?.chatId === c.chatId ? 'bg-tg-active text-white' : 'hover:bg-black/5 dark:hover:bg-white/5',
                )}
              >
                <Avatar name={c.title} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className={cn('truncate text-sm', selected?.chatId === c.chatId ? 'text-white/80' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
                    {c.messages[c.messages.length - 1]?.text || 'media'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main: conversation + callback panel */}
      <div className="flex h-full flex-1 flex-col">
        {callbacks.length > 0 && (
          <div className="border-b border-black/5 bg-amber-500/10 px-4 py-2 dark:border-tg-divider">
            <p className="mb-1 text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Callback queries</p>
            <div className="flex flex-wrap gap-2">
              {callbacks.map((cb) => (
                <div key={cb.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm shadow dark:bg-tg-panel-2">
                  <span className="font-medium">{cb.fromName}</span>
                  <span className="text-tg-text-secondary-light dark:text-tg-text-secondary">pressed</span>
                  <code className="rounded bg-black/10 px-1 dark:bg-white/10">{cb.dataText}</code>
                  <button
                    onClick={async () => {
                      if (client) await answerBotCallback(client, cb.raw.queryId, `Received: ${cb.dataText}`, true);
                      dismissCallback(cb.id);
                    }}
                    className="rounded bg-tg-blue px-2 py-0.5 text-xs font-medium text-white hover:bg-tg-blue-dark"
                  >
                    Answer
                  </button>
                  <button onClick={() => dismissCallback(cb.id)} className="text-xs text-tg-text-secondary-light hover:underline dark:text-tg-text-secondary">
                    dismiss
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {selected ? (
          <>
            <header className="flex items-center gap-3 border-b border-black/5 bg-tg-panel-light px-4 py-2 dark:border-tg-divider dark:bg-tg-panel">
              <Avatar name={selected.title} size={40} />
              <p className="font-medium">{selected.title}</p>
            </header>

            <BotMessageList messages={selected.messages} />

            <div className="border-t border-black/5 bg-tg-panel-light px-3 py-2.5 dark:border-tg-divider dark:bg-tg-panel">
              <label className="mb-2 flex items-center gap-2 px-1 text-xs text-tg-text-secondary-light dark:text-tg-text-secondary">
                <input type="checkbox" checked={withButtons} onChange={(e) => setWithButtons(e.target.checked)} />
                Attach a sample inline keyboard
              </label>
              <div className="flex items-end gap-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Reply as bot…"
                  className="tg-scroll max-h-32 flex-1 resize-none rounded-2xl bg-black/5 px-4 py-2.5 text-[15px] outline-none dark:bg-white/5"
                />
                <button onClick={() => void handleSend()} className="flex h-11 w-11 items-center justify-center rounded-full bg-tg-blue text-white hover:bg-tg-blue-dark" aria-label="Send">
                  <SendIcon width={21} height={21} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="chat-pattern flex h-full flex-col items-center justify-center gap-3 text-center">
            <BotIcon width={56} height={56} className="text-tg-text-secondary" />
            <p className="max-w-sm text-sm text-tg-text-secondary-light dark:text-tg-text-secondary">
              Your bot is connected. Incoming messages and button presses from users will appear here in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BotMessageList({ messages }: { messages: ReturnType<typeof useBotUpdates>['conversations'][number]['messages'] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div className="tg-scroll chat-pattern flex-1 overflow-y-auto px-3 py-3">
      {messages.map((m) => (
        <div key={m.id} className={cn('mb-2 flex', m.out ? 'justify-end' : 'justify-start')}>
          <div className={cn('max-w-[78%] rounded-2xl px-3 py-1.5 text-[15px] shadow-sm', m.out ? 'bg-tg-bubble-out-light dark:bg-tg-bubble-out' : 'bg-tg-bubble-in-light dark:bg-tg-bubble-in')}>
            {m.text && <span className="whitespace-pre-wrap break-words">{m.text}</span>}
            {m.buttons && m.buttons.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {m.buttons.map((row, ri) => (
                  <div key={ri} className="flex gap-1">
                    {row.map((b, bi) => (
                      <span key={bi} className="flex-1 rounded-lg bg-black/10 px-3 py-1.5 text-center text-sm dark:bg-white/10">{b.text}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <span className="float-right ml-2 mt-1 text-[11px] text-tg-text-secondary-light dark:text-white/55">{formatTime(m.date)}</span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
