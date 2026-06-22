import { isFirebaseConfigured } from '@/lib/firebase';
import { mockBackend } from './mockBackend';
import { createFirebaseBackend } from './firebaseBackend';
import type { Backend } from './backendTypes';

export type { Backend, SendMessageInput, VerificationHandle, Unsubscribe } from './backendTypes';

/**
 * Pick the backend implementation:
 *   - VITE_BACKEND=mock|firebase forces a choice
 *   - otherwise auto-detect: Firebase if configured, else the mock backend.
 */
function selectBackend(): Backend {
  const forced = import.meta.env.VITE_BACKEND;
  if (forced === 'mock') return mockBackend;
  if (forced === 'firebase') return createFirebaseBackend();
  return isFirebaseConfigured() ? createFirebaseBackend() : mockBackend;
}

export const backend: Backend = selectBackend();

/** Convenience flag for UI hints (e.g. showing the mock verification code). */
export const isMockBackend = backend.kind === 'mock';
