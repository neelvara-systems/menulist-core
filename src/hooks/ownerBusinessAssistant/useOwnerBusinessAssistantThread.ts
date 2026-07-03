import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';
import {
  OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY,
  readOwnerBusinessAssistantThreadResponse,
  type OwnerBusinessAssistantThreadResponse,
} from '@lib/ownerBusinessAssistant/clientResponses';
import { getBoundedRuntimeStringContext } from '@lib/runtime/runtimeDiagnostics';

const fetcher = async (url: string): Promise<OwnerBusinessAssistantThreadResponse> => {
  const response = await fetch(url, OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY);
  const payload = await readOwnerBusinessAssistantThreadResponse(response, {
    ...getBoundedRuntimeStringContext('url', url),
  });
  if (!payload) throw new Error('Failed to load thread');
  return payload;
};

export function useOwnerBusinessAssistantThread(threadId?: string, storeScopeKey?: string | number) {
  const enabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && Boolean(threadId);
  const params = new URLSearchParams();
  if (storeScopeKey) params.set('storeId', String(storeScopeKey));
  const url = threadId
    ? `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.thread(threadId)}${params.toString() ? `?${params.toString()}` : ''}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<OwnerBusinessAssistantThreadResponse>(
    enabled && url ? url : null,
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
