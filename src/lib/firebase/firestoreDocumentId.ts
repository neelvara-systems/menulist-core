const RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN = /^__.*__$/;
export const FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES = 1_500;

export function isValidFirestoreDocumentId(value: unknown): value is string {
  const id = typeof value === 'string' ? value.trim() : '';
  return Boolean(id)
    && id !== '.'
    && id !== '..'
    && !id.includes('/')
    && new TextEncoder().encode(id).byteLength <= FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES
    && !RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN.test(id);
}
