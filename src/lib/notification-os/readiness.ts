import { isInternalNotificationEmail } from '@data/shared/notificationOs';
import { normalizeWhatsAppOsRecipient } from '@data/shared/whatsappOs';
import type { OwnerNotificationSettings } from './preferences';

const INTERNAL_EMAIL_DOMAINS = ['msg.menulist.ai', 'msg.menulist.digital'] as const;

export type NotificationOsSessionIdentity = {
    dialCode?: string;
    email?: string;
    isVerified?: boolean;
    phone?: string;
    phoneLoginEnabled?: boolean;
    phoneNumber?: string;
};

export type NotificationOsContactReadiness = {
    emailDisplay: string;
    emailReady: boolean;
    whatsappDisplay: string;
    whatsappReady: boolean;
};

function normalizeVerifiedEmail(settings: OwnerNotificationSettings, identity: NotificationOsSessionIdentity): string | undefined {
    const persisted = settings.emailVerified === true ? settings.primaryEmail?.trim().toLowerCase() : undefined;
    const sessionEmail = identity.isVerified !== false ? identity.email?.trim().toLowerCase() : undefined;
    const candidate = persisted || sessionEmail;
    if (!candidate || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return undefined;
    return isInternalNotificationEmail(candidate, INTERNAL_EMAIL_DOMAINS) ? undefined : candidate;
}

function normalizeVerifiedWhatsApp(settings: OwnerNotificationSettings, identity: NotificationOsSessionIdentity): string | undefined {
    const candidate = settings.whatsappVerified === true
        ? settings.whatsappNumber
        : identity.phoneLoginEnabled === true
            ? `${identity.dialCode || ''}${identity.phoneNumber || identity.phone || ''}`
            : undefined;
    if (!candidate) return undefined;
    try {
        return normalizeWhatsAppOsRecipient(candidate);
    } catch {
        return undefined;
    }
}

export function maskNotificationEmail(email: string): string {
    const [local, domain] = email.split('@');
    return `${local.slice(0, 1)}${local.length > 1 ? '•••' : ''}@${domain}`;
}

export function maskNotificationPhone(phone: string): string {
    return `•••• ${phone.slice(-4)}`;
}

export function resolveNotificationOsContactReadiness(
    settings: OwnerNotificationSettings,
    identity: NotificationOsSessionIdentity,
): NotificationOsContactReadiness {
    const email = normalizeVerifiedEmail(settings, identity);
    const whatsapp = normalizeVerifiedWhatsApp(settings, identity);
    return {
        emailDisplay: email ? maskNotificationEmail(email) : 'No verified email',
        emailReady: Boolean(email),
        whatsappDisplay: whatsapp ? maskNotificationPhone(whatsapp) : 'No verified WhatsApp number',
        whatsappReady: Boolean(whatsapp),
    };
}

export function canSaveNotificationOsMode(params: {
    emailReady: boolean;
    mode: 'email_only' | 'whatsapp_only' | 'email_and_whatsapp' | 'preferred_available';
    revokingConsent: boolean;
    whatsappConsent: boolean;
    whatsappReady: boolean;
}): boolean {
    if (params.revokingConsent) return true;
    const whatsappEligible = params.whatsappReady && params.whatsappConsent;
    if (params.mode === 'email_only') return params.emailReady;
    if (params.mode === 'whatsapp_only') return whatsappEligible;
    if (params.mode === 'email_and_whatsapp') return params.emailReady && whatsappEligible;
    return params.emailReady || whatsappEligible;
}
