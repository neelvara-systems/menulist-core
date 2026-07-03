import { useCallback, useState } from 'react';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  readOwnerBusinessAssistantFeedbackResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';

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
        ...OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          storeId: storeScopeKey ? String(storeScopeKey) : undefined,
        }),
      });
      const result = await readOwnerBusinessAssistantFeedbackResponse(response, {
        answerIdLength: params.answerId.length,
        hasQuestion: Boolean(params.question),
        hasReason: Boolean(params.reason),
        hasStoreScope: Boolean(storeScopeKey),
        rating: params.rating,
      });
      return result?.data.success === true;
    } finally {
      setIsLoading(false);
    }
  }, [storeScopeKey]);

  return { sendFeedback, isLoading };
}
