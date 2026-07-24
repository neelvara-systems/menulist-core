/**
 * Answerlattice integration safety helpers.
 *
 * Keeps external delivery bounded, validates tenant-owned configs, and prevents
 * secrets or unbounded payloads from entering logs/delivery records.
 */

import { Timestamp } from 'firebase-admin/firestore';
import {
    ADAPTER_TYPES,
    AdapterType,
    EmailConfig,
    GithubConfig,
    IntegrationConfig,
    IntegrationEventType,
    INTEGRATION_EVENT_TYPES,
    INTEGRATION_LIMITS,
    LinearConfig,
    SlackConfig,
} from './types';

const SECRET_PATTERNS = [
    /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/gi,
    /Bearer\s+[A-Za-z0-9._~-]+/gi,
    /xox[baprs]-[A-Za-z0-9-]+/gi,
    /gh[pousr]_[A-Za-z0-9_]+/gi,
    /lin_api_[A-Za-z0-9_]+/gi,
];

const EVENT_TYPE_SET = new Set<string>(Object.values(INTEGRATION_EVENT_TYPES));
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SENSITIVE_PAYLOAD_KEY_PATTERN = /token|secret|password|passphrase|webhook|api[_-]?key|private[_-]?key|authorization|credential/i;
const MAX_INTEGRATION_PAYLOAD_KEYS = 40;
const MAX_INTEGRATION_PAYLOAD_ARRAY_ITEMS = 5;

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function redactSecrets(value: string): string {
    let redacted = value;
    for (const pattern of SECRET_PATTERNS) {
        redacted = redacted.replace(pattern, '[redacted]');
    }
    return redacted;
}

export function safeText(value: unknown, maxLength = 200): string {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export function safePayloadCount(value: unknown, maxValue = 1_000_000_000): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.min(Math.max(0, Math.trunc(value)), maxValue);
}

export function safePayloadRatio(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.min(Math.max(0, value), 1);
}

export function safePayloadStringArray(
    value: unknown,
    maxItems = MAX_INTEGRATION_PAYLOAD_ARRAY_ITEMS,
    maxItemLength = 160,
): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .slice(0, Math.max(0, maxItems))
        .filter((item): item is string => typeof item === 'string')
        .map(item => redactSecrets(safeText(item, maxItemLength)))
        .filter(Boolean);
}

export function safeSlackMrkdwnText(value: unknown, maxLength = 200): string {
    return redactSecrets(safeText(value, maxLength))
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function escapeHtml(value: unknown, maxLength = 400): string {
    return redactSecrets(safeText(value, maxLength))
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function sanitizeDeliveryError(value: unknown, maxLength = 180): string {
    const message = redactSecrets(safeText(value instanceof Error ? value.message : value, maxLength * 2));
    return message.slice(0, maxLength) || 'Delivery failed';
}

export function normalizeEventFilters(value: unknown): IntegrationEventType[] {
    if (!Array.isArray(value)) return [];
    const filters = value
        .filter((item): item is IntegrationEventType => typeof item === 'string' && EVENT_TYPE_SET.has(item));
    return Array.from(new Set(filters)).slice(0, Object.values(INTEGRATION_EVENT_TYPES).length);
}

function normalizeBoolean(value: unknown): boolean {
    return value === true;
}

function normalizeSlackWebhook(value: unknown): string {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
        const url = new URL(trimmed);
        if (url.protocol !== 'https:') return '';
        if (url.hostname !== 'hooks.slack.com') return '';
        if (url.username || url.password || url.port) return '';
        if (!url.pathname.startsWith('/services/')) return '';
        if (url.search || url.hash) return '';
        return url.toString();
    } catch {
        return '';
    }
}

function normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const email = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    return email.slice(0, 160);
}

function normalizeEmailRecipients(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const recipients = value
        .map(normalizeEmail)
        .filter((item): item is string => Boolean(item));
    return Array.from(new Set(recipients)).slice(0, INTEGRATION_LIMITS.MAX_EMAIL_RECIPIENTS);
}

function normalizeGithubSlug(value: unknown): string {
    if (typeof value !== 'string') return '';
    const normalized = value.trim();
    return /^[A-Za-z0-9_.-]{1,100}$/.test(normalized) ? normalized : '';
}

function normalizeToken(value: unknown, maxLength = 300): string {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

export function normalizeSlackConfig(value: unknown): SlackConfig {
    const data = asRecord(value);
    const webhookUrl = normalizeSlackWebhook(data.webhookUrl);
    const channel = typeof data.channel === 'string' ? safeText(data.channel, 80) : '';
    const eventFilters = normalizeEventFilters(data.eventFilters);
    return {
        enabled: normalizeBoolean(data.enabled) && Boolean(webhookUrl),
        webhookUrl,
        channel,
        eventFilters,
    };
}

export function normalizeEmailConfig(value: unknown): EmailConfig {
    const data = asRecord(value);
    const recipients = normalizeEmailRecipients(data.recipients);
    const eventFilters = normalizeEventFilters(data.eventFilters);
    return {
        enabled: normalizeBoolean(data.enabled) && recipients.length > 0,
        recipients,
        eventFilters,
    };
}

export function normalizeLinearConfig(value: unknown): LinearConfig {
    const data = asRecord(value);
    const apiKey = normalizeToken(data.apiKey);
    const teamId = typeof data.teamId === 'string' ? safeText(data.teamId, 120) : '';
    const eventFilters = normalizeEventFilters(data.eventFilters);
    return {
        enabled: normalizeBoolean(data.enabled) && Boolean(apiKey) && Boolean(teamId),
        apiKey,
        teamId,
        eventFilters,
    };
}

export function normalizeGithubConfig(value: unknown): GithubConfig {
    const data = asRecord(value);
    const token = normalizeToken(data.token);
    const owner = normalizeGithubSlug(data.owner);
    const repo = normalizeGithubSlug(data.repo);
    const eventFilters = normalizeEventFilters(data.eventFilters);
    return {
        enabled: normalizeBoolean(data.enabled) && Boolean(token) && Boolean(owner) && Boolean(repo),
        token,
        owner,
        repo,
        eventFilters,
    };
}

function normalizeCircuitBreaker(value: unknown): IntegrationConfig['circuitBreaker'] {
    const data = asRecord(value);
    const fallback: IntegrationConfig['circuitBreaker'] = {
        slack: { consecutiveFailures: 0, disabledAt: null, probeStartedAt: null },
        email: { consecutiveFailures: 0, disabledAt: null, probeStartedAt: null },
        linear: { consecutiveFailures: 0, disabledAt: null, probeStartedAt: null },
        github: { consecutiveFailures: 0, disabledAt: null, probeStartedAt: null },
    };
    const out: IntegrationConfig['circuitBreaker'] = { ...fallback };
    for (const adapter of Object.values(ADAPTER_TYPES) as AdapterType[]) {
        const state = asRecord(data[adapter]);
        const failures = state.consecutiveFailures;
        out[adapter] = {
            consecutiveFailures: typeof failures === 'number'
                && Number.isSafeInteger(failures)
                && failures >= 0
                && failures <= 1000
                ? failures
                : 0,
            disabledAt: state.disabledAt instanceof Timestamp ? state.disabledAt : null,
            probeStartedAt: state.probeStartedAt instanceof Timestamp ? state.probeStartedAt : null,
        };
    }
    return out;
}

export function normalizeIntegrationConfig(
    value: unknown,
    identity: Pick<IntegrationConfig, 'pId' | 'tId' | 'sId'>,
): IntegrationConfig {
    const data = asRecord(value);
    return {
        ...identity,
        slack: normalizeSlackConfig(data.slack),
        email: normalizeEmailConfig(data.email),
        linear: normalizeLinearConfig(data.linear),
        github: normalizeGithubConfig(data.github),
        circuitBreaker: normalizeCircuitBreaker(data.circuitBreaker),
        modifiedOn: data.modifiedOn instanceof Timestamp ? data.modifiedOn : Timestamp.now(),
    };
}

export function sanitizeIntegrationPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload || {}).slice(0, MAX_INTEGRATION_PAYLOAD_KEYS)) {
        if (
            !key
            || key.length > 80
            || UNSAFE_OBJECT_KEYS.has(key)
            || SENSITIVE_PAYLOAD_KEY_PATTERN.test(key)
        ) continue;
        if (Array.isArray(value)) {
            sanitized[key] = value
                .slice(0, MAX_INTEGRATION_PAYLOAD_ARRAY_ITEMS)
                .flatMap((item) => {
                    if (typeof item === 'string') return [redactSecrets(safeText(item, 180))];
                    if (typeof item === 'boolean' || item === null) return [item];
                    if (typeof item === 'number' && Number.isFinite(item)) return [item];
                    return [];
                });
        } else if (typeof value === 'string') {
            sanitized[key] = redactSecrets(safeText(value, 300));
        } else if ((typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean' || value === null) {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
