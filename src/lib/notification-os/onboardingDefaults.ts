import { isInternalNotificationEmail } from '@data/shared/notificationOs';
import { normalizeWhatsAppOsRecipient } from '@data/shared/whatsappOs';
import type { OwnerNotificationSettings } from './preferences';

const INTERNAL_EMAIL_DOMAINS = ['msg.menulist.ai', 'msg.menulist.digital'] as const;

type OnboardingNotificationIdentity = {
    countryCode?: unknown;
    dialCode?: unknown;
    email?: unknown;
    emailVerified?: boolean;
    phone?: unknown;
    phoneNumber?: unknown;
    phoneVerified?: boolean;
    phoneVerifiedAt?: unknown;
    whatsappVerifiedAt?: unknown;
};

function normalizeVerifiedEmail(identity: OnboardingNotificationIdentity): string | undefined {
    if (identity.emailVerified !== true) return undefined;
    const email = typeof identity.email === 'string' ? identity.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
    return isInternalNotificationEmail(email, INTERNAL_EMAIL_DOMAINS) ? undefined : email;
}

function normalizeVerifiedWhatsApp(identity: OnboardingNotificationIdentity): string | undefined {
    const verified = identity.phoneVerified === true
        || identity.phoneVerifiedAt != null
        || identity.whatsappVerifiedAt != null;
    if (!verified) return undefined;
    const candidate = [identity.dialCode, identity.phoneNumber || identity.phone]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join('');
    if (!candidate) return undefined;
    try {
        return normalizeWhatsAppOsRecipient(candidate);
    } catch {
        return undefined;
    }
}

/**
 * Initializes the owner notification policy from onboarding authority without
 * creating a second Firestore write. Both channels are selected by default,
 * while provider routing still requires a verified destination and explicit
 * WhatsApp consent before that channel can be used.
 */
export function buildOnboardingOwnerNotificationSettings(
    identity: OnboardingNotificationIdentity,
): OwnerNotificationSettings {
    const email = normalizeVerifiedEmail(identity);
    const whatsappNumber = normalizeVerifiedWhatsApp(identity);
    return {
        ...(email ? {
            billingEmail: email,
            emailVerified: true,
            primaryEmail: email,
        } : {}),
        ...(whatsappNumber ? {
            whatsappNumber,
            whatsappVerified: true,
        } : {}),
        channelMode: 'email_and_whatsapp',
        preferredChannel: whatsappNumber && !email ? 'whatsapp' : 'email',
        preferredChannels: whatsappNumber && !email ? ['whatsapp', 'email'] : ['email', 'whatsapp'],
        quietHoursEnabled: true,
    };
}
