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
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ================================================================
// LAZY LOADING
// ================================================================

/**
 * Lazy load component with retry logic
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 3
): Promise<{ default: T }> {
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

    attemptImport(retries);
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
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expires) {
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
