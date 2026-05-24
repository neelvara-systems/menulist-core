import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { deleteObject, ref, type FirebaseStorage } from "firebase/storage";

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
export const deleteFileByUrl = async (url: string, storageOverride?: FirebaseStorage | null): Promise<{
    success: boolean;
    error?: string;
    code?: string;
}> => {
    try {
        // Validate input
        if (!url || typeof url !== 'string') {
            console.error('🗑️ Delete failed: Invalid URL provided', { url });
            return {
                success: false,
                error: 'Invalid URL provided',
                code: 'invalid-argument'
            };
        }

        const storageRef = ref(storageOverride || firebaseStorage, url);

        // Delete the file
        await deleteObject(storageRef);

        console.log('✅ File deleted successfully:', url);
        return { success: true };

    } catch (error: any) {
        const errorCode = error.code || 'unknown';
        const errorMessage = error.message || 'Unknown error';

        // File not found is acceptable (already deleted)
        if (errorCode === 'storage/object-not-found') {
            console.log('ℹ️ File already deleted or not found:', url);
            return {
                success: true, // Idempotent - consider it success
                code: errorCode
            };
        }

        // Log other errors to console for debugging
        console.error('🗑️ Delete failed:', {
            url,
            code: errorCode,
            message: errorMessage,
            error
        });

        // Return error details
        return {
            success: false,
            error: errorMessage,
            code: errorCode
        };
    }
}
