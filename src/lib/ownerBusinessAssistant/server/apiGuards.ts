import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRateLimitForFeature, type RateLimitFeature } from '@lib/rateLimit/configs';
import { checkRateLimit } from '@lib/rateLimit';
import { logger } from '@lib/monitoring/logger';
import { canUserAccessStore, normalizeStoreSwitchStoreId } from '@lib/multiOutlet/storeSwitchAccess';
import { getBoundedSecurityRouteContext, getBoundedSecurityStringContext } from '@lib/security/securityDiagnostics';
import { verifyTenantAccess } from '@/middleware/auth';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { resolveOwnerBusinessAssistantSessionScope } from './sessionScope';

export const getOwnerAssistantSessionScope = (session: any) => {
  return resolveOwnerBusinessAssistantSessionScope(session) || {
    tId: undefined,
    sId: undefined,
    userId: undefined,
  };
};

const buildSessionUserForStoreAccess = (session: any, fallbackStoreId: string | number) => ({
  ...(session?.user || {}),
  platformRole: session?.platformRole || session?.user?.platformRole,
  storeId: session?.user?.storeId || session?.sId || fallbackStoreId,
  storeIds: session?.user?.storeIds || session?.storeIds,
  stores: session?.user?.stores || session?.stores,
});

export const resolveOwnerAssistantSelectedStoreScope = (
  request: NextRequest,
  session: any,
  requestedStoreId?: string | number | null,
) => {
  const { tId, sId, userId } = getOwnerAssistantSessionScope(session);
  if (!tId || !sId || !userId) {
    return {
      error: NextResponse.json({ error: 'User not onboarded' }, { status: 400 }),
    };
  }

  const hasRequestedStoreId = requestedStoreId !== undefined && requestedStoreId !== null && requestedStoreId !== '';
  const selectedStoreId = hasRequestedStoreId ? normalizeStoreSwitchStoreId(requestedStoreId) : null;
  if (hasRequestedStoreId && !selectedStoreId) {
    return {
      error: NextResponse.json({ error: 'Invalid request' }, { status: 400 }),
    };
  }
  if (!selectedStoreId || String(selectedStoreId) === String(sId)) {
    return { tId, sId, userId };
  }

  const sessionUser = buildSessionUserForStoreAccess(session, sId);
  if (!canUserAccessStore({ sessionUser, storeId: selectedStoreId })) {
    logger.security('Tenant Access Violation - Owner Business Assistant Store Scope', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
      ...getBoundedSecurityStringContext('attemptedStoreId', selectedStoreId),
      ...getBoundedSecurityStringContext('sessionStoreId', sId),
      ...getBoundedSecurityStringContext('tenantId', tId),
    }, 'critical');
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { tId, sId: selectedStoreId, userId };
};

export const ensureOwnerAssistantTenantAccess = (
  request: NextRequest,
  session: any,
  tId: string | number,
  sId: string | number,
) => {
  if (!tId || !sId) {
    return NextResponse.json({ error: 'User not onboarded' }, { status: 400 });
  }

  if (!verifyTenantAccess(session, tId, sId, request)) {
    logger.security('Tenant Access Violation - Owner Business Assistant', {
      ...getBoundedSecurityRouteContext(session, request),
      endpoint: request.nextUrl.pathname,
    }, 'critical');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
};

export async function applyOwnerBusinessAssistantRateLimit(params: {
  request: NextRequest;
  session: any;
  feature: RateLimitFeature;
  keyPrefix: string;
}) {
  const { tId, sId, userId } = getOwnerAssistantSessionScope(params.session);
  const rateLimitConfig = getRateLimitForFeature(params.feature);
  const userRateLimitHash = hashPublicRateLimitValue(userId || 'unknown');
  const tenantRateLimitHash = hashPublicRateLimitValue(tId || '_');
  const storeRateLimitHash = hashPublicRateLimitValue(sId || '_');
  const failClosedOnProviderError = params.feature === 'AI_OPERATION';
  const rateLimit = await checkRateLimit({
    failClosedOnProviderError,
    key: `${params.keyPrefix}:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`,
    ...rateLimitConfig,
  });

  if (rateLimit.allowed) return null;

  const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
  const providerUnavailable = rateLimit.reason === 'provider_unavailable';
  logger.security(providerUnavailable ? 'Rate Limit Provider Unavailable' : 'Rate Limit Exceeded', {
    ...getBoundedSecurityRouteContext(params.session, params.request),
    endpoint: params.request.nextUrl.pathname,
    feature: params.feature,
    limit: rateLimitConfig.limit,
    ...getBoundedSecurityStringContext('storeId', sId),
    ...getBoundedSecurityStringContext('tenantId', tId),
    ...getBoundedSecurityStringContext('userId', userId),
    waitSeconds,
    window: rateLimitConfig.window,
  }, 'medium');

  return NextResponse.json(
    {
      error: providerUnavailable
        ? 'This operation is temporarily unavailable. Please try again shortly.'
        : `Too many requests. Please wait ${waitSeconds} seconds.`,
      retryAfter: waitSeconds,
      resetAt: rateLimit.resetAt,
    },
    {
      status: providerUnavailable ? 503 : 429,
      headers: {
        'Retry-After': String(waitSeconds),
        'X-RateLimit-Limit': String(rateLimitConfig.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
    },
  );
}
