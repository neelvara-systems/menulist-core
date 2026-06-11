import { DB_COLLECTIONS } from '@constant/database';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { admin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { buildSecurityContext } from '@lib/security/securityContext';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function isPlatformSession(session: any): boolean {
    return session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
        || session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE;
}

export function normalizeGoogleAnalyticsPropertyId(rawPropertyId: string | null | undefined): string | null {
    const trimmed = String(rawPropertyId || '').trim();
    if (!trimmed) return null;
    return trimmed.startsWith('properties/') ? trimmed.slice('properties/'.length).trim() : trimmed;
}

export function toGoogleAnalyticsPropertyResource(rawPropertyId: string | null | undefined): string | null {
    const normalized = normalizeGoogleAnalyticsPropertyId(rawPropertyId);
    return normalized ? `properties/${normalized}` : null;
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

    const tenantId = Number(session?.tId ?? session?.user?.tenantId);
    const storeId = Number(session?.sId ?? session?.user?.storeId);
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(storeId))
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

    if (!storeDoc.exists || Number(storeData?.tenantId) !== tenantId || !allowedPropertyIds.includes(requestedPropertyId)) {
        logger.security('Authorization Failed - Analytics Property Mismatch', {
            ...buildSecurityContext(session, request),
            endpoint: request.nextUrl.pathname,
            requestedPropertyId,
            storeId,
            tenantId,
        }, 'high');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null;
}
