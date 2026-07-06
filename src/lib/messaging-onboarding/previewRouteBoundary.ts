import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";

export const MESSAGING_PREVIEW_SESSION_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

export function normalizeMessagingPreviewSessionId(value: unknown): string | null {
  const raw = typeof value === "string" ? value : "";
  const sessionId = raw.trim();
  if (sessionId !== raw || !MESSAGING_PREVIEW_SESSION_ID_PATTERN.test(sessionId)) return null;
  return isValidFirestoreDocumentId(sessionId) ? sessionId : null;
}
