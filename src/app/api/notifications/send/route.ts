export const dynamic = 'force-dynamic';

/**
 * Notification Send API — Internal endpoint for triggering email notifications.
 *
 * Called fire-and-forget from client-side DAL functions (tickets, etc.).
 * Uses firebase-admin for logging (server-side only).
 * Protected by current Answerlattice support permission. Recipient and
 * template data are derived from the exact persisted ticket.
 *
 * @see src/lib/notifications/index.ts — Core notification sender
 */

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    normalizeAnswerlatticeSupportTicketId,
    parseAnswerlatticeSupportTicketDocument,
} from '@lib/answerlattice/supportTicketLifecycle';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { sendNotification } from '@lib/notifications';
import {
    getBoundedNotificationStringContext,
    getNotificationPayloadLogContext,
    logNotificationFailure,
} from '@lib/notifications/notificationDiagnostics';
import {
    CLIENT_TICKET_NOTIFICATION_EVENTS,
    projectTicketNotification,
} from '@lib/notifications/ticketNotificationBoundary';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import { hashPublicRateLimitValue } from '../../../../middleware/publicApi';

const NOTIFICATION_SEND_MAX_BODY_BYTES = 16 * 1024;

const NotificationRequestSchema = z.object({
    eventType: z.enum(CLIENT_TICKET_NOTIFICATION_EVENTS),
    ticketId: z.string().trim().min(1).max(180),
    messageId: z.string().trim().min(1).max(180).optional(),
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
}).strict();

export const POST = withAuth(async (request: NextRequest, session) => {
    let failureContext: Record<string, boolean | number | string | null | undefined> = {
        endpoint: '/api/notifications/send',
    };

    try {
        const userId = String(session?.uId || session?.user?.id || session?.user?.email || '').trim();
        failureContext = {
            ...failureContext,
            ...getBoundedNotificationStringContext('userId', userId),
        };

        const userRateLimitHash = hashPublicRateLimitValue(userId || 'unknown');
        const rateLimitResult = await checkRateLimit({
            key: `notification-send:${userRateLimitHash}`,
            limit: 120,
            window: 60 * 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            return NextResponse.json({
                error: providerUnavailable
                    ? 'Notification delivery is temporarily unavailable.'
                    : 'Too many notification attempts. Try again later.',
            }, { status: providerUnavailable ? 503 : 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, NOTIFICATION_SEND_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid notification request',
        });
        if (bodyResult.ok === false) return bodyResult.response;

        const parsed = NotificationRequestSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid notification request' }, { status: 400 });
        }
        const ticketId = normalizeAnswerlatticeSupportTicketId(parsed.data.ticketId);
        if (!ticketId) {
            return NextResponse.json({ error: 'Invalid notification request' }, { status: 400 });
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
            {
                tenantId: parsed.data.tId,
                storeId: parsed.data.sId,
            },
        );
        if (permission.response) return permission.response;
        if (!permission.access) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const ticketSnapshot = await answerlatticeFirestoreAdmin
            .collection(DB_COLLECTIONS.SUPPORT_TICKETS)
            .doc(ticketId)
            .get();

        const ticket = ticketSnapshot.exists
            ? parseAnswerlatticeSupportTicketDocument({
                id: ticketSnapshot.id,
                value: ticketSnapshot.data(),
                scope: {
                    tId: permission.access.scope.tenantId,
                    sId: permission.access.scope.storeId,
                },
            })
            : null;
        if (!ticket || ticket.deleted === true) {
            return NextResponse.json({ error: 'Notification target not found' }, { status: 404 });
        }

        const projection = projectTicketNotification({
            eventType: parsed.data.eventType,
            messageId: parsed.data.messageId,
            ticket,
        });
        if (!projection.ok) {
            return NextResponse.json({ error: 'Notification target is not available' }, { status: 409 });
        }
        failureContext = {
            ...failureContext,
            ...getNotificationPayloadLogContext(projection.payload),
        };

        const sent = await sendNotification(projection.payload);

        return NextResponse.json({ sent });
    } catch (err: any) {
        logNotificationFailure('notification_send_route_failed', err, failureContext);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
    }
});
