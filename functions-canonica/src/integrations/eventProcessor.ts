/**
 * Canonica — Integration Event Processor
 * 
 * Cloud Function triggered by onCreate on canonica_integrationEvents.
 * Reads tenant config, dispatches to enabled adapters, logs delivery.
 * 
 * Retry: 3 attempts with exponential backoff (1s, 4s).
 * Circuit breaker: 10 consecutive failures → auto-disable adapter.
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §5.2
 */

import * as logger from 'firebase-functions/logger';
import { EmailAdapter } from './adapters/emailAdapter';
import { GithubAdapter } from './adapters/githubAdapter';
import { LinearAdapter } from './adapters/linearAdapter';
import { SlackAdapter } from './adapters/slackAdapter';
import { getIntegrationConfig, isAdapterAvailable, recordDeliveryFailure, recordDeliverySuccess } from './configStore';
import { logDeliveryAttempt, updateEventStatus } from './deliveryLogger';
import {
    ADAPTER_TYPES,
    AdapterConfig,
    AdapterType,
    EVENT_SEVERITY,
    INTEGRATION_EVENT_TYPES,
    IIntegrationAdapter,
    INTEGRATION_LIMITS,
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
        logger.warn('[Canonica Integration] Invalid event skipped', { eventId });
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

        // Attempt delivery with retries
        for (let attempt = 1; attempt <= INTEGRATION_LIMITS.MAX_DELIVERY_ATTEMPTS; attempt++) {
            // Backoff delay (skip for first attempt)
            if (attempt > 1) {
                const delay = RETRY_DELAYS_MS[attempt - 1] || 4_000;
                await sleep(delay);
            }

            const deliveryResult = await adapter.send(event, adapterConfig);

            // Log the attempt
            await logDeliveryAttempt({
                eventId,
                tId: event.tId,
                sId: event.sId,
                adapter: adapterType,
                attempt,
                result: deliveryResult,
            });

            logger.info('[Canonica Integration] Delivery attempt completed', {
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
        } else {
            result.failed++;
        }
    }

    // Update final event status
    if (anyAttempted) {
        const finalStatus = anyDelivered ? 'delivered' : 'failed';
        await updateEventStatus(eventId, finalStatus).catch(() => { });
    } else {
        logger.info('[Canonica Integration] No enabled adapters for event', {
            tId: event.tId,
            sId: event.sId,
            eventId,
            eventType: event.eventType,
        });
        await updateEventStatus(eventId, 'delivered').catch(() => { });
    }

    return result;
}
