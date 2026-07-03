/**
 * Answerlattice Gemini key manager.
 *
 * Mirrors the MenuList Functions GenAI gateway pattern while keeping
 * Answerlattice credential ownership product-scoped.
 */

import { GoogleGenAI } from '@google/genai';
import * as logger from 'firebase-functions/logger';

export const AI_PROVIDER_CONFIG_MISSING_CODE = 'ANSWERLATTICE_AI_PROVIDER_CONFIG_MISSING';

interface KeyEntry {
    index: number;
    key: string;
    client: GoogleGenAI;
    cooldownUntil: number;
    rateLimitHits: number;
    totalRequests: number;
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

const RATE_LIMIT_COOLDOWN_MS = 60_000;
const MAX_COOLDOWN_MS = 5 * 60_000;

const KEY_ENV_VARS = [
    'ANSWERLATTICE_GEMINI_AI_KEY',
    'ANSWERLATTICE_GEMINI_AI_KEY_2',
    'ANSWERLATTICE_GEMINI_AI_KEY_3',
    'ANSWERLATTICE_GEMINI_AI_KEY_4',
] as const;

export class AIProviderConfigMissingError extends Error {
    readonly code = AI_PROVIDER_CONFIG_MISSING_CODE;

    constructor() {
        super(AI_PROVIDER_CONFIG_MISSING_CODE);
        this.name = 'AIProviderConfigMissingError';
    }
}

export class KeyManager {
    private keys: KeyEntry[] = [];
    private currentIndex = 0;

    constructor() {
        this.discoverKeys();
    }

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
            logger.warn('[Answerlattice KeyManager] No Gemini API key found', {
                configuredKeyCount: 0,
                candidateSlotCount: KEY_ENV_VARS.length,
                candidateEnvVarCount: KEY_ENV_VARS.length,
            });
            return;
        }

        logger.info('[Answerlattice KeyManager] Initialized', {
            configuredKeyCount: this.keys.length,
            keyRotationEnabled: this.keys.length > 1,
        });
    }

    getClient(): GoogleGenAI {
        if (this.keys.length === 0) {
            throw new AIProviderConfigMissingError();
        }

        const now = Date.now();

        for (let i = 0; i < this.keys.length; i++) {
            const idx = (this.currentIndex + i) % this.keys.length;
            const entry = this.keys[idx];

            if (entry.cooldownUntil <= now) {
                this.currentIndex = idx;
                entry.totalRequests++;
                return entry.client;
            }
        }

        let shortestCooldownIdx = 0;
        let shortestCooldown = Infinity;

        for (let i = 0; i < this.keys.length; i++) {
            const remaining = this.keys[i].cooldownUntil - now;
            if (remaining < shortestCooldown) {
                shortestCooldown = remaining;
                shortestCooldownIdx = i;
            }
        }

        logger.warn('[Answerlattice KeyManager] All keys are in cooldown', {
            configuredKeyCount: this.keys.length,
            selectedKeySlot: shortestCooldownIdx + 1,
            cooldownSeconds: Math.ceil(shortestCooldown / 1000),
        });

        this.currentIndex = shortestCooldownIdx;
        this.keys[shortestCooldownIdx].totalRequests++;
        return this.keys[shortestCooldownIdx].client;
    }

    markCurrentKeyRateLimited(): void {
        const entry = this.keys[this.currentIndex];
        if (!entry) return;

        entry.rateLimitHits++;
        entry.totalRateLimits++;

        const cooldownMs = Math.min(
            RATE_LIMIT_COOLDOWN_MS * Math.pow(2, entry.rateLimitHits - 1),
            MAX_COOLDOWN_MS
        );
        entry.cooldownUntil = Date.now() + cooldownMs;

        logger.warn('[Answerlattice KeyManager] Key rate limited', {
            keySlot: this.currentIndex + 1,
            rateLimitHits: entry.rateLimitHits,
            cooldownSeconds: Math.ceil(cooldownMs / 1000),
            keyRotationEnabled: this.keys.length > 1,
        });

        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }

    markCurrentKeySuccess(): void {
        const entry = this.keys[this.currentIndex];
        if (!entry) return;

        if (entry.rateLimitHits > 0) {
            entry.rateLimitHits = 0;
        }
    }

    hasAlternativeKeys(): boolean {
        if (this.keys.length <= 1) return false;
        const now = Date.now();
        return this.keys.some((entry, idx) => idx !== this.currentIndex && entry.cooldownUntil <= now);
    }

    hasConfiguredKeys(): boolean {
        return this.keys.length > 0;
    }

    get totalKeys(): number {
        return this.keys.length;
    }

    getStats(): KeyManagerStats {
        const now = Date.now();
        return {
            totalKeys: this.keys.length,
            activeKeys: this.keys.filter((entry) => entry.cooldownUntil <= now).length,
            coolingDownKeys: this.keys.filter((entry) => entry.cooldownUntil > now).length,
            currentKeyIndex: this.currentIndex,
            keys: this.keys.map((entry) => ({
                index: entry.index,
                active: entry.cooldownUntil <= now,
                cooldownRemaining: Math.max(0, entry.cooldownUntil - now),
                totalRequests: entry.totalRequests,
                totalRateLimits: entry.totalRateLimits,
            })),
        };
    }
}

export const keyManager = new KeyManager();
