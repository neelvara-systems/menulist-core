export const dynamic = 'force-dynamic';
/**
 * Weekly Narrative Manual Regeneration API
 * 
 * Triggers the Cloud Function to regenerate weekly digest
 * POST /api/analytics/weekly-narrative/regenerate
 */

import { NextRequest, NextResponse } from 'next/server';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { withAuth } from '@/middleware/auth';
import { generateWeeklyNarrativeLocally } from '../generate-local/route';

export const POST = withAuth(async (request: NextRequest, session) => {
  try {
    return await generateWeeklyNarrativeLocally(request, session);

  } catch (error: any) {
    logRuntimeFailure('weekly_narrative_regeneration_failed', error, {
      endpoint: '/api/analytics/weekly-narrative/regenerate',
    });

    return NextResponse.json(
      {
        error: 'Failed to regenerate weekly narrative'
      },
      { status: 500 }
    );
  }
});
