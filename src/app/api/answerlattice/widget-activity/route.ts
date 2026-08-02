export const dynamic = 'force-dynamic';

/**
 * Answerlattice Widget Activity API
 *
 * Protected dashboard endpoint for recent widget questions. The widget runtime
 * remains public API-key authenticated; this route only reads tenant-scoped
 * search-history rows for dashboard verification and support review.
 */

import {
    FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { normalizeAnswerlatticeScopeDocumentId,
    resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const MAX_ACTIVITY_ITEMS = 12;
const FALLBACK_SCAN_LIMIT = 80;
const CANONICAL_ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const activityJsonResponse = (body: unknown, init: ResponseInit = {}) => NextResponse.json(body, {
    ...init,
    headers: {
        'Cache-Control': 'private, no-store',
        ...(init.headers || {}),
    },
});
const withPrivateNoStore = <T extends NextResponse>(response: T): T => {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
};

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    return { tenantId: answerlatticeScope.tenantId, storeId: answerlatticeScope.storeId };
};

const getAnswerlatticeDb = () => {
    return answerlatticeFirestoreAdmin;
};

const canonicalIsoTimestampToMillis = (value: string): number | null => {
    const normalized = value.trim();
    if (!CANONICAL_ISO_TIMESTAMP_PATTERN.test(normalized)) return null;
    const millis = new Date(normalized).getTime();
    if (!Number.isFinite(millis)) return null;
    return new Date(millis).toISOString() === normalized ? millis : null;
};

const normalizeTimestampMillis = (millis: unknown): number | null => {
    if (typeof millis !== 'number' || !Number.isFinite(millis)) return null;
    const date = new Date(millis);
    return Number.isFinite(date.getTime()) ? millis : null;
};

const timestampLikeToMillis = (value: unknown): number | null => {
    if (!value) return null;
    if (value instanceof Date) return normalizeTimestampMillis(value.getTime());
    if (typeof value === 'number') return normalizeTimestampMillis(value);
    if (typeof value === 'string') return canonicalIsoTimestampToMillis(value);
    if (typeof value !== 'object') return null;

    const timestamp = value as {
        seconds?: unknown;
        toDate?: unknown;
        toMillis?: unknown;
    };
    try {
        if (typeof timestamp.toMillis === 'function') {
            return normalizeTimestampMillis(timestamp.toMillis.call(value));
        }
        if (typeof timestamp.toDate === 'function') {
            const date = timestamp.toDate.call(value);
            return date instanceof Date ? normalizeTimestampMillis(date.getTime()) : null;
        }
    } catch {
        return null;
    }
    if (typeof timestamp.seconds === 'number' && Number.isFinite(timestamp.seconds)) {
        return normalizeTimestampMillis(timestamp.seconds * 1000);
    }
    return null;
};

const toIsoString = (value: unknown): string | null => {
    const millis = timestampLikeToMillis(value);
    if (millis === null) return null;
    const date = new Date(millis);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString();
};

const toMillis = (value: unknown): number => {
    return timestampLikeToMillis(value) || 0;
};

const serializeActivityItem = (docSnapshot: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = docSnapshot.data() || {};
    const references = Array.isArray(data.references) ? data.references : [];
    const answer = typeof data.craftedAnswer === 'string' ? data.craftedAnswer.trim() : '';
    const evidenceLinks = Array.isArray(data.debugEvidenceLinks)
        ? data.debugEvidenceLinks.slice(0, 3).map((link: unknown) => {
            const record = link && typeof link === 'object' ? link as Record<string, unknown> : {};
            return {
                url: typeof record.url === 'string' ? record.url.slice(0, 1000) : '',
                label: typeof record.label === 'string' ? record.label.slice(0, 80) : null,
            };
        }).filter((link: { url: string }) => /^https:\/\//i.test(link.url))
        : [];

    return {
        id: docSnapshot.id,
        query: typeof data.query === 'string' ? data.query.slice(0, 500) : '',
        answerPreview: answer.slice(0, 220),
        canonical: Boolean(data.canonical),
        confidence: typeof data.confidence === 'string' ? data.confidence : null,
        referenceCount: references.length,
        feedback: typeof data.isGood === 'boolean' ? (data.isGood ? 'good' : 'bad') : null,
        visitorId: typeof data.visitorId === 'string' ? data.visitorId.slice(0, 120) : null,
        visitorName: typeof data.visitorName === 'string' ? data.visitorName.slice(0, 160) : null,
        visitorEmail: typeof data.visitorEmail === 'string' ? data.visitorEmail.slice(0, 180) : null,
        visitorVerified: data.visitorVerified === true,
        evidenceLinks,
        widgetSessionId: typeof data.widgetSessionId === 'string' ? data.widgetSessionId.slice(0, 120) : null,
        requestOrigin: typeof data.requestOrigin === 'string' ? data.requestOrigin.slice(0, 180) : null,
        requestPath: typeof data.requestPath === 'string' ? data.requestPath.slice(0, 180) : null,
        contextKey: typeof data.contextKey === 'string' ? data.contextKey.slice(0, 140) : null,
        surfacePage: typeof data.surfacePage === 'string' ? data.surfacePage.slice(0, 120) : null,
        surfaceFeature: typeof data.surfaceFeature === 'string' ? data.surfaceFeature.slice(0, 120) : null,
        createdAt: toIsoString(data.createdOn || data.modifiedOn),
    };
};

const isWidgetActivityRow = (
    data: FirebaseFirestore.DocumentData,
    tenantId: number,
    storeId: number,
) => (
    data.pId === PRODUCT_IDS.ANSWERLATTICE
    && normalizeAnswerlatticeScopeDocumentId(data.tId) === tenantId
    && normalizeAnswerlatticeScopeDocumentId(data.sId) === storeId
    && (data.mountContext === 'widget' || data.uId === 'widget')
);

const fetchIndexedWidgetActivity = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    storeId: number,
) => {
    return db
        .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tenantId)
        .where('sId', '==', storeId)
        .where('mountContext', '==', 'widget')
        .orderBy('createdOn', 'desc')
        .limit(MAX_ACTIVITY_ITEMS)
        .get();
};

const fetchFallbackWidgetActivity = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    storeId: number,
) => {
    const snapshot = await db
        .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
        .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tId', '==', tenantId)
        .where('sId', '==', storeId)
        .orderBy('createdOn', 'desc')
        .limit(FALLBACK_SCAN_LIMIT)
        .get();

    return snapshot.docs
        .filter(docSnapshot => isWidgetActivityRow(docSnapshot.data(), tenantId, storeId))
        .sort((left, right) => toMillis(right.data().createdOn || right.data().modifiedOn) - toMillis(left.data().createdOn || left.data().modifiedOn))
        .slice(0, MAX_ACTIVITY_ITEMS);
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return activityJsonResponse({ error: 'Answerlattice widget is not enabled.' }, { status: 403 });
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'widget-activity');
    if (rateLimitResponse) return withPrivateNoStore(rateLimitResponse);

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return withPrivateNoStore(permission.response);

    const scope = resolveSessionScope(session);
    if (!scope) {
        return activityJsonResponse({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return activityJsonResponse({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    try {
        let docs: FirebaseFirestore.QueryDocumentSnapshot[];
        try {
            const snapshot = await fetchIndexedWidgetActivity(db, scope.tenantId, scope.storeId);
            docs = snapshot.docs;
        } catch {
            docs = await fetchFallbackWidgetActivity(db, scope.tenantId, scope.storeId);
        }

        return activityJsonResponse({
            items: docs.map(serializeActivityItem),
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_activity_route_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return activityJsonResponse({ error: 'Failed to load widget activity' }, { status: 500 });
    }
});
