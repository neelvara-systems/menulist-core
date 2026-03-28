/**
 * Circuit Breaker Pattern for AI Service Calls
 * 
 * Prevents cascade failures by stopping requests to a failing service.
 * Based on the Netflix Hystrix pattern.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests fail immediately
 * - HALF_OPEN: Testing if service recovered
 * 
 * Configuration:
 * - failureThreshold: Number of failures before opening circuit
 * - resetTimeout: Time in ms before attempting recovery
 * - halfOpenRequests: Number of test requests in half-open state
 */

import * as functions from 'firebase-functions';
import { CIRCUIT_BREAKER_CONFIG } from '../constants/ai';
import { isFunctionFeatureEnabled } from '../constants/features';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
    failureThreshold?: number;
    resetTimeout?: number;
    halfOpenRequests?: number;
    name?: string;
}

interface CircuitStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: Date | null;
    lastSuccess: Date | null;
    totalRequests: number;
    totalFailures: number;
}

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenRequests: 3,
    name: 'default',
};

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failures = 0;
    private successes = 0;
    private lastFailure: Date | null = null;
    private lastSuccess: Date | null = null;
    private halfOpenAttempts = 0;
    private totalRequests = 0;
    private totalFailures = 0;
    private readonly options: Required<CircuitBreakerOptions>;
    private readonly logger = functions.logger;

    constructor(options: CircuitBreakerOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.totalRequests++;

        // Check if circuit should transition from OPEN to HALF_OPEN
        if (this.state === 'OPEN') {
            if (this.shouldAttemptReset()) {
                this.transitionTo('HALF_OPEN');
            } else {
                const waitTime = this.getWaitTime();
                this.logger.warn(`[CircuitBreaker:${this.options.name}] Circuit OPEN - failing fast`, {
                    waitTime,
                    failures: this.failures,
                });
                throw new CircuitBreakerError(
                    `Service unavailable. Circuit breaker is OPEN. Retry in ${Math.ceil(waitTime / 1000)}s`,
                    this.getStats()
                );
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Record a successful request
     */
    private onSuccess(): void {
        this.successes++;
        this.lastSuccess = new Date();

        if (this.state === 'HALF_OPEN') {
            this.halfOpenAttempts++;
            if (this.halfOpenAttempts >= this.options.halfOpenRequests) {
                this.transitionTo('CLOSED');
            }
        } else if (this.state === 'CLOSED') {
            // Reset failure count on success
            this.failures = 0;
        }
    }

    /**
     * Record a failed request
     */
    private onFailure(error: any): void {
        this.failures++;
        this.totalFailures++;
        this.lastFailure = new Date();

        // Don't count client errors (4xx) as service failures
        if (error?.status >= 400 && error?.status < 500) {
            this.logger.debug(`[CircuitBreaker:${this.options.name}] Client error - not counting as failure`);
            this.failures--; // Undo the increment
            this.totalFailures--;
            return;
        }

        this.logger.warn(`[CircuitBreaker:${this.options.name}] Failure recorded`, {
            failures: this.failures,
            threshold: this.options.failureThreshold,
            state: this.state,
            error: error?.message || 'Unknown error',
        });

        if (this.state === 'HALF_OPEN') {
            // Any failure in half-open state trips the circuit back to open
            this.transitionTo('OPEN');
        } else if (this.state === 'CLOSED' && this.failures >= this.options.failureThreshold) {
            this.transitionTo('OPEN');
        }
    }

    /**
     * Check if we should attempt to reset the circuit
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailure) return true;
        const elapsed = Date.now() - this.lastFailure.getTime();
        return elapsed >= this.options.resetTimeout;
    }

    /**
     * Get remaining wait time before circuit can attempt reset
     */
    private getWaitTime(): number {
        if (!this.lastFailure) return 0;
        const elapsed = Date.now() - this.lastFailure.getTime();
        return Math.max(0, this.options.resetTimeout - elapsed);
    }

    /**
     * Transition to a new state
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        this.logger.info(`[CircuitBreaker:${this.options.name}] State transition: ${oldState} → ${newState}`, {
            failures: this.failures,
            successes: this.successes,
        });

        if (newState === 'CLOSED') {
            this.failures = 0;
            this.halfOpenAttempts = 0;
        } else if (newState === 'HALF_OPEN') {
            this.halfOpenAttempts = 0;
        }
    }

    /**
     * Get current circuit statistics
     */
    getStats(): CircuitStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            totalRequests: this.totalRequests,
            totalFailures: this.totalFailures,
        };
    }

    /**
     * Check if circuit is open (service unavailable)
     */
    isOpen(): boolean {
        return this.state === 'OPEN';
    }

    /**
     * Manually reset the circuit (for testing or admin override)
     */
    reset(): void {
        this.logger.info(`[CircuitBreaker:${this.options.name}] Manual reset`);
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        this.halfOpenAttempts = 0;
    }
}

/**
 * Custom error for circuit breaker failures
 */
export class CircuitBreakerError extends Error {
    public readonly stats: CircuitStats;

    constructor(message: string, stats: CircuitStats) {
        super(message);
        this.name = 'CircuitBreakerError';
        this.stats = stats;
    }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCES FOR AI SERVICES
// ═══════════════════════════════════════════════════════════════


/**
 * Circuit breaker for Gemini AI calls
 * Configuration defined in constants/ai.ts
 */
export const geminiCircuitBreaker = new CircuitBreaker(CIRCUIT_BREAKER_CONFIG);

/**
 * Execute a Gemini AI call with circuit breaker protection
 * 
 * Respects FUNCTION_FLAGS.ENABLE_CIRCUIT_BREAKER feature flag
 * When disabled, executes function directly without circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    breaker: CircuitBreaker = geminiCircuitBreaker
): Promise<T> {
    // If circuit breaker is disabled, execute directly
    if (!isFunctionFeatureEnabled('ENABLE_CIRCUIT_BREAKER')) {
        functions.logger.debug('[CircuitBreaker] Disabled via feature flag - executing directly');
        return fn();
    }

    return breaker.execute(fn);
}
