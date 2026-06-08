export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { OwnerBusinessAssistantThreadParamsSchema } from '@lib/ownerBusinessAssistant/schemas';
import {
  applyOwnerBusinessAssistantRateLimit,
  ensureOwnerAssistantTenantAccess,
  getOwnerAssistantSessionScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

function serializeOwnerBusinessAssistantThreadValue(value: any): any {
  if (value == null) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
  if (Array.isArray(value)) return value.map(serializeOwnerBusinessAssistantThreadValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serializeOwnerBusinessAssistantThreadValue(entry)]),
    );
  }
  return value;
}

export const GET = withAuth(async (request: NextRequest, session, params) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
  }

  const parsed = OwnerBusinessAssistantThreadParamsSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: 'DATA_READ',
    keyPrefix: 'owner-business-assistant-thread',
  });
  if (rateLimit) return rateLimit;

  const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Business Health thread');
  if (permissionError) return permissionError;

  const { tId, sId } = getOwnerAssistantSessionScope(session);
  const accessError = ensureOwnerAssistantTenantAccess(request, session, tId, sId);
  if (accessError) return accessError;

  const threadRef = firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_THREADS).doc(parsed.data.threadId);
  const threadSnap = await threadRef.get();
  const thread = threadSnap.exists ? threadSnap.data() : null;
  if (!thread || String(thread.tId) !== String(tId) || String(thread.sId) !== String(sId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = Array.isArray(thread.messages) ? thread.messages.slice(-20) : [];
  const threadMeta = { ...thread };
  delete (threadMeta as { messages?: unknown }).messages;

  return NextResponse.json({
    data: {
      thread: serializeOwnerBusinessAssistantThreadValue(threadMeta),
      messages: serializeOwnerBusinessAssistantThreadValue(messages),
    },
  });
});
