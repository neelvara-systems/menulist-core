/**
 * Upload Base64 File to Firebase Storage
 * 
 * Converts base64 encoded files (images and documents) to Firebase Storage URLs 
 * with proper content type detection and error handling.
 * 
 * Supported Formats:
 * - Images: JPEG, PNG, SVG, WebP, GIF
 * - Documents: PDF, DOC, DOCX, TXT
 */

import { firebaseStorage } from "@lib/firebase/firebaseClient";
import { getDownloadURL, ref, uploadString, type FirebaseStorage, type UploadMetadata } from "firebase/storage";
import {
    getBoundedStringLogContext,
    logStorageHelperFailure,
} from "./storageDiagnostics";

/**
 * Supported file types for upload
 * Covers common image formats and document types
 */
type SupportedFileType = 
    // Image formats (extensions)
    | "jpeg" | "jpg" | "png" | "svg" | "webp" | "gif" 
    // Image formats (MIME types)
    | "image/jpeg" | "image/png" | "image/svg+xml" | "image/webp" | "image/gif"
    // Document formats (extensions)
    | "pdf" | "doc" | "docx" | "txt"
    // Document formats (MIME types)
    | "application/pdf" | "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain";

interface UploadFileData {
    cacheControl?: string;      // Optional Cache-Control metadata for versioned/immutable paths
    customMetadata?: Record<string, string>;
    fileId: string;              // Unique identifier for the file
    storage?: FirebaseStorage | null; // Optional Firebase Storage instance for separated products
    url: string;                 // Base64 encoded data URL or base64 string
    path: string;                // Storage path (without extension)
    type?: SupportedFileType;    // File type/MIME type (images or documents)
}

interface FileTypeConfig {
    extension: string;
    contentType: string;
    uploadFormat: 'data_url' | 'raw';
}

/**
 * Normalize MIME type or extension to standard format
 * Handles both "jpeg", "image/jpeg", "application/pdf", etc.
 * Supports images and documents
 */
function normalizeFileType(type?: SupportedFileType): FileTypeConfig {
    if (!type) {
        // Default to JPEG
        return {
            extension: '.jpeg',
            contentType: 'image/jpeg',
            uploadFormat: 'data_url'
        };
    }

    const normalizedType = type.toLowerCase();

    // PNG
    if (normalizedType.includes('png')) {
        return {
            extension: '.png',
            contentType: 'image/png',
            uploadFormat: 'data_url'
        };
    }
    
    // JPEG/JPG
    if (normalizedType.includes('jpeg') || normalizedType.includes('jpg')) {
        return {
            extension: '.jpeg',
            contentType: 'image/jpeg',
            uploadFormat: 'data_url'
        };
    }
    
    // SVG
    if (normalizedType.includes('svg')) {
        return {
            extension: '.svg',
            contentType: 'image/svg+xml',
            uploadFormat: 'raw'
        };
    }
    
    // WebP
    if (normalizedType.includes('webp')) {
        return {
            extension: '.webp',
            contentType: 'image/webp',
            uploadFormat: 'data_url'
        };
    }
    
    // GIF
    if (normalizedType.includes('gif')) {
        return {
            extension: '.gif',
            contentType: 'image/gif',
            uploadFormat: 'data_url'
        };
    }
    
    // PDF (Documents)
    if (normalizedType.includes('pdf')) {
        return {
            extension: '.pdf',
            contentType: 'application/pdf',
            uploadFormat: 'data_url'
        };
    }
    
    // Word Documents (.doc)
    if (normalizedType.includes('msword') || normalizedType === 'doc') {
        return {
            extension: '.doc',
            contentType: 'application/msword',
            uploadFormat: 'data_url'
        };
    }
    
    // Word Documents (.docx)
    if (normalizedType.includes('wordprocessingml') || normalizedType === 'docx') {
        return {
            extension: '.docx',
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            uploadFormat: 'data_url'
        };
    }
    
    // Plain Text
    if (normalizedType.includes('text') || normalizedType === 'txt') {
        return {
            extension: '.txt',
            contentType: 'text/plain',
            uploadFormat: 'data_url'
        };
    }

    // Default fallback to JPEG for images, or keep as-is for unknown types
    return {
        extension: '.jpeg',
        contentType: 'image/jpeg',
        uploadFormat: 'data_url'
    };
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
        const typeConfig = normalizeFileType(fileData.type);
        
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
