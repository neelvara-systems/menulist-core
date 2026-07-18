export const dynamic = 'force-dynamic';

import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withPlatformAuth } from '../../../../middleware/auth';

/**
 * Fresh platform-access admission for browser Firestore monitors.
 *
 * The page layouts and Firebase rules still provide their normal session/token
 * gates. This endpoint adds one current users/{uId} read immediately before a
 * browser monitor starts its bounded cross-tenant reads, including MobileShell
 * sub-screens that can remain mounted under /dashboard.
 */
export const GET = withPlatformAuth(async (request: NextRequest, session: any) => {
  const rateLimitConfig = getRateLimitForFeature('DATA_READ');
  const operatorId = String(session?.uId || session?.user?.id || 'platform');
  const rateLimit = await checkRateLimit({
    key: `platform-current-access:${hashPublicRateLimitValue(operatorId)}`,
    ...rateLimitConfig,
    failClosedOnProviderError: true,
  });

  if (!rateLimit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Platform current-access check rate limited', {
      ...getBoundedSecurityRouteContext(session, request),
    }, 'medium');
    return NextResponse.json(
      {
        error: rateLimit.reason === 'provider_unavailable'
          ? 'Platform access check is temporarily unavailable'
          : 'Too many platform access checks',
        retryAfter,
      },
      {
        status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        headers: {
          'Cache-Control': 'private, no-store',
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

  const currentPlatformUser = await getCurrentPlatformUser(session);
  if (!currentPlatformUser) {
    logger.security('Authorization Failed - Current Platform Access', {
      ...getBoundedSecurityRouteContext(session, request),
    }, 'high');
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return NextResponse.json(
    { authorized: true, accessModel: 'current_persisted_platform_user' },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
});
