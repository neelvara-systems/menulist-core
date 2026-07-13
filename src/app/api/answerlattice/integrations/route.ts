export const dynamic = 'force-dynamic';

/**
 * Answerlattice Workflow Integrations API
 *
 * Owner-scoped settings endpoint for Slack and email governance alerts.
 * Raw Slack webhook URLs stay server-side in platformSummary and are never
 * returned to the browser after save.
 */

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    buildAnswerlatticeIntegrationConfigIdentity,
    classifyAnswerlatticeIntegrationConfigOwnership,
} from '@lib/answerlattice/integrationConfigOwnership';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const INTEGRATION_EVENT_TYPES = [
    'drift_detected',
    'mutation_proposed',
    'knowledge_gap_detected',
    'coverage_drop',
    'article_approved',
    'ai_failure_recurring',
    'nightly_summary',
] as const;

type IntegrationEventType = typeof INTEGRATION_EVENT_TYPES[number];

const EventFilterSchema = z.enum(INTEGRATION_EVENT_TYPES);
const SlackWebhookSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string()
        .trim()
        .url()
        .max(500)
        .refine((value) => {
            try {
                const url = new URL(value);
                return url.protocol === 'https:'
                    && url.hostname === 'hooks.slack.com'
                    && url.pathname.startsWith('/services/')
                    && !url.search
                    && !url.hash;
            } catch {
                return false;
            }
        }, 'Slack webhook must be a hooks.slack.com HTTPS URL')
        .optional(),
);

const IntegrationsSaveSchema = z.object({
    slack: z.object({
        enabled: z.boolean().default(false),
        webhookUrl: SlackWebhookSchema,
        clearWebhook: z.boolean().optional(),
        channel: z.string().trim().max(80).optional().default(''),
        eventFilters: z.array(EventFilterSchema).max(INTEGRATION_EVENT_TYPES.length).default([]),
    }).strict().default({ enabled: false, channel: '', eventFilters: [] }),
    email: z.object({
        enabled: z.boolean().default(false),
        recipients: z.array(z.string().trim().email().max(160)).max(5).default([]),
        eventFilters: z.array(EventFilterSchema).max(INTEGRATION_EVENT_TYPES.length).default([]),
    }).strict().default({ enabled: false, recipients: [], eventFilters: [] }),
}).strict();

const DEFAULT_EVENT_FILTERS: IntegrationEventType[] = [
    'nightly_summary',
    'coverage_drop',
    'ai_failure_recurring',
];

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    return { tenantId: answerlatticeScope.tenantId, storeId: answerlatticeScope.storeId };
};

const getAnswerlatticeDb = () => answerlatticeFirestoreAdmin
    && typeof answerlatticeFirestoreAdmin.collection === 'function'
    ? answerlatticeFirestoreAdmin
    : null;
const INTEGRATIONS_SAVE_MAX_BODY_BYTES = 16 * 1024;

const configDocId = (tenantId: number, storeId: number) => `integrationConfig_${tenantId}_${storeId}`;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

class IntegrationConfigOwnershipError extends Error {}
class IntegrationConfigInputError extends Error {}

const readScopedSummaryData = (
    snapshot: { exists: boolean; data: () => Record<string, unknown> | undefined },
    scope: { tenantId: number; storeId: number },
): { data: Record<string, unknown>; identityToClaim: { pId: 'AL'; tId: number; sId: number } | null } => {
    if (!snapshot.exists) return { data: {}, identityToClaim: null };
    const data = snapshot.data() || {};
    const expectedScope = { tId: scope.tenantId, sId: scope.storeId };
    const ownership = classifyAnswerlatticeIntegrationConfigOwnership(data, expectedScope);
    if (ownership === 'invalid') throw new IntegrationConfigOwnershipError('Integration summary ownership mismatch');
    if (ownership === 'legacy-unowned') {
        const identity = buildAnswerlatticeIntegrationConfigIdentity(expectedScope);
        if (!identity) throw new IntegrationConfigOwnershipError('Invalid integration summary scope');
        return { data: { ...data, ...identity }, identityToClaim: identity };
    }
    return { data, identityToClaim: null };
};

const claimScopedSummaryData = async (
    db: FirebaseFirestore.Firestore,
    docRef: FirebaseFirestore.DocumentReference,
    scope: { tenantId: number; storeId: number },
): Promise<Record<string, unknown>> => db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    const { data, identityToClaim } = readScopedSummaryData(snapshot, scope);
    if (identityToClaim) transaction.set(docRef, identityToClaim, { merge: true });
    return data;
});

const normalizeFilters = (value: unknown): IntegrationEventType[] => {
    if (!Array.isArray(value)) return [];
    const allowed = new Set<string>(INTEGRATION_EVENT_TYPES);
    return Array.from(new Set(value.filter((item): item is IntegrationEventType => typeof item === 'string' && allowed.has(item))))
        .slice(0, INTEGRATION_EVENT_TYPES.length);
};

const normalizeRecipientList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim().toLowerCase())
            .filter(item => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
    )).slice(0, 5);
};

const toIso = (value: any): string | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value === 'string') return value;
    return null;
};

const ownerSafeIntegrationError = (value: unknown): string | null => (
    typeof value === 'string' && value.trim().length > 0 ? 'Delivery needs review.' : null
);

const buildSafeHealth = (data: Record<string, any> = {}) => {
    const adapters = data.adapters || {};
    return {
        slack: {
            lastStatus: typeof adapters.slack?.lastStatus === 'string' ? adapters.slack.lastStatus : null,
            lastAttemptAt: toIso(adapters.slack?.lastAttemptAt),
            lastSuccessAt: toIso(adapters.slack?.lastSuccessAt),
            lastFailureAt: toIso(adapters.slack?.lastFailureAt),
            lastError: ownerSafeIntegrationError(adapters.slack?.lastError),
        },
        email: {
            lastStatus: typeof adapters.email?.lastStatus === 'string' ? adapters.email.lastStatus : null,
            lastAttemptAt: toIso(adapters.email?.lastAttemptAt),
            lastSuccessAt: toIso(adapters.email?.lastSuccessAt),
            lastFailureAt: toIso(adapters.email?.lastFailureAt),
            lastError: ownerSafeIntegrationError(adapters.email?.lastError),
        },
    };
};

const buildSafeResponse = (data: Record<string, any> = {}, health: Record<string, any> = {}) => ({
    slack: {
        enabled: Boolean(data.slack?.enabled && data.slack?.webhookUrl),
        webhookConfigured: Boolean(data.slack?.webhookUrl),
        channel: typeof data.slack?.channel === 'string' ? data.slack.channel : '',
        eventFilters: normalizeFilters(data.slack?.eventFilters),
    },
    email: {
        enabled: Boolean(data.email?.enabled && normalizeRecipientList(data.email?.recipients).length > 0),
        recipients: normalizeRecipientList(data.email?.recipients),
        eventFilters: normalizeFilters(data.email?.eventFilters),
    },
    eventTypes: INTEGRATION_EVENT_TYPES,
    defaultEventFilters: DEFAULT_EVENT_FILTERS,
    health: buildSafeHealth(health),
});

export const GET = withAuth(async (_request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) {
        return NextResponse.json({ error: 'Answerlattice integrations are not enabled.' }, { status: 403 });
    }
    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(_request, session, 'integrations');
    if (rateLimitResponse) return rateLimitResponse;

    const permission = await requireAnswerlatticePermission(_request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getAnswerlatticeDb();
    if (!db) return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });

    try {
        const configRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(scope.tenantId, scope.storeId));
        const healthRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`integrationHealth_${scope.tenantId}_${scope.storeId}`);
        const [config, health] = await Promise.all([
            claimScopedSummaryData(db, configRef, scope),
            claimScopedSummaryData(db, healthRef, scope),
        ]);
        return NextResponse.json(buildSafeResponse(config, health));
    } catch (error) {
        if (error instanceof IntegrationConfigOwnershipError) {
            logRuntimeFailure('answerlattice_integrations_settings_ownership_mismatch', error, {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            });
            return NextResponse.json({ error: 'Integration settings require support review.' }, { status: 409 });
        }
        logRuntimeFailure('answerlattice_integrations_settings_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to load integration settings' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) {
        return NextResponse.json({ error: 'Answerlattice integrations are not enabled.' }, { status: 403 });
    }
    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getAnswerlatticeDb();
    if (!db) return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });

    try {
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-integrations', scope.storeId),
            limit: 12,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, INTEGRATIONS_SAVE_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid integration settings',
            tooLargeMessage: 'Request body too large',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid integration settings' },
                { status: bodyResult.response.status },
            );
        }

        const parsed = IntegrationsSaveSchema.parse(bodyResult.data);
        const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(scope.tenantId, scope.storeId));
        const identity = buildAnswerlatticeIntegrationConfigIdentity({ tId: scope.tenantId, sId: scope.storeId });
        if (!identity) throw new IntegrationConfigOwnershipError('Invalid integration config scope');
        const nextConfig = await db.runTransaction(async (transaction) => {
            const currentSnapshot = await transaction.get(docRef);
            const { data: existing } = readScopedSummaryData(currentSnapshot, scope);
            const existingSlack = isRecord(existing.slack) ? existing.slack : {};
            const existingSlackWebhook = typeof existingSlack.webhookUrl === 'string' ? existingSlack.webhookUrl : '';
            const nextSlackWebhook = parsed.slack.clearWebhook ? '' : (parsed.slack.webhookUrl || existingSlackWebhook);

            if (parsed.slack.enabled && !nextSlackWebhook) {
                throw new IntegrationConfigInputError('Slack webhook is required when Slack alerts are enabled.');
            }
            if (parsed.email.enabled && parsed.email.recipients.length === 0) {
                throw new IntegrationConfigInputError('At least one email recipient is required when email alerts are enabled.');
            }

            const next = {
                ...identity,
                slack: {
                    enabled: parsed.slack.enabled,
                    webhookUrl: nextSlackWebhook,
                    channel: parsed.slack.channel || '',
                    eventFilters: parsed.slack.eventFilters.length ? parsed.slack.eventFilters : DEFAULT_EVENT_FILTERS,
                },
                email: {
                    enabled: parsed.email.enabled,
                    recipients: normalizeRecipientList(parsed.email.recipients),
                    eventFilters: parsed.email.eventFilters.length ? parsed.email.eventFilters : DEFAULT_EVENT_FILTERS,
                },
                modifiedOn: FieldValue.serverTimestamp(),
                updatedBy: session?.uId || session?.user?.email || 'unknown',
            };
            transaction.set(docRef, next, { merge: true });
            return next;
        });
        logRuntimeDiagnostic('answerlattice_integrations_settings_saved', {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            slackEnabled: nextConfig.slack.enabled,
            emailEnabled: nextConfig.email.enabled,
            emailRecipientCount: nextConfig.email.recipients.length,
        });

        return NextResponse.json(buildSafeResponse(nextConfig));
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: 'Invalid integration settings' }, { status: 400 });
        }
        if (error instanceof IntegrationConfigInputError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error instanceof IntegrationConfigOwnershipError) {
            logRuntimeFailure('answerlattice_integrations_settings_ownership_mismatch', error, {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            });
            return NextResponse.json({ error: 'Integration settings require support review.' }, { status: 409 });
        }
        logRuntimeFailure('answerlattice_integrations_settings_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to save integration settings' }, { status: 500 });
    }
});
