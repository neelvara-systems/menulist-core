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
import { EmailAdapter } from './adapters/emailAdapter';
import { GithubAdapter } from './adapters/githubAdapter';
import { LinearAdapter } from './adapters/linearAdapter';
import { SlackAdapter } from './adapters/slackAdapter';
import { getIntegrationConfig, isAdapterAvailable, recordDeliveryFailure, recordDeliverySuccess } from './configStore';
import { logDeliveryAttempt, updateEventStatus, updateIntegrationHealth } from './deliveryLogger';
import { consumeAdapterDailySlot, consumeAdapterMinuteSlot, filterEmailRecipientsByDailyLimit } from './rateLimiter';
import {
    ADAPTER_TYPES,
    AdapterConfig,
    AdapterType,
    EVENT_SEVERITY,
    INTEGRATION_EVENT_TYPES,
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
    const eventTypes = new Set<string>(Object.values(INTEGRATION_EVENT_TYPES));
    const severities = new Set<string>(Object.values(EVENT_SEVERITY));
    return Boolean(
        event
        && Number.isFinite(Number(event.tId))
        && Number.isFinite(Number(event.sId))
        && Number(event.tId) > 0
        && Number(event.sId) > 0
        && eventTypes.has(event.eventType)
        && severities.has(event.severity)
    );
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
        logger.warn('[Answerlattice Integration] Invalid event skipped', { eventId });
        await updateEventStatus(eventId, 'failed').catch(() => { });
        return result;
    }

    // Read tenant integration config
    const config = await getIntegrationConfig(event.tId, event.sId);

    // Update event to processing (will be overridden to delivered/failed after dispatch)
    await updateEventStatus(eventId, 'processing').catch(() => { });

    const adapterTypes = Object.values(ADAPTER_TYPES) as AdapterType[];
    let anyDelivered = false;
    let anyAttempted = false;

    for (const adapterType of adapterTypes) {
        // Check adapter availability (enabled + not circuit-broken)
        if (!isAdapterAvailable(config, adapterType)) continue;

        const adapterConfig = getAdapterConfig(config, adapterType);
        if (!adapterConfig) continue;

        // Check event filter — does this adapter want this event type?
        const filters = (adapterConfig as any).eventFilters as string[] | undefined;
        if (filters && filters.length > 0 && !filters.includes(event.eventType)) continue;

        anyAttempted = true;
        const adapter = adapterRegistry[adapterType];
        const cbState = config.circuitBreaker?.[adapterType];
        const currentFailures = cbState?.consecutiveFailures || 0;

        let delivered = false;
        let deliveryConfig: AdapterConfig = adapterConfig;
        const adapterSlotAvailable = await consumeAdapterMinuteSlot(event.tId, event.sId, adapterType).catch(() => false);
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

        const adapterDailySlotAvailable = await consumeAdapterDailySlot(event.tId, event.sId, adapterType).catch(() => false);
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

        if (adapterType === ADAPTER_TYPES.EMAIL) {
            const recipients = Array.isArray((adapterConfig as any).recipients) ? (adapterConfig as any).recipients : [];
            const allowedRecipients = await filterEmailRecipientsByDailyLimit(event.tId, event.sId, recipients).catch(() => []);
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
            deliveryConfig = { ...(adapterConfig as any), recipients: allowedRecipients } as AdapterConfig;
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

            const deliveryResult = await adapter.send(event, deliveryConfig);
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
                tId: event.tId,
                sId: event.sId,
                eventId,
                eventType: event.eventType,
                adapter: adapterType,
                attempt,
                success: deliveryResult.success,
                statusCode: deliveryResult.statusCode,
                durationMs: deliveryResult.durationMs,
            });

            if (deliveryResult.success) {
                delivered = true;
                // Reset circuit breaker on success
                if (currentFailures > 0) {
                    await recordDeliverySuccess(event.tId, event.sId, adapterType).catch(() => { });
                }
                break;
            }

            // If last attempt failed, record failure for circuit breaker
            if (attempt === INTEGRATION_LIMITS.MAX_DELIVERY_ATTEMPTS) {
                await recordDeliveryFailure(event.tId, event.sId, adapterType, currentFailures).catch(() => { });
            }
        }

        if (delivered) {
            result.delivered++;
            anyDelivered = true;
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
        const finalStatus = anyDelivered ? 'delivered' : 'failed';
        await updateEventStatus(eventId, finalStatus).catch(() => { });
    } else {
        logger.info('[Answerlattice Integration] No enabled adapters for event', {
            tId: event.tId,
            sId: event.sId,
            eventId,
            eventType: event.eventType,
        });
        await updateEventStatus(eventId, 'delivered').catch(() => { });
    }

    return result;
}
