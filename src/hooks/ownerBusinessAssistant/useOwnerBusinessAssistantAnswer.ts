import { useCallback, useEffect, useState } from 'react';
import { FEATURE_FLAGS } from '@config/features';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import type {
  OwnerBusinessAssistantAnswer,
  OwnerBusinessAssistantClientContext,
} from '@lib/ownerBusinessAssistant/types';

const buildThreadStorageKey = (projectId?: string) => `ownerBusinessAssistant-thread:${projectId || 'store'}`;

const createThreadId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `oba_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export function useOwnerBusinessAssistantAnswer(projectId?: string, clientContext?: OwnerBusinessAssistantClientContext) {
  const [answer, setAnswer] = useState<OwnerBusinessAssistantAnswer | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS || typeof window === 'undefined') {
      setThreadId(undefined);
      return;
    }

    const storageKey = buildThreadStorageKey(projectId);
    const existing = window.localStorage.getItem(storageKey);
    const nextThreadId = existing || createThreadId();
    if (!existing) window.localStorage.setItem(storageKey, nextThreadId);
    setThreadId(nextThreadId);
  }, [projectId]);

  const ask = useCallback(async (question: string, suggestedQuestionId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(OWNER_BUSINESS_ASSISTANT_ENDPOINTS.answer, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          projectId,
          suggestedQuestionId,
          threadId,
          clientContext,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Business Health could not answer that.');
      if (FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && payload.data?.threadId && typeof window !== 'undefined') {
        window.localStorage.setItem(buildThreadStorageKey(projectId), payload.data.threadId);
        setThreadId(payload.data.threadId);
      }
      setAnswer(payload.data);
      return payload.data as OwnerBusinessAssistantAnswer;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Business Health could not answer that.');
      setError(normalized);
      throw normalized;
    } finally {
      setIsLoading(false);
    }
  }, [clientContext, projectId, threadId]);

  return { answer, ask, threadId, isLoading, error, reset: () => setAnswer(null) };
}
