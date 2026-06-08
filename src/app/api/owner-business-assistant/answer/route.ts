export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { getOwnerBusinessHealthQuestionById } from '@data/shared/ownerBusinessHealthQuestionSuggestions';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkSafeMode } from '@lib/ops/safeMode';
import { logger } from '@lib/monitoring/logger';
import { OwnerBusinessAssistantAnswerRequestSchema } from '@lib/ownerBusinessAssistant/schemas';
import type { OwnerBusinessAssistantAnswerRequest } from '@lib/ownerBusinessAssistant/schemas';
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

const readJsonBody = async (request: NextRequest) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const normalizeSuggestedQuestionRequest = (
  request: OwnerBusinessAssistantAnswerRequest,
): OwnerBusinessAssistantAnswerRequest | NextResponse => {
  if (!request.suggestedQuestionId) return request;

  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS) {
    return NextResponse.json({ error: 'Suggested questions are disabled' }, { status: 403 });
  }

  const suggestion = getOwnerBusinessHealthQuestionById(request.suggestedQuestionId);
  if (!suggestion) {
    return NextResponse.json({ error: 'Unknown suggested question' }, { status: 400 });
  }

  return {
    ...request,
    question: suggestion.question,
  };
};

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

  const json = await readJsonBody(request);
  if (!json) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = OwnerBusinessAssistantAnswerRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedRequest = normalizeSuggestedQuestionRequest(parsed.data);
  if (normalizedRequest instanceof NextResponse) {
    return normalizedRequest;
  }

  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT && !normalizedRequest.suggestedQuestionId) {
    return NextResponse.json({ error: 'Free-text questions are disabled' }, { status: 403 });
  }

  const answer = await resolveOwnerBusinessAssistantAnswer({
    tId,
    sId,
    userId,
    request: normalizedRequest,
  });

  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS) {
    answer.suggestedQuestions = [];
  }
  answer.metrics = {
    cacheSource: answer.cache?.source || answer.metrics?.cacheSource || 'fresh_firestore',
    firestoreReadCount: answer.metrics?.firestoreReadCount ?? 0,
    firestoreWriteCount: answer.metrics?.firestoreWriteCount ?? 0,
    ...answer.metrics,
    route: '/api/owner-business-assistant/answer',
    threadWritten: false,
    answerEventWritten: false,
  };

  if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && normalizedRequest.threadId) {
    try {
      const threadId = await persistOwnerBusinessAssistantExchange({
        tId,
        sId,
        userId,
        request: normalizedRequest,
        answer,
      });
      if (threadId) {
        answer.threadId = threadId;
        answer.metrics = {
          ...answer.metrics,
          firestoreWriteCount: (answer.metrics?.firestoreWriteCount ?? 0) + 1,
          threadWritten: true,
        };
      }
    } catch (error) {
      logger.warn('Owner Business Assistant thread persistence failed', {
        storeId: sId,
        tenantId: tId,
        userId,
        threadId: normalizedRequest.threadId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING) {
    try {
      answer.metrics = {
        ...answer.metrics,
        firestoreWriteCount: (answer.metrics?.firestoreWriteCount ?? 0) + 1,
        answerEventWritten: true,
      };
      await logOwnerBusinessAssistantAnswerEvent({
        tId,
        sId,
        userId,
        request: normalizedRequest,
        answer,
      });
    } catch (error) {
      answer.metrics = {
        ...answer.metrics,
        firestoreWriteCount: Math.max(0, (answer.metrics?.firestoreWriteCount ?? 1) - 1),
        answerEventWritten: false,
      };
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
