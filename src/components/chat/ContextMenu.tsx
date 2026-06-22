import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/telegram/format';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + r.width > window.innerWidth - 8) left = window.innerWidth - r.width - 8;
    if (top + r.height > window.innerHeight - 8) top = window.innerHeight - r.height - 8;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40" onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={ref}
        className="absolute min-w-[180px] animate-fade-in overflow-hidden rounded-xl bg-white py-1.5 shadow-2xl ring-1 ring-black/5 dark:bg-tg-panel dark:ring-white/10"
        style={{ left: pos.left, top: pos.top }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5',
              item.danger && 'text-red-500',
            )}
          >
            {item.icon && <span className={cn(item.danger ? 'text-red-500' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
