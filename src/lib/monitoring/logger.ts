/**
 * Unified Logging System
 * 
 * Console-based logging for both dev and production.
 * Sentry integration removed — will be re-added with fresh setup later.
 * 
 * API surface is preserved so all callers continue working.
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Structured logger that adapts to environment
 */
export const logger = {
  /**
   * Info-level logs
   * Dev: Console with blue styling
   * Prod: Silent (re-enable with monitoring service later)
   */
  info(message: string, data?: any) {
    if (isDev) {
      console.info('%c[INFO]', 'background: blue; color: white; padding: 2px 6px; border-radius: 3px;', message, data || '');
    }
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
  },

  /**
   * Error-level logs with exception tracking
   * Dev: Console with red styling
   * Prod: Console error (monitoring service placeholder)
   */
  error(message: string, error?: Error | unknown, context?: any) {
    if (isDev) {
      console.error('%c[ERROR]', 'background: red; color: white; padding: 2px 6px; border-radius: 3px;', message, error, context || '');
    } else {
      console.error(`[ERROR] ${message}`, error, context || '');
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
  void user;
}

/**
 * Clear user context (call on logout)
 */
export function clearUserContext() {
  return;
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
  if (statusCode && statusCode >= 400) {
    if (isDev) {
      console.warn(`❌ API call failed: ${method} ${endpoint} (${statusCode})`);
    }
  }
}

/**
 * Track user actions for debugging
 */
export function trackUserAction(action: string, details?: Record<string, any>) {
  if (isDev) {
    console.log(`👤 User action: ${action}`, details || '');
  }
}

/**
 * Track navigation events
 */
export function trackNavigation(from: string, to: string) {
  if (isDev) {
    console.log(`🧭 Navigated: ${from} → ${to}`);
  }
}

/**
 * Track important business events
 */
export function trackBusinessEvent(event: string, details?: Record<string, any>) {
  if (isDev) {
    console.log(`💼 Business event: ${event}`, details || '');
  }
}

/**
 * Add custom context to errors (no-op until monitoring service is re-added)
 */
export function setContext(_key: string, _value: any) {
  // No-op — will be re-wired when monitoring service is set up
}

export default logger;
