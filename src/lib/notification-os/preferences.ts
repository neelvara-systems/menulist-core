import type { NotificationOsChannel, NotificationOsChannelMode } from '@data/shared/notificationOs';

export const NOTIFICATION_OS_CONSENT_POLICY_VERSION = '2026-08-15';

export const NOTIFICATION_OS_OWNER_MODES = [
    'email_only',
    'whatsapp_only',
    'email_and_whatsapp',
    'preferred_available',
] as const satisfies readonly NotificationOsChannelMode[];

export type NotificationOsOwnerMode = (typeof NOTIFICATION_OS_OWNER_MODES)[number];
export type WhatsAppOsConsentChoice = 'grant' | 'revoke' | 'unchanged';

export type OwnerNotificationSettings = {
    primaryEmail?: string;
    emailVerified?: boolean;
    billingEmail?: string;
    whatsappNumber?: string;
    whatsappVerified?: boolean;
    whatsappConsent?: boolean;
    whatsappConsented?: boolean;
    whatsappConsentStatus?: 'granted' | 'revoked';
    whatsappConsentedAt?: string;
    whatsappConsentRevokedAt?: string;
    whatsappConsentSource?: 'owner_settings' | 'website_onboarding' | 'messaging_onboarding';
    whatsappConsentPolicyVersion?: string;
    preferredChannel?: NotificationOsChannel;
    preferredChannels?: NotificationOsChannel[];
    channelMode?: NotificationOsOwnerMode;
    consentedAt?: string;
    quietHoursEnabled?: boolean;
};

export function channelsForOwnerNotificationMode(mode: NotificationOsOwnerMode): NotificationOsChannel[] {
    if (mode === 'email_only') return ['email'];
    if (mode === 'whatsapp_only') return ['whatsapp'];
    return ['email', 'whatsapp'];
}

export function normalizeOwnerNotificationSettings(value: unknown): OwnerNotificationSettings {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const settings = value as Record<string, unknown>;
    const channelMode = NOTIFICATION_OS_OWNER_MODES.includes(settings.channelMode as NotificationOsOwnerMode)
        ? settings.channelMode as NotificationOsOwnerMode
        : settings.preferredChannel === 'email'
            ? 'email_only'
            : settings.preferredChannel === 'whatsapp'
                ? 'whatsapp_only'
                : 'email_and_whatsapp';
    const preferredChannels = Array.isArray(settings.preferredChannels)
        ? Array.from(new Set(settings.preferredChannels.filter(
            (channel): channel is NotificationOsChannel => channel === 'email' || channel === 'whatsapp',
        )))
        : channelsForOwnerNotificationMode(channelMode);

    const explicitConsentStatus = settings.whatsappConsentStatus === 'granted'
        ? 'granted'
        : settings.whatsappConsentStatus === 'revoked'
            ? 'revoked'
            : null;
    const whatsappConsent = explicitConsentStatus
        ? explicitConsentStatus === 'granted'
        : settings.whatsappConsent === true || settings.whatsappConsented === true;

    return {
        ...(typeof settings.primaryEmail === 'string' ? { primaryEmail: settings.primaryEmail } : {}),
        ...(typeof settings.billingEmail === 'string' ? { billingEmail: settings.billingEmail } : {}),
        ...(typeof settings.emailVerified === 'boolean' ? { emailVerified: settings.emailVerified } : {}),
        ...(typeof settings.whatsappNumber === 'string' ? { whatsappNumber: settings.whatsappNumber } : {}),
        ...(typeof settings.whatsappVerified === 'boolean' ? { whatsappVerified: settings.whatsappVerified } : {}),
        whatsappConsent,
        whatsappConsented: whatsappConsent,
        whatsappConsentStatus: whatsappConsent ? 'granted' : 'revoked',
        ...(typeof settings.whatsappConsentedAt === 'string' ? { whatsappConsentedAt: settings.whatsappConsentedAt } : {}),
        ...(typeof settings.whatsappConsentRevokedAt === 'string' ? { whatsappConsentRevokedAt: settings.whatsappConsentRevokedAt } : {}),
        ...(settings.whatsappConsentSource === 'owner_settings'
            || settings.whatsappConsentSource === 'website_onboarding'
            || settings.whatsappConsentSource === 'messaging_onboarding'
            ? { whatsappConsentSource: settings.whatsappConsentSource }
            : {}),
        ...(typeof settings.whatsappConsentPolicyVersion === 'string' ? { whatsappConsentPolicyVersion: settings.whatsappConsentPolicyVersion } : {}),
        ...(settings.preferredChannel === 'email' || settings.preferredChannel === 'whatsapp'
            ? { preferredChannel: settings.preferredChannel }
            : {}),
        channelMode,
        preferredChannels,
        ...(typeof settings.consentedAt === 'string' ? { consentedAt: settings.consentedAt } : {}),
        quietHoursEnabled: settings.quietHoursEnabled !== false,
    };
}

export function modeNeedsWhatsApp(mode: NotificationOsOwnerMode): boolean {
    return mode === 'whatsapp_only' || mode === 'email_and_whatsapp';
}

export function modeRequiresEmail(mode: NotificationOsOwnerMode): boolean {
    return mode === 'email_only' || mode === 'email_and_whatsapp';
}
