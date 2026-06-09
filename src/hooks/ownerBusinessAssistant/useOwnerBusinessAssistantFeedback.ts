import { useCallback, useState } from 'react';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';

export function useOwnerBusinessAssistantFeedback(storeScopeKey?: string | number) {
  const [isLoading, setIsLoading] = useState(false);

  const sendFeedback = useCallback(async (params: {
    answerId: string;
    rating: 'helpful' | 'not_helpful';
    reason?: string;
    question?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch(OWNER_BUSINESS_ASSISTANT_ENDPOINTS.feedback, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          storeId: storeScopeKey ? String(storeScopeKey) : undefined,
        }),
      });
      if (!response.ok) return false;
      return true;
    } finally {
      setIsLoading(false);
    }
  }, [storeScopeKey]);

  return { sendFeedback, isLoading };
}
