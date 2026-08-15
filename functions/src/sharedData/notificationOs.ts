/**
 * NotificationOS pure cross-runtime routing contract.
 *
 * This module performs no Firebase or provider work. It is intentionally
 * self-contained so MenuList Functions can use an exact mirror.
 */

export type NotificationOsChannel = 'email' | 'whatsapp';
export type NotificationOsChannelMode =
    | 'email_only'
    | 'whatsapp_only'
    | 'email_and_whatsapp'
    | 'preferred_available'
    | 'all_eligible_critical';

export type NotificationOsEligibilityReason =
    | 'eligible'
    | 'channel_disabled'
    | 'not_requested'
    | 'recipient_missing'
    | 'email_internal_identity'
    | 'email_not_verified'
    | 'whatsapp_phone_not_verified'
    | 'whatsapp_consent_missing';

export type NotificationOsChannelPlanItem = {
    channel: NotificationOsChannel;
    eligible: boolean;
    reason: NotificationOsEligibilityReason;
};

export type NotificationOsPlanInput = {
    allowedChannels: readonly NotificationOsChannel[];
    requestedChannels?: readonly NotificationOsChannel[];
    mode?: NotificationOsChannelMode;
    preferredChannels?: readonly NotificationOsChannel[];
    email?: string;
    emailVerified: boolean;
    emailInternalIdentity: boolean;
    whatsappNumber?: string;
    phoneVerified: boolean;
    whatsappConsentGranted: boolean;
    requiresWhatsAppConsent: boolean;
    enabledChannels: Readonly<Record<NotificationOsChannel, boolean>>;
};

const CHANNEL_ORDER: readonly NotificationOsChannel[] = ['email', 'whatsapp'];

export function getNotificationOsChannelMode(
    channels: readonly NotificationOsChannel[],
): NotificationOsChannelMode {
    const email = channels.includes('email');
    const whatsapp = channels.includes('whatsapp');
    if (email && whatsapp) return 'email_and_whatsapp';
    if (whatsapp) return 'whatsapp_only';
    return 'email_only';
}

function channelsForMode(input: NotificationOsPlanInput): NotificationOsChannel[] {
    const allowed = CHANNEL_ORDER.filter((channel) => input.allowedChannels.includes(channel));
    const requested = input.requestedChannels?.length
        ? allowed.filter((channel) => input.requestedChannels?.includes(channel))
        : allowed;
    const mode = input.mode || getNotificationOsChannelMode(requested);

    if (mode === 'email_only') return requested.filter((channel) => channel === 'email');
    if (mode === 'whatsapp_only') return requested.filter((channel) => channel === 'whatsapp');
    if (mode === 'email_and_whatsapp' || mode === 'all_eligible_critical') return requested;

    const preferred = input.preferredChannels || [];
    const ordered = [
        ...preferred.filter((channel) => requested.includes(channel)),
        ...requested.filter((channel) => !preferred.includes(channel)),
    ];
    return ordered;
}

function evaluateChannel(
    channel: NotificationOsChannel,
    selected: readonly NotificationOsChannel[],
    input: NotificationOsPlanInput,
): NotificationOsChannelPlanItem {
    if (!input.allowedChannels.includes(channel) || !selected.includes(channel)) {
        return { channel, eligible: false, reason: 'not_requested' };
    }
    if (!input.enabledChannels[channel]) {
        return { channel, eligible: false, reason: 'channel_disabled' };
    }
    if (channel === 'email') {
        if (!input.email) return { channel, eligible: false, reason: 'recipient_missing' };
        if (input.emailInternalIdentity) {
            return { channel, eligible: false, reason: 'email_internal_identity' };
        }
        if (!input.emailVerified) return { channel, eligible: false, reason: 'email_not_verified' };
        return { channel, eligible: true, reason: 'eligible' };
    }
    if (!input.whatsappNumber) return { channel, eligible: false, reason: 'recipient_missing' };
    if (!input.phoneVerified) {
        return { channel, eligible: false, reason: 'whatsapp_phone_not_verified' };
    }
    if (input.requiresWhatsAppConsent && !input.whatsappConsentGranted) {
        return { channel, eligible: false, reason: 'whatsapp_consent_missing' };
    }
    return { channel, eligible: true, reason: 'eligible' };
}

export function planNotificationOsChannels(input: NotificationOsPlanInput): NotificationOsChannelPlanItem[] {
    const selected = channelsForMode(input);
    const evaluated = CHANNEL_ORDER
        .filter((channel) => input.allowedChannels.includes(channel))
        .map((channel) => evaluateChannel(channel, selected, input));
    const mode = input.mode || getNotificationOsChannelMode(selected);
    if (mode !== 'preferred_available') return evaluated;

    const preferredOrder = selected;
    const chosen = preferredOrder.find((channel) => (
        evaluated.find((item) => item.channel === channel)?.eligible === true
    ));
    if (!chosen) return evaluated;
    return evaluated.map((item) => (
        item.channel === chosen || !item.eligible
            ? item
            : { ...item, eligible: false, reason: 'not_requested' }
    ));
}

export function isInternalNotificationEmail(
    email: string | undefined,
    internalDomains: readonly string[],
): boolean {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    const at = normalized.lastIndexOf('@');
    if (at <= 0) return false;
    const domain = normalized.slice(at + 1);
    return internalDomains.some((candidate) => domain === candidate.trim().toLowerCase());
}
