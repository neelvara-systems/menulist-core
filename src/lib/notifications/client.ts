/**
 * Client-side notification trigger (fire-and-forget)
 *
 * Used by DAL functions (which run client-side) to trigger
 * email notifications via the /api/notifications/send route.
 *
 * Always fire-and-forget: never blocks the calling operation.
 * Errors are silently caught — notification failure must NEVER
 * prevent a ticket from being updated or a message from being sent.
 *
 * @see src/app/api/notifications/send/route.ts — Server-side handler
 * @see src/lib/notifications/index.ts — Core notification sender
 */

interface TriggerNotificationParams {
    eventType: string;
    recipientEmail: string;
    recipientName?: string;
    referenceId: string;
    metadata?: Record<string, any>;
    productId?: string;
    skipDedup?: boolean;
}

/**
 * Trigger a notification email via the internal API.
 * Fire-and-forget: returns immediately, never throws.
 */
export function triggerNotification(params: TriggerNotificationParams): void {
    // Fire-and-forget: intentionally not awaited
    fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    }).catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[Notification] Trigger request failed', error);
        }
    });
}
