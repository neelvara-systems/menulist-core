import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN = /^oba_(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]+_[a-z0-9]{12})$/;

export function normalizeOwnerBusinessAssistantThreadId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const threadId = value.trim();
  return threadId === value
    && OWNER_BUSINESS_ASSISTANT_THREAD_ID_PATTERN.test(threadId)
    && isValidFirestoreDocumentId(threadId)
    ? threadId
    : null;
}
