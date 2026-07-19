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
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import {
    buildAnswerlatticeIntegrationConfigIdentity,
    classifyAnswerlatticeIntegrationConfigOwnership,
} from '@lib/answerlattice/integrationConfigOwnership';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { AnswerlatticeWorkflowIntegrationTestResponseSchema } from '@lib/answerlattice/workflowIntegrationContracts';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const EVENT_TTL_DAYS = 90;
const TEST_EVENT_TYPE = 'nightly_summary' as const;
const integrationTestJsonResponse = (body: unknown, status = 200) => NextResponse.json(body, {
    status,
    headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
});

class IntegrationTestConfigOwnershipError extends Error {}

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    return { tenantId: answerlatticeScope.tenantId, storeId: answerlatticeScope.storeId };
};

const getAnswerlatticeDb = () => answerlatticeFirestoreAdmin
    && typeof answerlatticeFirestoreAdmin.collection === 'function'
    ? answerlatticeFirestoreAdmin
    : null;

export const POST = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) {
        return integrationTestJsonResponse({ error: 'Answerlattice integrations are not enabled.' }, 403);
    }
    const scope = resolveSessionScope(session);
    if (!scope) return integrationTestJsonResponse({ error: 'Not onboarded' }, 400);

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-integrations-test',
                session?.uId || session?.user?.id || session?.user?.email || 'unknown',
                scope.tenantId,
                scope.storeId,
            ),
            limit: 3,
            window: 300,
        });
        if (!rateLimitResult.allowed) {
            return integrationTestJsonResponse(
                { error: 'Too many test notifications. Please wait before trying again.' },
                429,
            );
        }

        const permission = await requireAnswerlatticePermission(
            _request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS,
        );
        if (permission.response) return permission.response;

        const db = getAnswerlatticeDb();
        if (!db) return integrationTestJsonResponse({ error: 'Answerlattice Firebase is not configured' }, 503);

        const configRef = db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`integrationConfig_${scope.tenantId}_${scope.storeId}`);
        const expectedScope = { tId: scope.tenantId, sId: scope.storeId };
        const config = await db.runTransaction(async (transaction) => {
            const configSnap = await transaction.get(configRef);
            if (!configSnap.exists) return {};
            const current = configSnap.data() || {};
            const ownership = classifyAnswerlatticeIntegrationConfigOwnership(current, expectedScope);
            if (ownership === 'invalid') throw new IntegrationTestConfigOwnershipError('Integration config ownership mismatch');
            if (ownership === 'owned') return current;

            const identity = buildAnswerlatticeIntegrationConfigIdentity(expectedScope);
            if (!identity) throw new Error('answerlattice_integration_test_config_scope_invalid');
            transaction.set(configRef, identity, { merge: true });
            return { ...current, ...identity };
        }).catch((error) => {
            if (error instanceof IntegrationTestConfigOwnershipError) {
                return null;
            }
            throw error;
        });
        if (!config) {
            logRuntimeDiagnostic('answerlattice_integration_test_config_ownership_mismatch', {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            });
            return integrationTestJsonResponse({ error: 'Integration settings require support review.' }, 409);
        }
        const hasSlack = Boolean(config.slack?.enabled && config.slack?.webhookUrl);
        const hasEmail = Boolean(config.email?.enabled && Array.isArray(config.email?.recipients) && config.email.recipients.length > 0);
        if (!hasSlack && !hasEmail) {
            return integrationTestJsonResponse({ error: 'Enable Slack or email before sending a test.' }, 400);
        }

        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(Date.now() + EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);
        const eventRef = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS).add({
            pId: 'AL',
            eventType: TEST_EVENT_TYPE,
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
            eventType: TEST_EVENT_TYPE,
            slackEnabled: hasSlack,
            emailEnabled: hasEmail,
        });

        return integrationTestJsonResponse(AnswerlatticeWorkflowIntegrationTestResponseSchema.parse({
            eventId: eventRef.id,
            message: 'Test notification queued. Delivery status will update shortly.',
        }));
    } catch (error) {
        logRuntimeFailure('answerlattice_integration_test_queue_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return integrationTestJsonResponse({ error: 'Failed to queue test notification' }, 500);
    }
});
