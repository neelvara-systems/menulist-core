/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV-ONLY DATABASE UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ CRITICAL: These functions should NEVER be exposed in production!
 * 
 * PURPOSE:
 * --------
 * Provides a scoped utility for clearing the current user's loaded chat
 * sessions during development and testing. It is loaded dynamically and has
 * an independent production guard.
 * 
 * WHY THIS EXISTS:
 * ----------------
 * During development, this enables a fresh user conversation list without
 * bypassing the normal Answerlattice tenant, actor, or Storage boundaries.
 * 
 * SAFETY MECHANISMS:
 * ------------------
 * 1. Environment Check: Functions throw error if NODE_ENV === 'production'
 * 2. Dynamic Import: Loaded only from the development UI handler
 * 3. Scoped IDs: Only the current user's loaded session IDs are accepted
 * 4. DAL Reuse: Every delete uses the normal Answerlattice session DAL
 * 
 * MAINTENANCE:
 * ------------
 * Keep this utility routed through the normal Answerlattice chat DAL. Do not
 * add direct client deletion for server-owned analytics or embedding data.
 * 
 * ARCHITECTURE:
 * -------------
 * DevOnlyClearDataButton.tsx (UI)
 *    ↓ onClick
 * handleClearAllData (useChatHandlers.ts) - State management
 *    ↓ import & call
 * clearCurrentUserChatSessions (this file)
 *    ↓ scoped DAL delete
 * Answerlattice Firestore + owned Storage objects
 * 
 * CREATED: 2025-01-23
 * LAST MODIFIED: 2025-01-23
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DB_COLLECTIONS } from '@constant/database';
import {
    deleteChatSession,
} from '@database/chatSessions';
import type { AnswerlatticeChatSessionActorScope } from '@lib/answerlattice/chatSessionContracts';
import {
    normalizeDevChatCleanupSessionIds,
    summarizeDevChatCleanupResults,
} from '@lib/answerlattice/devChatCleanupBoundary';
import { logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

const logDevCleanupDiagnostic = (diagnosticCode: string, context: Record<string, boolean | number | string | null | undefined> = {}) => {
    logRuntimeDiagnostic(diagnosticCode, context, { developmentOnly: true });
};

/**
 * DEV-ONLY: Delete the current user's loaded Answerlattice chat sessions.
 * 
 * Each deletion uses the production Answerlattice session DAL. That DAL removes
 * Firestore truth transactionally before best-effort cleanup of tenant-owned
 * Storage objects. Server-owned analytics and embedding collections are not
 * client-deletable and are intentionally outside this tool.
 * 
 * SAFETY:
 * - Throws error if called in production environment
 * - Requires explicit confirmation from user (handled in UI layer)
 * - Deletes only IDs already loaded for the current signed-in user
 * - Preserves partial results so the UI does not hide sessions that failed
 * 
 * PERFORMANCE:
 * - Processes at most the bounded loaded-session limit sequentially
 * - Avoids a destructive burst of concurrent Firestore transactions
 * - Leaves per-session Storage cleanup to the normal DAL
 * - Returns total count for user feedback
 * 
 * @returns Per-session acknowledgements and actual Storage deletion count
 * @throws Error if NODE_ENV === 'production'
 * 
 * @example
 * const result = await clearCurrentUserChatSessions(['session-id']);
 * // { 
 * //   success: true, 
 * //   totalDeleted: 1,
 * //   imagesDeleted: 8,
 * //   deletedSessionIds: ['session-id'],
 * //   failedSessionIds: [],
 * //   collections: ['chatSessions']
 * // }
 */
export async function clearCurrentUserChatSessions(
    rawSessionIds: unknown,
    expectedActorScope: AnswerlatticeChatSessionActorScope,
) {
    // Double-check we're in development
    if (process.env.NODE_ENV === 'production') {
        throw new Error('This function is disabled in production.');
    }

    logDevCleanupDiagnostic('dev_chat_data_clear_started');

    try {
        const sessionIds = normalizeDevChatCleanupSessionIds(rawSessionIds);
        if (!sessionIds) throw new Error('dev_chat_cleanup_session_ids_invalid');

        const results: PromiseSettledResult<unknown>[] = [];
        for (const sessionId of sessionIds) {
            try {
                results.push({
                    status: 'fulfilled',
                    value: await deleteChatSession(sessionId, expectedActorScope),
                });
            } catch (reason) {
                results.push({ status: 'rejected', reason });
            }
        }
        const summary = summarizeDevChatCleanupResults(sessionIds, results);

        logDevCleanupDiagnostic('dev_chat_data_clear_completed', {
            totalDeleted: summary.deletedSessionIds.length,
            imagesDeleted: summary.imagesDeleted,
            failedCount: summary.failedSessionIds.length,
        });
        return {
            success: summary.failedSessionIds.length === 0,
            totalDeleted: summary.deletedSessionIds.length,
            imagesDeleted: summary.imagesDeleted,
            deletedSessionIds: summary.deletedSessionIds,
            failedSessionIds: summary.failedSessionIds,
            collections: [DB_COLLECTIONS.CHAT_SESSIONS],
        };
    } catch (error) {
        logRuntimeFailure('dev_chat_data_clear_failed', error, {}, { developmentOnly: true });
        throw error;
    }
}
