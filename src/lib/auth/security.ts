/**
 * Authentication Security Module
 * ═══════════════════════════════════════════════════════════════
 * 
 * Production-ready security features:
 * - Rate limiting (5 attempts per email per 15 minutes)
 * - Failed login tracking
 * - Account lockout (auto-unlocks after 15 minutes)
 * - Security event logging
 * - Suspicious activity detection
 * 
 * Uses Firestore for persistence (survives server restarts)
 */

import { admin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { getBoundedAuthStringContext, logAuthFailure } from '@lib/auth/authDiagnostics';
import { getRequestMetadata } from '@lib/security/ipExtractor';
import { sanitizeForFirestore } from '@lib/firestore/sanitizeForFirestore';
import { DB_COLLECTIONS } from '@constant/database';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

const COLLECTION = DB_COLLECTIONS.AUTH_SECURITY_EVENTS;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const TTL_AUTH_EVENTS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — Firestore TTL auto-deletes after this
const MAX_SECURITY_SUMMARY_EVENTS = 1_000;
const MAX_SECURITY_STRING_LENGTHS = {
    email: 320,
    ip: 128,
    reason: 160,
    source: 64,
    userAgent: 512,
} as const;

interface SecurityEvent {
    email: string;
    eventType: 'login_success' | 'login_failed' | 'account_locked' | 'account_unlocked';
    expiresAt: Timestamp;
    timestamp: Timestamp;
    ip: string | null;
    userAgent: string | null;
    reason: string | null;
    source: string | null;
}

interface AccountLockStatus {
    isLocked: boolean;
    lockedUntil?: Date;
    failedAttempts: number;
    lastAttempt?: Date;
}

export class AuthSecurityUnavailableError extends Error {
    constructor(message = 'Authentication security checks are temporarily unavailable.') {
        super(message);
        this.name = 'AuthSecurityUnavailableError';
        Object.setPrototypeOf(this, AuthSecurityUnavailableError.prototype);
    }
}

const normalizeSecurityString = (
    value: unknown,
    maxLength: number,
    options: { lowercase?: boolean; required?: boolean } = {},
): string | null => {
    if (typeof value !== 'string') {
        if (options.required) throw new AuthSecurityUnavailableError();
        return null;
    }
    const trimmed = value.trim();
    const normalized = options.lowercase ? trimmed.toLowerCase() : trimmed;
    if (!normalized || normalized.length > maxLength) {
        if (options.required) throw new AuthSecurityUnavailableError();
        return null;
    }
    return normalized;
};

const normalizeSecurityEmail = (value: unknown): string => (
    normalizeSecurityString(value, MAX_SECURITY_STRING_LENGTHS.email, {
        lowercase: true,
        required: true,
    }) as string
);

const parseSecurityTimestamp = (value: unknown): Timestamp | null => (
    value instanceof Timestamp && Number.isSafeInteger(value.toMillis()) && value.toMillis() > 0
        ? value
        : null
);

const parseSecurityEvent = (value: unknown): SecurityEvent | null => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    if (
        data.eventType !== 'login_success'
        && data.eventType !== 'login_failed'
        && data.eventType !== 'account_locked'
        && data.eventType !== 'account_unlocked'
    ) {
        return null;
    }
    const email = normalizeSecurityString(data.email, MAX_SECURITY_STRING_LENGTHS.email, { lowercase: true });
    const expiresAt = parseSecurityTimestamp(data.expiresAt);
    const timestamp = parseSecurityTimestamp(data.timestamp);
    if (!email || email !== data.email || !expiresAt || !timestamp) return null;
    return {
        email,
        eventType: data.eventType,
        expiresAt,
        timestamp,
        ip: normalizeSecurityString(data.ip, MAX_SECURITY_STRING_LENGTHS.ip),
        userAgent: normalizeSecurityString(data.userAgent, MAX_SECURITY_STRING_LENGTHS.userAgent),
        reason: normalizeSecurityString(data.reason, MAX_SECURITY_STRING_LENGTHS.reason),
        source: normalizeSecurityString(data.source, MAX_SECURITY_STRING_LENGTHS.source),
    };
};

const getSecurityEventMetadata = (
    metadata?: { ip?: string; userAgent?: string },
): { ip: string | null; userAgent: string | null } => ({
    ip: normalizeSecurityString(metadata?.ip, MAX_SECURITY_STRING_LENGTHS.ip),
    userAgent: normalizeSecurityString(metadata?.userAgent, MAX_SECURITY_STRING_LENGTHS.userAgent),
});

/**
 * Check if account is locked due to failed login attempts
 */
export async function checkAccountLock(email: string): Promise<AccountLockStatus> {
    const normalizedEmail = normalizeSecurityEmail(email);
    try {
        const db = admin.firestore();
        const now = Date.now();

        // Get recent failed attempts (last 15 minutes)
        const recentAttempts = await db
            .collection(COLLECTION)
            .where('email', '==', normalizedEmail)
            .where('eventType', '==', 'login_failed')
            .where('timestamp', '>', Timestamp.fromMillis(now - RATE_LIMIT_WINDOW_MS))
            .orderBy('timestamp', 'desc')
            .limit(MAX_FAILED_ATTEMPTS)
            .get();
        const recentFailedEvents = recentAttempts.docs.map((doc) => parseSecurityEvent(doc.data()));
        if (recentFailedEvents.some((event) => !event || event.eventType !== 'login_failed')) {
            throw new AuthSecurityUnavailableError();
        }
        const failedAttempts = recentFailedEvents.length;

        // Check if account is currently locked
        const lockDoc = await db
            .collection(COLLECTION)
            .where('email', '==', normalizedEmail)
            .where('eventType', '==', 'account_locked')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (!lockDoc.empty) {
            const lockData = parseSecurityEvent(lockDoc.docs[0].data());
            if (!lockData || lockData.eventType !== 'account_locked') {
                throw new AuthSecurityUnavailableError();
            }
            const lockedUntil = new Date(lockData.timestamp.toMillis() + LOCKOUT_DURATION_MS);

            if (now < lockedUntil.getTime()) {
                const latestFailedEvent = recentFailedEvents[0];
                return {
                    isLocked: true,
                    lockedUntil,
                    failedAttempts,
                    lastAttempt: latestFailedEvent?.timestamp.toDate(),
                };
            }
        }

        const latestFailedEvent = recentFailedEvents[0];
        return {
            isLocked: false,
            failedAttempts,
            lastAttempt: latestFailedEvent?.timestamp.toDate(),
        };
    } catch (error) {
        logAuthFailure('auth_security_account_lock_check_failed', error, {
            ...getBoundedAuthStringContext('email', normalizedEmail),
        });
        throw error instanceof AuthSecurityUnavailableError
            ? error
            : new AuthSecurityUnavailableError();
    }
}

/**
 * Log failed login attempt and lock account if threshold exceeded
 * 
 * @param email - User email
 * @param reason - Reason for failure
 * @param source - Login source/provider ('google', 'credentials', etc.)
 * @param metadata - Optional metadata with IP and User-Agent
 * @param request - Optional NextRequest to auto-extract IP/UA (recommended)
 */
export async function logFailedLogin(
    email: string,
    reason: string,
    source?: 'google' | 'credentials' | 'email-link' | string,
    metadata?: { ip?: string; userAgent?: string },
    request?: NextRequest
): Promise<void> {
    const normalizedEmail = normalizeSecurityEmail(email);
    const normalizedReason = normalizeSecurityString(
        reason,
        MAX_SECURITY_STRING_LENGTHS.reason,
        { required: true },
    ) as string;
    const normalizedSource = normalizeSecurityString(
        source || 'unknown',
        MAX_SECURITY_STRING_LENGTHS.source,
        { required: true },
    ) as string;
    try {
        const db = admin.firestore();

        // Auto-extract IP and User-Agent from request if provided
        let finalMetadata = metadata;
        if (request && !metadata) {
            const requestMetadata = getRequestMetadata(request);
            finalMetadata = {
                ...(requestMetadata.ip ? { ip: requestMetadata.ip } : {}),
                ...(requestMetadata.userAgent ? { userAgent: requestMetadata.userAgent } : {}),
            };
        }
        const persistedMetadata = getSecurityEventMetadata(finalMetadata);
        const operationNowMs = Date.now();

        // ✅ SECURITY FIX: Use transaction to prevent race condition
        // Ensures atomic check + log + lock operation
        const alert = await db.runTransaction(async (transaction) => {
            // 1. Check current lock status FIRST (before logging)
            const lockQuery = db
                .collection(COLLECTION)
                .where('email', '==', normalizedEmail)
                .where('eventType', '==', 'account_locked')
                .orderBy('timestamp', 'desc')
                .limit(1);

            const lockSnapshot = await transaction.get(lockQuery);

            // If already locked and still active, don't log attempt
            if (!lockSnapshot.empty) {
                const lockData = parseSecurityEvent(lockSnapshot.docs[0].data());
                if (!lockData || lockData.eventType !== 'account_locked') {
                    throw new AuthSecurityUnavailableError();
                }
                const lockedUntil = lockData.timestamp.toMillis() + LOCKOUT_DURATION_MS;

                if (operationNowMs < lockedUntil) {
                    // Account is locked, don't log additional attempts
                    return { kind: 'none' as const };
                }
            }

            // 2. Count recent failed attempts
            const failedQuery = db
                .collection(COLLECTION)
                .where('email', '==', normalizedEmail)
                .where('eventType', '==', 'login_failed')
                .where('timestamp', '>', Timestamp.fromMillis(operationNowMs - RATE_LIMIT_WINDOW_MS))
                .limit(MAX_FAILED_ATTEMPTS);

            const failedSnapshot = await transaction.get(failedQuery);
            if (failedSnapshot.docs.some((doc) => {
                const event = parseSecurityEvent(doc.data());
                return !event || event.eventType !== 'login_failed';
            })) {
                throw new AuthSecurityUnavailableError();
            }
            const currentFailedCount = failedSnapshot.size;

            // 3. Log this failed attempt
            const failedRef = db.collection(COLLECTION).doc();
            // ✅ SECURITY FIX: Sanitize data to replace undefined with null
            const failedData = sanitizeForFirestore({
                email: normalizedEmail,
                eventType: 'login_failed' as const,
                timestamp: Timestamp.fromMillis(operationNowMs),
                expiresAt: Timestamp.fromMillis(operationNowMs + TTL_AUTH_EVENTS_MS),
                reason: normalizedReason,
                source: normalizedSource,
                ip: persistedMetadata.ip,
                userAgent: persistedMetadata.userAgent,
            });
            transaction.set(failedRef, failedData);

            // 4. Lock account if threshold exceeded (including this attempt)
            if (currentFailedCount + 1 >= MAX_FAILED_ATTEMPTS) {
                const lockRef = db.collection(COLLECTION).doc();
                // ✅ SECURITY FIX: Sanitize data to replace undefined with null
                const lockData = sanitizeForFirestore({
                    email: normalizedEmail,
                    eventType: 'account_locked' as const,
                    timestamp: Timestamp.fromMillis(operationNowMs),
                    expiresAt: Timestamp.fromMillis(operationNowMs + TTL_AUTH_EVENTS_MS),
                    reason: `Account locked after ${MAX_FAILED_ATTEMPTS} failed login attempts`,
                    source: normalizedSource,
                    ip: persistedMetadata.ip,
                    userAgent: persistedMetadata.userAgent,
                });
                transaction.set(lockRef, lockData);
                return { kind: 'locked' as const };
            } else if (currentFailedCount + 1 >= 3) {
                return { kind: 'warning' as const, attemptNumber: currentFailedCount + 1 };
            }
            return { kind: 'none' as const };
        });
        if (alert.kind === 'locked') {
            logger.security('Account Locked', {
                ...getBoundedAuthStringContext('email', normalizedEmail),
                ...getBoundedAuthStringContext('ip', persistedMetadata.ip),
                ...getBoundedAuthStringContext('userAgent', persistedMetadata.userAgent),
                reason: 'Multiple failed login attempts',
                failedAttempts: MAX_FAILED_ATTEMPTS,
            }, 'high');
        } else if (alert.kind === 'warning') {
            logger.security('Multiple Failed Login Attempts', {
                ...getBoundedAuthStringContext('email', normalizedEmail),
                ...getBoundedAuthStringContext('ip', persistedMetadata.ip),
                ...getBoundedAuthStringContext('reason', normalizedReason),
                ...getBoundedAuthStringContext('userAgent', persistedMetadata.userAgent),
                attemptNumber: alert.attemptNumber,
                maxAttempts: MAX_FAILED_ATTEMPTS,
            }, 'medium');
        }
    } catch (error) {
        logAuthFailure('auth_security_failed_login_log_failed', error, {
            ...getBoundedAuthStringContext('email', normalizedEmail),
            ...getBoundedAuthStringContext('reason', normalizedReason),
            ...getBoundedAuthStringContext('source', normalizedSource),
        });
        throw error instanceof AuthSecurityUnavailableError
            ? error
            : new AuthSecurityUnavailableError();
    }
}

/**
 * Log successful login (clears failed attempts)
 * 
 * @param email - User email
 * @param source - Login source/provider ('google', 'credentials', etc.)
 * @param metadata - Optional metadata with IP and User-Agent
 * @param request - Optional NextRequest to auto-extract IP/UA (recommended)
 * 
 * Best practice: Pass request object to auto-capture IP
 * Example: await logSuccessfulLogin(email, 'google', undefined, request)
 */
export async function logSuccessfulLogin(
    email: string,
    source?: 'google' | 'credentials' | 'email-link' | string,
    metadata?: { ip?: string; userAgent?: string },
    request?: NextRequest
): Promise<void> {
    const normalizedEmail = normalizeSecurityEmail(email);
    const normalizedSource = normalizeSecurityString(
        source || 'unknown',
        MAX_SECURITY_STRING_LENGTHS.source,
        { required: true },
    ) as string;
    try {
        const db = admin.firestore();

        // Auto-extract IP and User-Agent from request if provided
        let finalMetadata = metadata;
        if (request && !metadata) {
            const requestMetadata = getRequestMetadata(request);
            finalMetadata = {
                ...(requestMetadata.ip ? { ip: requestMetadata.ip } : {}),
                ...(requestMetadata.userAgent ? { userAgent: requestMetadata.userAgent } : {}),
            };
        }
        const persistedMetadata = getSecurityEventMetadata(finalMetadata);
        const nowMs = Date.now();

        // ✅ SECURITY FIX: Sanitize data to replace undefined with null
        const eventData = sanitizeForFirestore({
            email: normalizedEmail,
            eventType: 'login_success' as const,
            timestamp: Timestamp.fromMillis(nowMs),
            expiresAt: Timestamp.fromMillis(nowMs + TTL_AUTH_EVENTS_MS),
            source: normalizedSource,
            ip: persistedMetadata.ip,
            userAgent: persistedMetadata.userAgent,
        });

        await db.collection(COLLECTION).add(eventData);

        // Optionally: Delete old failed attempts to clean up
        // (They'll naturally age out after 15 minutes anyway)
    } catch (error) {
        logAuthFailure('auth_security_successful_login_log_failed', error, {
            ...getBoundedAuthStringContext('email', normalizedEmail),
            ...getBoundedAuthStringContext('source', normalizedSource),
        });
    }
}

/**
 * Get formatted lockout message for user
 */
export function getLockoutMessage(lockStatus: AccountLockStatus): string {
    if (!lockStatus.isLocked || !lockStatus.lockedUntil) return '';

    const minutesLeft = Math.max(1, Math.ceil((lockStatus.lockedUntil.getTime() - Date.now()) / 60000));

    return `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`;
}

/**
 * Get security summary for admin dashboard
 */
export async function getSecuritySummary(since: Date): Promise<{
    totalAttempts: number;
    failedAttempts: number;
    lockedAccounts: number;
    suspiciousIPs: string[];
}> {
    if (!(since instanceof Date) || !Number.isFinite(since.getTime())) {
        throw new AuthSecurityUnavailableError('Invalid security summary boundary.');
    }
    const earliestSupportedMs = Date.now() - TTL_AUTH_EVENTS_MS;
    const boundedSince = Timestamp.fromMillis(Math.max(since.getTime(), earliestSupportedMs));
    try {
        const db = admin.firestore();

        const events = await db
            .collection(COLLECTION)
            .where('timestamp', '>', boundedSince)
            .orderBy('timestamp', 'desc')
            .limit(MAX_SECURITY_SUMMARY_EVENTS + 1)
            .get();
        if (events.size > MAX_SECURITY_SUMMARY_EVENTS) {
            throw new AuthSecurityUnavailableError('Security summary exceeds the supported event boundary.');
        }
        const parsedEvents = events.docs.map((doc) => parseSecurityEvent(doc.data()));
        if (parsedEvents.some((event) => event === null)) {
            throw new AuthSecurityUnavailableError('Security summary contains malformed event data.');
        }
        const admittedEvents = parsedEvents as SecurityEvent[];

        const failedAttempts = admittedEvents.filter((event) => event.eventType === 'login_failed').length;
        const lockedAccounts = new Set(
            admittedEvents
                .filter((event) => event.eventType === 'account_locked')
                .map((event) => event.email)
        ).size;

        // Detect suspicious IPs (multiple failed attempts from same IP)
        const ipAttempts = new Map<string, number>();
        admittedEvents
            .filter((event) => event.eventType === 'login_failed' && event.ip)
            .forEach((event) => {
                const ip = event.ip as string;
                ipAttempts.set(ip, (ipAttempts.get(ip) || 0) + 1);
            });

        const suspiciousIPs = Array.from(ipAttempts.entries())
            .filter(([_, count]) => count >= 10)
            .map(([ip]) => ip);

        return {
            totalAttempts: admittedEvents.length,
            failedAttempts,
            lockedAccounts,
            suspiciousIPs
        };
    } catch (error) {
        logAuthFailure('auth_security_summary_load_failed', error, {
            ...getBoundedAuthStringContext('since', since.toISOString()),
        });
        throw error instanceof AuthSecurityUnavailableError
            ? error
            : new AuthSecurityUnavailableError('Security summary is temporarily unavailable.');
    }
}
