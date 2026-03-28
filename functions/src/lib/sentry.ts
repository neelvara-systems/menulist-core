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

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const isProduction = process.env.NODE_ENV === 'production' || !isEmulator;

// Check if Sentry is enabled via feature flag
const isSentryEnabled = isFunctionFeatureEnabled('ENABLE_SENTRY');

// DSN from Firebase secrets (set via: firebase functions:secrets:set SENTRY_DSN)
// Falls back to hardcoded value if not set (for dev convenience)
const DEV_DSN = "https://6d8940082c1030ff67af7e2345684dc9@o4510276442062848.ingest.us.sentry.io/4510276910710784";
const PROD_DSN = process.env.SENTRY_DSN || "https://74bb29116e9ac34f9e0b97a8121b95c7@o4510276442062848.ingest.us.sentry.io/4510276442259456";

let isInitialized = false;

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

    const dsn = isProduction ? PROD_DSN : DEV_DSN;

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

        // Integrations
        integrations: [
            // Node-specific integrations are auto-detected
        ],

        // Filter out noise
        beforeSend(event, hint) {
            // Don't send expected errors
            const error = hint?.originalException;
            if (error instanceof Error) {
                // Skip rate limit errors (expected behavior)
                if (error.message?.includes('Rate limit')) {
                    return null;
                }
                // Skip circuit breaker open errors (expected behavior)
                if (error.message?.includes('Circuit breaker is OPEN')) {
                    return null;
                }
            }
            return event;
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

    // Format username for email-friendly display
    const formattedUsername = [
        user.tenantName,
        user.projectId ? `Project: ${user.projectId}` : null,
    ].filter(Boolean).join(' | ');

    Sentry.setUser({
        id: user.uid,
        email: user.email,
        username: formattedUsername || undefined,
    });

    // Set searchable tags
    Sentry.setTags({
        tenant_id: user.tenantId || 'unknown',
        project_id: user.projectId || 'unknown',
    });

    // Set detailed context
    Sentry.setContext('user_details', {
        tenant_id: user.tenantId,
        tenant_name: user.tenantName,
        project_id: user.projectId,
    });
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

    Sentry.setContext('processing', {
        action: context.action,
        files_count: context.filesCount,
        target_languages: context.targetLanguages.join(', '),
        project_id: context.projectId,
        file_id: context.fileId,
    });

    Sentry.setTags({
        action: context.action,
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
    data?: Record<string, any>,
    level: Sentry.SeverityLevel = 'info'
): void {
    if (!isInitialized) return;

    Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
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
        message: `AI: ${operation} - ${status}`,
        category: 'ai',
        level,
        data: {
            operation,
            status,
            ...details,
            timestamp: new Date().toISOString(),
        },
    });

    // Track failed calls in context
    if (status === 'error') {
        Sentry.setContext('last_failed_ai_call', {
            operation,
            ...details,
            failed_at: new Date().toISOString(),
        });
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
        details?: Record<string, any>;
        level?: Sentry.SeverityLevel;
    }
): string | undefined {
    if (!isInitialized) return undefined;

    const eventId = Sentry.captureException(error, {
        level: context?.level || 'error',
        tags: context?.operation ? { operation: context.operation } : undefined,
        extra: context?.details,
    });

    return eventId;
}

/**
 * Capture a message (for non-exception events)
 */
export function captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    extra?: Record<string, any>
): string | undefined {
    if (!isInitialized) return undefined;

    return Sentry.captureMessage(message, {
        level,
        extra,
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
        name,
        op: operation,
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
        name,
        op: operation,
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
