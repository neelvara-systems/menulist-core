export const dynamic = 'force-dynamic';

import { Timestamp } from 'firebase-admin/firestore';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { OwnerBusinessAssistantFeedbackRequestSchema } from '@lib/ownerBusinessAssistant/schemas';
import {
  applyOwnerBusinessAssistantRateLimit,
  ensureOwnerAssistantTenantAccess,
  getOwnerAssistantSessionScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

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

  const { tId, sId, userId } = getOwnerAssistantSessionScope(session);
  const accessError = ensureOwnerAssistantTenantAccess(request, session, tId, sId);
  if (accessError) return accessError;

  const parsed = OwnerBusinessAssistantFeedbackRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const docId = `${parsed.data.answerId}_${userId || 'unknown'}`;
  await firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_FEEDBACK).doc(docId).set({
    ...parsed.data,
    tId: String(tId),
    sId: String(sId),
    userId: userId ? String(userId) : null,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 180 * 24 * 60 * 60 * 1000),
    source: 'owner_business_assistant',
  }, { merge: true });

  return NextResponse.json({ data: { success: true } });
});
