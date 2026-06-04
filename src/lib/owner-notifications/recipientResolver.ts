import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { admin } from '@lib/firebase/firebaseAdmin';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
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
    return typeof value === 'string' && isValidEmail(value) ? value.trim() : undefined;
}

function cleanString(value?: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function cleanPhone(value?: unknown, context?: Record<string, any> | null): string | undefined {
    const raw = cleanString(value);
    if (!raw) return undefined;

    const phone = buildWhatsAppPhoneParam({
        countryCode: cleanString(context?.countryCode),
        dialCode: cleanString(context?.dialCode),
        phone: raw,
        phoneNumber: raw,
    });
    return phone.length >= 10 && phone.length <= 15 ? phone : undefined;
}

function resolveFirstPhone(context: Record<string, any> | null | undefined, ...values: unknown[]): string | undefined {
    for (const value of values) {
        const phone = cleanPhone(value, context);
        if (phone) return phone;
    }
    return undefined;
}

function hasWhatsAppConsent(settings?: Record<string, any> | null): boolean {
    if (!settings) return false;
    const status = String(settings.whatsappConsentStatus || '').toLowerCase();
    return settings.whatsappConsent === true
        || settings.whatsappConsented === true
        || status === 'granted'
        || status === 'active'
        || status === 'verified';
}

function getAnswerlatticeDb(): Firestore | null {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
}

export async function resolveOwnerNotificationScope(
    event: OwnerNotificationEventDoc,
): Promise<OwnerNotificationScope> {
    if (event.productId === PRODUCT_IDS.ANSWERLATTICE) {
        const db = getAnswerlatticeDb();
        if (!db || !event.storeId) return {};
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(event.storeId)).get();
        return { workspaceData: storeSnap.exists ? storeSnap.data() || null : null };
    }

    if (!event.tenantId || !event.storeId) return {};
    const storeSnap = await admin.firestore()
        .collection(DB_COLLECTIONS.TENANTS).doc(String(event.tenantId))
        .collection(DB_COLLECTIONS.STORES).doc(String(event.storeId))
        .get();

    return { storeData: storeSnap.exists ? storeSnap.data() || null : null };
}

export function resolveOwnerNotificationRecipient(
    event: OwnerNotificationEventDoc,
    scope: OwnerNotificationScope,
): OwnerNotificationRecipient {
    const data = event.productId === PRODUCT_IDS.ANSWERLATTICE
        ? scope.workspaceData || {}
        : scope.storeData || {};
    const settings = data.notificationSettings || {};
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
        const resolvedEmail = event.recipientRole === 'support_owner'
            ? cleanEmail(data.supportEmail) || cleanEmail(settings.primaryEmail) || cleanEmail(hints.email)
            : cleanEmail(settings.primaryEmail) || cleanEmail(data.ownerEmail) || cleanEmail(hints.email);
        const resolvedWhatsappNumber = resolveFirstPhone(
            phoneContext,
            settings.whatsappNumber,
            data.whatsappNumber,
            hints.whatsappNumber,
            data.phone,
            data.phoneNumber,
        );

        return {
            role: event.recipientRole,
            email: forceHintRecipient ? hintEmail || resolvedEmail : resolvedEmail,
            name: hints.name || data.productName || data.companyName || data.businessName,
            whatsappNumber: forceHintRecipient ? hintWhatsappNumber || resolvedWhatsappNumber : resolvedWhatsappNumber,
            whatsappConsent: hasWhatsAppConsent(settings),
        };
    }

    const billingEmail = cleanEmail(settings.billingEmail);
    const primaryEmail = cleanEmail(settings.primaryEmail)
        || cleanEmail(data.contactPersonEmail)
        || cleanEmail(data.email)
        || cleanEmail(hints.email);

    const email = event.recipientRole === 'billing_owner'
        ? billingEmail || primaryEmail
        : primaryEmail || billingEmail;
    const whatsappNumber = resolveFirstPhone(
        phoneContext,
        settings.whatsappNumber,
        data.ownerWhatsappNumber,
        data.whatsappNumber,
        hints.whatsappNumber,
        data.phone,
        data.phoneNumber,
    );

    return {
        role: event.recipientRole,
        email: forceHintRecipient ? hintEmail || email : email,
        name: hints.name || data.name || data.businessName,
        whatsappNumber: forceHintRecipient ? hintWhatsappNumber || whatsappNumber : whatsappNumber,
        whatsappConsent: hasWhatsAppConsent(settings),
    };
}
