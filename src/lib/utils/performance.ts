/**
 * Performance Optimization Utilities
 * Tools for monitoring and improving app performance
 */

import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

// ================================================================
// PERFORMANCE MONITORING
// ================================================================

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string): () => void {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (duration > 100) {
      logRuntimeDiagnostic('component_render_slow', {
        durationMs: Number(duration.toFixed(2)),
        ...getBoundedRuntimeStringContext('componentName', componentName),
      }, { developmentOnly: true });
    }
  };
}

/**
 * Debounce function calls
 */
const MAX_TIMER_DELAY_MS = 2_147_483_647;
const MAX_IMPORT_RETRIES = 10;

function normalizeTimerDelay(value: number): number {
  return Number.isFinite(value)
    ? Math.min(MAX_TIMER_DELAY_MS, Math.max(0, Math.floor(value)))
    : 0;
}

export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout | null = null;
  const delay = normalizeTimerDelay(wait);

  return (...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function calls
 */
export function throttle<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  limit: number
): (...args: TArgs) => void {
  let inThrottle = false;
  const delay = normalizeTimerDelay(limit);

  return (...args: TArgs) => {
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => (inThrottle = false), delay);
      func(...args);
    }
  };
}

// ================================================================
// LAZY LOADING
// ================================================================

/**
 * Lazy load component with retry logic
 */
export function lazyWithRetry<T>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3
): Promise<{ default: T }> {
  const retryCount = Number.isSafeInteger(retries)
    ? Math.min(MAX_IMPORT_RETRIES, Math.max(0, retries))
    : 0;
  return new Promise((resolve, reject) => {
    const attemptImport = (retriesLeft: number) => {
      componentImport()
        .then(resolve)
        .catch((error) => {
          if (retriesLeft === 0) {
            reject(error);
            return;
          }

          logRuntimeFailure('component_import_retry_scheduled', error, {
            retriesLeft,
          }, { developmentOnly: true });
          setTimeout(() => attemptImport(retriesLeft - 1), 1000);
        });
    };

    attemptImport(retryCount);
  });
}

// ================================================================
// CACHE UTILITIES
// ================================================================

/**
 * Simple in-memory cache with TTL
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();

  set(key: string, value: T, ttl: number): void {
    if (!Number.isFinite(ttl) || ttl <= 0) {
      this.cache.delete(key);
      return;
    }
    this.cache.set(key, {
      value,
      expires: Date.now() + Math.min(MAX_TIMER_DELAY_MS, Math.floor(ttl)),
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() >= item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  measureRenderTime,
  debounce,
  throttle,
  lazyWithRetry,
  MemoryCache,
};
