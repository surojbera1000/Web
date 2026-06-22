import { useEffect, useRef } from 'react';

const EMOJIS = [
  '😀','😁','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😜','🤪','🤗','🤔','😎',
  '🥳','😏','😢','😭','😤','😡','🤯','😱','🥶','😴','👍','👎','👌','✌️','🤞','🙏',
  '💪','👏','🙌','🔥','⭐','✨','💯','🎉','🎁','🚀','❤️','🧡','💛','💚','💙','💜',
  '🖤','🤍','💔','💕','😅','😆','🫶','👀','🎯','✅','❌','⏰','☕','🍕','🌈','🎂',
];

export function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="tg-scroll absolute bottom-14 left-2 z-30 h-64 w-80 max-w-[90vw] animate-fade-in overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel dark:ring-white/10"
    >
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((e, i) => (
          <button
            key={i}
            onClick={() => onSelect(e)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
