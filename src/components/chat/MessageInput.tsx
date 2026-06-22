import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Attachment, MessageType } from '@/types';
import {
  PaperclipIcon,
  MicIcon,
  SendIcon,
  SmileIcon,
} from '@/components/common/Icon';
import { formatBytes, uid } from '@/lib/utils';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorder } from './VoiceRecorder';

export interface ComposePayload {
  text: string;
  type: MessageType;
  attachment?: Attachment;
}

interface MessageInputProps {
  onSend: (payload: ComposePayload) => void;
  onTyping: (isTyping: boolean) => void;
}

export function MessageInput({ onSend, onTyping }: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<number>();

  // Auto-grow the textarea up to a max height.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  function emitTyping() {
    onTyping(true);
    window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => onTyping(false), 1800);
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    if (e.target.value) emitTyping();
  }

  function sendText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend({ text: trimmed, type: 'text' });
    setText('');
    onTyping(false);
    window.clearTimeout(typingTimeout.current);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const attachment: Attachment = {
      id: uid('a_'),
      type: isImage ? 'image' : 'file',
      name: file.name,
      size: formatBytes(file.size),
      url: isImage ? URL.createObjectURL(file) : undefined,
    };
    onSend({ text: text.trim(), type: isImage ? 'image' : 'file', attachment });
    setText('');
    e.target.value = '';
  }

  function insertEmoji(emoji: string) {
    setText((t) => t + emoji);
    textRef.current?.focus();
  }

  function sendVoice(duration: number, waveform: number[]) {
    onSend({
      text: '',
      type: 'voice',
      attachment: { id: uid('a_'), type: 'voice', name: 'Voice message', duration, waveform },
    });
    setRecording(false);
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="relative border-t border-black/5 bg-tg-panel-light px-3 py-2.5 dark:border-white/5 dark:bg-tg-panel-dark">
      {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}

      <div className="mx-auto flex max-w-3xl items-end gap-2">
        {recording ? (
          <VoiceRecorder onCancel={() => setRecording(false)} onSend={sendVoice} />
        ) : (
          <>
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="mb-1 rounded-full p-2 text-tg-text-secondary-light transition-colors hover:bg-tg-hover-light hover:text-tg-blue dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
              aria-label="Emoji"
            >
              <SmileIcon width={24} height={24} />
            </button>

            <textarea
              ref={textRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Message"
              className="tg-scroll max-h-36 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-tg-text-secondary-light dark:placeholder:text-tg-text-secondary-dark"
            />

            <button
              onClick={() => fileRef.current?.click()}
              className="mb-1 rounded-full p-2 text-tg-text-secondary-light transition-colors hover:bg-tg-hover-light hover:text-tg-blue dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
              aria-label="Attach file"
            >
              <PaperclipIcon width={23} height={23} />
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

            {hasText ? (
              <button
                onClick={sendText}
                className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-tg-blue text-white transition-all hover:bg-tg-blue-dark active:scale-95"
                aria-label="Send"
              >
                <SendIcon width={21} height={21} />
              </button>
            ) : (
              <button
                onClick={() => setRecording(true)}
                className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full text-tg-text-secondary-light transition-colors hover:bg-tg-hover-light hover:text-tg-blue dark:text-tg-text-secondary-dark dark:hover:bg-tg-hover-dark"
                aria-label="Record voice message"
              >
                <MicIcon width={23} height={23} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
