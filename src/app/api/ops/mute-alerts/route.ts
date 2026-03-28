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
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

export const POST = withAuth(async (request, session) => {
  try {
    const { durationMinutes } = await request.json();

    const duration = Number(durationMinutes);
    if (!duration || duration < 1 || duration > 120) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be between 1 and 120 minutes.' },
        { status: 400 }
      );
    }

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
    console.error('[API /ops/mute-alerts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mute alerts' },
      { status: 500 }
    );
  }
}, { requiredPlatformRole: 'PLATFORM' });
