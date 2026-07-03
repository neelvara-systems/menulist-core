/**
 * SAFE_MODE Check for Next.js API Routes
 * 
 * Centralized utility — import and call checkSafeMode() at the top
 * of any expensive API route to block it during SAFE_MODE.
 * 
 * Design decisions:
 * - Fail-open: if check fails, operations continue (don't break the system to protect it)
 * - Feature flag gated: ENABLE_COST_PROTECTION must be true for checks to run
 * - Returns NextResponse(503) when SAFE_MODE active, null when OK
 * 
 * Firebase cost: 1 read per call (no caching in serverless API routes).
 * At 50 stores with ~50 AI calls/day = ~1500 reads/month = ~₹0.45/month.
 * 
 * @see __docs__/cost-self-protection/cost-self-protection_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { logOpsFailure } from '@lib/ops/opsDiagnostics';
import { NextResponse } from 'next/server';

/**
 * Check if SAFE_MODE is active. Call at the top of expensive API routes.
 * 
 * @returns NextResponse(503) if SAFE_MODE active, null if OK to proceed.
 * 
 * Usage:
 * ```ts
 * const safeModeResponse = await checkSafeMode();
 * if (safeModeResponse) return safeModeResponse;
 * ```
 */
export async function checkSafeMode(): Promise<NextResponse | null> {
  if (!FEATURE_FLAGS.ENABLE_COST_PROTECTION) return null;

  try {
    // Dynamic import to avoid bundling firebase-admin on client
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    const doc = await db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system').get();
    if (!doc.exists) return null;

    const data = doc.data();
    if (data?.SAFE_MODE === true) {
      return NextResponse.json(
        {
          error: 'System is in maintenance mode. Please try again later.',
          code: 'SAFE_MODE_ACTIVE',
        },
        { status: 503 }
      );
    }

    return null;
  } catch (error) {
    // Fail-open: don't block operations if check fails
    logOpsFailure('ops_safe_mode_check_failed', error, {
      failOpen: true,
    });
    return null;
  }
}
