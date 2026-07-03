/**
 * AI Key Manager — Multi-key rotation for Gemini API (Cloud Functions)
 * 
 * Manages a pool of API keys with automatic failover on rate limiting.
 * Google applies Gemini rate limits per project, not per API key, so this is
 * for rotation/leak response/failover only. It is not a quota scaling strategy
 * unless the key/project design is intentionally separated.
 * 
 * Key Discovery:
 * - GEMINI_AI_KEY (required, primary)
 * - GEMINI_AI_KEY_2 (optional)
 * - GEMINI_AI_KEY_3 (optional)
 * - GEMINI_AI_KEY_4 (optional)
 * 
 * Note: Cloud Functions can have warm instances, so in-memory state
 * (cooldown tracking) persists across requests within the same instance.
 * 
 * @see __docs__/ai-system-layer/README.md
 */

import { GoogleGenAI } from "@google/genai";
import * as functions from 'firebase-functions';

export const AI_PROVIDER_CONFIG_MISSING_CODE = 'AI_PROVIDER_CONFIG_MISSING';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface KeyEntry {
    index: number;
    key: string;
    client: GoogleGenAI;
    /** Timestamp when cooldown expires (0 = no cooldown) */
    cooldownUntil: number;
    /** Number of consecutive rate limit hits */
    rateLimitHits: number;
    /** Total requests served by this key */
    totalRequests: number;
    /** Total rate limit errors on this key */
    totalRateLimits: number;
}

export interface KeyManagerStats {
    totalKeys: number;
    activeKeys: number;
    coolingDownKeys: number;
    currentKeyIndex: number;
    keys: Array<{
        index: number;
        active: boolean;
        cooldownRemaining: number;
        totalRequests: number;
        totalRateLimits: number;
    }>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Cooldown period after a rate limit hit (60 seconds) */
const RATE_LIMIT_COOLDOWN_MS = 60_000;

/** Max cooldown period (5 minutes) — caps exponential backoff */
const MAX_COOLDOWN_MS = 5 * 60_000;

/** Env var names for API keys (in order) */
const KEY_ENV_VARS = [
    'GEMINI_AI_KEY',
    'GEMINI_AI_KEY_2',
    'GEMINI_AI_KEY_3',
    'GEMINI_AI_KEY_4',
] as const;

export class AIProviderConfigMissingError extends Error {
    readonly code = AI_PROVIDER_CONFIG_MISSING_CODE;

    constructor() {
        super(AI_PROVIDER_CONFIG_MISSING_CODE);
        this.name = 'AIProviderConfigMissingError';
    }
}

// ═══════════════════════════════════════════════════════════════
// KEY MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

export class KeyManager {
    private keys: KeyEntry[] = [];
    private currentIndex: number = 0;
    private readonly logger = functions.logger;

    constructor() {
        this.discoverKeys();
    }

    /**
     * Discover available API keys from environment variables.
     * Creates a GoogleGenAI client for each valid key.
     */
    private discoverKeys(): void {
        for (let i = 0; i < KEY_ENV_VARS.length; i++) {
            const envVar = KEY_ENV_VARS[i];
            const key = process.env[envVar];

            if (key && key.trim().length > 0) {
                this.keys.push({
                    index: i,
                    key: key.trim(),
                    client: new GoogleGenAI({ apiKey: key.trim() }),
                    cooldownUntil: 0,
                    rateLimitHits: 0,
                    totalRequests: 0,
                    totalRateLimits: 0,
                });
            }
        }

        if (this.keys.length === 0) {
            this.logger.warn('[KeyManager] No Gemini API key found', {
                configuredKeyCount: 0,
                candidateSlotCount: KEY_ENV_VARS.length,
                candidateEnvVarCount: KEY_ENV_VARS.length,
            });
        } else {
            this.logger.info('[KeyManager] Initialized', {
                configuredKeyCount: this.keys.length,
                keyRotationEnabled: this.keys.length > 1,
            });
        }
    }

    /**
     * Get the current active GoogleGenAI client.
     * Skips keys that are in cooldown.
     */
    getClient(): GoogleGenAI {
        if (this.keys.length === 0) {
            throw new AIProviderConfigMissingError();
        }

        const now = Date.now();

        // Try to find a non-cooled-down key starting from current index
        for (let i = 0; i < this.keys.length; i++) {
            const idx = (this.currentIndex + i) % this.keys.length;
            const entry = this.keys[idx];

            if (entry.cooldownUntil <= now) {
                this.currentIndex = idx;
                entry.totalRequests++;
                return entry.client;
            }
        }

        // All keys are in cooldown — use the one with the shortest remaining cooldown
        let shortestCooldownIdx = 0;
        let shortestCooldown = Infinity;

        for (let i = 0; i < this.keys.length; i++) {
            const remaining = this.keys[i].cooldownUntil - now;
            if (remaining < shortestCooldown) {
                shortestCooldown = remaining;
                shortestCooldownIdx = i;
            }
        }

        this.logger.warn('[KeyManager] All keys are in cooldown', {
            configuredKeyCount: this.keys.length,
            selectedKeySlot: shortestCooldownIdx + 1,
            cooldownSeconds: Math.ceil(shortestCooldown / 1000),
        });
        this.currentIndex = shortestCooldownIdx;
        this.keys[shortestCooldownIdx].totalRequests++;
        return this.keys[shortestCooldownIdx].client;
    }

    /**
     * Mark the current key as rate-limited.
     * Applies exponential cooldown and advances to the next key.
     */
    markCurrentKeyRateLimited(): void {
        const entry = this.keys[this.currentIndex];
        if (!entry) return;

        entry.rateLimitHits++;
        entry.totalRateLimits++;

        // Exponential cooldown: 60s → 120s → 240s → capped at 5min
        const cooldownMs = Math.min(
            RATE_LIMIT_COOLDOWN_MS * Math.pow(2, entry.rateLimitHits - 1),
            MAX_COOLDOWN_MS
        );
        entry.cooldownUntil = Date.now() + cooldownMs;

        this.logger.warn('[KeyManager] Key rate limited', {
            keySlot: this.currentIndex + 1,
            rateLimitHits: entry.rateLimitHits,
            cooldownSeconds: Math.ceil(cooldownMs / 1000),
            keyRotationEnabled: this.keys.length > 1,
        });

        // Advance to next key
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }

    /**
     * Reset rate limit counter for the current key on a successful request.
     */
    markCurrentKeySuccess(): void {
        const entry = this.keys[this.currentIndex];
        if (!entry) return;

        if (entry.rateLimitHits > 0) {
            entry.rateLimitHits = 0;
        }
    }

    /**
     * Check if there are alternative keys available (not in cooldown).
     */
    hasAlternativeKeys(): boolean {
        if (this.keys.length <= 1) return false;
        const now = Date.now();
        return this.keys.some((entry, idx) =>
            idx !== this.currentIndex && entry.cooldownUntil <= now
        );
    }

    hasConfiguredKeys(): boolean {
        return this.keys.length > 0;
    }

    /**
     * Get the total number of configured keys.
     */
    get totalKeys(): number {
        return this.keys.length;
    }

    /**
     * Get current key stats for monitoring.
     */
    getStats(): KeyManagerStats {
        const now = Date.now();
        return {
            totalKeys: this.keys.length,
            activeKeys: this.keys.filter(k => k.cooldownUntil <= now).length,
            coolingDownKeys: this.keys.filter(k => k.cooldownUntil > now).length,
            currentKeyIndex: this.currentIndex,
            keys: this.keys.map(k => ({
                index: k.index,
                active: k.cooldownUntil <= now,
                cooldownRemaining: Math.max(0, k.cooldownUntil - now),
                totalRequests: k.totalRequests,
                totalRateLimits: k.totalRateLimits,
            })),
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════

/** Singleton Key Manager instance for Cloud Functions */
export const keyManager = new KeyManager();
