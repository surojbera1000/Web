import { ChevronDownIcon, CloseIcon, SearchIcon } from '@/components/common/Icon';

interface ChatSearchBarProps {
  query: string;
  onChange: (value: string) => void;
  matchCount: number;
  currentMatch: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function ChatSearchBar({
  query,
  onChange,
  matchCount,
  currentMatch,
  onPrev,
  onNext,
  onClose,
}: ChatSearchBarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-black/5 bg-tg-panel-light px-3 py-2 dark:border-white/5 dark:bg-tg-panel-dark">
      <div className="relative flex-1">
        <SearchIcon
          width={18}
          height={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tg-text-secondary-light dark:text-tg-text-secondary-dark"
        />
        <input
          autoFocus
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search messages"
          className="w-full rounded-full bg-tg-hover-light py-2 pl-10 pr-3 text-sm outline-none dark:bg-tg-hover-dark"
        />
      </div>
      <span className="min-w-[52px] text-center text-xs tabular-nums text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
        {query ? `${matchCount ? currentMatch + 1 : 0}/${matchCount}` : ''}
      </span>
      <button
        onClick={onPrev}
        disabled={matchCount === 0}
        className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-tg-hover-light disabled:opacity-40 dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
        aria-label="Previous match"
      >
        <ChevronDownIcon width={20} height={20} className="rotate-180" />
      </button>
      <button
        onClick={onNext}
        disabled={matchCount === 0}
        className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-tg-hover-light disabled:opacity-40 dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
        aria-label="Next match"
      >
        <ChevronDownIcon width={20} height={20} />
      </button>
      <button
        onClick={onClose}
        className="rounded-full p-1.5 text-tg-text-secondary-light hover:bg-tg-hover-light dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
        aria-label="Close search"
      >
        <CloseIcon width={20} height={20} />
      </button>
    </div>
  );
}
