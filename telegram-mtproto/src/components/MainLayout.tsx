import { useState } from 'react';
import type { NormalizedDialog } from '@/lib/telegram/types';
import { cn } from '@/lib/telegram/format';
import { Sidebar } from './sidebar/Sidebar';
import { ChatView } from './chat/ChatView';

export function MainLayout() {
  const [selected, setSelected] = useState<NormalizedDialog | null>(null);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div
        className={cn(
          'h-full w-full shrink-0 border-r border-black/5 dark:border-tg-divider md:w-[26rem] lg:w-[28rem]',
          selected ? 'hidden md:block' : 'block',
        )}
      >
        <Sidebar activeChatId={selected?.id ?? null} onSelect={setSelected} />
      </div>

      <div className={cn('h-full flex-1', selected ? 'block' : 'hidden md:block')}>
        {selected ? (
          <ChatView dialog={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="chat-pattern flex h-full items-center justify-center">
            <span className="rounded-full bg-black/15 px-4 py-2 text-sm text-white dark:bg-white/10">
              Select a chat to start messaging
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
