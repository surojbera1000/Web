import { useState } from 'react';
import type { NormalizedMessage } from '@/lib/telegram/types';
import { api } from '@/lib/api';
import { cn, formatBytes, formatDuration } from '@/lib/telegram/format';
import { DocumentIcon, PlayIcon } from '@/components/common/Icon';

/** Renders a message's media using the backend media proxy (/api/media). */
export function MessageMedia({ message, outgoing }: { message: NormalizedMessage; outgoing: boolean }) {
  const media = message.media!;
  const url = api.mediaUrl(message.chatId, message.id);
  const [broken, setBroken] = useState(false);

  if ((media.type === 'photo' || media.type === 'sticker' || media.type === 'gif') && !broken) {
    return (
      <div className="overflow-hidden rounded-lg">
        <img
          src={url}
          alt=""
          onError={() => setBroken(true)}
          className="max-h-80 w-full max-w-sm object-cover"
          loading="lazy"
          draggable={false}
        />
      </div>
    );
  }

  if (media.type === 'video' && !broken) {
    return (
      <div className="overflow-hidden rounded-lg">
        <video src={url} controls className="max-h-80 w-full max-w-sm" onError={() => setBroken(true)} />
      </div>
    );
  }

  if (media.type === 'voice') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-1">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-full', outgoing ? 'bg-white/25 text-white' : 'bg-tg-blue text-white')}>
          <PlayIcon width={18} height={18} />
        </span>
        <span className="flex h-6 items-center gap-[2px]">
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} className={cn('w-[3px] rounded-full', outgoing ? 'bg-white/70' : 'bg-tg-blue/60')} style={{ height: `${20 + ((i * 37) % 80)}%` }} />
          ))}
        </span>
        <span className={cn('text-xs', outgoing ? 'text-white/80' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
          {formatDuration(media.duration ?? 0)}
        </span>
      </a>
    );
  }

  // document / other / broken preview → download link
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-1">
      <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', outgoing ? 'bg-white/25 text-white' : 'bg-tg-blue text-white')}>
        <DocumentIcon width={22} height={22} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{media.fileName ?? 'Document'}</span>
        <span className={cn('block text-xs', outgoing ? 'text-white/75' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
          {formatBytes(media.size ?? 0) || 'Download'}
        </span>
      </span>
    </a>
  );
}
