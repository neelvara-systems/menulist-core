/**
 * Unified Logging System
 * 
 * Console logging remains the first debugging surface.
 * Sentry adds searchable production events, breadcrumbs, and user context.
 */

import * as Sentry from '@sentry/nextjs';
import { sanitizeErrorForLog, sanitizeLogData } from '@lib/security/secureLogger';
import {
  applyMonitoringContext,
  getSanitizedMonitoringContext,
  getSanitizedMonitoringMessage,
  isSentryMonitoringEnabled,
} from './sentryShared';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

const isDev = process.env.NODE_ENV === 'development';
const hasMonitoring = isSentryMonitoringEnabled;
const isServer = typeof window === 'undefined';
const shouldWriteInfoLog = isDev || isServer;

const sanitizeLoggerConsoleValue = (value: unknown): unknown => {
  if (value === undefined) return '';
  if (value instanceof Error) return sanitizeErrorForLog(value);
  if (typeof value === 'string') return sanitizeLogData({ value }).value;
  if (value && typeof value === 'object') return sanitizeLogData({ value }).value;
  return value;
};

const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>, level: 'info' | 'warning' | 'error' = 'info') => {
  if (!hasMonitoring) return;

  const safeMessage = getSanitizedMonitoringMessage(message);
  Sentry.addBreadcrumb({
    category,
    data: getSanitizedMonitoringContext(data),
    level,
    message: safeMessage,
    timestamp: Date.now() / 1000,
  });
};

const captureWithScope = (
  level: 'error' | 'warning' | 'info' | 'fatal',
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>
): string | undefined => {
  if (!hasMonitoring) return undefined;

  const safeMessage = getSanitizedMonitoringMessage(message);
  return Sentry.withScope((scope) => {
    scope.setLevel(level);
    applyMonitoringContext(scope, context);

    if (error instanceof Error) {
      scope.setFingerprint([safeMessage, getBoundedErrorName(error) || "Error"]);
      return Sentry.captureException(error);
    }

    if (error) {
      scope.setContext('error_payload', getSanitizedMonitoringContext({ error }));
      return Sentry.captureMessage(safeMessage, level);
    }

    return Sentry.captureMessage(safeMessage, level);
  });
};

/**
 * Structured logger that adapts to environment
 */
export const logger = {
  /**
   * Info-level logs
   * Dev: Console with blue styling
   * Prod: Server console info + Sentry breadcrumb
   */
  info(message: string, data?: any) {
    const sanitizedData = sanitizeLoggerConsoleValue(data);
    if (isDev) {
      console.info('%c[INFO]', 'background: blue; color: white; padding: 2px 6px; border-radius: 3px;', message, sanitizedData || '');
    } else if (shouldWriteInfoLog) {
      console.info(`[INFO] ${message}`, sanitizedData || '');
    }

    addBreadcrumb(message, 'log', data, 'info');
  },

  /**
   * Warning-level logs
   * Dev: Console with orange styling
   * Prod: Console warn
   */
  warn(message: string, data?: any) {
    const sanitizedData = sanitizeLoggerConsoleValue(data);
    if (isDev) {
      console.warn('%c[WARN]', 'background: orange; color: white; padding: 2px 6px; border-radius: 3px;', message, sanitizedData || '');
    } else {
      console.warn(`[WARN] ${message}`, sanitizedData || '');
    }

    addBreadcrumb(message, 'log', data, 'warning');
  },

  /**
   * Error-level logs with exception tracking
   * Dev: Console with red styling
   * Prod: Console error (monitoring service placeholder)
   */
  error(message: string, error?: Error | unknown, context?: any): string | undefined {
    const sanitizedError = sanitizeLoggerConsoleValue(error);
    const sanitizedContext = sanitizeLoggerConsoleValue(context);
    if (isDev) {
      console.error('%c[ERROR]', 'background: red; color: white; padding: 2px 6px; border-radius: 3px;', message, sanitizedError, sanitizedContext || '');
    } else {
      console.error(`[ERROR] ${message}`, sanitizedError, sanitizedContext || '');
    }

    return captureWithScope('error', message, error, context);
  },

  /**
   * Debug-level logs (dev-only)
   * Prod: Does nothing (no overhead)
   */
  debug(message: string, data?: any) {
    const sanitizedData = sanitizeLoggerConsoleValue(data);
    if (isDev) {
      console.debug('%c[DEBUG]', 'background: green; color: white; padding: 2px 6px; border-radius: 3px;', message, sanitizedData || '');
    }
  },

  /**
   * Trace-level logs (dev-only)
   * Prod: Does nothing
   */
  trace(message: string, data?: any) {
    const sanitizedData = sanitizeLoggerConsoleValue(data);
    if (isDev) {
      console.trace('%c[TRACE]', 'background: yellow; color: black; padding: 2px 6px; border-radius: 3px;', message, sanitizedData || '');
    }
  },

  /**
   * General log (dev-only, for migration compatibility)
   * Prod: Does nothing
   */
  log(message: string, data?: any) {
    const sanitizedData = sanitizeLoggerConsoleValue(data);
    if (isDev) {
      console.log('%c[LOG]', 'background: gray; color: white; padding: 2px 6px; border-radius: 3px;', message, sanitizedData || '');
    }
  },

  /**
   * Security event logging (CSP violations, auth failures, etc.)
   * Dev: Console with colored background
   * Prod: Console error/warn based on severity
   * 
   * @param event - Event name (e.g., "Input Validation Failed")
   * @param details - Event details with metadata
   * @param severity - Optional severity: 'low' | 'medium' | 'high' | 'critical'
   */
  security(
    event: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    const sanitizedDetails = sanitizeLoggerConsoleValue(details);
    const severityColors = {
      low: '#fbbf24',      // yellow
      medium: '#f97316',   // orange
      high: '#dc2626',     // red
      critical: '#7f1d1d', // dark red
    };

    const severityEmojis = {
      low: '⚠️',
      medium: '🔶',
      high: '🚨',
      critical: '🔥',
    };

    if (isDev) {
      console.error(
        `%c${severityEmojis[severity]} SECURITY [${severity.toUpperCase()}]`,
        `background: ${severityColors[severity]}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;`,
        event,
        sanitizedDetails
      );
    } else {
      const logFn = severity === 'critical' || severity === 'high' ? console.error : console.warn;
      logFn(`[SECURITY:${severity.toUpperCase()}] ${event}`, sanitizedDetails);
    }

    if (!hasMonitoring) return;

    const category = this.categorizeEvent(event);
    const safeEvent = getSanitizedMonitoringMessage(event);
    Sentry.withScope((scope) => {
      scope.setLevel(severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warning');
      scope.setTag('type', 'security');
      scope.setTag('category', category);
      scope.setTag('severity', severity);
      scope.setFingerprint(['security', category, safeEvent]);
      applyMonitoringContext(scope, {
        ...details,
        category,
        severity,
        type: 'security',
      });
      Sentry.captureMessage(safeEvent);
    });
  },

  /**
   * Categorize security events for filtering
   */
  categorizeEvent(event: string): string {
    const lowerEvent = event.toLowerCase();

    if (lowerEvent.includes('csp') || lowerEvent.includes('policy')) {
      return 'csp_violation';
    }
    if (lowerEvent.includes('input') || lowerEvent.includes('validation')) {
      return 'input_validation';
    }
    if (lowerEvent.includes('auth') || lowerEvent.includes('login')) {
      return 'authentication';
    }
    if (lowerEvent.includes('rate') || lowerEvent.includes('limit')) {
      return 'rate_limiting';
    }
    if (lowerEvent.includes('firestore') || lowerEvent.includes('database')) {
      return 'database_access';
    }
    if (lowerEvent.includes('suspicious') || lowerEvent.includes('attack')) {
      return 'suspicious_activity';
    }

    return 'other';
  },
};

/**
 * Set user context for error tracking (call after authentication)
 * Currently logs to console in dev. Will be re-wired to monitoring service later.
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  name?: string;
  tId?: string | number;
  sId?: string | number;
  tenantName?: string;
  storeName?: string;
  role?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
}) {
  if (!hasMonitoring) return;

  const emailLength = String(user.email || '').length;
  const nameLength = String(user.name || '').length;
  const storeNameLength = String(user.storeName || '').length;
  const tenantNameLength = String(user.tenantName || '').length;
  const userContext = getSanitizedMonitoringContext({
    emailLength,
    emailPresent: emailLength > 0,
    id: user.id,
    nameLength,
    namePresent: nameLength > 0,
    role: user.role,
    storeNameLength,
    storeNamePresent: storeNameLength > 0,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    tenantNameLength,
    tenantNamePresent: tenantNameLength > 0,
    tId: user.tId,
    sId: user.sId,
  }) || {};

  Sentry.setUser({
    id: String(userContext.id || 'user_present'),
  });

  Sentry.setTag('tenantId', String(userContext.tId || 'unknown'));
  Sentry.setTag('storeId', String(userContext.sId || 'unknown'));
  Sentry.setTag('role', String(userContext.role || 'unknown'));
  Sentry.setTag('subscriptionPlan', String(userContext.subscriptionPlan || 'unknown'));
  Sentry.setTag('subscriptionStatus', String(userContext.subscriptionStatus || 'unknown'));

  Sentry.setContext('user_details', userContext);
}

/**
 * Clear user context (call on logout)
 */
export function clearUserContext() {
  if (!hasMonitoring) return;
  Sentry.setUser(null);
}

/**
 * Track API calls for debugging
 */
export function trackAPICall(
  endpoint: string,
  method: string,
  statusCode?: number,
  duration?: number
) {
  addBreadcrumb(`API ${method}`, 'api', {
    duration,
    endpoint,
    method,
    statusCode,
  }, statusCode && statusCode >= 400 ? 'warning' : 'info');

  if (statusCode && statusCode >= 400 && isDev) {
    console.warn('API call failed', sanitizeLoggerConsoleValue(getSanitizedMonitoringContext({
      endpoint,
      method,
      statusCode,
    })));
  }
}

/**
 * Track user actions for debugging
 */
export function trackUserAction(action: string, details?: Record<string, any>) {
  addBreadcrumb('User action', 'user', {
    action,
    details,
  }, 'info');

  if (isDev) {
    console.log('User action', sanitizeLoggerConsoleValue(getSanitizedMonitoringContext({
      action,
      details,
    })));
  }
}

/**
 * Track navigation events
 */
export function trackNavigation(from: string, to: string) {
  addBreadcrumb('Navigation', 'navigation', { from, to }, 'info');

  if (isDev) {
    console.log('Navigation', sanitizeLoggerConsoleValue(getSanitizedMonitoringContext({ from, to })));
  }
}

/**
 * Track important business events
 */
export function trackBusinessEvent(event: string, details?: Record<string, any>) {
  addBreadcrumb('Business event', 'business', {
    details,
    event,
  }, 'info');

  if (isDev) {
    console.log('Business event', sanitizeLoggerConsoleValue(getSanitizedMonitoringContext({
      details,
      event,
    })));
  }
}

/**
 * Add custom context to errors (no-op until monitoring service is re-added)
 */
export function setContext(key: string, value: any) {
  if (!hasMonitoring) return;
  Sentry.setContext(key, getSanitizedMonitoringContext(value));
}

export default logger;
