import { useEffect, useState } from 'react';
import type { NormalizedMessage } from '@/lib/telegram/types';
import { useTelegram } from '@/context/TelegramContext';
import { downloadMessageMedia } from '@/lib/telegram/messages';
import { cn, formatBytes, formatDuration } from '@/lib/telegram/format';
import { DocumentIcon, PlayIcon } from '@/components/common/Icon';
import { Spinner } from '@/components/common/Spinner';

/** Renders a message's media, downloading lazily with a progress indicator. */
export function MessageMedia({ message, outgoing }: { message: NormalizedMessage; outgoing: boolean }) {
  const { client } = useTelegram();
  const media = message.media!;
  const [url, setUrl] = useState<string | undefined>(media.url);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const autoLoad = media.type === 'photo' || media.type === 'sticker' || media.type === 'gif';

  async function load() {
    if (!client || url || loading) return;
    setLoading(true);
    const result = await downloadMessageMedia(client, message, setProgress);
    setUrl(result);
    setLoading(false);
  }

  useEffect(() => {
    if (autoLoad) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  if (media.type === 'photo' || media.type === 'sticker' || media.type === 'gif') {
    return (
      <div className="overflow-hidden rounded-lg">
        {url ? (
          <img src={url} alt="" className="max-h-80 w-full max-w-sm object-cover" draggable={false} />
        ) : (
          <div className="flex h-44 w-64 items-center justify-center bg-black/20">
            <Spinner size={24} className="text-white" />
          </div>
        )}
      </div>
    );
  }

  if (media.type === 'voice') {
    return (
      <div className="flex items-center gap-3 py-1">
        <button
          onClick={load}
          className={cn('flex h-10 w-10 items-center justify-center rounded-full', outgoing ? 'bg-white/25 text-white' : 'bg-tg-blue text-white')}
        >
          {loading ? <Spinner size={16} /> : <PlayIcon width={18} height={18} />}
        </button>
        <div>
          <div className="flex h-6 items-center gap-[2px]">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className={cn('w-[3px] rounded-full', outgoing ? 'bg-white/70' : 'bg-tg-blue/60')} style={{ height: `${20 + ((i * 37) % 80)}%` }} />
            ))}
          </div>
          <span className={cn('text-xs', outgoing ? 'text-white/80' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
            {formatDuration(media.duration ?? 0)}
          </span>
        </div>
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <div className="overflow-hidden rounded-lg">
        {url ? (
          <video src={url} controls className="max-h-80 w-full max-w-sm" />
        ) : (
          <button onClick={load} className="flex h-44 w-64 items-center justify-center bg-black/30 text-white">
            {loading ? <Spinner size={24} className="text-white" /> : <PlayIcon width={40} height={40} />}
          </button>
        )}
      </div>
    );
  }

  // document / other
  return (
    <button onClick={load} className="flex items-center gap-3 py-1 text-left">
      <span className={cn('relative flex h-11 w-11 items-center justify-center rounded-full', outgoing ? 'bg-white/25 text-white' : 'bg-tg-blue text-white')}>
        {loading ? <Spinner size={18} /> : <DocumentIcon width={22} height={22} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{media.fileName ?? 'Document'}</span>
        <span className={cn('block text-xs', outgoing ? 'text-white/75' : 'text-tg-text-secondary-light dark:text-tg-text-secondary')}>
          {loading && progress > 0 ? `${Math.round(progress * 100)}%` : formatBytes(media.size ?? 0) || 'Download'}
        </span>
      </span>
    </button>
  );
}
