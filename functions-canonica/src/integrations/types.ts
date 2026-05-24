/**
 * Canonica — Integration Event Types
 * 
 * Type definitions for the External Workflow Integrations system.
 * Covers: event bus, adapters, config store, delivery logging.
 * 
 * Feature-flagged: ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
 * @see __docs__/canonica/workflow-integrations/
 */

import { Timestamp } from 'firebase-admin/firestore';

// ═══════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════

export const INTEGRATION_EVENT_TYPES = {
    DRIFT_DETECTED: 'drift_detected',
    MUTATION_PROPOSED: 'mutation_proposed',
    KNOWLEDGE_GAP_DETECTED: 'knowledge_gap_detected',
    COVERAGE_DROP: 'coverage_drop',
    ARTICLE_APPROVED: 'article_approved',
    AI_FAILURE_RECURRING: 'ai_failure_recurring',
    NIGHTLY_SUMMARY: 'nightly_summary',
} as const;

export type IntegrationEventType = typeof INTEGRATION_EVENT_TYPES[keyof typeof INTEGRATION_EVENT_TYPES];

export const EVENT_SEVERITY = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
} as const;

export type EventSeverity = typeof EVENT_SEVERITY[keyof typeof EVENT_SEVERITY];

export const EVENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    DELIVERED: 'delivered',
    FAILED: 'failed',
} as const;

export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS];

// ═══════════════════════════════════════════════════════════════
// INTEGRATION EVENT (Firestore document)
// ═══════════════════════════════════════════════════════════════

export interface IntegrationEvent {
    eventId?: string;
    pId?: 'CN';
    eventType: IntegrationEventType;
    tId: number;
    sId: number;
    severity: EventSeverity;
    payload: Record<string, any>;
    status: EventStatus;
    createdAt: Timestamp;
    expiresAt?: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// ADAPTER TYPES
// ═══════════════════════════════════════════════════════════════

export const ADAPTER_TYPES = {
    SLACK: 'slack',
    EMAIL: 'email',
    LINEAR: 'linear',
    GITHUB: 'github',
} as const;

export type AdapterType = typeof ADAPTER_TYPES[keyof typeof ADAPTER_TYPES];

export interface DeliveryResult {
    success: boolean;
    statusCode?: number;
    error?: string;
    durationMs: number;
}

export interface DeliveryLogEntry {
    eventId: string;
    pId?: 'CN';
    tId: number;
    sId: number;
    adapter: AdapterType;
    attempt: number;
    status: 'success' | 'failed' | 'rate_limited';
    statusCode?: number | null;
    error?: string | null;
    durationMs: number;
    createdAt: Timestamp;
    expiresAt?: Timestamp;
}

export interface IntegrationDeliveryHealth {
    adapters: Partial<Record<AdapterType, {
        lastStatus: 'success' | 'failed' | 'rate_limited';
        lastAttemptAt: Timestamp;
        lastSuccessAt?: Timestamp | null;
        lastFailureAt?: Timestamp | null;
        lastError?: string | null;
        lastEventId?: string;
        lastEventType?: IntegrationEventType;
        statusCode?: number | null;
        durationMs?: number;
    }>>;
    modifiedOn: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// ADAPTER INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface IIntegrationAdapter {
    readonly adapterType: AdapterType;

    send(
        event: IntegrationEvent,
        config: AdapterConfig,
    ): Promise<DeliveryResult>;

    formatPayload(event: IntegrationEvent): any;
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION CONFIG (per-tenant, stored in platformSummary)
// ═══════════════════════════════════════════════════════════════

export interface SlackConfig {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    eventFilters: IntegrationEventType[];
}

export interface EmailConfig {
    enabled: boolean;
    recipients: string[];
    eventFilters: IntegrationEventType[];
}

export interface LinearConfig {
    enabled: boolean;
    apiKey: string;
    teamId: string;
    eventFilters: IntegrationEventType[];
}

export interface GithubConfig {
    enabled: boolean;
    token: string;
    owner: string;
    repo: string;
    eventFilters: IntegrationEventType[];
}

export type AdapterConfig = SlackConfig | EmailConfig | LinearConfig | GithubConfig;

export interface CircuitBreakerState {
    consecutiveFailures: number;
    disabledAt: Timestamp | null;
}

export interface IntegrationConfig {
    slack: SlackConfig;
    email: EmailConfig;
    linear: LinearConfig;
    github: GithubConfig;
    circuitBreaker: Record<AdapterType, CircuitBreakerState>;
    modifiedOn: Timestamp;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const INTEGRATION_LIMITS = {
    MAX_EVENTS_PER_NIGHTLY_RUN: 50,
    MAX_DELIVERY_ATTEMPTS: 3,
    MAX_EVENTS_PER_MINUTE_PER_ADAPTER: 20,
    MAX_EVENTS_PER_DAY_PER_ADAPTER: 50,
    CIRCUIT_BREAKER_THRESHOLD: 10,
    CIRCUIT_BREAKER_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours
    EVENT_TTL_DAYS: 90,
    DELIVERY_LOG_TTL_DAYS: 90,
    MAX_EMAIL_RECIPIENTS: 5,
    MAX_EMAIL_PER_DAY_PER_RECIPIENT: 20,
    ADAPTER_TIMEOUT_MS: 10_000, // 10 seconds
    LINEAR_TIMEOUT_MS: 15_000,
    GITHUB_TIMEOUT_MS: 15_000,
} as const;

// Retry delays in milliseconds (exponential backoff)
export const RETRY_DELAYS_MS = [0, 1_000, 4_000] as const;

// Coverage drop threshold
export const COVERAGE_DROP_THRESHOLD = 0.60;
