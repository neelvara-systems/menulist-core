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
 * Cost: one fail-closed limiter operation and one current-user Firestore read.
 * A transition adds one ops_config transaction read/write and one best-effort
 * systemAlerts write; alert delivery may add one mute read. A no-op transition
 * adds only the transaction read and does not create an alert.
 * 
 * @see __docs__/cost-self-protection/cost-self-protection_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { PLATFORM_NOTIFICATION_TRIGGER_TYPES } from '@data/shared/platformNotificationRegistry';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { createAlert } from '@lib/ops/alerts';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { Timestamp } from 'firebase-admin/firestore';
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
      failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      logger.security('Ops SAFE_MODE rate limited', {
        ...getBoundedSecurityRouteContext(session, request),
      }, 'high');
      return NextResponse.json(
        {
          error: rateLimit.reason === 'provider_unavailable'
            ? 'SAFE_MODE controls are temporarily unavailable'
            : 'Too many SAFE_MODE toggle attempts',
          retryAfter,
        },
        {
          status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
          headers: { 'Retry-After': String(retryAfter) },
        },
      );
    }

    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
      logger.security('Authorization Failed - SAFE_MODE Current Platform Role', {
        ...getBoundedSecurityRouteContext(session, request),
      }, 'high');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    const targetSafeMode = action === 'activate';
    const operatorUserId = currentPlatformUser.documentId;
    const changedAt = Timestamp.now();
    const opsRef = firestoreAdmin.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system');
    const changed = await firestoreAdmin.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(opsRef);
      const currentSafeMode = currentSnapshot.data()?.SAFE_MODE === true;
      if (currentSafeMode === targetSafeMode) return false;

      transaction.set(opsRef, targetSafeMode
        ? {
          SAFE_MODE: true,
          activatedAt: changedAt,
          activatedBy: operatorUserId,
          reason: reason || 'Manual activation from ops dashboard',
        }
        : {
          SAFE_MODE: false,
          deactivatedAt: changedAt,
          deactivatedBy: operatorUserId,
          reason: null,
        }, { merge: true });
      return true;
    });

    if (!changed) {
      return NextResponse.json({ success: true, SAFE_MODE: targetSafeMode, changed: false });
    }

    logger.security(targetSafeMode ? 'SAFE_MODE Activated' : 'SAFE_MODE Deactivated', {
      ...getBoundedSecurityRouteContext(session, request),
      ...(targetSafeMode ? getBoundedOpsStringContext('reason', reason || 'Manual activation') : {}),
    }, targetSafeMode ? 'critical' : 'high');

    const alertId = await createAlert({
      severity: targetSafeMode ? 'critical' : 'warning',
      type: 'usage',
      title: targetSafeMode ? 'SAFE_MODE activated' : 'SAFE_MODE deactivated',
      message: reason || (targetSafeMode
        ? 'Manual activation from ops dashboard'
        : 'Manual deactivation from ops dashboard'),
      triggerType: targetSafeMode
        ? PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_ACTIVATED
        : PLATFORM_NOTIFICATION_TRIGGER_TYPES.SAFE_MODE_DEACTIVATED,
      productId: 'PLATFORM',
      category: 'cost',
      metadata: {
        reason: reason || (targetSafeMode
          ? 'Manual activation from ops dashboard'
          : 'Manual deactivation from ops dashboard'),
        operatorId: operatorUserId,
        sourcePath: 'src/app/api/ops/safe-mode/route.ts',
      },
    });
    if (!alertId) {
      logOpsFailure('ops_safe_mode_alert_write_failed', undefined, {
        targetSafeMode,
        ...getBoundedOpsStringContext('userId', operatorUserId),
      });
    }

    return NextResponse.json({
      success: true,
      SAFE_MODE: targetSafeMode,
      changed: true,
      alertRecorded: Boolean(alertId),
    });
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
