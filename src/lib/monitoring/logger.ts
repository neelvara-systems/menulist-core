/**
 * Unified Logging System
 * 
 * Dev:  Uses console.log with styled output
 * Prod: Uses Sentry for error tracking
 * 
 * This replaces the old Firebase DB logging system
 */

import * as Sentry from '@sentry/nextjs';

const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

/**
 * Structured logger that adapts to environment
 */
export const logger = {
  /**
   * Info-level logs
   * Dev: Console with blue styling
   * Prod: Sentry breadcrumb (attached to next error for context)
   */
  info(message: string, data?: any) {
    if (isDev) {
      console.info('%c[INFO]', 'background: blue; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    } else if (isProd) {
      Sentry.addBreadcrumb({
        message,
        data,
        level: 'info',
        timestamp: Date.now() / 1000,
      });
    }
  },

  /**
   * Warning-level logs
   * Dev: Console with orange styling
   * Prod: Sentry warning event
   */
  warn(message: string, data?: any) {
    if (isDev) {
      console.warn('%c[WARN]', 'background: orange; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    } else if (isProd) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: data,
      });
    }
  },

  /**
   * Error-level logs with exception tracking
   * Dev: Console with red styling
   * Prod: Sentry error event with full stack trace
   */
  error(message: string, error?: Error | unknown, context?: any) {
    if (isDev) {
      console.error('%c[ERROR]', 'background: red; color: white; padding: 2px 6px; border-radius: 3px;', message, error, context || '');
    } else if (isProd) {
      // If error is an Error object, capture it
      // Otherwise create a new Error with the message
      const errorToCapture = error instanceof Error ? error : new Error(message);

      Sentry.captureException(errorToCapture, {
        tags: {
          context: message,
        },
        extra: {
          ...context,
          originalMessage: message,
        },
      });
    }
  },

  /**
   * Debug-level logs (dev-only)
   * Prod: Does nothing (no overhead)
   */
  debug(message: string, data?: any) {
    if (isDev) {
      console.debug('%c[DEBUG]', 'background: green; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    }
    // Intentionally does nothing in production
  },

  /**
   * Trace-level logs (dev-only)
   * Prod: Does nothing
   */
  trace(message: string, data?: any) {
    if (isDev) {
      console.trace('%c[TRACE]', 'background: yellow; color: black; padding: 2px 6px; border-radius: 3px;', message, data || '');
    }
    // Intentionally does nothing in production
  },

  /**
   * General log (dev-only, for migration compatibility)
   * Prod: Does nothing
   */
  log(message: string, data?: any) {
    if (isDev) {
      console.log('%c[LOG]', 'background: gray; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    }
    // Intentionally does nothing in production
  },

  /**
   * Security event logging (CSP violations, auth failures, etc.)
   * Dev: Console with red background
   * Prod: Sentry with 'security' tag for easy filtering
   * 
   * Use this for security-related events that need investigation
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
    } else if (isProd) {
      // Map severity to Sentry level
      const sentryLevel = severity === 'critical' || severity === 'high' 
        ? 'error' 
        : 'warning';
      
      // Send to Sentry with high priority
      Sentry.captureMessage(`Security Event: ${event}`, {
        level: sentryLevel,
        tags: {
          type: 'security',
          event: event,
          severity: severity,
          // Add category for better filtering
          category: this.categorizeEvent(event),
        },
        extra: {
          ...details,
          timestamp: new Date().toISOString(),
        },
        // Add fingerprint for grouping similar violations
        fingerprint: [
          'security',
          severity,
          event,
          details.endpoint || details.violatedDirective || 'unknown',
        ],
      });
    }
  },

  /**
   * Categorize security events for better Sentry filtering
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
 * Set user context for Sentry (call after authentication)
 * This enriches ALL errors with client identification data
 * 
 * Works in both dev and prod (we have separate Sentry projects now)
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
  // Format username to include tenant/store for easy identification in emails
  // Format: "User Name | Tenant Name | Store Name"
  const formattedUsername = [
    user.name,
    `${user.tenantName}(${user.tId})`,
    `${user.storeName}(${user.sId})`
  ].filter(Boolean).join(' | ');

  // Set user identification
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: formattedUsername, // Shows in email notifications!
  });

  // Add client context (tenant/store/subscription)
  Sentry.setContext('client', {
    tenant_id: user.tId?.toString(),
    tenant_name: user.tenantName,
    store_id: user.sId?.toString(),
    store_name: user.storeName,
    subscription_plan: user.subscriptionPlan || 'free',
    subscription_status: user.subscriptionStatus || 'none',
  });

  // Add searchable tags for filtering in Sentry dashboard
  Sentry.setTags({
    tenant_id: user.tId?.toString() || 'unknown',
    store_id: user.sId?.toString() || 'unknown',
    user_role: user.role || 'unknown',
    subscription_plan: user.subscriptionPlan || 'free',
    subscription_status: user.subscriptionStatus || 'none',
  });

  // Log in dev for verification
  if (isDev) {
    console.log('✅ Sentry user context set:', {
      username: formattedUsername,
      email: user.email,
      tenant: user.tenantName,
      store: user.storeName,
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
    });
  }
}

/**
 * Clear user context (call on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);

  if (isDev) {
    console.log('🔒 Sentry user context cleared');
  }
}

/**
 * Track API calls for debugging
 * Creates breadcrumbs and context for failed API requests
 */
export function trackAPICall(
  endpoint: string,
  method: string,
  statusCode?: number,
  duration?: number
) {
  const level = statusCode && statusCode >= 400 ? 'error' : 'info';

  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: level,
    data: {
      endpoint,
      method,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      timestamp: new Date().toISOString(),
    },
  });

  // Track failed API calls in context
  if (statusCode && statusCode >= 400) {
    Sentry.setContext('last_failed_api_call', {
      endpoint,
      method,
      statusCode,
      failed_at: new Date().toISOString(),
      duration: duration ? `${duration}ms` : undefined,
    });

    if (isDev) {
      console.warn(`❌ API call failed: ${method} ${endpoint} (${statusCode})`);
    }
  }
}

/**
 * Track user actions for debugging
 * Creates breadcrumbs to see what user did before error
 */
export function trackUserAction(action: string, details?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data: {
      ...details,
      timestamp: new Date().toISOString(),
    },
    timestamp: Date.now() / 1000,
  });

  if (isDev) {
    console.log(`👤 User action: ${action}`, details || '');
  }
}

/**
 * Track navigation events
 */
export function trackNavigation(from: string, to: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    level: 'info',
    data: {
      from,
      to,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Track important business events
 */
export function trackBusinessEvent(event: string, details?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: 'business',
    message: event,
    level: 'info',
    data: {
      ...details,
      timestamp: new Date().toISOString(),
    },
  });

  if (isDev) {
    console.log(`💼 Business event: ${event}`, details || '');
  }
}

/**
 * Add custom context to errors
 */
export function setContext(key: string, value: any) {
  if (isProd) {
    Sentry.setContext(key, value);
  }
}

export default logger;
