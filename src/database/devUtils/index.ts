/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV-ONLY DATABASE UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ⚠️ CRITICAL: These functions should NEVER be exposed in production!
 * 
 * PURPOSE:
 * --------
 * Provides utility functions for clearing database collections during 
 * development and testing. These are ONLY used via dynamic imports to 
 * ensure they're tree-shaken from production builds.
 * 
 * WHY THIS EXISTS:
 * ----------------
 * During development, we need to frequently test with fresh data. Manually
 * clearing Firestore collections via Firebase Console is:
 * - Time-consuming (3 collections × multiple clicks)
 * - Error-prone (easy to miss a collection)
 * - Tedious for rapid iteration
 * 
 * This utility enables one-click data clearing for efficient testing.
 * 
 * SAFETY MECHANISMS:
 * ------------------
 * 1. Environment Check: Functions throw error if NODE_ENV === 'production'
 * 2. Dynamic Import: Code tree-shaken from production bundle
 * 3. No Direct Export: Only used through handler layer
 * 4. Batched Deletes: Efficient deletion (500 docs per batch)
 * 
 * MAINTENANCE:
 * ------------
 * When adding new chat-related collections:
 * 1. Add collection name to DB_COLLECTIONS in constants/database.ts
 * 2. Add to collections array in clearAllChatData() below
 * 3. Update DevOnlyClearDataButton.tsx modal to list new collection
 * 4. Update useChatHandlers.ts documentation
 * 
 * ARCHITECTURE:
 * -------------
 * DevOnlyClearDataButton.tsx (UI)
 *    ↓ onClick
 * handleClearAllData (useChatHandlers.ts) - State management
 *    ↓ import & call
 * clearAllChatData (this file) - Database operations
 *    ↓ batch delete
 * Firestore Collections
 * 
 * CREATED: 2025-01-23
 * LAST MODIFIED: 2025-01-23
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { DB_COLLECTIONS } from '@constant/database';
import { deleteFileByUrl } from '@database/storage/deleteFromStorage';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

const logDevCleanupDiagnostic = (diagnosticCode: string, context: Record<string, boolean | number | string | null | undefined> = {}) => {
    logRuntimeDiagnostic(diagnosticCode, context, { developmentOnly: true });
};

/**
 * Delete all documents from a Firestore collection using batch operations
 * 
 * This function efficiently deletes large numbers of documents by:
 * 1. Fetching all documents in the collection
 * 2. Batching delete operations (Firestore limit: 500 operations/batch)
 * 3. Executing batches in parallel for maximum speed
 * 
 * @param collectionName - Name of the Firestore collection to clear
 * @returns Number of documents deleted (0 if collection was already empty)
 * 
 * @example
 * const deletedCount = await deleteCollection('chatSessions');
 */
async function deleteCollection(collectionName: string) {
    const collectionRef = collection(firebaseClient, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
        logDevCleanupDiagnostic('dev_chat_collection_empty', {
            ...getBoundedRuntimeStringContext('collectionName', collectionName),
        });
        return 0;
    }

    // Firestore batch limit is 500 operations
    const batchSize = 500;
    const batches: any[] = [];
    let currentBatch = writeBatch(firebaseClient);
    let operationCount = 0;

    snapshot.docs.forEach((doc, index) => {
        currentBatch.delete(doc.ref);
        operationCount++;

        // If we've reached batch size or last document, commit batch
        if (operationCount === batchSize || index === snapshot.docs.length - 1) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(firebaseClient);
            operationCount = 0;
        }
    });

    await Promise.all(batches);
    logDevCleanupDiagnostic('dev_chat_collection_deleted', {
        ...getBoundedRuntimeStringContext('collectionName', collectionName),
        deletedCount: snapshot.size,
    });
    return snapshot.size;
}

/**
 * Extract and delete all uploaded images from chat sessions
 * 
 * Before deleting chatSessions collection, we need to:
 * 1. Extract all image URLs from chat messages
 * 2. Delete those files from Firebase Storage
 * 3. Then delete the Firestore documents
 * 
 * This prevents orphaned files in Storage (images without database records)
 * 
 * @returns Number of images deleted from Storage
 */
async function deleteAllChatImages(): Promise<number> {
    logDevCleanupDiagnostic('dev_chat_images_delete_started');
    
    try {
        const chatSessionsRef = collection(firebaseClient, DB_COLLECTIONS.CHAT_SESSIONS);
        const snapshot = await getDocs(chatSessionsRef);
        
        if (snapshot.empty) {
            logDevCleanupDiagnostic('dev_chat_images_no_sessions');
            return 0;
        }

        const imageUrls: string[] = [];

        // Extract all image URLs from chat messages
        snapshot.docs.forEach((doc) => {
            const session = doc.data();
            const messages = session.messages || [];
            
            messages.forEach((message: any) => {
                // Check if message has an uploaded image
                if (message.image?.url && !message.image.url.includes('base64')) {
                    imageUrls.push(message.image.url);
                }
            });
        });

        if (imageUrls.length === 0) {
            logDevCleanupDiagnostic('dev_chat_images_none_found');
            return 0;
        }

        logDevCleanupDiagnostic('dev_chat_images_found', {
            imageCount: imageUrls.length,
        });

        // Delete all images from Firebase Storage
        const deletePromises = imageUrls.map(url => deleteFileByUrl(url));
        await Promise.all(deletePromises);

        logDevCleanupDiagnostic('dev_chat_images_deleted', {
            imageCount: imageUrls.length,
        });
        return imageUrls.length;
    } catch (error) {
        logRuntimeFailure('dev_chat_images_delete_failed', error, {}, { developmentOnly: true });
        // Don't throw - continue with collection deletion even if image deletion fails
        return 0;
    }
}

/**
 * DEV-ONLY: Clear all chat-related Firestore collections AND Storage files
 * 
 * This is the main function called by the development UI to wipe all chat data.
 * It performs the following operations:
 * 
 * STEP 1: Delete uploaded images from Firebase Storage
 * - Extracts image URLs from all chat messages
 * - Deletes files from Storage to prevent orphaned files
 * 
 * STEP 2: Delete Firestore collections
 * 1. aiSearchHistory   - AI search analytics and user queries
 * 2. chatSessions      - Complete chat conversation history
 * 3. queryEmbeddings   - Cached vector embeddings for search optimization
 * 
 * SAFETY:
 * - Throws error if called in production environment
 * - Requires explicit confirmation from user (handled in UI layer)
 * - Uses efficient batched deletions to avoid timeout issues
 * - Continues even if Storage deletion fails (logs error)
 * 
 * PERFORMANCE:
 * - Processes collections sequentially (for clearer logging)
 * - Uses batch operations for speed (500 docs per batch)
 * - Deletes Storage files in parallel for efficiency
 * - Returns total count for user feedback
 * 
 * @returns Object with success status, total deleted count, image count, and collection names
 * @throws Error if NODE_ENV === 'production'
 * 
 * @example
 * const result = await clearAllChatData();
 * // { 
 * //   success: true, 
 * //   totalDeleted: 124, 
 * //   imagesDeleted: 8,
 * //   collections: ['aiSearchHistory', 'chatSessions', 'queryEmbeddings'] 
 * // }
 */
export async function clearAllChatData() {
    // Double-check we're in development
    if (process.env.NODE_ENV === 'production') {
        throw new Error('This function is disabled in production.');
    }

    logDevCleanupDiagnostic('dev_chat_data_clear_started');

    try {
        // STEP 1: Delete uploaded images from Firebase Storage
        // Must be done BEFORE deleting chatSessions collection
        const imagesDeleted = await deleteAllChatImages();

        // STEP 2: Delete Firestore collections
        const collections = [
            DB_COLLECTIONS.AI_SEARCH_HISTORY,
            DB_COLLECTIONS.CHAT_SESSIONS,
            DB_COLLECTIONS.QUERY_EMBEDDINGS
        ];

        let totalDeleted = 0;

        for (const collectionName of collections) {
            const deleted = await deleteCollection(collectionName);
            totalDeleted += deleted;
        }

        logDevCleanupDiagnostic('dev_chat_data_clear_completed', {
            totalDeleted,
            imagesDeleted,
            collectionCount: collections.length,
        });
        return {
            success: true,
            totalDeleted,
            imagesDeleted,
            collections: collections
        };
    } catch (error) {
        logRuntimeFailure('dev_chat_data_clear_failed', error, {}, { developmentOnly: true });
        throw error;
    }
}
