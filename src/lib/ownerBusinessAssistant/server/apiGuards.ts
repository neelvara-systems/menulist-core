import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRateLimitForFeature, type RateLimitFeature } from '@lib/rateLimit/configs';
import { checkRateLimit } from '@lib/rateLimit';
import { logger } from '@lib/monitoring/logger';
import { buildSecurityContext } from '@lib/security/securityContext';
import { verifyTenantAccess } from '@/middleware/auth';

export const getOwnerAssistantSessionScope = (session: any) => {
  const tId = session?.tId || session?.user?.tenantId;
  const sId = session?.sId || session?.user?.storeId;
  const userId = session?.uId || session?.user?.id;
  return { tId, sId, userId };
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
      ...buildSecurityContext(session, request),
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
  const rateLimit = await checkRateLimit({
    key: `${params.keyPrefix}:${userId || 'unknown'}:${tId || '_'}:${sId || '_'}`,
    ...rateLimitConfig,
  });

  if (rateLimit.allowed) return null;

  const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
  logger.security('Rate Limit Exceeded', {
    endpoint: params.request.nextUrl.pathname,
    feature: params.feature,
    limit: rateLimitConfig.limit,
    storeId: sId,
    tenantId: tId,
    userId,
    waitSeconds,
    window: rateLimitConfig.window,
  }, 'medium');

  return NextResponse.json(
    {
      error: `Too many requests. Please wait ${waitSeconds} seconds.`,
      retryAfter: waitSeconds,
      resetAt: rateLimit.resetAt,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(waitSeconds),
        'X-RateLimit-Limit': String(rateLimitConfig.limit),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(rateLimit.resetAt),
      },
    },
  );
}
