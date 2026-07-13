/**
 * Answerlattice — Integration Event Processor
 * 
 * Cloud Function triggered by onCreate on answerlattice_integrationEvents.
 * Reads tenant config, dispatches to enabled adapters, logs delivery.
 * 
 * Retry: 3 attempts with exponential backoff (1s, 4s).
 * Circuit breaker: 10 consecutive failures → auto-disable adapter.
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.2
 */

import * as logger from 'firebase-functions/logger';
import { parseExactAnswerlatticeScope } from '../answerlattice/scopeBoundary';
import { EmailAdapter } from './adapters/emailAdapter';
import { GithubAdapter } from './adapters/githubAdapter';
import { LinearAdapter } from './adapters/linearAdapter';
import { SlackAdapter } from './adapters/slackAdapter';
import { claimCircuitBreakerProbe, getIntegrationConfig, isAdapterAvailable, recordDeliveryFailure, recordDeliverySuccess } from './configStore';
import { claimIntegrationEvent, logDeliveryAttempt, rejectInvalidIntegrationEvent, updateEventStatus, updateIntegrationHealth } from './deliveryLogger';
import {
    isClaimableIntegrationEventDocument,
    resolveIntegrationEventCompletionStatus,
    shouldIntegrationAdapterReceiveEvent,
} from './eventDeliveryState';
import { consumeAdapterDailySlot, consumeAdapterMinuteSlot, filterEmailRecipientsByDailyLimit } from './rateLimiter';
import {
    ADAPTER_TYPES,
    AdapterConfig,
    AdapterType,
    IIntegrationAdapter,
    INTEGRATION_LIMITS,
    DeliveryResult,
    IntegrationConfig,
    IntegrationEvent,
    RETRY_DELAYS_MS,
} from './types';

// ═══════════════════════════════════════════════════════════════
// ADAPTER REGISTRY
// ═══════════════════════════════════════════════════════════════

const adapterRegistry: Record<AdapterType, IIntegrationAdapter> = {
    [ADAPTER_TYPES.SLACK]: new SlackAdapter(),
    [ADAPTER_TYPES.EMAIL]: new EmailAdapter(),
    [ADAPTER_TYPES.LINEAR]: new LinearAdapter(),
    [ADAPTER_TYPES.GITHUB]: new GithubAdapter(),
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getAdapterConfig(config: IntegrationConfig, adapterType: AdapterType): AdapterConfig | null {
    const c = config[adapterType];
    if (!c || !c.enabled) return null;
    return c;
}

function isValidEvent(event: IntegrationEvent): boolean {
    return Boolean(
        event
        && parseExactAnswerlatticeScope(event.tId, event.sId) !== null
        && isClaimableIntegrationEventDocument(event, event)
    );
}

function getEventProcessorStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const text = typeof value === 'string' ? value : '';
    return {
        [`${label}Present`]: text.length > 0,
        [`${label}Length`]: text.length,
    };
}

function getEventProcessorScopeContext(event: Partial<IntegrationEvent>): Record<string, boolean> {
    const scope = parseExactAnswerlatticeScope(event.tId, event.sId);
    return {
        hasTenantScope: scope !== null,
        hasStoreScope: scope !== null,
    };
}

type EventProcessorLogContext = Record<string, boolean | number | string | null | undefined>;

function getEventProcessorSourceErrorContext(error: unknown): EventProcessorLogContext {
    const source = error && typeof error === 'object'
        ? error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown }
        : null;
    const status = Number(source?.status ?? source?.statusCode);

    return {
        sourceErrorName: typeof source?.name === 'string' ? source.name.slice(0, 80) : typeof error,
        sourceErrorCode: source?.code === undefined || source?.code === null ? undefined : String(source.code).slice(0, 80),
        sourceStatusCode: Number.isFinite(status) ? status : undefined,
    };
}

function logEventProcessorFailure(
    failureCode: string,
    error: unknown,
    context: EventProcessorLogContext,
): void {
    logger.error('[Answerlattice Integration] Processor side effect failed', {
        failureCode,
        ...context,
        ...getEventProcessorSourceErrorContext(error),
    });
}

async function updateEventStatusWithDiagnostics(
    eventId: string,
    status: 'processing' | 'delivered' | 'failed',
    event: Partial<IntegrationEvent>,
): Promise<boolean> {
    try {
        return await updateEventStatus(eventId, status, event as IntegrationEvent);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_event_status_update_failed', error, {
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
            targetStatus: status,
        });
        return false;
    }
}

async function consumeAdapterMinuteSlotWithDiagnostics(
    event: IntegrationEvent,
    adapterType: AdapterType,
): Promise<boolean> {
    try {
        return await consumeAdapterMinuteSlot(event.tId, event.sId, adapterType);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_adapter_minute_rate_limit_check_failed', error, {
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
            adapter: adapterType,
        });
        return false;
    }
}

async function consumeAdapterDailySlotWithDiagnostics(
    event: IntegrationEvent,
    adapterType: AdapterType,
): Promise<boolean> {
    try {
        return await consumeAdapterDailySlot(event.tId, event.sId, adapterType);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_adapter_daily_rate_limit_check_failed', error, {
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
            adapter: adapterType,
        });
        return false;
    }
}

async function filterEmailRecipientsByDailyLimitWithDiagnostics(
    event: IntegrationEvent,
    recipients: string[],
): Promise<string[]> {
    try {
        return await filterEmailRecipientsByDailyLimit(event.tId, event.sId, recipients);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_email_recipient_limit_check_failed', error, {
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
            adapter: ADAPTER_TYPES.EMAIL,
            recipientCount: recipients.length,
        });
        return [];
    }
}

async function recordDeliverySuccessWithDiagnostics(
    event: IntegrationEvent,
    eventId: string,
    adapterType: AdapterType,
): Promise<void> {
    try {
        await recordDeliverySuccess(event.tId, event.sId, adapterType);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_delivery_success_record_failed', error, {
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
            adapter: adapterType,
        });
    }
}

async function recordDeliveryFailureWithDiagnostics(
    event: IntegrationEvent,
    eventId: string,
    adapterType: AdapterType,
): Promise<void> {
    try {
        await recordDeliveryFailure(event.tId, event.sId, adapterType);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_delivery_failure_record_failed', error, {
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
            adapter: adapterType,
        });
    }
}

async function claimCircuitBreakerProbeWithDiagnostics(
    config: IntegrationConfig,
    event: IntegrationEvent,
    eventId: string,
    adapterType: AdapterType,
): Promise<boolean> {
    if (!config.circuitBreaker?.[adapterType]?.disabledAt) return true;
    try {
        return await claimCircuitBreakerProbe(event.tId, event.sId, adapterType);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_circuit_breaker_probe_claim_failed', error, {
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
            adapter: adapterType,
        });
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN PROCESSOR
// ═══════════════════════════════════════════════════════════════

/**
 * Process a single integration event.
 * Called by the onCreate Cloud Function trigger.
 * 
 * For each enabled adapter:
 *   1. Check event filter match
 *   2. Check circuit breaker
 *   3. Attempt delivery (up to 3 retries)
 *   4. Log result
 *   5. Update circuit breaker state
 */
export async function processEvent(
    eventId: string,
    event: IntegrationEvent,
): Promise<{ delivered: number; failed: number }> {
    const result = { delivered: 0, failed: 0 };
    if (!isValidEvent(event)) {
        logger.warn('[Answerlattice Integration] Invalid event skipped', {
            failureCode: 'answerlattice_integration_event_invalid_skipped',
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event || {}),
            eventType: event?.eventType,
            severity: event?.severity,
        });
        try {
            await rejectInvalidIntegrationEvent(eventId);
        } catch (error) {
            logEventProcessorFailure('answerlattice_integration_invalid_event_rejection_failed', error, {
                ...getEventProcessorStringContext('eventId', eventId),
            });
        }
        return result;
    }

    const claimed = await claimIntegrationEvent(eventId, event);
    if (!claimed) {
        logger.info('[Answerlattice Integration] Duplicate or non-pending event skipped', {
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
        });
        return result;
    }

    // Read tenant integration config
    let config: IntegrationConfig;
    try {
        config = await getIntegrationConfig(event.tId, event.sId);
    } catch (error) {
        logEventProcessorFailure('answerlattice_integration_config_load_failed', error, {
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
        });
        await updateEventStatusWithDiagnostics(eventId, 'failed', event);
        return result;
    }

    const adapterTypes = Object.values(ADAPTER_TYPES) as AdapterType[];
    let anyAttempted = false;

    for (const adapterType of adapterTypes) {
        const adapterConfig = getAdapterConfig(config, adapterType);
        if (!adapterConfig) continue;

        // Check event filter — does this adapter want this event type?
        const filters = adapterConfig.eventFilters;
        if (!shouldIntegrationAdapterReceiveEvent({
            adapterType,
            eventType: event.eventType,
            eventFilters: filters,
            isOwnerConnectionTest: event.payload.test === true && event.payload.runLogId === 'manual-test',
        })) continue;

        anyAttempted = true;
        const adapter = adapterRegistry[adapterType];

        if (!isAdapterAvailable(config, adapterType)) {
            const circuitBreakerResult: DeliveryResult = {
                success: false,
                retryable: false,
                error: 'Circuit breaker is open',
                durationMs: 0,
            };
            await logDeliveryAttempt({
                eventId,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                attempt: 0,
                result: circuitBreakerResult,
            });
            await updateIntegrationHealth({
                eventId,
                eventType: event.eventType,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                status: 'failed',
                result: circuitBreakerResult,
            });
            result.failed++;
            continue;
        }

        let delivered = false;
        let deliveryConfig: AdapterConfig = adapterConfig;
        const adapterSlotAvailable = await consumeAdapterMinuteSlotWithDiagnostics(event, adapterType);
        if (!adapterSlotAvailable) {
            const rateLimitResult = {
                success: false,
                error: 'Adapter rate limit exceeded',
                durationMs: 0,
            };
            await logDeliveryAttempt({
                eventId,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                attempt: 0,
                result: rateLimitResult,
                status: 'rate_limited',
            });
            await updateIntegrationHealth({
                eventId,
                eventType: event.eventType,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                status: 'rate_limited',
                result: rateLimitResult,
            });
            result.failed++;
            continue;
        }

        const adapterDailySlotAvailable = await consumeAdapterDailySlotWithDiagnostics(event, adapterType);
        if (!adapterDailySlotAvailable) {
            const rateLimitResult = {
                success: false,
                error: 'Adapter daily rate limit exceeded',
                durationMs: 0,
            };
            await logDeliveryAttempt({
                eventId,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                attempt: 0,
                result: rateLimitResult,
                status: 'rate_limited',
            });
            await updateIntegrationHealth({
                eventId,
                eventType: event.eventType,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                status: 'rate_limited',
                result: rateLimitResult,
            });
            result.failed++;
            continue;
        }

        const probeClaimed = await claimCircuitBreakerProbeWithDiagnostics(config, event, eventId, adapterType);
        if (!probeClaimed) {
            const probeResult: DeliveryResult = {
                success: false,
                retryable: false,
                error: 'Circuit breaker probe unavailable',
                durationMs: 0,
            };
            await logDeliveryAttempt({
                eventId,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                attempt: 0,
                result: probeResult,
            });
            await updateIntegrationHealth({
                eventId,
                eventType: event.eventType,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                status: 'failed',
                result: probeResult,
            });
            result.failed++;
            continue;
        }

        if (adapterType === ADAPTER_TYPES.EMAIL) {
            const recipients = config.email.recipients;
            const allowedRecipients = await filterEmailRecipientsByDailyLimitWithDiagnostics(event, recipients);
            if (allowedRecipients.length === 0) {
                const rateLimitResult = {
                    success: false,
                    error: 'Email recipient daily limit exceeded',
                    durationMs: 0,
                };
                await logDeliveryAttempt({
                    eventId,
                    tId: event.tId,
                    sId: event.sId,
                    adapter: adapterType,
                    attempt: 0,
                    result: rateLimitResult,
                    status: 'rate_limited',
                });
                await updateIntegrationHealth({
                    eventId,
                    eventType: event.eventType,
                    tId: event.tId,
                    sId: event.sId,
                    adapter: adapterType,
                    status: 'rate_limited',
                    result: rateLimitResult,
                });
                result.failed++;
                continue;
            }
            deliveryConfig = { ...config.email, recipients: allowedRecipients };
        }

        // Attempt delivery with retries
        let finalDeliveryResult: DeliveryResult = {
            success: false,
            error: 'Delivery not attempted',
            durationMs: 0,
        };
        for (let attempt = 1; attempt <= INTEGRATION_LIMITS.MAX_DELIVERY_ATTEMPTS; attempt++) {
            // Backoff delay (skip for first attempt)
            if (attempt > 1) {
                const delay = RETRY_DELAYS_MS[attempt - 1] || 4_000;
                await sleep(delay);
            }

            const deliveryStartedAt = Date.now();
            let deliveryResult: DeliveryResult;
            try {
                deliveryResult = await adapter.send(event, deliveryConfig);
            } catch (error) {
                logEventProcessorFailure('answerlattice_integration_adapter_unexpected_failure', error, {
                    ...getEventProcessorStringContext('eventId', eventId),
                    ...getEventProcessorScopeContext(event),
                    eventType: event.eventType,
                    adapter: adapterType,
                    attempt,
                });
                deliveryResult = {
                    success: false,
                    retryable: false,
                    error: 'Adapter delivery failed',
                    durationMs: Math.max(0, Date.now() - deliveryStartedAt),
                };
            }
            finalDeliveryResult = deliveryResult;

            // Log the attempt
            await logDeliveryAttempt({
                eventId,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                attempt,
                result: deliveryResult,
            });

            logger.info('[Answerlattice Integration] Delivery attempt completed', {
                ...getEventProcessorStringContext('eventId', eventId),
                ...getEventProcessorScopeContext(event),
                eventType: event.eventType,
                adapter: adapterType,
                attempt,
                success: deliveryResult.success,
                statusCode: deliveryResult.statusCode,
                durationMs: deliveryResult.durationMs,
            });

            if (deliveryResult.success) {
                delivered = true;
                // Serialize the reset with concurrent failure records. The
                // config-store transaction is a no-op when already clean.
                await recordDeliverySuccessWithDiagnostics(event, eventId, adapterType);
                break;
            }

            if (deliveryResult.retryable !== true) {
                await recordDeliveryFailureWithDiagnostics(event, eventId, adapterType);
                break;
            }

            // If last attempt failed, record failure for circuit breaker
            if (attempt === INTEGRATION_LIMITS.MAX_DELIVERY_ATTEMPTS) {
                await recordDeliveryFailureWithDiagnostics(event, eventId, adapterType);
            }
        }

        if (delivered) {
            result.delivered++;
            await updateIntegrationHealth({
                eventId,
                eventType: event.eventType,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                status: 'success',
                result: finalDeliveryResult,
            });
        } else {
            result.failed++;
            await updateIntegrationHealth({
                eventId,
                eventType: event.eventType,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                status: 'failed',
                result: finalDeliveryResult,
            });
        }
    }

    // Update final event status
    if (anyAttempted) {
        const finalStatus = resolveIntegrationEventCompletionStatus(result, true);
        await updateEventStatusWithDiagnostics(eventId, finalStatus, event);
    } else {
        logger.info('[Answerlattice Integration] No enabled adapters for event', {
            ...getEventProcessorStringContext('eventId', eventId),
            ...getEventProcessorScopeContext(event),
            eventType: event.eventType,
        });
        await updateEventStatusWithDiagnostics(eventId, 'delivered', event);
    }

    return result;
}
