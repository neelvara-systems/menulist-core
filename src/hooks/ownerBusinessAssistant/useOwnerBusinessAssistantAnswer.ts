import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import { OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY } from '@lib/ownerBusinessAssistant/clientResponses';
import { normalizeOwnerBusinessAssistantThreadId } from '@lib/ownerBusinessAssistant/threadIdBoundary';
import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type {
  OwnerBusinessAssistantAnswer,
  OwnerBusinessAssistantClientContext,
} from '@lib/ownerBusinessAssistant/types';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
  buildOwnerBusinessAssistantThreadStorageKey,
  resolveOwnerBusinessAssistantClientScope,
} from '@lib/ownerBusinessAssistant/clientScope';

const OWNER_BUSINESS_ASSISTANT_SAFE_ERROR = 'Business Health could not answer that.';
const OWNER_BUSINESS_ASSISTANT_SAFE_ERROR_CODE = 'OWNER_BUSINESS_ASSISTANT_SAFE_ERROR';
const OWNER_BUSINESS_ASSISTANT_ANSWER_RESPONSE_JSON_MAX_BYTES = 32 * 1024;

type OwnerBusinessAssistantAnswerPayload = {
  data?: OwnerBusinessAssistantAnswer & {
    threadId?: string;
  };
};

type OwnerBusinessAssistantAnswerLogContext = Record<string, boolean | number | string | null | undefined>;

class OwnerBusinessAssistantSafeError extends Error {
  readonly code = OWNER_BUSINESS_ASSISTANT_SAFE_ERROR_CODE;

  constructor() {
    super(OWNER_BUSINESS_ASSISTANT_SAFE_ERROR);
    this.name = 'OwnerBusinessAssistantSafeError';
  }
}

const isOwnerBusinessAssistantSafeError = (error: unknown): error is OwnerBusinessAssistantSafeError => (
  error instanceof OwnerBusinessAssistantSafeError
  || (
    typeof error === 'object'
    && error !== null
    && (error as { code?: unknown }).code === OWNER_BUSINESS_ASSISTANT_SAFE_ERROR_CODE
  )
);

const createThreadId = () => createRuntimeId('oba');
const readStoredThreadId = (storageKey: string): string | undefined => {
  try {
    return normalizeOwnerBusinessAssistantThreadId(window.localStorage.getItem(storageKey)) || undefined;
  } catch {
    return undefined;
  }
};
const writeStoredThreadId = (storageKey: string, threadId: string): void => {
  try {
    window.localStorage.setItem(storageKey, threadId);
  } catch {
    // The in-memory thread remains usable when browser storage is unavailable.
  }
};

const readOwnerBusinessAssistantAnswerResponseJson = async (
  response: Response,
  logContext: OwnerBusinessAssistantAnswerLogContext,
): Promise<OwnerBusinessAssistantAnswerPayload | null> => {
  try {
    return await readJsonResponseWithLimit<OwnerBusinessAssistantAnswerPayload>(
      response,
      OWNER_BUSINESS_ASSISTANT_ANSWER_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure('owner_business_assistant_answer_response_parse_failed', error, {
      ...logContext,
      responseOk: response.ok,
      responseStatus: response.status,
      maxBytes: OWNER_BUSINESS_ASSISTANT_ANSWER_RESPONSE_JSON_MAX_BYTES,
    });
    return null;
  }
};

export function useOwnerBusinessAssistantAnswer(
  projectId?: string,
  clientContext?: OwnerBusinessAssistantClientContext,
  storeScopeKey?: string | number,
) {
  const session = useClientAuthSession();
  const clientScope = useMemo(
    () => resolveOwnerBusinessAssistantClientScope(session, storeScopeKey),
    [session?.sId, session?.tId, session?.uId, session?.user?.id, storeScopeKey],
  );
  const [answer, setAnswer] = useState<OwnerBusinessAssistantAnswer | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [lastQuestion, setLastQuestion] = useState<{
    question: string;
    suggestedQuestionId?: string;
    threadId?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    requestGenerationRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;

    if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS || typeof window === 'undefined' || !clientScope) {
      setThreadId(undefined);
      setAnswer(null);
      setLastQuestion(null);
      setError(null);
      setIsLoading(false);
      return () => {
        requestGenerationRef.current += 1;
        requestControllerRef.current?.abort();
      };
    }

    const storageKey = buildOwnerBusinessAssistantThreadStorageKey(projectId, clientScope);
    const existing = readStoredThreadId(storageKey);
    const nextThreadId = existing || createThreadId();
    if (!existing) writeStoredThreadId(storageKey, nextThreadId);
    setThreadId(nextThreadId);
    setAnswer(null);
    setLastQuestion(null);
    setError(null);
    setIsLoading(false);
    return () => {
      requestGenerationRef.current += 1;
      requestControllerRef.current?.abort();
    };
  }, [clientScope, projectId]);

  const ensureThreadId = useCallback(() => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS || typeof window === 'undefined' || !clientScope) {
      return undefined;
    }

    const storageKey = buildOwnerBusinessAssistantThreadStorageKey(projectId, clientScope);
    const nextThreadId = normalizeOwnerBusinessAssistantThreadId(threadId)
      || readStoredThreadId(storageKey)
      || createThreadId();
    if (readStoredThreadId(storageKey) !== nextThreadId) writeStoredThreadId(storageKey, nextThreadId);
    if (threadId !== nextThreadId) {
      setThreadId(nextThreadId);
    }
    return nextThreadId;
  }, [clientScope, projectId, threadId]);

  const ask = useCallback(async (question: string, suggestedQuestionId?: string) => {
    if (!clientScope) throw new OwnerBusinessAssistantSafeError();
    requestControllerRef.current?.abort();
    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    const requestGeneration = ++requestGenerationRef.current;
    const requestIsCurrent = () => (
      requestGenerationRef.current === requestGeneration
      && requestControllerRef.current === requestController
    );
    const nextThreadId = ensureThreadId();
    const logContext = {
      ...getBoundedRuntimeStringContext('projectId', projectId),
      ...getBoundedRuntimeStringContext('storeScopeKey', storeScopeKey),
      ...getBoundedRuntimeStringContext('suggestedQuestionId', suggestedQuestionId),
      hasClientContext: Boolean(clientContext),
      questionLength: question.length,
    };
    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setLastQuestion({
      question,
      suggestedQuestionId,
      threadId: nextThreadId,
    });
    try {
      const response = await fetch(OWNER_BUSINESS_ASSISTANT_ENDPOINTS.answer, {
        ...OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
        method: 'POST',
        signal: requestController.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          projectId,
          storeId: clientScope.storeId,
          suggestedQuestionId,
          threadId: nextThreadId,
          clientContext,
        }),
      });
      const payload = await readOwnerBusinessAssistantAnswerResponseJson(response, logContext);
      if (!requestIsCurrent()) throw new OwnerBusinessAssistantSafeError();
      if (!response.ok) {
        logRuntimeFailure('owner_business_assistant_answer_rejected', new Error('owner_business_assistant_answer_rejected'), {
          ...logContext,
          responseStatus: response.status,
        });
        throw new OwnerBusinessAssistantSafeError();
      }
      const answerData = payload?.data;
      if (!answerData) {
        logRuntimeFailure('owner_business_assistant_answer_response_invalid', new Error('owner_business_assistant_answer_response_invalid'), {
          ...logContext,
          responseStatus: response.status,
        });
        throw new OwnerBusinessAssistantSafeError();
      }
      const normalizedAnswerThreadId = normalizeOwnerBusinessAssistantThreadId(answerData.threadId);
      if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && normalizedAnswerThreadId && typeof window !== 'undefined') {
        writeStoredThreadId(buildOwnerBusinessAssistantThreadStorageKey(projectId, clientScope), normalizedAnswerThreadId);
        setThreadId(normalizedAnswerThreadId);
        setLastQuestion((current) => current ? { ...current, threadId: normalizedAnswerThreadId } : current);
      }
      if (!requestIsCurrent()) throw new OwnerBusinessAssistantSafeError();
      setAnswer(answerData);
      return answerData as OwnerBusinessAssistantAnswer;
    } catch (err) {
      if (!requestIsCurrent()) {
        throw new OwnerBusinessAssistantSafeError();
      }
      if (!isOwnerBusinessAssistantSafeError(err)) {
        logRuntimeFailure('owner_business_assistant_answer_failed', err, logContext);
      }
      const normalized = new OwnerBusinessAssistantSafeError();
      setLastQuestion(null);
      setError(normalized);
      throw normalized;
    } finally {
      if (requestIsCurrent()) {
        requestControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }, [clientContext, clientScope, ensureThreadId, projectId, storeScopeKey]);

  return {
    answer,
    ask,
    threadId,
    lastQuestion,
    isLoading,
    error,
    reset: () => {
      setAnswer(null);
      setLastQuestion(null);
    },
  };
}
