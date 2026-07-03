export const dynamic = 'force-dynamic';
/**
 * POST /api/ops/mute-alerts
 * 
 * Mute alert delivery for a specified duration (deploy window).
 * Superadmin (PLATFORM role) only.
 * 
 * Request: { durationMinutes: number }
 * Response: { success: true, mutedUntil: string }
 * 
 * Firebase cost: 1 write per mute (rare — before deploys only).
 * 
 * @see __docs__/ops-alerting-delivery/ops-alerting-delivery_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { logger } from '@lib/monitoring/logger';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext } from '@lib/security/securityDiagnostics';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const OPS_MUTE_ALERTS_MAX_BODY_BYTES = 1024;

const MuteAlertsRequestSchema = z.object({
  durationMinutes: z.number().int().min(1).max(120),
});

function getOperatorId(session: any): string {
  return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

export const POST = withAuth(async (request, session) => {
  try {
    const operatorId = getOperatorId(session);
    const operatorRateLimitHash = hashPublicRateLimitValue(operatorId);
    const rateLimit = await checkRateLimit({
      key: `ops-mute-alerts:${operatorRateLimitHash}`,
      limit: 10,
      window: 60 * 60,
    });
    if (!rateLimit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
      logger.security('Ops mute-alerts rate limited', {
        ...getBoundedSecurityRouteContext(session, request),
      }, 'medium');
      return NextResponse.json(
        { error: 'Too many alert mute attempts', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }

    const bodyResult = await readBoundedJsonBody(request, OPS_MUTE_ALERTS_MAX_BODY_BYTES, {
      invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = MuteAlertsRequestSchema.safeParse(bodyResult.data);

    if (!validation.success) {
      const details = getSafeZodValidationDetails(validation.error);
      logger.security('Ops mute-alerts input validation failed', {
        ...getBoundedSecurityRouteContext(session, request),
        details,
      }, 'medium');
      return NextResponse.json(
        { error: 'Invalid input', details },
        { status: 400 }
      );
    }

    const duration = validation.data.durationMinutes;
    const db = getFirestore();
    const opsRef = db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system');

    const mutedUntil = Timestamp.fromMillis(
      Date.now() + duration * 60 * 1000
    );

    await opsRef.set(
      { alertsMutedUntil: mutedUntil },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      mutedUntil: mutedUntil.toDate().toISOString(),
      durationMinutes: duration,
    });
  } catch (error) {
    logOpsFailure('ops_mute_alerts_route_failed', error, {
      ...getBoundedOpsStringContext('userId', getOperatorId(session)),
      ...getBoundedOpsStringContext('requestPath', request.nextUrl.pathname),
    });
    return NextResponse.json(
      { error: 'Failed to mute alerts' },
      { status: 500 }
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
