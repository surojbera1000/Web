import type { Message } from '@/types';

/** Short, icon-prefixed preview used in chat list rows and search results. */
export function messagePreview(message: Message | undefined): string {
  if (!message) return '';
  switch (message.type) {
    case 'voice':
      return '🎤 Voice message';
    case 'file':
      return `📎 ${message.attachment?.name ?? 'File'}`;
    case 'image':
      return message.text ? `🖼 ${message.text}` : '🖼 Photo';
    case 'system':
      return message.text;
    default:
      return message.text;
  }
}
