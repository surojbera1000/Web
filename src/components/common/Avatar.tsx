import { avatarGradient, cn, initials } from '@/lib/utils';

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  showStatus?: boolean;
  className?: string;
}

export function Avatar({
  name,
  src,
  size = 48,
  online = false,
  showStatus = false,
  className,
}: AvatarProps) {
  const dimension = { width: size, height: size };
  const fontSize = Math.round(size * 0.38);

  return (
    <div className={cn('relative shrink-0', className)} style={dimension}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          style={dimension}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-medium text-white select-none',
            avatarGradient(name),
          )}
          style={{ ...dimension, fontSize }}
        >
          {initials(name)}
        </div>
      )}
      {showStatus && online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full border-2 border-white bg-[#4dcd5e] dark:border-tg-panel-dark"
          style={{ width: Math.max(10, size * 0.26), height: Math.max(10, size * 0.26) }}
          aria-label="online"
        />
      )}
    </div>
  );
}
