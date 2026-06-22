import { useEffect, useRef, useState } from 'react';
import type { Attachment } from '@/types';
import { DocumentIcon, PauseIcon, PlayIcon } from '@/components/common/Icon';
import { cn, formatDuration } from '@/lib/utils';

/** Visual-only voice note player with an animated waveform + progress. */
export function VoiceMessage({ attachment, outgoing }: { attachment: Attachment; outgoing: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const timer = useRef<number>();
  const duration = attachment.duration ?? 12;
  const waveform = attachment.waveform ?? [];

  useEffect(() => {
    if (!playing) {
      window.clearInterval(timer.current);
      return;
    }
    const stepMs = 100;
    timer.current = window.setInterval(() => {
      setProgress((p) => {
        const next = p + stepMs / (duration * 1000);
        if (next >= 1) {
          window.clearInterval(timer.current);
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(timer.current);
  }, [playing, duration]);

  const elapsed = playing || progress > 0 ? duration * progress : duration;
  const playedBars = Math.floor(progress * waveform.length);

  return (
    <div className="flex items-center gap-3 py-1">
      <button
        onClick={() => setPlaying((v) => !v)}
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          outgoing ? 'bg-white/25 text-white' : 'bg-tg-blue text-white',
        )}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <PauseIcon width={18} height={18} /> : <PlayIcon width={18} height={18} />}
      </button>

      <div className="flex flex-col gap-1">
        <div className="flex h-7 items-center gap-[2px]">
          {waveform.map((amp, i) => (
            <span
              key={i}
              className={cn(
                'w-[3px] rounded-full transition-colors',
                i <= playedBars
                  ? outgoing
                    ? 'bg-white'
                    : 'bg-tg-blue'
                  : outgoing
                    ? 'bg-white/40'
                    : 'bg-tg-blue/30',
              )}
              style={{ height: `${Math.max(15, amp * 100)}%` }}
            />
          ))}
        </div>
        <span className={cn('text-xs', outgoing ? 'text-white/80' : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark')}>
          {formatDuration(elapsed)}
        </span>
      </div>
    </div>
  );
}

export function FileAttachment({ attachment, outgoing }: { attachment: Attachment; outgoing: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          outgoing ? 'bg-white/25 text-white' : 'bg-tg-blue text-white',
        )}
      >
        <DocumentIcon width={22} height={22} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{attachment.name}</p>
        <p className={cn('text-xs', outgoing ? 'text-white/75' : 'text-tg-text-secondary-light dark:text-tg-text-secondary-dark')}>
          {attachment.size ?? 'Document'}
        </p>
      </div>
    </div>
  );
}

export function ImageAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div className="overflow-hidden rounded-lg">
      <img
        src={attachment.url}
        alt={attachment.name}
        className="max-h-80 w-full max-w-sm object-cover"
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}
