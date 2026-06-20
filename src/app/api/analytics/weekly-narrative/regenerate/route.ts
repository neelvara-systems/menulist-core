export const dynamic = 'force-dynamic';
/**
 * Weekly Narrative Manual Regeneration API
 * 
 * Triggers the Cloud Function to regenerate weekly digest
 * POST /api/analytics/weekly-narrative/regenerate
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lib/monitoring/logger';
import { POST as generateWeeklyNarrativeLocally } from '../generate-local/route';

export async function POST(request: NextRequest) {
  try {
    return await generateWeeklyNarrativeLocally(request);

  } catch (error: any) {
    logger.error('[Weekly Narrative Regeneration] Error', error);

    return NextResponse.json(
      {
        error: 'Failed to regenerate weekly narrative'
      },
      { status: 500 }
    );
  }
}
