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
import { buildSecurityContext } from '@lib/security/securityContext';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const MuteAlertsRequestSchema = z.object({
  durationMinutes: z.number().int().min(1).max(120),
});

export const POST = withAuth(async (request, session) => {
  try {
    const validation = MuteAlertsRequestSchema.safeParse(await request.json());

    if (!validation.success) {
      logger.security('Ops mute-alerts input validation failed', {
        ...buildSecurityContext(session, request),
        details: validation.error.flatten(),
      }, 'medium');
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
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
    logger.error('[API /ops/mute-alerts] Error', error, buildSecurityContext(session, request));
    return NextResponse.json(
      { error: 'Failed to mute alerts' },
      { status: 500 }
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
