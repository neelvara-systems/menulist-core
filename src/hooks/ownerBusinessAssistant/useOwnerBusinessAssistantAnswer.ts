import { useCallback, useEffect, useState } from 'react';
import { FEATURE_FLAGS } from '@config/features';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import type {
  OwnerBusinessAssistantAnswer,
  OwnerBusinessAssistantClientContext,
} from '@lib/ownerBusinessAssistant/types';

const buildThreadStorageKey = (projectId?: string, storeScopeKey?: string | number) =>
  `ownerBusinessAssistant-thread:${storeScopeKey || 'store'}:${projectId || 'all'}`;

const createThreadId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `oba_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export function useOwnerBusinessAssistantAnswer(
  projectId?: string,
  clientContext?: OwnerBusinessAssistantClientContext,
  storeScopeKey?: string | number,
) {
  const [answer, setAnswer] = useState<OwnerBusinessAssistantAnswer | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [lastQuestion, setLastQuestion] = useState<{
    question: string;
    suggestedQuestionId?: string;
    threadId?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS || typeof window === 'undefined') {
      setThreadId(undefined);
      return;
    }

    const storageKey = buildThreadStorageKey(projectId, storeScopeKey);
    const existing = window.localStorage.getItem(storageKey);
    const nextThreadId = existing || createThreadId();
    if (!existing) window.localStorage.setItem(storageKey, nextThreadId);
    setThreadId(nextThreadId);
    setAnswer(null);
    setLastQuestion(null);
    setError(null);
  }, [projectId, storeScopeKey]);

  const ensureThreadId = useCallback(() => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS || typeof window === 'undefined') {
      return undefined;
    }

    const storageKey = buildThreadStorageKey(projectId, storeScopeKey);
    const nextThreadId = threadId || window.localStorage.getItem(storageKey) || createThreadId();
    if (window.localStorage.getItem(storageKey) !== nextThreadId) {
      window.localStorage.setItem(storageKey, nextThreadId);
    }
    if (threadId !== nextThreadId) {
      setThreadId(nextThreadId);
    }
    return nextThreadId;
  }, [projectId, storeScopeKey, threadId]);

  const ask = useCallback(async (question: string, suggestedQuestionId?: string) => {
    const nextThreadId = ensureThreadId();
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          projectId,
          suggestedQuestionId,
          threadId: nextThreadId,
          clientContext,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Business Health could not answer that.');
      if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && payload.data?.threadId && typeof window !== 'undefined') {
        window.localStorage.setItem(buildThreadStorageKey(projectId, storeScopeKey), payload.data.threadId);
        setThreadId(payload.data.threadId);
        setLastQuestion((current) => current ? { ...current, threadId: payload.data.threadId } : current);
      }
      setAnswer(payload.data);
      return payload.data as OwnerBusinessAssistantAnswer;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Business Health could not answer that.');
      setLastQuestion(null);
      setError(normalized);
      throw normalized;
    } finally {
      setIsLoading(false);
    }
  }, [clientContext, ensureThreadId, projectId, storeScopeKey]);

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
