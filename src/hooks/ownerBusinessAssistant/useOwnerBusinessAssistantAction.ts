import { useCallback, useState } from 'react';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import type {
  OwnerBusinessAssistantActionOperation,
  OwnerBusinessAssistantActionResult,
  OwnerBusinessAssistantActionTargetKind,
} from '@lib/ownerBusinessAssistant/types';

export function useOwnerBusinessAssistantAction(projectId?: string, storeScopeKey?: string | number) {
  const [result, setResult] = useState<OwnerBusinessAssistantActionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const runAction = useCallback(async (params: {
    operation: OwnerBusinessAssistantActionOperation;
    actionType: string;
    targetKind?: OwnerBusinessAssistantActionTargetKind;
    targetId?: string;
    draftId?: string;
    actionId?: string;
    payload?: Record<string, unknown>;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(OWNER_BUSINESS_ASSISTANT_ENDPOINTS.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          projectId,
          storeId: storeScopeKey ? String(storeScopeKey) : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.data?.message || payload?.error || 'Action could not be completed.');
      setResult(payload.data);
      return payload.data as OwnerBusinessAssistantActionResult;
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error('Action could not be completed.');
      setError(normalized);
      throw normalized;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, storeScopeKey]);

  return { runAction, result, isLoading, error };
}
