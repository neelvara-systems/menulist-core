import { z } from 'zod';

export const ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES = [
    'coverage_drop',
    'ai_failure_recurring',
    'nightly_summary',
] as const;

export const AnswerlatticeWorkflowIntegrationEventTypeSchema = z.enum(
    ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES,
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export function normalizeAnswerlatticeSlackWebhookUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const candidate = value.trim();
    if (!candidate || candidate.length > 500) return null;
    try {
        const url = new URL(candidate);
        return url.protocol === 'https:'
            && url.hostname === 'hooks.slack.com'
            && !url.username
            && !url.password
            && !url.port
            && url.pathname.startsWith('/services/')
            && !url.search
            && !url.hash
            ? url.toString()
            : null;
    } catch {
        return null;
    }
}

const normalizeStoredEventFilters = (value: unknown): AnswerlatticeWorkflowIntegrationEventType[] => {
    if (!Array.isArray(value)) return [];
    const admitted = value.flatMap((entry) => {
        const parsed = AnswerlatticeWorkflowIntegrationEventTypeSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
    });
    return Array.from(new Set(admitted)).slice(0, ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES.length);
};

const normalizeStoredRecipients = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    const admitted = value.flatMap((entry) => {
        if (typeof entry !== 'string') return [];
        const candidate = entry.trim().toLowerCase();
        return candidate.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)
            ? [candidate]
            : [];
    });
    return Array.from(new Set(admitted)).slice(0, 5);
};

const normalizeStoredChannel = (value: unknown): string => (
    typeof value === 'string'
        ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
        : ''
);

export function projectAnswerlatticeWorkflowIntegrationStoredConfig(value: unknown): Pick<
    AnswerlatticeWorkflowIntegrationsResponse,
    'slack' | 'email'
> {
    const data = isRecord(value) ? value : {};
    const slack = isRecord(data.slack) ? data.slack : {};
    const email = isRecord(data.email) ? data.email : {};
    const webhookUrl = normalizeAnswerlatticeSlackWebhookUrl(slack.webhookUrl);
    const recipients = normalizeStoredRecipients(email.recipients);
    return {
        slack: {
            enabled: slack.enabled === true && Boolean(webhookUrl),
            webhookConfigured: Boolean(webhookUrl),
            channel: normalizeStoredChannel(slack.channel),
            eventFilters: normalizeStoredEventFilters(slack.eventFilters),
        },
        email: {
            enabled: email.enabled === true && recipients.length > 0,
            recipients,
            eventFilters: normalizeStoredEventFilters(email.eventFilters),
        },
    };
}

const NullableIsoTimestampSchema = z.string().datetime({ offset: true }).nullable();
const NullableDeliveryStatusSchema = z.enum(['success', 'failed', 'rate_limited']).nullable();

const AnswerlatticeWorkflowIntegrationHealthAdapterSchema = z.object({
    lastStatus: NullableDeliveryStatusSchema,
    lastAttemptAt: NullableIsoTimestampSchema,
    lastSuccessAt: NullableIsoTimestampSchema,
    lastFailureAt: NullableIsoTimestampSchema,
    lastError: z.string().max(80).nullable(),
}).strict();

export const AnswerlatticeWorkflowIntegrationsResponseSchema = z.object({
    slack: z.object({
        enabled: z.boolean(),
        webhookConfigured: z.boolean(),
        channel: z.string().max(80),
        eventFilters: z.array(AnswerlatticeWorkflowIntegrationEventTypeSchema)
            .max(ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES.length),
    }).strict(),
    email: z.object({
        enabled: z.boolean(),
        recipients: z.array(z.string().email().max(160)).max(5),
        eventFilters: z.array(AnswerlatticeWorkflowIntegrationEventTypeSchema)
            .max(ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES.length),
    }).strict(),
    eventTypes: z.array(AnswerlatticeWorkflowIntegrationEventTypeSchema)
        .length(ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES.length),
    defaultEventFilters: z.array(AnswerlatticeWorkflowIntegrationEventTypeSchema)
        .max(ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES.length),
    health: z.object({
        slack: AnswerlatticeWorkflowIntegrationHealthAdapterSchema,
        email: AnswerlatticeWorkflowIntegrationHealthAdapterSchema,
    }).strict(),
}).strict();

export const AnswerlatticeWorkflowIntegrationTestResponseSchema = z.object({
    eventId: z.string().trim().min(1).max(200),
    message: z.string().trim().min(1).max(240),
}).strict();

export type AnswerlatticeWorkflowIntegrationEventType = z.infer<
    typeof AnswerlatticeWorkflowIntegrationEventTypeSchema
>;
export type AnswerlatticeWorkflowIntegrationsResponse = z.infer<
    typeof AnswerlatticeWorkflowIntegrationsResponseSchema
>;
export type AnswerlatticeWorkflowIntegrationTestResponse = z.infer<
    typeof AnswerlatticeWorkflowIntegrationTestResponseSchema
>;
