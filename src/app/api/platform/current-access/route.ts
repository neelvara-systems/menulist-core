export const dynamic = 'force-dynamic';

import {
  getCurrentPlatformUser,
  resolveCurrentSessionUserDocumentId,
} from '@lib/auth/currentPlatformUser';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withPlatformAuth } from '../../../../middleware/auth';

const PLATFORM_ACCESS_PRIVATE_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
} as const;
const platformAccessJson = (body: unknown, init: ResponseInit = {}) => {
  const headers = new Headers(init.headers);
  Object.entries(PLATFORM_ACCESS_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
    headers.set(name, value);
  });
  return NextResponse.json(body, { ...init, headers });
};

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
  const operatorId = resolveCurrentSessionUserDocumentId(session) || 'invalid-platform-session';
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
    return platformAccessJson(
      {
        error: rateLimit.reason === 'provider_unavailable'
          ? 'Platform access check is temporarily unavailable'
          : 'Too many platform access checks',
        retryAfter,
      },
      {
        status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        headers: {
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
    return platformAccessJson(
      { error: 'Forbidden' },
      { status: 403 },
    );
  }

  return platformAccessJson(
    { authorized: true, accessModel: 'current_persisted_platform_user' },
  );
});
