import { logOpsFailure } from '@lib/ops/opsDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

const CURRENT_PLATFORM_ACCESS_MAX_BYTES = 4 * 1024;

function isCurrentPlatformAccessResponse(value: unknown): boolean {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as { authorized?: unknown }).authorized === true
    && (value as { accessModel?: unknown }).accessModel === 'current_persisted_platform_user';
}

export async function assertCurrentPlatformAccess(): Promise<void> {
  const response = await fetch('/api/platform/current-access', {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
  });

  let payload: unknown = null;
  try {
    payload = await readJsonResponseWithLimit(response, CURRENT_PLATFORM_ACCESS_MAX_BYTES);
  } catch (error) {
    logOpsFailure('platform_current_access_response_parse_failed', error, {
      maxBytes: CURRENT_PLATFORM_ACCESS_MAX_BYTES,
      responseOk: response.ok,
      responseStatus: response.status,
    });
    throw new Error('platform_current_access_unavailable');
  }

  if (!response.ok || !isCurrentPlatformAccessResponse(payload)) {
    logOpsFailure('platform_current_access_rejected', undefined, {
      maxBytes: CURRENT_PLATFORM_ACCESS_MAX_BYTES,
      responseOk: response.ok,
      responseStatus: response.status,
    });
    throw new Error('platform_current_access_rejected');
  }
}
