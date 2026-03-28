export const dynamic = 'force-dynamic';
/**
 * Weekly Narrative Manual Regeneration API
 * 
 * Triggers the Cloud Function to regenerate weekly digest
 * POST /api/analytics/weekly-narrative/regenerate
 */

import getActiveSession from '@lib/auth/getActiveSession';
import { functions } from '@lib/firebase/firebaseClient';
import { httpsCallable } from 'firebase/functions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 🛡️ SAFE_MODE: Block expensive AI operations during system maintenance
    const { checkSafeMode } = await import('@lib/ops/safeMode');
    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    // 1. Authentication
    const session = await getActiveSession();
    if (!session?.tId || !session?.sId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Call Cloud Function (specific weekly narrative trigger)
    const triggerWeeklyNarrative = httpsCallable(functions, 'triggerWeeklyNarrativeManually');

    console.log(`[Weekly Narrative Regeneration] Triggering for tenant ${session.tId}, store ${session.sId}`);

    const result = await triggerWeeklyNarrative({
      tId: session.tId,
      sId: session.sId
    });

    console.log(`[Weekly Narrative Regeneration] Result:`, result);

    // 3. Return success
    return NextResponse.json({
      success: true,
      message: 'Weekly narrative regeneration triggered',
      data: result.data
    });

  } catch (error: any) {
    console.error('[Weekly Narrative Regeneration] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to regenerate weekly narrative',
        details: error.message
      },
      { status: 500 }
    );
  }
}
