export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { OwnerBusinessAssistantActionRequestSchema } from '@lib/ownerBusinessAssistant/schemas';
import { executeOwnerBusinessAssistantAction } from '@lib/ownerBusinessAssistant/actions/actionExecutor';
import {
  applyOwnerBusinessAssistantRateLimit,
  resolveOwnerAssistantSelectedStoreScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const readJsonBody = async (request: NextRequest) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export const POST = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: 'DATA_WRITE',
    keyPrefix: 'owner-business-assistant-action',
  });
  if (rateLimit) return rateLimit;

  const json = await readJsonBody(request);
  if (!json) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = OwnerBusinessAssistantActionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const scope = resolveOwnerAssistantSelectedStoreScope(request, session, parsed.data.storeId);
  if ('error' in scope && scope.error) return scope.error;

  const result = await executeOwnerBusinessAssistantAction({
    request,
    session,
    tId: scope.tId,
    sId: scope.sId,
    userId: scope.userId,
    body: parsed.data,
  });

  return NextResponse.json({ data: result }, { status: result.success ? 200 : 400 });
});
