import { DB_COLLECTIONS } from '@constant/database';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { admin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { logger } from '@lib/monitoring/logger';
import {
    isSensitiveStoreRecordInScope,
    resolveSensitiveSessionStoreScope,
} from '@lib/security/sensitiveStoreScope';
import {
    getBoundedSecurityRouteContext,
    getBoundedSecurityStringContext,
} from '@lib/security/securityDiagnostics';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const GOOGLE_ANALYTICS_PROPERTY_ID_PATTERN = /^\d{1,32}$/;

export type GoogleAnalyticsScopeDocumentId = {
    numericId: number;
    documentId: string;
};

function isPlatformSession(session: any): boolean {
    return resolveExactSessionPlatformRole(session) === ECOMSAI_PLATFORM_USER_ROLE;
}

export function normalizeGoogleAnalyticsPropertyId(rawPropertyId: string | null | undefined): string | null {
    const trimmed = String(rawPropertyId || '').trim();
    if (!trimmed) return null;
    const normalized = trimmed.startsWith('properties/') ? trimmed.slice('properties/'.length).trim() : trimmed;
    return GOOGLE_ANALYTICS_PROPERTY_ID_PATTERN.test(normalized) ? normalized : null;
}

export function toGoogleAnalyticsPropertyResource(rawPropertyId: string | null | undefined): string | null {
    const normalized = normalizeGoogleAnalyticsPropertyId(rawPropertyId);
    return normalized ? `properties/${normalized}` : null;
}

export function normalizeGoogleAnalyticsScopeDocumentId(value: unknown): GoogleAnalyticsScopeDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

export async function requireConfiguredGoogleAnalyticsProperty(
    request: NextRequest,
    session: any,
    rawPropertyId: string | null | undefined,
): Promise<NextResponse | null> {
    const requestedPropertyId = normalizeGoogleAnalyticsPropertyId(rawPropertyId);
    if (!requestedPropertyId) {
        return NextResponse.json({ error: 'Property ID is required' }, { status: 400 });
    }

    if (isPlatformSession(session)) return null;

    const sessionScope = resolveSensitiveSessionStoreScope({
        tenantValues: [session?.tId, session?.user?.tenantId],
        storeValues: [session?.sId, session?.user?.storeId],
    });
    if (!sessionScope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }
    const { storeScope, tenantScope } = sessionScope;
    const tenantId = tenantScope.numericId;
    const storeId = storeScope.numericId;

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(storeScope.documentId)
        .get();
    const storeData = storeDoc.data();
    const analytics = storeData?.analytics || {};
    const allowedPropertyIds = [
        analytics.googleAnalyticsId,
        analytics.googleAnalyticsPropertyId,
        analytics.ga4PropertyId,
    ]
        .map(normalizeGoogleAnalyticsPropertyId)
        .filter(Boolean);

    if (
        !storeDoc.exists
        || !isSensitiveStoreRecordInScope({
            storeData,
            storeDocumentId: storeScope.documentId,
            tenantDocumentId: tenantScope.documentId,
        })
        || !allowedPropertyIds.includes(requestedPropertyId)
    ) {
        logger.security('Authorization Failed - Analytics Property Mismatch', {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext('endpoint', request.nextUrl.pathname),
            ...getBoundedSecurityStringContext('requestedPropertyId', requestedPropertyId),
            ...getBoundedSecurityStringContext('storeId', storeId),
            ...getBoundedSecurityStringContext('tenantId', tenantId),
            allowedPropertyCount: allowedPropertyIds.length,
        }, 'high');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null;
}
