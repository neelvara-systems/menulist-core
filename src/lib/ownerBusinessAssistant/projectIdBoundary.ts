import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const OWNER_BUSINESS_ASSISTANT_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

export function normalizeOwnerBusinessAssistantProjectId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const projectId = value.trim();
  return projectId === value
    && OWNER_BUSINESS_ASSISTANT_PROJECT_ID_PATTERN.test(projectId)
    && isValidFirestoreDocumentId(projectId)
    ? projectId
    : null;
}
