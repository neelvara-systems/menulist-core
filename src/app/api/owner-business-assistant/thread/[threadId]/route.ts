export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { OwnerBusinessAssistantScopeSchema, OwnerBusinessAssistantThreadParamsSchema } from '@lib/ownerBusinessAssistant/schemas';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import {
  applyOwnerBusinessAssistantRateLimit,
  resolveOwnerAssistantSelectedStoreScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import {
  isOwnerBusinessAssistantThreadOwnedByScope,
  projectOwnerBusinessAssistantMessage,
  serializeOwnerBusinessAssistantThreadValue,
} from '@lib/ownerBusinessAssistant/threadResponse';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

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
    return NextResponse.json({ error: 'Invalid query', details: getSafeZodValidationDetails(parsedScope.error) }, { status: 400 });
  }

  const scope = resolveOwnerAssistantSelectedStoreScope(request, session, parsedScope.data.storeId);
  if ('error' in scope) return scope.error;

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
  if (!isOwnerBusinessAssistantThreadOwnedByScope(thread, scope)) {
    // A browser-generated thread ID exists before the first answer persists a
    // row. Return the same empty envelope for absent and foreign-scope rows so
    // first use is quiet without exposing whether another actor owns the ID.
    return NextResponse.json({
      data: {
        thread: null,
        messages: [],
      },
    });
  }

  const messages = Array.isArray(thread.messages)
    ? thread.messages
      .slice(-20)
      .map(projectOwnerBusinessAssistantMessage)
      .filter((message): message is NonNullable<typeof message> => Boolean(message))
    : [];
  const threadMeta = {
    threadId: parsed.data.threadId,
    status: typeof thread.status === 'string' && thread.status.length <= 40 ? thread.status : 'active',
    messageCount: messages.length,
    firstQuestion: typeof thread.firstQuestion === 'string' && thread.firstQuestion.length <= 240
      ? thread.firstQuestion
      : undefined,
    lastAnswerStatus: typeof thread.lastAnswerStatus === 'string' && thread.lastAnswerStatus.length <= 80
      ? thread.lastAnswerStatus
      : undefined,
    createdAt: serializeOwnerBusinessAssistantThreadValue(thread.createdAt),
    updatedAt: serializeOwnerBusinessAssistantThreadValue(thread.updatedAt),
    expiresAt: serializeOwnerBusinessAssistantThreadValue(thread.expiresAt),
  };

  return NextResponse.json({
    data: {
      thread: serializeOwnerBusinessAssistantThreadValue(threadMeta),
      messages: serializeOwnerBusinessAssistantThreadValue(messages),
    },
  });
});
