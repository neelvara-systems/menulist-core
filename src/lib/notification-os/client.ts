import type { NotificationOsOwnerMode, OwnerNotificationSettings, WhatsAppOsConsentChoice } from './preferences';

export type SaveNotificationOsPreferencesInput = {
    expectedStoreId: string;
    expectedTenantId: string;
    mode: NotificationOsOwnerMode;
    preferredChannel?: 'email' | 'whatsapp';
    whatsappConsent: WhatsAppOsConsentChoice;
};

export async function saveNotificationOsPreferences(
    input: SaveNotificationOsPreferencesInput,
): Promise<OwnerNotificationSettings> {
    const response = await fetch('/api/notification-os/preferences', {
        body: JSON.stringify({ ...input, requestId: crypto.randomUUID() }),
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
    });
    const body = await response.json().catch(() => null) as { error?: unknown; notificationSettings?: unknown } | null;
    if (!response.ok) {
        const message = typeof body?.error === 'string' ? body.error : 'Could not save notification settings.';
        const error = new Error(message) as Error & { status?: number };
        error.status = response.status;
        throw error;
    }
    if (!body?.notificationSettings || typeof body.notificationSettings !== 'object') {
        throw new Error('Notification settings response was invalid.');
    }
    return body.notificationSettings as OwnerNotificationSettings;
}
