import { firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    normalizeStorageDeleteErrorCode,
    normalizeStorageDeleteTarget,
} from "@lib/storage/storageDeleteBoundary";
import { deleteObject, ref, type FirebaseStorage } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";

/**
 * Delete file from Firebase Storage by URL
 * 
 * @param url - Firebase Storage URL or path
 * @returns Promise<{ success: boolean; error?: string; code?: string }>
 * 
 * Error Codes:
 * - object-not-found: File doesn't exist (considered success for idempotency)
 * - unauthorized: No permission to delete
 * - unknown: Other errors
 */
export const deleteFileByUrl = async (url: unknown, storageOverride?: FirebaseStorage | null): Promise<{
    success: boolean;
    error?: string;
    code?: string;
}> => {
    try {
        // Validate input
        const normalizedUrl = normalizeStorageDeleteTarget(url);
        if (!normalizedUrl) {
            logStorageHelperFailure(
                "storage_delete_invalid_url",
                new Error("storage_delete_invalid_url"),
                getBoundedStringLogContext("url", url),
            );
            return {
                success: false,
                error: 'Invalid URL provided',
                code: 'invalid-argument'
            };
        }

        const storageRef = ref(storageOverride || firebaseStorage, normalizedUrl);

        // Delete the file
        await deleteObject(storageRef);

        return { success: true };

    } catch (error: unknown) {
        const errorCode = normalizeStorageDeleteErrorCode(error);

        // File not found is acceptable (already deleted)
        if (errorCode === 'storage/object-not-found') {
            return {
                success: true, // Idempotent - consider it success
                code: errorCode
            };
        }

        logStorageHelperFailure(
            "storage_delete_failed",
            error,
            {
                ...getBoundedStringLogContext("url", url),
                hasStorageOverride: Boolean(storageOverride),
            },
        );

        // Return error details
        return {
            success: false,
            error: 'Failed to delete file',
            code: errorCode
        };
    }
}
