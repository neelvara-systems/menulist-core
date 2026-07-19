import { z } from 'zod';

export const ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES = [
    'coverage_drop',
    'ai_failure_recurring',
    'nightly_summary',
] as const;

export const AnswerlatticeWorkflowIntegrationEventTypeSchema = z.enum(
    ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES,
);

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
