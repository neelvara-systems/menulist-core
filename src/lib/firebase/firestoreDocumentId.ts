const RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN = /^__.*__$/;

export function isValidFirestoreDocumentId(value: unknown): value is string {
  const id = typeof value === 'string' ? value.trim() : '';
  return Boolean(id)
    && id !== '.'
    && id !== '..'
    && !id.includes('/')
    && !RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN.test(id);
}
