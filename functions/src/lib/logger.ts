/**
 * Unified Logger for Firebase Functions
 * 
 * Combines Firebase Functions logger with Sentry for comprehensive
 * logging and error tracking.
 * 
 * - Firebase Logger: Always logs (visible in Cloud Console)
 * - Sentry: Captures errors and breadcrumbs for monitoring
 * 
 * Usage:
 * ```typescript
 * import { logger } from '../lib/logger';
 * 
 * logger.info('Processing started', { filesCount: 5 });
 * logger.error('Failed to process', error, { fileId: 'abc123' });
 * ```
 */

import * as functions from 'firebase-functions';
import * as Sentry from './sentry';

const firebaseLogger = functions.logger;

export const logger = {
    /**
     * Info-level logs
     * Firebase: Logged as INFO
     * Sentry: Added as breadcrumb
     */
    info(message: string, data?: Record<string, any>): void {
        firebaseLogger.info(message, data || {});
        Sentry.addBreadcrumb(message, 'log', data, 'info');
    },

    /**
     * Warning-level logs
     * Firebase: Logged as WARNING
     * Sentry: Added as breadcrumb with warning level
     */
    warn(message: string, data?: Record<string, any>): void {
        firebaseLogger.warn(message, data || {});
        Sentry.addBreadcrumb(message, 'log', data, 'warning');
    },

    /**
     * Error-level logs with exception tracking
     * Firebase: Logged as ERROR
     * Sentry: Captures exception with full context
     */
    error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
        // Log to Firebase
        firebaseLogger.error(message, { error, ...context });

        // Capture in Sentry
        if (error) {
            Sentry.captureException(error, {
                operation: message,
                details: context,
            });
        } else {
            // If no error object, capture as message
            Sentry.captureMessage(message, 'error', context);
        }
    },

    /**
     * Debug-level logs (Firebase only)
     * Sentry: Not captured (too verbose)
     */
    debug(message: string, data?: Record<string, any>): void {
        firebaseLogger.debug(message, data || {});
    },

    /**
     * Track AI operation progress
     * Firebase: Logged as INFO
     * Sentry: Added as specialized AI breadcrumb
     */
    aiCall(
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
        const message = `[AI] ${operation}: ${status}`;

        if (status === 'error') {
            firebaseLogger.error(message, details);
        } else {
            firebaseLogger.info(message, details);
        }

        Sentry.trackAICall(operation, status, details);
    },

    /**
     * Track processing milestones
     * Firebase: Logged as INFO
     * Sentry: Added as breadcrumb
     */
    milestone(step: string, data?: Record<string, any>): void {
        const message = `[Milestone] ${step}`;
        firebaseLogger.info(message, data || {});
        Sentry.addBreadcrumb(step, 'milestone', data, 'info');
    },

    /**
     * Track performance metrics
     * Firebase: Logged as INFO
     * Sentry: Added with performance context
     */
    performance(operation: string, durationMs: number, data?: Record<string, any>): void {
        const message = `[Performance] ${operation}: ${durationMs}ms`;
        firebaseLogger.info(message, { duration_ms: durationMs, ...data });
        Sentry.addBreadcrumb(message, 'performance', {
            duration_ms: durationMs,
            ...data
        }, 'info');
    },
};

export default logger;
