import { useEffect, useState } from 'react';
import { avatarGradient, cn, initials } from '@/lib/telegram/format';

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  showStatus?: boolean;
  className?: string;
}

export function Avatar({ name, src, size = 48, online = false, showStatus = false, className }: AvatarProps) {
  const dim = { width: size, height: size };
  const [errored, setErrored] = useState(false);

  // Reset error state when the src changes (e.g. switching chats).
  useEffect(() => setErrored(false), [src]);

  const showImg = src && !errored;

  return (
    <div className={cn('relative shrink-0', className)} style={dim}>
      {showImg ? (
        <img
          src={src}
          alt={name}
          onError={() => setErrored(true)}
          className="h-full w-full rounded-full object-cover"
          style={dim}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br font-medium text-white select-none',
            avatarGradient(name),
          )}
          style={{ ...dim, fontSize: Math.round(size * 0.38) }}
        >
          {initials(name)}
        </div>
      )}
      {showStatus && online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full border-2 border-white bg-[#4dcd5e] dark:border-tg-panel"
          style={{ width: Math.max(10, size * 0.26), height: Math.max(10, size * 0.26) }}
        />
      )}
    </div>
  );
}
