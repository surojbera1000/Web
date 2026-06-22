import { useEffect, type ReactNode } from 'react';
import { CloseIcon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-message-in dark:bg-tg-panel-dark">
        {title && (
          <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
              aria-label="Close"
            >
              <CloseIcon width={20} height={20} />
            </button>
          </div>
        )}
        <div className="tg-scroll flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-black/5 px-5 py-4 dark:border-white/5">{footer}</div>}
      </div>
    </div>
  );
}
