export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkSafeMode } from '@lib/ops/safeMode';
import { logger } from '@lib/monitoring/logger';
import { OwnerBusinessAssistantAnswerRequestSchema } from '@lib/ownerBusinessAssistant/schemas';
import { logOwnerBusinessAssistantAnswerEvent } from '@lib/ownerBusinessAssistant/server/answerEventLogger';
import { resolveOwnerBusinessAssistantAnswer } from '@lib/ownerBusinessAssistant/server/resolveOwnerBusinessAssistantAnswer';
import { persistOwnerBusinessAssistantExchange } from '@lib/ownerBusinessAssistant/server/threadStore';
import {
  applyOwnerBusinessAssistantRateLimit,
  ensureOwnerAssistantTenantAccess,
  getOwnerAssistantSessionScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

export const POST = withAuth(async (request: NextRequest, session) => {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH) {
    return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
  }

  if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS) {
    const safeMode = await checkSafeMode();
    if (safeMode) return safeMode;
  }

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS ? 'AI_OPERATION' : 'DATA_READ',
    keyPrefix: 'owner-business-assistant-answer',
  });
  if (rateLimit) return rateLimit;

  const permissionError = await requireAnyStorePermission(request, session, [PERMISSIONS.VIEW_ANALYTICS], 'Business Health answer');
  if (permissionError) return permissionError;

  const { tId, sId, userId } = getOwnerAssistantSessionScope(session);
  const accessError = ensureOwnerAssistantTenantAccess(request, session, tId, sId);
  if (accessError) return accessError;

  const json = await request.json();
  const parsed = OwnerBusinessAssistantAnswerRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT && !parsed.data.suggestedQuestionId) {
    return NextResponse.json({ error: 'Free-text questions are disabled' }, { status: 403 });
  }

  if (parsed.data.suggestedQuestionId && !FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS) {
    return NextResponse.json({ error: 'Suggested questions are disabled' }, { status: 403 });
  }

  const answer = await resolveOwnerBusinessAssistantAnswer({
    tId,
    sId,
    userId,
    request: parsed.data,
  });

  if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && parsed.data.threadId) {
    try {
      const threadId = await persistOwnerBusinessAssistantExchange({
        tId,
        sId,
        userId,
        request: parsed.data,
        answer,
      });
      if (threadId) answer.threadId = threadId;
    } catch (error) {
      logger.warn('Owner Business Assistant thread persistence failed', {
        storeId: sId,
        tenantId: tId,
        userId,
        threadId: parsed.data.threadId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING) {
    try {
      await logOwnerBusinessAssistantAnswerEvent({
        tId,
        sId,
        userId,
        request: parsed.data,
        answer,
      });
    } catch (error) {
      logger.warn('Owner Business Assistant answer event logging failed', {
        storeId: sId,
        tenantId: tId,
        userId,
        answerId: answer.answerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ data: answer });
});
