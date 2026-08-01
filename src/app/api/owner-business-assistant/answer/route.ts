export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import { getOwnerBusinessHealthQuestionById } from '@data/shared/ownerBusinessHealthQuestionSuggestions';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { checkSafeMode } from '@lib/ops/safeMode';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { OwnerBusinessAssistantAnswerRequestSchema } from '@lib/ownerBusinessAssistant/schemas';
import type { OwnerBusinessAssistantAnswerRequest } from '@lib/ownerBusinessAssistant/schemas';
import { projectOwnerBusinessAssistantAnswerResponse } from '@lib/ownerBusinessAssistant/answerResponseBoundary';
import { logOwnerBusinessAssistantAnswerEvent } from '@lib/ownerBusinessAssistant/server/answerEventLogger';
import { resolveOwnerBusinessAssistantAnswer } from '@lib/ownerBusinessAssistant/server/resolveOwnerBusinessAssistantAnswer';
import { persistOwnerBusinessAssistantExchange } from '@lib/ownerBusinessAssistant/server/threadStore';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
  applyOwnerBusinessAssistantRateLimit,
  resolveOwnerAssistantSelectedStoreScope,
} from '@lib/ownerBusinessAssistant/server/apiGuards';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const OWNER_BUSINESS_ASSISTANT_ANSWER_MAX_BODY_BYTES = 32 * 1024;

const buildOwnerBusinessAssistantAnswerLogContext = (
  scope: { sId?: unknown; tId?: unknown; userId?: unknown },
  metadata: {
    answerId?: unknown;
    threadId?: unknown;
  } = {},
) => ({
  ...getBoundedRuntimeStringContext('storeId', scope.sId),
  ...getBoundedRuntimeStringContext('tenantId', scope.tId),
  ...getBoundedRuntimeStringContext('userId', scope.userId),
  ...getBoundedRuntimeStringContext('answerId', metadata.answerId),
  ...getBoundedRuntimeStringContext('threadId', metadata.threadId),
});

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

  const rateLimit = await applyOwnerBusinessAssistantRateLimit({
    request,
    session,
    feature: FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS ? 'AI_OPERATION' : 'DATA_READ',
    keyPrefix: 'owner-business-assistant-answer',
  });
  if (rateLimit) return rateLimit;

  const bodyResult = await readBoundedJsonBody(
    request,
    OWNER_BUSINESS_ASSISTANT_ANSWER_MAX_BODY_BYTES,
    { invalidJsonMessage: 'Invalid request' },
  );
  if (bodyResult.ok === false) return bodyResult.response;

  const parsed = OwnerBusinessAssistantAnswerRequestSchema.safeParse(bodyResult.data);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: getSafeZodValidationDetails(parsed.error) }, { status: 400 });
  }

  const normalizedRequest = normalizeSuggestedQuestionRequest(parsed.data);
  if (normalizedRequest instanceof NextResponse) {
    return normalizedRequest;
  }

  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT && !normalizedRequest.suggestedQuestionId) {
    return NextResponse.json({ error: 'Free-text questions are disabled' }, { status: 403 });
  }

  const scope = resolveOwnerAssistantSelectedStoreScope(request, session, normalizedRequest.storeId);
  if ('error' in scope) return scope.error;

  const permissionError = await requireAnyStorePermissionForStore(
    request,
    session,
    [PERMISSIONS.VIEW_ANALYTICS],
    'Business Health answer',
    scope.sId,
    scope.tId,
  );
  if (permissionError) return permissionError;

  if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS) {
    const safeMode = await checkSafeMode();
    if (safeMode) return safeMode;
  }

  const answer = await resolveOwnerBusinessAssistantAnswer({
    tId: scope.tId,
    sId: scope.sId,
    userId: scope.userId,
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
        tId: scope.tId,
        sId: scope.sId,
        userId: scope.userId,
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
      logRuntimeFailure(
        'owner_business_assistant_thread_persistence_failed',
        error,
        buildOwnerBusinessAssistantAnswerLogContext(scope, {
          threadId: normalizedRequest.threadId,
        }),
      );
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
        tId: scope.tId,
        sId: scope.sId,
        userId: scope.userId,
        request: normalizedRequest,
        answer,
      });
    } catch (error) {
      answer.metrics = {
        ...answer.metrics,
        firestoreWriteCount: Math.max(0, (answer.metrics?.firestoreWriteCount ?? 1) - 1),
        answerEventWritten: false,
      };
      logRuntimeFailure(
        'owner_business_assistant_answer_event_logging_failed',
        error,
        buildOwnerBusinessAssistantAnswerLogContext(scope, {
          answerId: answer.answerId,
        }),
      );
    }
  }

  const publicResponse = projectOwnerBusinessAssistantAnswerResponse({ data: answer });
  if (!publicResponse) {
    logRuntimeFailure(
      'owner_business_assistant_answer_output_invalid',
      new Error('owner_business_assistant_answer_output_invalid'),
      buildOwnerBusinessAssistantAnswerLogContext(scope, {
        answerId: answer.answerId,
        threadId: answer.threadId,
      }),
    );
    return NextResponse.json({ error: 'Business Health could not answer that.' }, { status: 500 });
  }

  return NextResponse.json(publicResponse);
});
