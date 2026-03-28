export const dynamic = 'force-dynamic';

/**
 * Notification Send API — Internal endpoint for triggering email notifications.
 *
 * Called fire-and-forget from client-side DAL functions (tickets, etc.).
 * Uses firebase-admin for logging (server-side only).
 * Protected by session auth — only authenticated users can trigger.
 *
 * @see src/lib/notifications/index.ts — Core notification sender
 */

import { sendNotification } from '@lib/notifications';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        const body = await request.json();
        const { eventType, recipientEmail, recipientName, referenceId, metadata, skipDedup } = body;

        if (!eventType || !recipientEmail || !referenceId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sent = await sendNotification({
            eventType,
            recipientEmail,
            recipientName,
            referenceId,
            metadata: metadata || {},
            skipDedup,
        });

        return NextResponse.json({ sent });
    } catch (err: any) {
        console.error('[Notification API] Error:', err.message);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
});
