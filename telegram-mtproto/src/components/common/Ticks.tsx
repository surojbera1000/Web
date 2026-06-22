import type { TickState } from '@/lib/telegram/types';
import { CheckDoubleIcon, CheckIcon } from './Icon';
import { Spinner } from './Spinner';

/** Telegram delivery ticks: clock (sending), single (sent), double (read = blue). */
export function Ticks({ state, size = 16 }: { state: TickState; size?: number }) {
  if (state === 'none') return null;
  if (state === 'sending') return <Spinner size={size - 4} className="text-current opacity-60" />;
  if (state === 'sent') return <CheckIcon width={size} height={size} className="opacity-70" />;
  // delivered + read → double check, blue when read
  return <CheckDoubleIcon width={size} height={size} className="text-tg-blue dark:text-[#6ab7ff]" />;
}
