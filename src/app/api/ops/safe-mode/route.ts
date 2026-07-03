export const dynamic = 'force-dynamic';
/**
 * POST /api/ops/safe-mode
 * 
 * Enable/disable SAFE_MODE circuit breaker.
 * Superadmin (PLATFORM role) only.
 * 
 * Request: { action: 'activate' | 'deactivate', reason?: string }
 * Response: { success: true, SAFE_MODE: boolean }
 * 
 * Firebase cost: 2 writes per toggle (ops_config + systemAlerts), plus one
 * alert mute read when Telegram delivery is enabled.
 * 
 * @see __docs__/cost-self-protection/cost-self-protection_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '@data/shared/platformNotificationRegistry';
import { logger } from '@lib/monitoring/logger';
import { createAlert } from '@lib/ops/alerts';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const OPS_SAFE_MODE_MAX_BODY_BYTES = 2 * 1024;

const SafeModeRequestSchema = z.object({
  action: z.enum(['activate', 'deactivate']),
  reason: z.string().trim().max(500).optional(),
});

function getOperatorId(session: any): string {
  return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

export const POST = withAuth(async (request, session) => {
  try {
    const operatorId = getOperatorId(session);
    const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);
    const rateLimit = await checkRateLimit({
      key: `ops-safe-mode:${operatorRateLimitHash}`,
      limit: 10,
      window: 60 * 60,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      logger.security('Ops SAFE_MODE rate limited', {
        ...getBoundedSecurityRouteContext(session, request),
      }, 'high');
      return NextResponse.json(
        { error: 'Too many SAFE_MODE toggle attempts', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    const bodyResult = await readBoundedJsonBody(request, OPS_SAFE_MODE_MAX_BODY_BYTES, {
      invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = validateAPIInput(SafeModeRequestSchema, bodyResult.data);

    if (validation.success === false) {
      logger.security('Ops SAFE_MODE input validation failed', {
        ...getBoundedSecurityRouteContext(session, request),
        details: validation.error,
      }, 'medium');
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { action, reason } = validation.data;
    const db = getFirestore();
    const opsRef = db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system');

    if (action === 'activate') {
      await opsRef.set({
        SAFE_MODE: true,
        activatedAt: Timestamp.now(),
        activatedBy: session.user?.email || 'unknown',
        reason: reason || 'Manual activation from ops dashboard',
      }, { merge: true });

      logger.security('SAFE_MODE Activated', {
        ...getBoundedSecurityRouteContext(session, request),
        ...getBoundedOpsStringContext('reason', reason || 'Manual activation'),
      }, 'critical');

      await createAlert({
        severity: 'critical',
        type: 'usage',
        title: 'SAFE_MODE activated',
        message: reason || 'Manual activation from ops dashboard',
        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_ACTIVATED,
        productId: 'PLATFORM',
        category: 'cost',
        metadata: {
          reason: reason || 'Manual activation from ops dashboard',
          operatorId,
          sourcePath: 'src/app/api/ops/safe-mode/route.ts',
        },
      });

      return NextResponse.json({ success: true, SAFE_MODE: true });
    } else {
      await opsRef.set({
        SAFE_MODE: false,
        deactivatedAt: Timestamp.now(),
        reason: null,
      }, { merge: true });

      logger.security('SAFE_MODE Deactivated', {
        ...getBoundedSecurityRouteContext(session, request),
      }, 'high');

      await createAlert({
        severity: 'warning',
        type: 'usage',
        title: 'SAFE_MODE deactivated',
        message: reason || 'Manual deactivation from ops dashboard',
        triggerType: PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_DEACTIVATED,
        productId: 'PLATFORM',
        category: 'cost',
        metadata: {
          reason: reason || 'Manual deactivation from ops dashboard',
          operatorId,
          sourcePath: 'src/app/api/ops/safe-mode/route.ts',
        },
      });

      return NextResponse.json({ success: true, SAFE_MODE: false });
    }
  } catch (error) {
    logOpsFailure('ops_safe_mode_route_failed', error, {
      ...getBoundedOpsStringContext('userId', getOperatorId(session)),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
    });
    return NextResponse.json(
      { error: 'Failed to toggle SAFE_MODE' },
      { status: 500 }
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
