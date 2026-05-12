/**
 * Platform Pull API — API Key Authentication
 *
 * Validates X-API-Key header and returns associated store data.
 * Used by public read-only API routes.
 *
 * Security: API keys are stored as SHA-256 hashes in Firestore.
 * Raw keys are never persisted after generation.
 *
 * @see __docs__/platform-pull-api/platform-pull-api_impl.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { admin } from "@lib/firebase/firebaseAdmin";
import { secureLog } from "@lib/security/secureLogger";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/** Current schema version for pull API responses */
export const PULL_API_SCHEMA_VERSION = "1.0";
const PUBLIC_API_KEY_PATTERN = /^(ml|cn)_[A-Za-z0-9_-]{20,128}$/;

function normalizePublicApiKey(apiKey: string | null): string | null {
    const normalizedApiKey = apiKey?.trim();
    if (!normalizedApiKey || normalizedApiKey.length < 10) return null;
    if (!PUBLIC_API_KEY_PATTERN.test(normalizedApiKey)) return null;
    return normalizedApiKey;
}

/**
 * Hash an API key using SHA-256.
 * Used for both storage and validation.
 */
export function hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey.trim()).digest('hex');
}

/**
 * Generate a deterministic ETag from a JSON-serializable payload.
 * Uses SHA-256 hash of the stringified response.
 */
export function generateETag(payload: Record<string, any>): string {
    const json = JSON.stringify(payload);
    return createHash('sha256').update(json).digest('hex').slice(0, 32);
}

/**
 * Build a structured error response following the standard format.
 */
export function apiError(
    code: string,
    message: string,
    status: number,
    headers?: Record<string, string>,
): NextResponse {
    return NextResponse.json(
        { error: { code, message } },
        { status, headers },
    );
}

/**
 * Log minimal abuse-detection metadata for a pull API request.
 * No dashboards — only for detecting leaked keys or abnormal patterns.
 */
export function logApiRequest(
    request: NextRequest,
    storeId: string,
    endpoint: string,
): void {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    secureLog(`[Public API] ${endpoint}`, {
        storeId,
        ip,
        userAgent: userAgent.slice(0, 120),
    });
}

/**
 * Validate an API key and return the associated store data.
 *
 * Lookup strategy:
 * 1. Hash the incoming key → query by publicApi.apiKeyHash (secure path)
 * 2. Fallback: query by publicApi.apiKey (backward compat for pre-hash keys)
 *
 * @returns Store data if valid key, null if invalid
 */
export async function validatePublicApiKey(
    apiKey: string | null,
): Promise<{ storeData: any; storeId: string } | null> {
    const normalizedApiKey = normalizePublicApiKey(apiKey);
    if (!normalizedApiKey) return null;

    const db = admin.firestore();
    const keyHash = hashApiKey(normalizedApiKey);

    // Primary: lookup by hash (secure)
    let snapshot = await db
        .collection(DB_COLLECTIONS.STORES)
        .where('publicApi.apiKeyHash', '==', keyHash)
        .limit(1)
        .get();

    // Fallback: lookup by raw key (backward compat for pre-migration keys)
    if (snapshot.empty) {
        snapshot = await db
            .collection(DB_COLLECTIONS.STORES)
            .where('publicApi.apiKey', '==', normalizedApiKey)
            .limit(1)
            .get();
    }

    if (snapshot.empty) {
        secureLog('[Public API] Invalid API key attempt');
        return null;
    }

    const doc = snapshot.docs[0];
    return {
        storeData: doc.data(),
        storeId: doc.id,
    };
}
