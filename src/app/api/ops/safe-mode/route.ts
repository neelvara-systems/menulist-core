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
 * Firebase cost: 1 write per toggle (extremely rare — emergency only).
 * 
 * @see __docs__/cost-self-protection/cost-self-protection_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { logger } from '@lib/monitoring/logger';
import { buildSecurityContext } from '@lib/security/securityContext';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const SafeModeRequestSchema = z.object({
  action: z.enum(['activate', 'deactivate']),
  reason: z.string().trim().max(500).optional(),
});

export const POST = withAuth(async (request, session) => {
  try {
    const validation = SafeModeRequestSchema.safeParse(await request.json());

    if (!validation.success) {
      logger.security('Ops SAFE_MODE input validation failed', {
        ...buildSecurityContext(session, request),
        details: validation.error.flatten(),
      }, 'medium');
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
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
        ...buildSecurityContext(session, request),
        reason: reason || 'Manual activation',
      }, 'critical');

      return NextResponse.json({ success: true, SAFE_MODE: true });
    } else {
      await opsRef.set({
        SAFE_MODE: false,
        deactivatedAt: Timestamp.now(),
        reason: null,
      }, { merge: true });

      logger.security('SAFE_MODE Deactivated', {
        ...buildSecurityContext(session, request),
      }, 'high');

      return NextResponse.json({ success: true, SAFE_MODE: false });
    }
  } catch (error) {
    logger.error('[API /ops/safe-mode] Error', error, buildSecurityContext(session, request));
    return NextResponse.json(
      { error: 'Failed to toggle SAFE_MODE' },
      { status: 500 }
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
