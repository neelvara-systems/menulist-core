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

import { PRODUCT_IDS } from '@constant/product';
import { sendNotification } from '@lib/notifications';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const ALLOWED_CLIENT_NOTIFICATION_EVENTS = [
    'TICKET_CREATED',
    'TICKET_REPLY',
    'TICKET_STATUS_CHANGED',
] as const;

const NotificationRequestSchema = z.object({
    eventType: z.enum(ALLOWED_CLIENT_NOTIFICATION_EVENTS),
    recipientEmail: z.string().trim().email().max(254),
    recipientName: z.string().trim().max(120).optional(),
    referenceId: z.string().trim().min(1).max(160),
    productId: z.string().trim().max(8).optional().default(PRODUCT_IDS.CANONICA),
    skipDedup: z.boolean().optional(),
    metadata: z.record(z.any()).optional().default({}),
});

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        const userId = String(session?.uId || session?.user?.id || session?.user?.email || '').trim();
        const rateLimitResult = await checkRateLimit({
            key: `notification-send:${userId || 'unknown'}`,
            limit: 120,
            window: 60 * 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many notification attempts. Try again later.' }, { status: 429 });
        }

        const parsed = NotificationRequestSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid notification request' }, { status: 400 });
        }

        const { eventType, recipientEmail, recipientName, referenceId, metadata, productId, skipDedup } = parsed.data;
        if (productId !== PRODUCT_IDS.CANONICA) {
            return NextResponse.json({ error: 'Unsupported notification product' }, { status: 400 });
        }

        const metadataSize = Buffer.byteLength(JSON.stringify(metadata), 'utf8');
        if (metadataSize > 8 * 1024) {
            return NextResponse.json({ error: 'Notification metadata is too large' }, { status: 400 });
        }

        const sent = await sendNotification({
            eventType,
            recipientEmail,
            recipientName,
            referenceId,
            metadata: metadata || {},
            productId,
            skipDedup,
        });

        return NextResponse.json({ sent });
    } catch (err: any) {
        secureError('[Notification API] Error', err as Error);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
});
