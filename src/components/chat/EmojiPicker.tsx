import { useEffect, useRef } from 'react';

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀','😁','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😜','🤪','🤗','🤔','🤨','😐','😴','😎','🥳','😏','😒','😢','😭','😤','😡','🤯','😱','🥶','😈'],
  },
  {
    label: 'Gestures',
    emojis: ['👍','👎','👌','✌️','🤞','🤟','🤙','👏','🙌','🙏','💪','👋','🤝','✍️','💅','👀','🫶','🤲','👐','🤌'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️'],
  },
  {
    label: 'Objects',
    emojis: ['🔥','⭐','🌟','✨','⚡','💯','🎉','🎊','🎁','🚀','💡','📌','📎','📁','💬','✅','❌','⏰','🏆','🎯'],
  },
  {
    label: 'Nature',
    emojis: ['🌸','🌹','🌻','🌴','🍀','🌈','☀️','🌙','⛅','❄️','🍎','🍕','🍔','🍟','☕','🍺','🍷','🎂','🍰','🐶'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
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
      className="tg-scroll absolute bottom-14 left-2 z-30 h-72 w-80 max-w-[90vw] animate-fade-in overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel-dark dark:ring-white/10"
    >
      {EMOJI_GROUPS.map((group) => (
        <div key={group.label} className="mb-3">
          <p className="mb-1.5 text-xs font-medium uppercase text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
            {group.label}
          </p>
          <div className="grid grid-cols-8 gap-1">
            {group.emojis.map((emoji, i) => (
              <button
                key={`${group.label}-${i}`}
                onClick={() => onSelect(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-transform hover:scale-125 hover:bg-tg-hover-light dark:hover:bg-tg-hover-dark"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
