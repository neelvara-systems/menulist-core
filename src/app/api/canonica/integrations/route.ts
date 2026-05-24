export const dynamic = 'force-dynamic';

/**
 * Canonica Workflow Integrations API
 *
 * Owner-scoped settings endpoint for Slack and email governance alerts.
 * Raw Slack webhook URLs stay server-side in platformSummary and are never
 * returned to the browser after save.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { resolveCanonicaSessionScope } from '@lib/canonica/sessionScope';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { withAuth } from '../../../../middleware/auth';

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
                return url.protocol === 'https:' && url.hostname === 'hooks.slack.com' && url.pathname.startsWith('/services/');
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
    }).default({ enabled: false, channel: '', eventFilters: [] }),
    email: z.object({
        enabled: z.boolean().default(false),
        recipients: z.array(z.string().trim().email().max(160)).max(5).default([]),
        eventFilters: z.array(EventFilterSchema).max(INTEGRATION_EVENT_TYPES.length).default([]),
    }).default({ enabled: false, recipients: [], eventFilters: [] }),
});

const DEFAULT_EVENT_FILTERS: IntegrationEventType[] = [
    'nightly_summary',
    'coverage_drop',
    'ai_failure_recurring',
];

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

const configDocId = (tenantId: number, storeId: number) => `integrationConfig_${tenantId}_${storeId}`;

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

const buildSafeHealth = (data: Record<string, any> = {}) => {
    const adapters = data.adapters || {};
    return {
        slack: {
            lastStatus: typeof adapters.slack?.lastStatus === 'string' ? adapters.slack.lastStatus : null,
            lastAttemptAt: toIso(adapters.slack?.lastAttemptAt),
            lastSuccessAt: toIso(adapters.slack?.lastSuccessAt),
            lastFailureAt: toIso(adapters.slack?.lastFailureAt),
            lastError: typeof adapters.slack?.lastError === 'string' ? adapters.slack.lastError : null,
        },
        email: {
            lastStatus: typeof adapters.email?.lastStatus === 'string' ? adapters.email.lastStatus : null,
            lastAttemptAt: toIso(adapters.email?.lastAttemptAt),
            lastSuccessAt: toIso(adapters.email?.lastSuccessAt),
            lastFailureAt: toIso(adapters.email?.lastFailureAt),
            lastError: typeof adapters.email?.lastError === 'string' ? adapters.email.lastError : null,
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
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WORKFLOW_INTEGRATIONS) {
        return NextResponse.json({ error: 'Canonica integrations are not enabled.' }, { status: 403 });
    }

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getCanonicaDb();
    if (!db) return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });

    try {
        const [configSnap, healthSnap] = await Promise.all([
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(scope.tenantId, scope.storeId)).get(),
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`integrationHealth_${scope.tenantId}_${scope.storeId}`).get(),
        ]);
        return NextResponse.json(buildSafeResponse(
            configSnap.exists ? configSnap.data() || {} : {},
            healthSnap.exists ? healthSnap.data() || {} : {},
        ));
    } catch (error) {
        secureError('[Canonica Integrations] Failed to load settings', error as Error, {
            tenantId: scope.tenantId,
            storeId: scope.storeId,
        });
        return NextResponse.json({ error: 'Failed to load integration settings' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WORKFLOW_INTEGRATIONS) {
        return NextResponse.json({ error: 'Canonica integrations are not enabled.' }, { status: 403 });
    }

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const db = getCanonicaDb();
    if (!db) return NextResponse.json({ error: 'Canonica Firebase is not configured' }, { status: 503 });

    try {
        const rateLimitResult = await checkRateLimit({
            key: `canonica-integrations:${scope.storeId}`,
            limit: 12,
            window: 60,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const parsed = IntegrationsSaveSchema.parse(await request.json().catch(() => null));
        const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(configDocId(scope.tenantId, scope.storeId));
        const existingSnap = await docRef.get();
        const existing = existingSnap.exists ? existingSnap.data() || {} : {};

        const existingSlackWebhook = typeof existing.slack?.webhookUrl === 'string' ? existing.slack.webhookUrl : '';
        const nextSlackWebhook = parsed.slack.clearWebhook ? '' : (parsed.slack.webhookUrl || existingSlackWebhook);

        if (parsed.slack.enabled && !nextSlackWebhook) {
            return NextResponse.json({ error: 'Slack webhook is required when Slack alerts are enabled.' }, { status: 400 });
        }
        if (parsed.email.enabled && parsed.email.recipients.length === 0) {
            return NextResponse.json({ error: 'At least one email recipient is required when email alerts are enabled.' }, { status: 400 });
        }

        const nextConfig = {
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
            linear: existing.linear || { enabled: false, apiKey: '', teamId: '', eventFilters: [] },
            github: existing.github || { enabled: false, token: '', owner: '', repo: '', eventFilters: [] },
            circuitBreaker: existing.circuitBreaker || {},
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: session?.uId || session?.user?.email || 'unknown',
        };

        await docRef.set(nextConfig, { merge: true });
        secureLog('[Canonica Integrations] Settings saved', {
            tenantId: scope.tenantId,
            storeId: scope.storeId,
            slackEnabled: nextConfig.slack.enabled,
            emailEnabled: nextConfig.email.enabled,
            emailRecipientCount: nextConfig.email.recipients.length,
        });

        return NextResponse.json(buildSafeResponse(nextConfig));
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: 'Invalid integration settings' }, { status: 400 });
        }
        secureError('[Canonica Integrations] Failed to save settings', error as Error, {
            tenantId: scope.tenantId,
            storeId: scope.storeId,
        });
        return NextResponse.json({ error: 'Failed to save integration settings' }, { status: 500 });
    }
});
