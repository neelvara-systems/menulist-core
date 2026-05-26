export const dynamic = 'force-dynamic';

/**
 * Canonica Widget Activity API
 *
 * Protected dashboard endpoint for recent widget questions. The widget runtime
 * remains public API-key authenticated; this route only reads tenant-scoped
 * search-history rows for dashboard verification and support review.
 */

import { FEATURE_FLAGS } from '@config/features';
import { CANONICA_PERMISSION_KEYS } from '@constant/canonica/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireCanonicaPermission } from '@lib/canonica/accessControl';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const MAX_ACTIVITY_ITEMS = 12;
const FALLBACK_SCAN_LIMIT = 80;

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const canonicaScope = resolveCanonicaSessionScope(session);
    if (!canonicaScope) return null;

    const tenantId = Number(canonicaScope.tenantId);
    const storeId = Number(canonicaScope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? canonicaFirestoreAdmin : null;
};

const toIsoString = (value: any): string | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toMillis = (value: any): number => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const serializeActivityItem = (docSnapshot: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = docSnapshot.data() || {};
    const references = Array.isArray(data.references) ? data.references : [];
    const answer = typeof data.craftedAnswer === 'string' ? data.craftedAnswer.trim() : '';

    return {
        id: docSnapshot.id,
        query: typeof data.query === 'string' ? data.query.slice(0, 500) : '',
        answerPreview: answer.slice(0, 220),
        canonical: Boolean(data.canonical),
        confidence: typeof data.confidence === 'string' ? data.confidence : null,
        referenceCount: references.length,
        feedback: typeof data.isGood === 'boolean' ? (data.isGood ? 'good' : 'bad') : null,
        createdAt: toIsoString(data.createdOn || data.modifiedOn),
    };
};

const isWidgetActivityRow = (
    data: FirebaseFirestore.DocumentData,
    tenantId: number,
    storeId: number,
) => (
    Number(data.tId) === tenantId
    && Number(data.sId) === storeId
    && (data.mountContext === 'widget' || data.uId === 'widget')
);

const fetchIndexedWidgetActivity = async (
    db: FirebaseFirestore.Firestore,
    tenantId: number,
    storeId: number,
) => {
    return db
        .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
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
        .orderBy('createdOn', 'desc')
        .limit(FALLBACK_SCAN_LIMIT)
        .get();

    return snapshot.docs
        .filter(docSnapshot => isWidgetActivityRow(docSnapshot.data(), tenantId, storeId))
        .sort((left, right) => toMillis(right.data().createdOn || right.data().modifiedOn) - toMillis(left.data().createdOn || left.data().modifiedOn))
        .slice(0, MAX_ACTIVITY_ITEMS);
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
        return NextResponse.json({ error: 'Canonica widget is not enabled.' }, { status: 403 });
    }

    const permission = await requireCanonicaPermission(request, session, CANONICA_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getCanonicaDb();
    if (!db) {
        return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });
    }

    try {
        let docs: FirebaseFirestore.QueryDocumentSnapshot[];
        try {
            const snapshot = await fetchIndexedWidgetActivity(db, scope.tenantId, scope.storeId);
            docs = snapshot.docs;
        } catch {
            docs = await fetchFallbackWidgetActivity(db, scope.tenantId, scope.storeId);
        }

        return NextResponse.json({
            items: docs.map(serializeActivityItem),
        });
    } catch (error) {
        secureError('[Canonica Widget Activity] Failed to load recent widget questions', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to load widget activity' }, { status: 500 });
    }
});
