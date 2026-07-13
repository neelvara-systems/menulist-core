export const dynamic = 'force-dynamic';
/**
 * Weekly Narrative Manual Regeneration API
 * 
 * Triggers the Cloud Function to regenerate weekly digest
 * POST /api/analytics/weekly-narrative/regenerate
 */

import { NextRequest, NextResponse } from 'next/server';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { POST as generateWeeklyNarrativePost } from '../generate-local/route';

export async function POST(request: NextRequest) {
  try {
    return await generateWeeklyNarrativePost(request);

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
}
