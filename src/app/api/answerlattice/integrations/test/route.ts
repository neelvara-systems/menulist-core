export const dynamic = 'force-dynamic';

/**
 * Answerlattice Workflow Integration Test
 *
 * Creates one controlled governance digest event so owners can verify Slack or
 * email delivery without waiting for the nightly scheduler.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const EVENT_TTL_DAYS = 90;
const TEST_EVENT_PRIORITY = [
    'nightly_summary',
    'coverage_drop',
    'ai_failure_recurring',
    'knowledge_gap_detected',
    'mutation_proposed',
    'drift_detected',
    'article_approved',
] as const;

type TestEventType = typeof TEST_EVENT_PRIORITY[number];

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    const tenantId = Number(answerlatticeScope.tenantId);
    const storeId = Number(answerlatticeScope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

const adapterAllowsEvent = (adapterConfig: any, eventType: TestEventType): boolean => {
    const filters = Array.isArray(adapterConfig?.eventFilters) ? adapterConfig.eventFilters : [];
    return filters.length === 0 || filters.includes(eventType);
};

const resolveTestEventType = (config: Record<string, any>): TestEventType | null => {
    const slackReady = Boolean(config.slack?.enabled && config.slack?.webhookUrl);
    const emailReady = Boolean(config.email?.enabled && Array.isArray(config.email?.recipients) && config.email.recipients.length > 0);

    for (const eventType of TEST_EVENT_PRIORITY) {
        if (slackReady && adapterAllowsEvent(config.slack, eventType)) return eventType;
        if (emailReady && adapterAllowsEvent(config.email, eventType)) return eventType;
    }

    return null;
};

export const POST = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) {
        return NextResponse.json({ error: 'Answerlattice integrations are not enabled.' }, { status: 403 });
    }
    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-integrations-test', scope.storeId),
            limit: 3,
            window: 300,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many test notifications. Please wait before trying again.' }, { status: 429 });
        }

        const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS);
        if (permission.response) return permission.response;

        const db = getAnswerlatticeDb();
        if (!db) return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });

        const configSnap = await db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`integrationConfig_${scope.tenantId}_${scope.storeId}`)
            .get();
        const config = configSnap.exists ? configSnap.data() || {} : {};
        const hasSlack = Boolean(config.slack?.enabled && config.slack?.webhookUrl);
        const hasEmail = Boolean(config.email?.enabled && Array.isArray(config.email?.recipients) && config.email.recipients.length > 0);
        const eventType = resolveTestEventType(config);

        if (!hasSlack && !hasEmail) {
            return NextResponse.json({ error: 'Enable Slack or email before sending a test.' }, { status: 400 });
        }
        if (!eventType) {
            return NextResponse.json({ error: 'Enable at least one event type before sending a test.' }, { status: 400 });
        }

        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(Date.now() + EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);
        const eventRef = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).add({
            pId: 'AL',
            eventType,
            tId: scope.tenantId,
            sId: scope.storeId,
            severity: 'low',
            payload: {
                test: true,
                runLogId: 'manual-test',
                tenantsProcessed: 1,
                driftDetected: 0,
                driftCleared: 0,
                proposalsCreated: 0,
                fallbackProposals: 0,
                signalsResolved: 0,
                coverageRate: 1,
                signalsArchived: 0,
                errors: [],
            },
            status: 'pending',
            createdAt: now,
            expiresAt,
        });

        logRuntimeDiagnostic('answerlattice_integration_test_event_queued', {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            ...getBoundedRuntimeStringContext('eventId', eventRef.id),
            eventType,
            slackEnabled: hasSlack,
            emailEnabled: hasEmail,
        });

        return NextResponse.json({
            eventId: eventRef.id,
            message: 'Test notification queued. Delivery status will update shortly.',
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_integration_test_queue_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to queue test notification' }, { status: 500 });
    }
});
