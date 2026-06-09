export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { OwnerBusinessAssistantScopeSchema, OwnerBusinessAssistantThreadParamsSchema } from '@lib/ownerBusinessAssistant/schemas';
import {
  applyOwnerBusinessAssistantRateLimit,
  resolveOwnerAssistantSelectedStoreScope,
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

  const parsedScope = OwnerBusinessAssistantScopeSchema
    .pick({ storeId: true })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsedScope.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsedScope.error.flatten() }, { status: 400 });
  }

  const scope = resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId);
  if ('error' in scope && scope.error) return scope.error;

  const permissionError = await requireAnyStorePermissionForStore(
    request,
    session,
    [PERMISSIONS.VIEW_ANALYTICS],
    'Business Health thread',
    scope.sId,
    scope.tId,
  );
  if (permissionError) return permissionError;

  const threadRef = firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_THREADS).doc(parsed.data.threadId);
  const threadSnap = await threadRef.get();
  const thread = threadSnap.exists ? threadSnap.data() : null;
  if (!thread || String(thread.tId) !== String(scope.tId) || String(thread.sId) !== String(scope.sId)) {
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
