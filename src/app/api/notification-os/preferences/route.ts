export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { isInternalNotificationEmail } from '@data/shared/notificationOs';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { admin } from '@lib/firebase/firebaseAdmin';
import { normalizePhoneNumberForStorage } from '@lib/phone/phoneNumber';
import { requireAnyStorePermissionForStoreData, resolveStorePermissionSessionScope } from '@lib/permissions/server';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import {
    channelsForOwnerNotificationMode,
    modeNeedsWhatsApp,
    modeRequiresEmail,
    NOTIFICATION_OS_CONSENT_POLICY_VERSION,
    NOTIFICATION_OS_OWNER_MODES,
    normalizeOwnerNotificationSettings,
} from '@lib/notification-os/preferences';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { getBoundedSecurityRouteContext, getBoundedSecurityStringContext } from '@lib/security/securityDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { withAuth } from '../../../../middleware/auth';
import { z } from 'zod';

const RequestSchema = z.object({
    expectedStoreId: z.string().trim().min(1).max(160),
    expectedTenantId: z.string().trim().min(1).max(160),
    mode: z.enum(NOTIFICATION_OS_OWNER_MODES),
    preferredChannel: z.enum(['email', 'whatsapp']).optional(),
    whatsappConsent: z.enum(['grant', 'revoke', 'unchanged']),
    requestId: z.string().uuid(),
}).strict();

const MAX_BODY_BYTES = 4 * 1024;
const INTERNAL_EMAIL_DOMAINS = ['msg.menulist.ai', 'msg.menulist.digital'] as const;

function getVerifiedUserPhone(user: Record<string, any>): string | null {
    if (!user.phoneVerifiedAt && user.phoneVerified !== true) return null;
    const normalized = normalizePhoneNumberForStorage({
        countryCode: user.countryCode,
        dialCode: user.dialCode,
        phone: user.phone,
        phoneNumber: user.phoneNumber,
    });
    return normalized?.phone || null;
}

function getVerifiedUserEmail(user: Record<string, any>): string | null {
    // The primary auth email is provider-verified. displayEmail is owner-editable
    // profile data and must not silently become a verified delivery destination.
    const email = String(user.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    if (isInternalNotificationEmail(email, INTERNAL_EMAIL_DOMAINS)) return null;
    return user.isVerified === false ? null : email;
}

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_NOTIFICATION_OS) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 403 });
    }
    const bodyResult = await readBoundedJsonBody(request, MAX_BODY_BYTES, { invalidJsonMessage: 'Invalid input' });
    if (bodyResult.ok === false) return bodyResult.response;
    const parsed = RequestSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
        logger.security('Notification Settings Input Validation Failed', {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname),
        }, 'medium');
        return NextResponse.json({ error: 'Invalid input', details: getSafeZodValidationDetails(parsed.error) }, { status: 400 });
    }

    const scope = resolveStorePermissionSessionScope(session);
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (
        !scope
        || !userId
        || scope.storeScope.documentId !== parsed.data.expectedStoreId
        || scope.tenantScope.documentId !== parsed.data.expectedTenantId
    ) {
        logger.security('Notification Settings Scope Mismatch', {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname),
        }, 'high');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const limit = await checkRateLimit({
        key: `notification-preferences:${hashPublicRateLimitValue(userId)}:${hashPublicRateLimitValue(scope.storeScope.documentId)}`,
        ...getRateLimitForFeature('DATA_WRITE'),
        failClosedOnProviderError: true,
    });
    if (!limit.allowed) {
        logger.security(limit.reason === 'provider_unavailable'
            ? 'Notification Settings Rate Limit Unavailable'
            : 'Notification Settings Rate Limit Exceeded', {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname),
        }, 'medium');
        return NextResponse.json(
            { error: limit.reason === 'provider_unavailable' ? 'Notification settings are temporarily unavailable.' : 'Too many requests.' },
            { status: limit.reason === 'provider_unavailable' ? 503 : 429 },
        );
    }

    const db = admin.firestore();
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(scope.storeScope.documentId);
    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(userId);
    const [storeSnap, userSnap] = await db.getAll(storeRef, userRef);
    if (!storeSnap.exists || !userSnap.exists) return NextResponse.json({ error: 'Account setup is incomplete' }, { status: 409 });
    const storeData = storeSnap.data() || {};
    const permissionError = await requireAnyStorePermissionForStoreData(
        request,
        session,
        storeData,
        [PERMISSIONS.MANAGE_STORE],
        'Notification settings',
        scope.storeScope.numericId,
        scope.tenantScope.numericId,
    );
    if (permissionError) return permissionError;

    const userData = userSnap.data() || {};
    const current = normalizeOwnerNotificationSettings(storeData.notificationSettings);
    const verifiedPhone = getVerifiedUserPhone(userData);
    const verifiedEmail = getVerifiedUserEmail(userData);
    const needsWhatsApp = modeNeedsWhatsApp(parsed.data.mode);
    if (
        parsed.data.whatsappConsent === 'grant'
        && !FEATURE_FLAGS.ENABLE_MENULIST_WHATSAPP_OS_OWNER_NOTIFICATIONS
    ) {
        return NextResponse.json({ error: 'WhatsApp notifications are not available yet.' }, { status: 409 });
    }
    const consentGranted = parsed.data.whatsappConsent === 'grant'
        ? true
        : parsed.data.whatsappConsent === 'revoke'
            ? false
            : current.whatsappConsent === true;
    const consentChanged = consentGranted !== (current.whatsappConsent === true);
    // Revocation is always admitted, including while the provider kill switch is
    // off. A stored WhatsApp mode without consent remains safe because routing
    // skips the channel until the owner grants permission again.
    if (parsed.data.whatsappConsent !== 'revoke' && needsWhatsApp && (!verifiedPhone || !consentGranted)) {
        return NextResponse.json({ error: verifiedPhone ? 'WhatsApp consent is required.' : 'Verify your phone before enabling WhatsApp.' }, { status: 409 });
    }
    const currentVerifiedEmail = current.emailVerified === true
        && typeof current.primaryEmail === 'string'
        && getVerifiedUserEmail({ email: current.primaryEmail, isVerified: true });
    if (parsed.data.whatsappConsent !== 'revoke' && modeRequiresEmail(parsed.data.mode) && !verifiedEmail && !currentVerifiedEmail) {
        return NextResponse.json({ error: 'A verified non-internal email is required.' }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const selectedChannels = channelsForOwnerNotificationMode(parsed.data.mode);
    const preferredChannels = parsed.data.mode === 'preferred_available' && parsed.data.preferredChannel
        ? [parsed.data.preferredChannel, ...selectedChannels.filter((channel) => channel !== parsed.data.preferredChannel)]
        : selectedChannels;
    const nextSettings = {
        ...current,
        ...(verifiedEmail ? { primaryEmail: verifiedEmail, emailVerified: true } : {}),
        ...(verifiedPhone ? { whatsappNumber: verifiedPhone, whatsappVerified: true } : {}),
        channelMode: parsed.data.mode,
        preferredChannels,
        preferredChannel: preferredChannels[0],
        quietHoursEnabled: current.quietHoursEnabled !== false,
        whatsappConsent: consentGranted,
        whatsappConsented: consentGranted,
        whatsappConsentStatus: consentGranted ? 'granted' as const : 'revoked' as const,
        whatsappConsentSource: 'owner_settings' as const,
        whatsappConsentPolicyVersion: NOTIFICATION_OS_CONSENT_POLICY_VERSION,
        ...(parsed.data.whatsappConsent === 'grant' ? { whatsappConsentedAt: nowIso, consentedAt: current.consentedAt || nowIso } : {}),
        ...(parsed.data.whatsappConsent === 'revoke' ? { whatsappConsentRevokedAt: nowIso } : {}),
    };

    const auditRef = db.collection(DB_COLLECTIONS.WHATSAPP_OS_CONSENT_EVENTS).doc(parsed.data.requestId);
    const batch = db.batch();
    batch.set(storeRef, {
        notificationSettings: nextSettings,
        modifiedBy: userId,
        modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (consentChanged) {
        batch.create(auditRef, {
            action: consentGranted ? 'grant' : 'revoke',
            actorUserId: userId,
            channelMode: parsed.data.mode,
            consentGranted,
            policyVersion: NOTIFICATION_OS_CONSENT_POLICY_VERSION,
            productId: 'ML',
            source: 'owner_settings',
            storeId: scope.storeScope.numericId,
            tenantId: scope.tenantScope.numericId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();

    return NextResponse.json({ notificationSettings: nextSettings });
}, { requiredRole: 'owner' });
