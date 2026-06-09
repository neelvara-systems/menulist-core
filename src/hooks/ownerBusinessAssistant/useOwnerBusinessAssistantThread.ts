import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { OWNER_BUSINESS_ASSISTANT_ENDPOINTS } from '@lib/ownerBusinessAssistant/constants';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to load thread');
  return response.json();
};

export function useOwnerBusinessAssistantThread(threadId?: string, storeScopeKey?: string | number) {
  const enabled = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_THREADS && Boolean(threadId);
  const params = new URLSearchParams();
  if (storeScopeKey) params.set('storeId', String(storeScopeKey));
  const url = threadId
    ? `${OWNER_BUSINESS_ASSISTANT_ENDPOINTS.thread(threadId)}${params.toString() ? `?${params.toString()}` : ''}`
    : null;
  const { data, error, isLoading, mutate } = useSWR(
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
