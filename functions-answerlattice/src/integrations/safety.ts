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

export function safeText(value: unknown, maxLength = 200): string {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

export function escapeHtml(value: unknown, maxLength = 400): string {
    return safeText(value, maxLength)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function sanitizeDeliveryError(value: unknown, maxLength = 180): string {
    let message = safeText(value instanceof Error ? value.message : value, maxLength * 2);
    for (const pattern of SECRET_PATTERNS) {
        message = message.replace(pattern, '[redacted]');
    }
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
        if (!url.pathname.startsWith('/services/')) return '';
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

export function normalizeSlackConfig(value: any): SlackConfig {
    const webhookUrl = normalizeSlackWebhook(value?.webhookUrl);
    const channel = safeText(value?.channel, 80);
    const eventFilters = normalizeEventFilters(value?.eventFilters);
    return {
        enabled: normalizeBoolean(value?.enabled) && Boolean(webhookUrl),
        webhookUrl,
        channel,
        eventFilters,
    };
}

export function normalizeEmailConfig(value: any): EmailConfig {
    const recipients = normalizeEmailRecipients(value?.recipients);
    const eventFilters = normalizeEventFilters(value?.eventFilters);
    return {
        enabled: normalizeBoolean(value?.enabled) && recipients.length > 0,
        recipients,
        eventFilters,
    };
}

export function normalizeLinearConfig(value: any): LinearConfig {
    const apiKey = normalizeToken(value?.apiKey);
    const teamId = safeText(value?.teamId, 120);
    const eventFilters = normalizeEventFilters(value?.eventFilters);
    return {
        enabled: normalizeBoolean(value?.enabled) && Boolean(apiKey) && Boolean(teamId),
        apiKey,
        teamId,
        eventFilters,
    };
}

export function normalizeGithubConfig(value: any): GithubConfig {
    const token = normalizeToken(value?.token);
    const owner = normalizeGithubSlug(value?.owner);
    const repo = normalizeGithubSlug(value?.repo);
    const eventFilters = normalizeEventFilters(value?.eventFilters);
    return {
        enabled: normalizeBoolean(value?.enabled) && Boolean(token) && Boolean(owner) && Boolean(repo),
        token,
        owner,
        repo,
        eventFilters,
    };
}

function normalizeCircuitBreaker(value: any): IntegrationConfig['circuitBreaker'] {
    const fallback: IntegrationConfig['circuitBreaker'] = {
        slack: { consecutiveFailures: 0, disabledAt: null },
        email: { consecutiveFailures: 0, disabledAt: null },
        linear: { consecutiveFailures: 0, disabledAt: null },
        github: { consecutiveFailures: 0, disabledAt: null },
    };
    const out: IntegrationConfig['circuitBreaker'] = { ...fallback };
    for (const adapter of Object.values(ADAPTER_TYPES) as AdapterType[]) {
        const state = value?.[adapter];
        const failures = Number(state?.consecutiveFailures || 0);
        out[adapter] = {
            consecutiveFailures: Number.isFinite(failures) ? Math.max(0, Math.min(failures, 1000)) : 0,
            disabledAt: state?.disabledAt instanceof Timestamp ? state.disabledAt : null,
        };
    }
    return out;
}

export function normalizeIntegrationConfig(value: any): IntegrationConfig {
    return {
        slack: normalizeSlackConfig(value?.slack),
        email: normalizeEmailConfig(value?.email),
        linear: normalizeLinearConfig(value?.linear),
        github: normalizeGithubConfig(value?.github),
        circuitBreaker: normalizeCircuitBreaker(value?.circuitBreaker),
        modifiedOn: value?.modifiedOn instanceof Timestamp ? value.modifiedOn : Timestamp.now(),
    };
}

export function sanitizeIntegrationPayload(payload: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload || {})) {
        if (/token|secret|password|webhook|apiKey|authorization/i.test(key)) continue;
        if (Array.isArray(value)) {
            sanitized[key] = value.slice(0, 5).map(item => typeof item === 'string' ? safeText(item, 180) : item);
        } else if (typeof value === 'string') {
            sanitized[key] = safeText(value, 300);
        } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
