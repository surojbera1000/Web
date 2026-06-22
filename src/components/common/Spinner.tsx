import { cn } from '@/lib/telegram/format';

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-block animate-spin rounded-full border-2', className)}
      style={{
        width: size,
        height: size,
        borderColor: 'rgba(127,127,127,0.3)',
        borderTopColor: 'currentColor',
      }}
    />
  );
}
