import { useEffect, useRef, useState } from 'react';
import { CheckIcon, TrashIcon } from '@/components/common/Icon';
import { formatDuration, generateWaveform } from '@/lib/utils';

interface VoiceRecorderProps {
  onCancel: () => void;
  onSend: (durationSeconds: number, waveform: number[]) => void;
}

/**
 * Visual-only recorder. It does NOT access the microphone; it simulates a live
 * waveform + timer so the send flow produces a voice message bubble.
 */
export function VoiceRecorder({ onCancel, onSend }: VoiceRecorderProps) {
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState<number[]>([]);
  const timer = useRef<number>();

  useEffect(() => {
    timer.current = window.setInterval(() => {
      setSeconds((s) => s + 0.1);
      setLive((prev) => {
        const next = [...prev, 0.2 + Math.random() * 0.8];
        return next.slice(-40);
      });
    }, 100);
    return () => window.clearInterval(timer.current);
  }, []);

  return (
    <div className="flex flex-1 items-center gap-3">
      <button
        onClick={onCancel}
        className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-500/10"
        aria-label="Cancel recording"
      >
        <TrashIcon width={22} height={22} />
      </button>

      <span className="flex items-center gap-2 text-sm tabular-nums text-tg-text-secondary-light dark:text-tg-text-secondary-dark">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        {formatDuration(seconds)}
      </span>

      <div className="flex h-8 flex-1 items-center justify-end gap-[2px] overflow-hidden">
        {live.map((amp, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-tg-blue"
            style={{ height: `${Math.max(15, amp * 100)}%` }}
          />
        ))}
      </div>

      <span className="hidden text-xs text-tg-text-secondary-light dark:text-tg-text-secondary-dark sm:block">
        Slide to cancel
      </span>

      <button
        onClick={() => onSend(Math.max(1, Math.round(seconds)), generateWaveform(30))}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-tg-blue text-white transition-colors hover:bg-tg-blue-dark"
        aria-label="Send voice message"
      >
        <CheckIcon width={22} height={22} />
      </button>
    </div>
  );
}
