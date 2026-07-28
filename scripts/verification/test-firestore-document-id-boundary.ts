import assert from 'node:assert/strict';

import {
  FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES,
  isValidFirestoreDocumentId,
} from '@lib/firebase/firestoreDocumentId';
import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';

assert.equal(isValidFirestoreDocumentId('document-1'), true);
assert.equal(isValidFirestoreDocumentId(' document-1 '), true);
assert.equal(isValidFirestoreDocumentId('.'), false);
assert.equal(isValidFirestoreDocumentId('..'), false);
assert.equal(isValidFirestoreDocumentId('collection/document'), false);
assert.equal(isValidFirestoreDocumentId('__reserved__'), false);
assert.equal(isValidFirestoreDocumentId('a'.repeat(FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES)), true);
assert.equal(isValidFirestoreDocumentId('a'.repeat(FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES + 1)), false);

const threeByteCharacter = '₹';
const maximumMultibyteId = threeByteCharacter.repeat(FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES / 3);
assert.equal(new TextEncoder().encode(maximumMultibyteId).byteLength, FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES);
assert.equal(isValidFirestoreDocumentId(maximumMultibyteId), true);
assert.equal(isValidFirestoreDocumentId(`${maximumMultibyteId}${threeByteCharacter}`), false);
assert.equal(normalizeAnswerlatticePredictiveTriggerId(`${maximumMultibyteId}${threeByteCharacter}`), null);

console.log('Firestore document ID boundary tests passed.');
