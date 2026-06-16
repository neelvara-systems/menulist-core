import type { PlatformCostPostureApiResponse, PlatformCostPostureData } from '@lib/ops/costPostureTypes';

export async function getPlatformCostPosture(days = 30): Promise<PlatformCostPostureData> {
  const params = new URLSearchParams({ days: String(days) });
  const response = await fetch(`/api/platform/cost-posture?${params.toString()}`, {
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null) as PlatformCostPostureApiResponse | { error?: string } | null;

  if (!response.ok || !payload || !('data' in payload)) {
    throw new Error((payload && 'error' in payload && payload.error) || 'Failed to load platform cost posture');
  }

  return payload.data;
}
