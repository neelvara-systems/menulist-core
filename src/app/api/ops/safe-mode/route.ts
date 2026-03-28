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
import { withAuth } from '../../../../middleware/auth';

export const POST = withAuth(async (request, session) => {
  try {
    const { action, reason } = await request.json();

    if (!action || !['activate', 'deactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "activate" or "deactivate".' },
        { status: 400 }
      );
    }

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
    console.error('[API /ops/safe-mode] Error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle SAFE_MODE' },
      { status: 500 }
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
