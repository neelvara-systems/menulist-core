export const dynamic = 'force-dynamic';

import { Timestamp } from 'firebase-admin/firestore';
import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { OwnerBusinessAssistantFeedbackRequestSchema } from '@lib/ownerBusinessAssistant/schemas';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import {
  applyOwnerBusinessAssistantRateLimit,
  resolveOwnerAssistantSelectedStoreScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const FEEDBACK_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const OWNER_BUSINESS_ASSISTANT_FEEDBACK_MAX_BODY_BYTES = 8 * 1024;

export const POST = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: 'DATA_WRITE',
    keyPrefix: 'owner-business-assistant-feedback',
  });
  if (rateLimit) return rateLimit;

  const bodyResult = await readBoundedJsonBody(
    request,
    OWNER_BUSINESS_ASSISTANT_FEEDBACK_MAX_BODY_BYTES,
    { invalidJsonMessage: 'Invalid request' },
  );
  if (bodyResult.ok === false) return bodyResult.response;

  const parsed = OwnerBusinessAssistantFeedbackRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: getSafeZodValidationDetails(parsed.error) }, { status: 400 });
  }

  const scope = resolveOwnerAssistantSelectedStoreScope(request, session, parsed.data.storeId);
  if ('error' in scope && scope.error) return scope.error;

  const permissionError = await requireAnyStorePermissionForStore(
    request,
    session,
    [PERMISSIONS.VIEW_ANALYTICS],
    'Business Health feedback',
    scope.sId,
    scope.tId,
  );
  if (permissionError) return permissionError;

  const docId = `${parsed.data.answerId}_${scope.userId || 'unknown'}`;
  if (!isValidFirestoreDocumentId(docId)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK).doc(docId).set({
    ...parsed.data,
    tId: String(scope.tId),
    sId: String(scope.sId),
    userId: scope.userId ? String(scope.userId) : null,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + FEEDBACK_RETENTION_MS),
    source: 'owner_business_assistant',
  }, { merge: true });

  return NextResponse.json({ data: { success: true } });
});
