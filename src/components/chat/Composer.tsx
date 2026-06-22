import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { SendIcon, SmileIcon } from '@/components/common/Icon';
import { EmojiPicker } from './EmojiPicker';

export function Composer({ onSendText }: { onSendText: (text: string) => void }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="relative border-t border-black/5 bg-tg-panel-light px-3 py-2.5 dark:border-tg-divider dark:bg-tg-panel">
      {showEmoji && (
        <EmojiPicker
          onSelect={(em) => {
            setText((t) => t + em);
            textRef.current?.focus();
          }}
          onClose={() => setShowEmoji(false)}
        />
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <button
          onClick={() => setShowEmoji((v) => !v)}
          className="mb-1 rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 hover:text-tg-blue dark:text-tg-text-secondary dark:hover:bg-white/5"
          aria-label="Emoji"
        >
          <SmileIcon width={24} height={24} />
        </button>

        <textarea
          ref={textRef}
          value={text}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message"
          className="tg-scroll max-h-36 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-tg-text-secondary-light dark:placeholder:text-tg-text-secondary"
        />

        <button
          onClick={submit}
          disabled={!text.trim()}
          className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-tg-blue text-white transition-all hover:bg-tg-blue-dark active:scale-95 disabled:opacity-50"
          aria-label="Send"
        >
          <SendIcon width={21} height={21} />
        </button>
      </div>
    </div>
  );
}
