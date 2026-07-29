import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  readOwnerBusinessAssistantThreadResponse,
  type OwnerBusinessAssistantThreadResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';
import { useMemo } from 'react';

const fetcher = async ([url]: readonly [string, string, string]): Promise<OwnerBusinessAssistantThreadResponse> => {
  const response = await fetch(url, OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY);
  const payload = await readOwnerBusinessAssistantThreadResponse(response, {
    ...getBoundedRuntimeStringContext('url', url),
  });
  if (!payload) throw new Error('Failed to load thread');
  return payload;
};

export function useOwnerBusinessAssistantThread(threadId?: string, storeScopeKey?: string | number) {
  const session = useClientAuthSession();
  const clientScope = useMemo(
    () => resolveOwnerBusinessAssistantClientScope(session, storeScopeKey),
    [session?.sId, session?.tId, session?.uId, session?.user?.id, storeScopeKey],
  );
  const enabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && Boolean(threadId) && Boolean(clientScope);
  const params = new URLSearchParams();
  if (clientScope) params.set('storeId', clientScope.storeId);
  const url = threadId
    ? `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.thread(threadId)}${params.toString() ? `?${params.toString()}` : ''}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<OwnerBusinessAssistantThreadResponse>(
    enabled && url && clientScope ? [url, clientScope.cacheScope, clientScope.actorId] as const : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60 * 1000 },
  );

  return {
    thread: data?.data?.thread || null,
    messages: data?.data?.messages || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
