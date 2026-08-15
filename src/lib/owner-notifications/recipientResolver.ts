import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    hasOwnerNotificationWhatsAppConsent,
    normalizeOwnerNotificationDocumentId,
    normalizeOwnerNotificationDocumentIdAliases,
    normalizeOwnerNotificationNumericScopeAliases,
    normalizeOwnerNotificationNumericScopeDocumentId,
    type OwnerNotificationNumericScopeDocumentId,
} from '@data/shared/ownerNotificationDeliveryBoundary';
import { admin } from '@lib/firebase/firebaseAdmin';
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { MSG_EMAIL_DOMAIN } from '@constant/urls';
import {
    isInternalNotificationEmail,
    type NotificationOsChannelMode,
} from '@data/shared/notificationOs';
import type { Firestore } from 'firebase-admin/firestore';
import type {
    OwnerNotificationEventDoc,
    OwnerNotificationRecipient,
    OwnerNotificationScope,
} from './types';

function isValidEmail(value?: string): value is string {
    return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function cleanEmail(value?: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const email = value.trim();
    return email.length <= 254 && isValidEmail(email) ? email : undefined;
}

function cleanString(value?: unknown, maxLength = 160): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized ? normalized.slice(0, maxLength) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolvePreferredChannels(settings: Record<string, unknown>): Array<'email' | 'whatsapp'> {
    if (!Array.isArray(settings.preferredChannels)) return [];
    return Array.from(new Set(
        settings.preferredChannels.filter((value): value is 'email' | 'whatsapp' => (
            value === 'email' || value === 'whatsapp'
        )),
    ));
}

function resolveChannelMode(settings: Record<string, unknown>): NotificationOsChannelMode {
    const mode = settings.channelMode;
    return mode === 'email_only' || mode === 'whatsapp_only' || mode === 'email_and_whatsapp' || mode === 'preferred_available'
        ? mode
        : 'preferred_available';
}

function buildRecipientCapabilities(params: {
    email?: string;
    whatsappNumber?: string;
    settings: Record<string, unknown>;
    data: Record<string, unknown>;
}) {
    const settings = params.settings;
    const whatsappConsent = hasOwnerNotificationWhatsAppConsent(settings);
    const emailInternalIdentity = isInternalNotificationEmail(params.email, [MSG_EMAIL_DOMAIN]);
    return {
        whatsappConsent,
        emailVerified: Boolean(params.email) && !emailInternalIdentity && settings.emailVerified !== false,
        emailInternalIdentity,
        phoneVerified: Boolean(params.whatsappNumber) && (
            settings.whatsappVerified === true
            || params.data.phoneVerifiedAt != null
            || params.data.whatsappVerifiedAt != null
        ),
        preferredChannels: resolvePreferredChannels(settings),
        channelMode: resolveChannelMode(settings),
    };
}

function cleanPhone(value?: unknown, context?: Record<string, unknown> | null): string | undefined {
    const raw = cleanString(value, 64);
    if (!raw) return undefined;

    const phone = buildWhatsAppPhoneParam({
        countryCode: cleanString(context?.countryCode, 8),
        dialCode: cleanString(context?.dialCode, 8),
        phone: raw,
        phoneNumber: raw,
    });
    return phone.length >= 10 && phone.length <= 15 ? phone : undefined;
}

export function normalizeOwnerNotificationRecipientDocumentId(value: unknown): string | null {
    return normalizeOwnerNotificationDocumentId(value);
}

export function normalizeMenuListOwnerNotificationScopeDocumentId(
    value: unknown,
): OwnerNotificationNumericScopeDocumentId | null {
    return normalizeOwnerNotificationNumericScopeDocumentId(value);
}

function resolveFirstPhone(
    context: Record<string, unknown> | null | undefined,
    ...values: unknown[]
): string | undefined {
    for (const value of values) {
        const phone = cleanPhone(value, context);
        if (phone) return phone;
    }
    return undefined;
}

function getAnswerlatticeDb(): Firestore | null {
    return answerlatticeAdminApp ? answerlatticeFirestoreAdmin : null;
}

export async function resolveOwnerNotificationScope(
    event: OwnerNotificationEventDoc,
    options: { onRead?: () => void } = {},
): Promise<OwnerNotificationScope> {
    if (event.productId === PRODUCT_IDS.ANSWERLATTICE) {
        const db = getAnswerlatticeDb();
        const tenantDocumentId = normalizeOwnerNotificationRecipientDocumentId(event.tenantId);
        const workspaceDocumentId = normalizeOwnerNotificationRecipientDocumentId(event.workspaceId ?? event.storeId);
        if (!db || !tenantDocumentId || !workspaceDocumentId) return { readCount: 0 };
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(workspaceDocumentId).get();
        options.onRead?.();
        if (!storeSnap.exists) return { readCount: 1 };
        const workspaceData = storeSnap.data() || null;
        const storedTenantDocumentId = normalizeOwnerNotificationDocumentIdAliases([
            workspaceData?.tenantId,
            workspaceData?.tId,
        ]);
        return storedTenantDocumentId === tenantDocumentId
            ? { readCount: 1, workspaceData }
            : { readCount: 1 };
    }

    const tenantScope = normalizeMenuListOwnerNotificationScopeDocumentId(event.tenantId);
    const storeScope = normalizeMenuListOwnerNotificationScopeDocumentId(event.storeId);
    if (!tenantScope || !storeScope) return { readCount: 0 };

    const db = admin.firestore();
    const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();
    options.onRead?.();
    if (storeSnap.exists) {
        const storeData = storeSnap.data() || null;
        const storedTenantScope = normalizeOwnerNotificationNumericScopeAliases([
            storeData?.tenantId,
            storeData?.tId,
        ]);
        return storedTenantScope?.numericId === tenantScope.numericId
            ? { readCount: 1, storeData }
            : { readCount: 1 };
    }

    const legacyStoreSnap = await db
        .collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId)
        .collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId)
        .get();
    options.onRead?.();

    if (!legacyStoreSnap.exists) return { readCount: 2 };
    const storeData = legacyStoreSnap.data() || null;
    const storedTenantAliases = [storeData?.tenantId, storeData?.tId]
        .filter((value) => value !== undefined && value !== null);
    const storedTenantScope = storedTenantAliases.length > 0
        ? normalizeOwnerNotificationNumericScopeAliases(storedTenantAliases)
        : null;
    return storedTenantAliases.length === 0 || storedTenantScope?.numericId === tenantScope.numericId
        ? { readCount: 2, storeData }
        : { readCount: 2 };
}

export function resolveOwnerNotificationRecipient(
    event: OwnerNotificationEventDoc,
    scope: OwnerNotificationScope,
): OwnerNotificationRecipient {
    const data = event.productId === PRODUCT_IDS.ANSWERLATTICE
        ? scope.workspaceData || {}
        : scope.storeData || {};
    const settings = isRecord(data.notificationSettings) ? data.notificationSettings : {};
    const hints = event.recipientHints || {};
    const phoneContext = {
        countryCode: data.countryCode || settings.countryCode,
        dialCode: data.dialCode || settings.dialCode,
        phone: data.phone,
        phoneNumber: data.phoneNumber,
    };
    const forceHintRecipient = event.metadata?.manualRecipientOverride === true;
    const hintEmail = cleanEmail(hints.email);
    const hintWhatsappNumber = cleanPhone(hints.whatsappNumber, phoneContext);

    if (event.productId === PRODUCT_IDS.ANSWERLATTICE) {
        const primaryEmail = cleanEmail(settings.primaryEmail)
            || cleanEmail(data.ownerEmail)
            || cleanEmail(data.supportEmail);
        const resolvedEmail = event.recipientRole === 'support_owner'
            ? cleanEmail(data.supportEmail) || primaryEmail
            : event.recipientRole === 'billing_owner'
                ? cleanEmail(settings.billingEmail) || primaryEmail
                : primaryEmail;
        const resolvedWhatsappNumber = resolveFirstPhone(
            phoneContext,
            settings.whatsappNumber,
            data.whatsappNumber,
            data.phone,
            data.phoneNumber,
        );

        const email = forceHintRecipient ? hintEmail || resolvedEmail : resolvedEmail;
        const whatsappNumber = forceHintRecipient ? hintWhatsappNumber || resolvedWhatsappNumber : resolvedWhatsappNumber;
        return {
            role: event.recipientRole,
            email,
            name: cleanString(hints.name || data.productName || data.companyName || data.businessName),
            whatsappNumber,
            ...buildRecipientCapabilities({ email, whatsappNumber, settings, data }),
        };
    }

    const billingEmail = cleanEmail(settings.billingEmail);
    const primaryEmail = cleanEmail(settings.primaryEmail)
        || cleanEmail(data.contactPersonEmail)
        || cleanEmail(data.email);

    const email = event.recipientRole === 'billing_owner'
        ? billingEmail || primaryEmail
        : primaryEmail || billingEmail;
    const whatsappNumber = resolveFirstPhone(
        phoneContext,
        settings.whatsappNumber,
        data.ownerWhatsappNumber,
        data.whatsappNumber,
        data.phone,
        data.phoneNumber,
    );

    return {
        role: event.recipientRole,
        email: forceHintRecipient ? hintEmail || email : email,
        name: cleanString(hints.name || data.name || data.businessName),
        whatsappNumber: forceHintRecipient ? hintWhatsappNumber || whatsappNumber : whatsappNumber,
        ...buildRecipientCapabilities({ email: forceHintRecipient ? hintEmail || email : email, whatsappNumber: forceHintRecipient ? hintWhatsappNumber || whatsappNumber : whatsappNumber, settings, data }),
    };
}
