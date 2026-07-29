import { useCallback, useMemo, useState } from 'react';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  readOwnerBusinessAssistantFeedbackResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';

export function useOwnerBusinessAssistantFeedback(storeScopeKey?: string | number) {
  const session = useClientAuthSession();
  const clientScope = useMemo(
    () => resolveOwnerBusinessAssistantClientScope(session, storeScopeKey),
    [session?.sId, session?.tId, session?.uId, session?.user?.id, storeScopeKey],
  );
  const [isLoading, setIsLoading] = useState(false);

  const sendFeedback = useCallback(async (params: {
    answerId: string;
    rating: 'helpful' | 'not_helpful';
    reason?: string;
    question?: string;
  }) => {
    if (!clientScope) return false;
    setIsLoading(true);
    try {
      const response = await fetch(OWNER_BUSINESS_ASSISTANT_ENDPOINTS.feedback, {
        ...OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          storeId: clientScope.storeId,
        }),
      });
      const result = await readOwnerBusinessAssistantFeedbackResponse(response, {
        answerIdLength: params.answerId.length,
        hasQuestion: Boolean(params.question),
        hasReason: Boolean(params.reason),
        hasStoreScope: true,
        rating: params.rating,
      });
      return result?.data.success === true;
    } finally {
      setIsLoading(false);
    }
  }, [clientScope]);

  return { sendFeedback, isLoading };
}
