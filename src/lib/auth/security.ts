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
import { getRequestMetadata } from '@lib/security/ipExtractor';
import { secureError } from '@lib/security/secureLogger';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

const COLLECTION = 'authSecurityEvents';

/**
 * Sanitize data for Firestore (server-side)
 * Replaces undefined values with null to prevent Firestore errors
 * Similar to replaceUndefined in apiHelper but for firebase-admin
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];

            // Replace undefined with null
            if (value === undefined) {
                (result as any)[key] = null;
            }
            // Preserve Timestamp objects (check constructor name for compatibility)
            else if (value && typeof value === 'object' && value.constructor?.name === 'Timestamp') {
                (result as any)[key] = value;
            }
            // Recursively handle nested objects
            else if (value && typeof value === 'object' && !Array.isArray(value)) {
                (result as any)[key] = sanitizeForFirestore(value);
            }
            // Handle arrays
            else if (Array.isArray(value)) {
                (result as any)[key] = value.map(item =>
                    (item && typeof item === 'object') ? sanitizeForFirestore(item) : item
                );
            }
            // Primitives (string, number, boolean, null)
            else {
                (result as any)[key] = value;
            }
        }
    }

    return result;
}
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const TTL_AUTH_EVENTS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — Firestore TTL auto-deletes after this

interface SecurityEvent {
    email: string;
    eventType: 'login_success' | 'login_failed' | 'account_locked' | 'account_unlocked';
    timestamp: Timestamp;
    ip?: string;
    userAgent?: string;
    reason?: string;
}

interface AccountLockStatus {
    isLocked: boolean;
    lockedUntil?: Date;
    failedAttempts: number;
    lastAttempt?: Date;
}

/**
 * Check if account is locked due to failed login attempts
 */
export async function checkAccountLock(email: string): Promise<AccountLockStatus> {
    try {
        const db = admin.firestore();
        const now = Date.now();

        // Get recent failed attempts (last 15 minutes)
        const recentAttempts = await db
            .collection(COLLECTION)
            .where('email', '==', email.toLowerCase())
            .where('eventType', '==', 'login_failed')
            .where('timestamp', '>', Timestamp.fromMillis(now - RATE_LIMIT_WINDOW_MS))
            .orderBy('timestamp', 'desc')
            .limit(MAX_FAILED_ATTEMPTS)
            .get();

        const failedAttempts = recentAttempts.size;

        // Check if account is currently locked
        const lockDoc = await db
            .collection(COLLECTION)
            .where('email', '==', email.toLowerCase())
            .where('eventType', '==', 'account_locked')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();

        if (!lockDoc.empty) {
            const lockData = lockDoc.docs[0].data();
            const lockedUntil = new Date(lockData.timestamp.toMillis() + LOCKOUT_DURATION_MS);

            if (now < lockedUntil.getTime()) {
                return {
                    isLocked: true,
                    lockedUntil,
                    failedAttempts,
                    lastAttempt: recentAttempts.docs[0]?.data().timestamp.toDate()
                };
            }
        }

        return {
            isLocked: false,
            failedAttempts,
            lastAttempt: recentAttempts.docs[0]?.data().timestamp.toDate()
        };
    } catch (error) {
        secureError('[Auth Security] Error checking account lock', error as Error, {
            email: email.toLowerCase()
        });
        // Fail open - don't block login on security check errors
        return { isLocked: false, failedAttempts: 0 };
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
    try {
        const db = admin.firestore();
        const normalizedEmail = email.toLowerCase();

        // Auto-extract IP and User-Agent from request if provided
        let finalMetadata = metadata;
        if (request && !metadata) {
            finalMetadata = getRequestMetadata(request);
        }

        // ✅ SECURITY FIX: Use transaction to prevent race condition
        // Ensures atomic check + log + lock operation
        await db.runTransaction(async (transaction) => {
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
                const lockData = lockSnapshot.docs[0].data();
                const lockedUntil = lockData.timestamp.toMillis() + LOCKOUT_DURATION_MS;

                if (Date.now() < lockedUntil) {
                    // Account is locked, don't log additional attempts
                    return;
                }
            }

            // 2. Count recent failed attempts
            const failedQuery = db
                .collection(COLLECTION)
                .where('email', '==', normalizedEmail)
                .where('eventType', '==', 'login_failed')
                .where('timestamp', '>', Timestamp.fromMillis(Date.now() - RATE_LIMIT_WINDOW_MS));

            const failedSnapshot = await transaction.get(failedQuery);
            const currentFailedCount = failedSnapshot.size;

            // 3. Log this failed attempt
            const failedRef = db.collection(COLLECTION).doc();
            // ✅ SECURITY FIX: Sanitize data to replace undefined with null
            const failedData = sanitizeForFirestore({
                email: normalizedEmail,
                eventType: 'login_failed' as const,
                timestamp: Timestamp.now(),
                expiresAt: Timestamp.fromMillis(Date.now() + TTL_AUTH_EVENTS_MS),
                reason,
                source: source || 'unknown',  // ✅ Track login source
                ip: finalMetadata?.ip,
                userAgent: finalMetadata?.userAgent
            });
            transaction.set(failedRef, failedData);

            // 4. Lock account if threshold exceeded (including this attempt)
            if (currentFailedCount + 1 >= MAX_FAILED_ATTEMPTS) {
                const lockRef = db.collection(COLLECTION).doc();
                // ✅ SECURITY FIX: Sanitize data to replace undefined with null
                const lockData = sanitizeForFirestore({
                    email: normalizedEmail,
                    eventType: 'account_locked' as const,
                    timestamp: Timestamp.now(),
                    expiresAt: Timestamp.fromMillis(Date.now() + TTL_AUTH_EVENTS_MS),
                    reason: `Account locked after ${MAX_FAILED_ATTEMPTS} failed login attempts`,
                    ip: finalMetadata?.ip,
                    userAgent: finalMetadata?.userAgent
                });
                transaction.set(lockRef, lockData);

                // Send to Sentry - This is a high-severity event!
                logger.security('Account Locked', {
                    email: normalizedEmail,
                    reason: 'Multiple failed login attempts',
                    failedAttempts: MAX_FAILED_ATTEMPTS,
                    ip: finalMetadata?.ip,
                    userAgent: finalMetadata?.userAgent,
                }, 'high');
            } else if (currentFailedCount + 1 >= 3) {
                // Send warning to Sentry after 3 failed attempts (before lockout)
                logger.security('Multiple Failed Login Attempts', {
                    email: normalizedEmail,
                    reason,
                    attemptNumber: currentFailedCount + 1,
                    maxAttempts: MAX_FAILED_ATTEMPTS,
                    ip: finalMetadata?.ip,
                    userAgent: finalMetadata?.userAgent,
                }, 'medium');
            }
        });
    } catch (error) {
        secureError('[Auth Security] Error logging failed login', error as Error, {
            email: email.toLowerCase(),
            reason
        });
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
    try {
        const db = admin.firestore();

        // Auto-extract IP and User-Agent from request if provided
        let finalMetadata = metadata;
        if (request && !metadata) {
            finalMetadata = getRequestMetadata(request);
        }

        // ✅ SECURITY FIX: Sanitize data to replace undefined with null
        const eventData = sanitizeForFirestore({
            email: email.toLowerCase(),
            eventType: 'login_success' as const,
            timestamp: Timestamp.now(),
            expiresAt: Timestamp.fromMillis(Date.now() + TTL_AUTH_EVENTS_MS),
            source: source || 'unknown',  // ✅ Track login source
            ip: finalMetadata?.ip,
            userAgent: finalMetadata?.userAgent
        });

        await db.collection(COLLECTION).add(eventData);

        // Optionally: Delete old failed attempts to clean up
        // (They'll naturally age out after 15 minutes anyway)
    } catch (error) {
        secureError('[Auth Security] Error logging successful login', error as Error, {
            email: email.toLowerCase()
        });
    }
}

/**
 * Get formatted lockout message for user
 */
export function getLockoutMessage(lockStatus: AccountLockStatus): string {
    if (!lockStatus.isLocked) return '';

    const minutesLeft = Math.ceil((lockStatus.lockedUntil!.getTime() - Date.now()) / 60000);

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
    try {
        const db = admin.firestore();

        const events = await db
            .collection(COLLECTION)
            .where('timestamp', '>', Timestamp.fromDate(since))
            .get();

        const failedAttempts = events.docs.filter(doc => doc.data().eventType === 'login_failed').length;
        const lockedAccounts = new Set(
            events.docs
                .filter(doc => doc.data().eventType === 'account_locked')
                .map(doc => doc.data().email)
        ).size;

        // Detect suspicious IPs (multiple failed attempts from same IP)
        const ipAttempts = new Map<string, number>();
        events.docs
            .filter(doc => doc.data().eventType === 'login_failed' && doc.data().ip)
            .forEach(doc => {
                const ip = doc.data().ip!;
                ipAttempts.set(ip, (ipAttempts.get(ip) || 0) + 1);
            });

        const suspiciousIPs = Array.from(ipAttempts.entries())
            .filter(([_, count]) => count >= 10)
            .map(([ip]) => ip);

        return {
            totalAttempts: events.size,
            failedAttempts,
            lockedAccounts,
            suspiciousIPs
        };
    } catch (error) {
        secureError('[Auth Security] Error getting security summary', error as Error, {
            since: since.toISOString()
        });
        return {
            totalAttempts: 0,
            failedAttempts: 0,
            lockedAccounts: 0,
            suspiciousIPs: []
        };
    }
}
