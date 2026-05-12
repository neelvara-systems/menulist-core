/**
 * Unified Logging System
 * 
 * Console logging remains the first debugging surface.
 * Sentry adds searchable production events, breadcrumbs, and user context.
 */

import * as Sentry from '@sentry/nextjs';
import { applyMonitoringContext, getSanitizedMonitoringContext, isSentryMonitoringEnabled } from './sentryShared';

const isDev = process.env.NODE_ENV === 'development';
const hasMonitoring = isSentryMonitoringEnabled;
const isServer = typeof window === 'undefined';
const shouldWriteInfoLog = isDev || isServer;

const addBreadcrumb = (message: string, category: string, data?: Record<string, unknown>, level: 'info' | 'warning' | 'error' = 'info') => {
  if (!hasMonitoring) return;

  Sentry.addBreadcrumb({
    category,
    data: getSanitizedMonitoringContext(data),
    level,
    message,
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

  return Sentry.withScope((scope) => {
    scope.setLevel(level);
    applyMonitoringContext(scope, context);

    if (error instanceof Error) {
      scope.setFingerprint([message, error.name]);
      return Sentry.captureException(error);
    }

    if (error) {
      scope.setContext('error_payload', getSanitizedMonitoringContext({ error }));
      return Sentry.captureMessage(message, level);
    }

    return Sentry.captureMessage(message, level);
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
    if (isDev) {
      console.info('%c[INFO]', 'background: blue; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    } else if (shouldWriteInfoLog) {
      console.info(`[INFO] ${message}`, data || '');
    }

    addBreadcrumb(message, 'log', data, 'info');
  },

  /**
   * Warning-level logs
   * Dev: Console with orange styling
   * Prod: Console warn
   */
  warn(message: string, data?: any) {
    if (isDev) {
      console.warn('%c[WARN]', 'background: orange; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    } else {
      console.warn(`[WARN] ${message}`, data || '');
    }

    addBreadcrumb(message, 'log', data, 'warning');
  },

  /**
   * Error-level logs with exception tracking
   * Dev: Console with red styling
   * Prod: Console error (monitoring service placeholder)
   */
  error(message: string, error?: Error | unknown, context?: any): string | undefined {
    if (isDev) {
      console.error('%c[ERROR]', 'background: red; color: white; padding: 2px 6px; border-radius: 3px;', message, error, context || '');
    } else {
      console.error(`[ERROR] ${message}`, error, context || '');
    }

    return captureWithScope('error', message, error, context);
  },

  /**
   * Debug-level logs (dev-only)
   * Prod: Does nothing (no overhead)
   */
  debug(message: string, data?: any) {
    if (isDev) {
      console.debug('%c[DEBUG]', 'background: green; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    }
  },

  /**
   * Trace-level logs (dev-only)
   * Prod: Does nothing
   */
  trace(message: string, data?: any) {
    if (isDev) {
      console.trace('%c[TRACE]', 'background: yellow; color: black; padding: 2px 6px; border-radius: 3px;', message, data || '');
    }
  },

  /**
   * General log (dev-only, for migration compatibility)
   * Prod: Does nothing
   */
  log(message: string, data?: any) {
    if (isDev) {
      console.log('%c[LOG]', 'background: gray; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
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
        details
      );
    } else {
      const logFn = severity === 'critical' || severity === 'high' ? console.error : console.warn;
      logFn(`[SECURITY:${severity.toUpperCase()}] ${event}`, details);
    }

    if (!hasMonitoring) return;

    const category = this.categorizeEvent(event);
    Sentry.withScope((scope) => {
      scope.setLevel(severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warning');
      scope.setTag('type', 'security');
      scope.setTag('category', category);
      scope.setTag('severity', severity);
      scope.setFingerprint(['security', category, event]);
      applyMonitoringContext(scope, {
        ...details,
        category,
        severity,
        type: 'security',
      });
      Sentry.captureMessage(event);
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

  Sentry.setUser({
    email: user.email,
    id: user.id,
    username: [user.name, user.tenantName, user.storeName].filter(Boolean).join(' | ') || undefined,
  });

  Sentry.setTag('tenantId', String(user.tId || 'unknown'));
  Sentry.setTag('storeId', String(user.sId || 'unknown'));
  Sentry.setTag('role', String(user.role || 'unknown'));
  Sentry.setTag('subscriptionPlan', String(user.subscriptionPlan || 'unknown'));
  Sentry.setTag('subscriptionStatus', String(user.subscriptionStatus || 'unknown'));

  Sentry.setContext('user_details', getSanitizedMonitoringContext({
    email: user.email,
    id: user.id,
    name: user.name,
    role: user.role,
    storeName: user.storeName,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    tenantName: user.tenantName,
    tId: user.tId,
    sId: user.sId,
  }));
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
  addBreadcrumb(`API ${method} ${endpoint}`, 'api', {
    duration,
    endpoint,
    method,
    statusCode,
  }, statusCode && statusCode >= 400 ? 'warning' : 'info');

  if (statusCode && statusCode >= 400 && isDev) {
    console.warn(`❌ API call failed: ${method} ${endpoint} (${statusCode})`);
  }
}

/**
 * Track user actions for debugging
 */
export function trackUserAction(action: string, details?: Record<string, any>) {
  addBreadcrumb(action, 'user', details, 'info');

  if (isDev) {
    console.log(`👤 User action: ${action}`, details || '');
  }
}

/**
 * Track navigation events
 */
export function trackNavigation(from: string, to: string) {
  addBreadcrumb('Navigation', 'navigation', { from, to }, 'info');

  if (isDev) {
    console.log(`🧭 Navigated: ${from} → ${to}`);
  }
}

/**
 * Track important business events
 */
export function trackBusinessEvent(event: string, details?: Record<string, any>) {
  addBreadcrumb(event, 'business', details, 'info');

  if (isDev) {
    console.log(`💼 Business event: ${event}`, details || '');
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
