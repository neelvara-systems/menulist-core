/**
 * Sentry Error Tracking for Firebase Functions
 * 
 * Provides error tracking, performance monitoring, and breadcrumbs
 * for Firebase Cloud Functions. Uses the same Sentry project as
 * the Next.js frontend for unified monitoring.
 * 
 * Features:
 * - Error capture with context
 * - Performance transactions
 * - Breadcrumb trails
 * - User context for debugging
 * 
 * @see /docs/architecture/SENTRY.md for full documentation
 */

import * as Sentry from '@sentry/node';
import * as functions from 'firebase-functions';
import { isFunctionFeatureEnabled } from '../constants/features';
import { getBoundedFunctionsErrorCode, getBoundedFunctionsErrorStatus , getBoundedFunctionsErrorName} from '../utils/boundedErrorContext';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const isProduction = process.env.NODE_ENV === 'production' || !isEmulator;

// Check if Sentry is enabled via feature flag
const isSentryEnabled = isFunctionFeatureEnabled('ENABLE_SENTRY');

// DSN from Firebase secrets/env. Do not embed a fallback project DSN in code.
// Set via: firebase functions:secrets:set SENTRY_DSN
function getConfiguredFunctionsSentryDsn(): string {
    const sentryDsn = String(process.env.SENTRY_DSN || '').trim();
    if (isProduction) return sentryDsn;

    return String(process.env.SENTRY_DEV_DSN || '').trim() || sentryDsn;
}

let isInitialized = false;

const FUNCTION_SENTRY_SENSITIVE_KEYS = new Set([
    'body',
    'businessname',
    'content',
    'customername',
    'description',
    'displayemail',
    'displayname',
    'email',
    'errormessage',
    'input',
    'name',
    'ownername',
    'payload',
    'phone',
    'prompt',
    'raw',
    'response',
    'stack',
    'storename',
    'tenantname',
    'text',
    'title',
    'username',
]);

const FUNCTION_SENTRY_IDENTIFIER_KEYS = new Set([
    'articleid',
    'customerid',
    'fileid',
    'id',
    'jobid',
    'orderid',
    'projectid',
    'providerid',
    'requestid',
    'sessionid',
    'sourceid',
    'storeid',
    'tenantid',
    'transactionid',
    'uid',
    'userid',
]);

const FUNCTION_SENTRY_PATH_KEYS = new Set([
    'endpoint',
    'from',
    'path',
    'pathname',
    'route',
    'routepath',
    'to',
    'url',
    'webhookurl',
]);

const FUNCTION_SENTRY_SUMMARY_PATTERN = /^\[[a-z_]+:length=\d+\]$/;
const FUNCTION_SENTRY_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const FUNCTION_SENTRY_ROUTE_PATTERN = /(?:^|\s)(?:https?:\/\/|\/[A-Za-z0-9._~/?#[\]@!$&'()*+,;=:%-]+)|[?&][A-Za-z0-9._~-]+=/i;
const FUNCTION_SENTRY_SECRET_VALUE_PATTERN = /\b(?:bearer\s+[A-Za-z0-9._~+/=-]+|(?:token|api[_-]?key|secret|password|authorization)=\S+)/i;

function normalizeFunctionSentryKey(key?: string): string {
    return String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function summarizeFunctionSentryValue(kind: string, value: unknown): string {
    if (typeof value === 'string') return `[${kind}:length=${value.length}]`;
    if (Array.isArray(value)) return `[${kind}:length=${value.length}]`;
    if (value && typeof value === 'object') return `[${kind}:length=${Object.keys(value).length}]`;
    return `[${kind}:length=${String(value ?? '').length}]`;
}

function getSentryErrorCode(error: Error): string {
    return getBoundedFunctionsErrorCode(error) || 'unknown';
}

function getFunctionSentryErrorStatus(error: Error): number | undefined {
    return getBoundedFunctionsErrorStatus(error);
}

function getFunctionSentryErrorContext(error: Error): Record<string, unknown> {
    return {
        sourceErrorCode: getBoundedFunctionsErrorCode(error),
        sourceErrorName: getBoundedFunctionsErrorName(error) || 'Error',
        sourceStatusCode: getFunctionSentryErrorStatus(error),
        messagePresent: typeof error.message === 'string' && error.message.length > 0,
        messageLength: typeof error.message === 'string' ? error.message.length : 0,
        stackPresent: typeof error.stack === 'string' && error.stack.length > 0,
        stackLength: typeof error.stack === 'string' ? error.stack.length : 0,
    };
}

function sanitizeFunctionSentryString(value: string, key?: string): string {
    if (FUNCTION_SENTRY_SUMMARY_PATTERN.test(value)) return value;

    const normalizedKey = normalizeFunctionSentryKey(key);
    if (FUNCTION_SENTRY_SENSITIVE_KEYS.has(normalizedKey)) return summarizeFunctionSentryValue('redacted', value);
    if (FUNCTION_SENTRY_IDENTIFIER_KEYS.has(normalizedKey)) return summarizeFunctionSentryValue('identifier_present', value);
    if (FUNCTION_SENTRY_PATH_KEYS.has(normalizedKey)) return summarizeFunctionSentryValue('path_present', value);
    if (FUNCTION_SENTRY_EMAIL_PATTERN.test(value) || FUNCTION_SENTRY_SECRET_VALUE_PATTERN.test(value)) {
        return summarizeFunctionSentryValue('redacted', value);
    }
    if (FUNCTION_SENTRY_ROUTE_PATTERN.test(value)) return summarizeFunctionSentryValue('path_present', value);

    return value.length > 500 ? `${value.slice(0, 500)}...[truncated:${value.length}]` : value;
}

function sanitizeFunctionSentryValue(
    value: unknown,
    depth: number = 0,
    key?: string,
    seen: WeakSet<object> = new WeakSet()
): unknown {
    if (value === undefined || value === null) return value;
    if (depth >= 4) return '[Truncated]';

    const normalizedKey = normalizeFunctionSentryKey(key);

    if (typeof value === 'string') return sanitizeFunctionSentryString(value, key);

    if (typeof value === 'number' || typeof value === 'boolean') {
        return FUNCTION_SENTRY_IDENTIFIER_KEYS.has(normalizedKey)
            ? summarizeFunctionSentryValue('identifier_present', String(value))
            : value;
    }

    if (value instanceof Error) return getFunctionSentryErrorContext(value);

    if (value && typeof value === 'object' && FUNCTION_SENTRY_SENSITIVE_KEYS.has(normalizedKey)) {
        return summarizeFunctionSentryValue('redacted', value);
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        return value.slice(0, 20).map((entry) => sanitizeFunctionSentryValue(entry, depth + 1, key, seen));
    }

    if (typeof value === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .slice(0, 40)
                .map(([entryKey, entryValue]) => [entryKey, sanitizeFunctionSentryValue(entryValue, depth + 1, entryKey, seen)])
        );
    }

    return String(value);
}

function getFunctionSentryTagValue(key: string, value: unknown): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') return sanitizeFunctionSentryString(value, key).slice(0, 200);
    if (typeof value === 'number' || typeof value === 'boolean') {
        return FUNCTION_SENTRY_IDENTIFIER_KEYS.has(normalizeFunctionSentryKey(key))
            ? summarizeFunctionSentryValue('identifier_present', String(value))
            : String(value);
    }
    return summarizeFunctionSentryValue('value_present', value);
}

export function getSanitizedFunctionSentryContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;
    return sanitizeFunctionSentryValue(context) as Record<string, unknown>;
}

export function getSanitizedFunctionSentryMessage(message: string): string {
    return sanitizeFunctionSentryString(message, 'message').slice(0, 200);
}

function sanitizeFunctionSentryBreadcrumb(breadcrumb: Record<string, unknown>): Record<string, unknown> {
    return {
        ...breadcrumb,
        data: sanitizeFunctionSentryValue(breadcrumb.data),
        message: typeof breadcrumb.message === 'string'
            ? getSanitizedFunctionSentryMessage(breadcrumb.message)
            : breadcrumb.message,
    };
}

function sanitizeFunctionSentryEvent<T extends object>(event: T): T {
    const sanitizedEvent: Record<string, any> = { ...(event as Record<string, any>) };

    if (typeof sanitizedEvent.message === 'string') {
        sanitizedEvent.message = getSanitizedFunctionSentryMessage(sanitizedEvent.message);
    }
    if (typeof sanitizedEvent.transaction === 'string') {
        sanitizedEvent.transaction = sanitizeFunctionSentryString(sanitizedEvent.transaction, 'routePath');
    }

    if (sanitizedEvent.exception && Array.isArray(sanitizedEvent.exception.values)) {
        sanitizedEvent.exception = {
            ...sanitizedEvent.exception,
            values: sanitizedEvent.exception.values.map((entry: Record<string, unknown>) => ({
                ...entry,
                mechanism: sanitizeFunctionSentryValue(entry.mechanism),
                type: typeof entry.type === 'string'
                    ? sanitizeFunctionSentryString(entry.type, 'errorType').slice(0, 120)
                    : entry.type,
                value: typeof entry.value === 'string'
                    ? summarizeFunctionSentryValue('error_message_present', entry.value)
                    : entry.value,
            })),
        };
    }

    if (sanitizedEvent.extra) sanitizedEvent.extra = sanitizeFunctionSentryValue(sanitizedEvent.extra);
    if (sanitizedEvent.contexts) sanitizedEvent.contexts = sanitizeFunctionSentryValue(sanitizedEvent.contexts);
    if (sanitizedEvent.tags) sanitizedEvent.tags = sanitizeFunctionSentryValue(sanitizedEvent.tags);
    if (sanitizedEvent.user) sanitizedEvent.user = sanitizeFunctionSentryValue(sanitizedEvent.user);
    if (sanitizedEvent.request) sanitizedEvent.request = sanitizeFunctionSentryValue(sanitizedEvent.request);
    if (sanitizedEvent.fingerprint) sanitizedEvent.fingerprint = sanitizeFunctionSentryValue(sanitizedEvent.fingerprint);

    if (Array.isArray(sanitizedEvent.breadcrumbs)) {
        sanitizedEvent.breadcrumbs = sanitizedEvent.breadcrumbs.map(sanitizeFunctionSentryBreadcrumb);
    } else if (Array.isArray(sanitizedEvent.breadcrumbs?.values)) {
        sanitizedEvent.breadcrumbs = {
            ...sanitizedEvent.breadcrumbs,
            values: sanitizedEvent.breadcrumbs.values.map(sanitizeFunctionSentryBreadcrumb),
        };
    }

    return sanitizedEvent as T;
}

function shouldDropExpectedSentryError(error: Error): boolean {
    const code = getSentryErrorCode(error);
    const name = error.name.toUpperCase();
    return name === 'CIRCUITBREAKERERROR' ||
        code === '429' ||
        code.includes('RATE_LIMIT') ||
        code.includes('RESOURCE_EXHAUSTED') ||
        code.includes('QUOTA');
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize Sentry for Firebase Functions
 * Call this once at the top of your function entry point
 * 
 * Respects FUNCTION_FLAGS.ENABLE_SENTRY feature flag
 */
export function initSentry(): void {
    if (isInitialized) return;

    // Skip initialization if Sentry is disabled via feature flag
    if (!isSentryEnabled) {
        isInitialized = true; // Mark as "initialized" to prevent repeated checks
        functions.logger.info('[Sentry] Disabled via feature flag');
        return;
    }

    const dsn = getConfiguredFunctionsSentryDsn();
    if (!dsn) {
        isInitialized = true;
        functions.logger.warn('[Sentry] Disabled because SENTRY_DSN is not configured', {
            environment: isProduction ? 'production' : 'development',
            enabled: false,
        });
        return;
    }

    Sentry.init({
        dsn,
        environment: isProduction ? 'production' : 'development',
        release: process.env.K_REVISION
            ? `firebase-functions@${process.env.K_REVISION}`
            : 'firebase-functions@local',

        // Performance sampling
        tracesSampleRate: isProduction ? 0.1 : 1.0, // 10% in prod, 100% in dev

        // Don't send in emulator unless explicitly enabled
        enabled: isProduction || process.env.SENTRY_ENABLED_IN_EMULATOR === 'true',
        sendDefaultPii: false,

        // Integrations
        integrations: [
            // Node-specific integrations are auto-detected
        ],

        // Filter out noise
        beforeSend(event, hint) {
            // Don't send expected errors
            const error = hint?.originalException;
            if (error instanceof Error) {
                if (shouldDropExpectedSentryError(error)) {
                    return null;
                }
            }
            return sanitizeFunctionSentryEvent(event);
        },
    });

    isInitialized = true;
    functions.logger.info('[Sentry] Initialized', {
        environment: isProduction ? 'production' : 'development',
        enabled: true
    });
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT SETTERS
// ═══════════════════════════════════════════════════════════════

/**
 * Set user context for error tracking
 * Call this when you have user information from the request
 */
export function setUserContext(user: {
    uid?: string;
    email?: string;
    tenantId?: string;
    tenantName?: string;
    projectId?: string;
}): void {
    if (!isInitialized) return;

    const emailLength = String(user.email || '').length;
    const tenantNameLength = String(user.tenantName || '').length;
    const userContext = getSanitizedFunctionSentryContext({
        emailLength,
        emailPresent: emailLength > 0,
        projectId: user.projectId,
        tenantId: user.tenantId,
        tenantNameLength,
        tenantNamePresent: tenantNameLength > 0,
        uid: user.uid,
    }) || {};

    Sentry.setUser({
        id: String(userContext.uid || 'user_present'),
    });

    // Set searchable tags
    Sentry.setTags({
        tenant_id: getFunctionSentryTagValue('tenantId', userContext.tenantId) || 'unknown',
        project_id: getFunctionSentryTagValue('projectId', userContext.projectId) || 'unknown',
    });

    // Set detailed context
    Sentry.setContext('user_details', userContext);
}

/**
 * Set processing context for the current operation
 */
export function setProcessingContext(context: {
    action: string;
    filesCount: number;
    targetLanguages: string[];
    projectId: string;
    fileId: string;
}): void {
    if (!isInitialized) return;

    const processingContext = getSanitizedFunctionSentryContext({
        action: context.action,
        files_count: context.filesCount,
        target_languages: context.targetLanguages,
        project_id: context.projectId,
        file_id: context.fileId,
    }) || {};

    Sentry.setContext('processing', processingContext);

    Sentry.setTags({
        action: getFunctionSentryTagValue('action', processingContext.action) || 'unknown',
        files_count: String(context.filesCount),
    });
}

// ═══════════════════════════════════════════════════════════════
// BREADCRUMBS
// ═══════════════════════════════════════════════════════════════

/**
 * Add a breadcrumb for tracking the execution flow
 */
export function addBreadcrumb(
    message: string,
    category: string = 'function',
    data?: Record<string, unknown>,
    level: Sentry.SeverityLevel = 'info'
): void {
    if (!isInitialized) return;

    Sentry.addBreadcrumb({
        message: getSanitizedFunctionSentryMessage(message),
        category,
        level,
        data: getSanitizedFunctionSentryContext(data),
        timestamp: Date.now() / 1000,
    });
}

/**
 * Track API/AI call for debugging
 */
export function trackAICall(
    operation: string,
    status: 'started' | 'success' | 'error',
    details?: {
        model?: string;
        batchIndex?: number;
        totalBatches?: number;
        duration?: number;
        tokensUsed?: number;
        error?: string;
    }
): void {
    if (!isInitialized) return;

    const level: Sentry.SeverityLevel = status === 'error' ? 'error' : 'info';

    Sentry.addBreadcrumb({
        message: `AI operation ${status}`,
        category: 'ai',
        level,
        data: getSanitizedFunctionSentryContext({
            operation,
            status,
            ...details,
            timestamp: new Date().toISOString(),
        }),
    });

    // Track failed calls in context
    if (status === 'error') {
        Sentry.setContext('last_failed_ai_call', getSanitizedFunctionSentryContext({
            operation,
            ...details,
            failed_at: new Date().toISOString(),
        }) || {});
    }
}

// ═══════════════════════════════════════════════════════════════
// ERROR CAPTURE
// ═══════════════════════════════════════════════════════════════

/**
 * Capture an exception with additional context
 */
export function captureException(
    error: Error | unknown,
    context?: {
        operation?: string;
        details?: Record<string, unknown>;
        level?: Sentry.SeverityLevel;
    }
): string | undefined {
    if (!isInitialized) return undefined;

    const operation = context?.operation
        ? getSanitizedFunctionSentryMessage(context.operation)
        : undefined;
    const eventId = Sentry.captureException(error, {
        level: context?.level || 'error',
        tags: operation ? { operation } : undefined,
        extra: getSanitizedFunctionSentryContext(context?.details),
    });

    return eventId;
}

/**
 * Capture a message (for non-exception events)
 */
export function captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    extra?: Record<string, unknown>
): string | undefined {
    if (!isInitialized) return undefined;

    return Sentry.captureMessage(getSanitizedFunctionSentryMessage(message), {
        level,
        extra: getSanitizedFunctionSentryContext(extra),
    });
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE MONITORING
// ═══════════════════════════════════════════════════════════════

/**
 * Start a performance transaction
 * Returns a finish function to call when the operation completes
 */
export function startTransaction(
    name: string,
    operation: string
): { finish: (status?: 'ok' | 'error') => void } {
    if (!isInitialized) {
        return { finish: () => { } };
    }

    const span = Sentry.startInactiveSpan({
        name: getSanitizedFunctionSentryMessage(name),
        op: sanitizeFunctionSentryString(operation, 'operation'),
    });

    return {
        finish: (status = 'ok') => {
            if (span) {
                span.end();
            }
        },
    };
}

/**
 * Create a child span within a transaction
 */
export function startSpan(
    name: string,
    operation: string
): { finish: () => void } {
    if (!isInitialized) {
        return { finish: () => { } };
    }

    const span = Sentry.startInactiveSpan({
        name: getSanitizedFunctionSentryMessage(name),
        op: sanitizeFunctionSentryString(operation, 'operation'),
    });

    return {
        finish: () => span?.end(),
    };
}

// ═══════════════════════════════════════════════════════════════
// FLUSH (Important for serverless)
// ═══════════════════════════════════════════════════════════════

/**
 * Flush pending events before function terminates
 * IMPORTANT: Call this before returning from your function
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
    if (!isInitialized) return true;
    return Sentry.flush(timeout);
}

// ═══════════════════════════════════════════════════════════════
// WRAPPER FOR CALLABLE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap a callable function with Sentry error tracking
 * Automatically captures errors and flushes events
 */
export function wrapWithSentry<T, R>(
    functionName: string,
    handler: (data: T) => Promise<R>
): (data: T) => Promise<R> {
    return async (data: T): Promise<R> => {
        initSentry();

        const transaction = startTransaction(functionName, 'function.callable');

        try {
            addBreadcrumb(`Function started: ${functionName}`, 'function');
            const result = await handler(data);
            addBreadcrumb(`Function completed: ${functionName}`, 'function');
            transaction.finish('ok');
            return result;
        } catch (error) {
            transaction.finish('error');
            captureException(error, {
                operation: functionName,
                details: { input: data },
            });
            throw error;
        } finally {
            await flush();
        }
    };
}

// Export Sentry for direct access if needed
export { Sentry };
