/**
 * Upload Base64 File to Firebase Storage
 * 
 * Converts base64 encoded files (images and documents) to Firebase Storage URLs 
 * with proper content type detection and error handling.
 * 
 * Supported Formats:
 * - Images: JPEG, PNG, SVG, WebP, GIF
 * - Documents: PDF, DOC, DOCX, TXT
 * - Fonts: TTF, OTF, WOFF, WOFF2
 */

import { firebaseStorage } from "@lib/firebase/firebaseClient";
import {
    resolveBase64UploadConfig,
    type SupportedBase64UploadFileType,
} from "@lib/storage/base64UploadBoundary";
import { getDownloadURL, ref, uploadString, type FirebaseStorage, type UploadMetadata } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";

/**
 * Supported file types for upload
 * Covers common image formats and document types
 */
export type SupportedFileType = SupportedBase64UploadFileType;

interface UploadFileData {
    cacheControl?: string;      // Optional Cache-Control metadata for versioned/immutable paths
    customMetadata?: Record<string, string>;
    fileId: string;              // Unique identifier for the file
    storage?: FirebaseStorage | null; // Optional Firebase Storage instance for separated products
    url: string;                 // Base64 encoded data URL or base64 string
    path: string;                // Storage path (without extension)
    type?: SupportedFileType;    // File type/MIME type (images or documents)
}

/**
 * Upload base64 file (image or document) to Firebase Storage
 * 
 * @param fileData - File data containing base64 URL and metadata
 * @returns Promise<string> - Download URL of uploaded file
 * @throws Error if upload fails
 * 
 * @example
 * ```typescript
 * const downloadURL = await uploadBase64ToStorage({
 *     fileId: '1729833600000-random',
 *     url: 'data:image/png;base64,iVBORw0KGgo...',
 *     path: 'chatSessions/chatimages/5/12/1729833600000-random',
 *     type: 'image/png'
 * });
 * ```
 */
const uploadBase64ToStorage = async (fileData: UploadFileData): Promise<string> => {
    try {
        // Normalize file type and get configuration
        const typeConfig = resolveBase64UploadConfig({ type: fileData.type, url: fileData.url });
        
        // Build complete file path with extension
        const fileName = `${fileData.path}${typeConfig.extension}`;
        
        // Create upload metadata
        const metadata: UploadMetadata = {
            ...(fileData.cacheControl ? { cacheControl: fileData.cacheControl } : {}),
            contentType: typeConfig.contentType,
            customMetadata: {
                ...(fileData.customMetadata || {}),
                fileId: fileData.fileId,
                uploadedAt: new Date().toISOString()
            }
        };

        // Create storage reference
        const storageRef = ref(fileData.storage || firebaseStorage, fileName);
        
        // Upload the file
        await uploadString(
            storageRef,
            fileData.url,
            typeConfig.uploadFormat,
            metadata
        );
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        return downloadURL;
        
    } catch (error) {
        logStorageHelperFailure(
            "storage_base64_upload_failed",
            error,
            {
                ...getBoundedStringLogContext("fileId", fileData?.fileId),
                ...getBoundedStringLogContext("path", fileData?.path),
                ...getBoundedStringLogContext("type", fileData?.type),
                hasStorageOverride: Boolean(fileData?.storage),
                hasCustomMetadata: Boolean(fileData?.customMetadata),
                hasCacheControl: Boolean(fileData?.cacheControl),
            },
        );
        throw new Error('Failed to upload file');
    }
};

export default uploadBase64ToStorage;
