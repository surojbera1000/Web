import { CloseIcon, SearchIcon } from '@/components/common/Icon';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search' }: SearchBarProps) {
  return (
    <div className="relative flex-1">
      <SearchIcon
        width={18}
        height={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-text-secondary-light dark:text-tg-text-secondary-dark"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-tg-hover-light py-2.5 pl-10 pr-9 text-sm outline-none ring-tg-blue/40 transition focus:ring-2 dark:bg-tg-hover-dark"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-tg-text-secondary-light hover:bg-black/5 dark:text-tg-text-secondary-dark dark:hover:bg-white/10"
          aria-label="Clear search"
        >
          <CloseIcon width={16} height={16} />
        </button>
      )}
    </div>
  );
}
