import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn, formatDuration } from '@/lib/telegram/format';
import { MicIcon, PaperclipIcon, SendIcon, SmileIcon, TrashIcon, CheckIcon } from '@/components/common/Icon';
import { EmojiPicker } from './EmojiPicker';

interface Props {
  onSendText: (text: string) => void;
  onTyping: (typing: boolean) => void;
  onSendFile: (file: File) => void;
  editingText: string | null;
  onSaveEdit: (text: string) => void;
  onCancelEdit: () => void;
}

export function Composer({ onSendText, onTyping, onSendFile, editingText, onSaveEdit, onCancelEdit }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<number>();
  const recTimer = useRef<number>();

  const editing = editingText !== null;

  useEffect(() => {
    if (editing) {
      setText(editingText ?? '');
      textRef.current?.focus();
    }
  }, [editing, editingText]);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  useEffect(() => {
    if (!recording) {
      window.clearInterval(recTimer.current);
      return;
    }
    recTimer.current = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(recTimer.current);
  }, [recording]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    if (e.target.value && !editing) {
      onTyping(true);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => onTyping(false), 2000);
    }
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editing) {
      onSaveEdit(trimmed);
    } else {
      onSendText(trimmed);
      onTyping(false);
    }
    setText('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape' && editing) onCancelEdit();
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSendFile(file);
    e.target.value = '';
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="relative border-t border-black/5 bg-tg-panel-light px-3 py-2.5 dark:border-tg-divider dark:bg-tg-panel">
      {showEmoji && <EmojiPicker onSelect={(em) => { setText((t) => t + em); textRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />}

      {editing && (
        <div className="mb-2 flex items-center gap-2 border-l-2 border-tg-blue pl-2 text-sm">
          <span className="font-medium text-tg-blue">Editing message</span>
          <button onClick={onCancelEdit} className="ml-auto text-tg-text-secondary-light hover:underline dark:text-tg-text-secondary">cancel</button>
        </div>
      )}

      <div className="mx-auto flex max-w-3xl items-end gap-2">
        {recording ? (
          <div className="flex flex-1 items-center gap-3">
            <button onClick={() => { setRecording(false); setRecSeconds(0); }} className="rounded-full p-2 text-red-500 hover:bg-red-500/10" aria-label="Cancel">
              <TrashIcon width={22} height={22} />
            </button>
            <span className="flex items-center gap-2 text-sm tabular-nums text-tg-text-secondary-light dark:text-tg-text-secondary">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {formatDuration(recSeconds)}
            </span>
            <span className="flex-1 text-xs text-tg-text-secondary-light dark:text-tg-text-secondary">Voice recording is UI-only in this demo</span>
            <button onClick={() => { setRecording(false); setRecSeconds(0); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-tg-blue text-white" aria-label="Stop">
              <CheckIcon width={22} height={22} />
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => setShowEmoji((v) => !v)} className="mb-1 rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 hover:text-tg-blue dark:text-tg-text-secondary dark:hover:bg-white/5" aria-label="Emoji">
              <SmileIcon width={24} height={24} />
            </button>

            <textarea
              ref={textRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={editing ? 'Edit message…' : 'Message'}
              className="tg-scroll max-h-36 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-tg-text-secondary-light dark:placeholder:text-tg-text-secondary"
            />

            {!editing && (
              <>
                <button onClick={() => fileRef.current?.click()} className="mb-1 rounded-full p-2 text-tg-text-secondary-light hover:bg-black/5 hover:text-tg-blue dark:text-tg-text-secondary dark:hover:bg-white/5" aria-label="Attach">
                  <PaperclipIcon width={23} height={23} />
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
              </>
            )}

            {hasText || editing ? (
              <button onClick={submit} className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-tg-blue text-white transition-all hover:bg-tg-blue-dark active:scale-95" aria-label="Send">
                {editing ? <CheckIcon width={21} height={21} /> : <SendIcon width={21} height={21} />}
              </button>
            ) : (
              <button onClick={() => setRecording(true)} className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full text-tg-text-secondary-light hover:bg-black/5 hover:text-tg-blue dark:text-tg-text-secondary dark:hover:bg-white/5" aria-label="Record voice">
                <MicIcon width={23} height={23} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
