/**
 * Storage Path Generator Utility
 * 
 * Generates standardized storage paths with tenant/store isolation
 * Pattern: {collection}/{fileType}/{tenantId}/{storeId}/{fileId}
 * 
 * Benefits:
 * - Multi-tenancy data isolation at storage level
 * - Security rules can enforce tenant boundaries
 * - Easy per-tenant analytics and cost tracking
 * - GDPR-compliant data deletion (delete entire tenant folder)
 * - Consistent pattern across all features
 */

import { ECOMSAI_PLATFORM_STORE_ID, ECOMSAI_PLATFORM_TENANT_ID } from '@constant/user';

export interface StoragePathOptions {
    collection: string;      // e.g., 'chatSessions', 'supportTickets', 'projects'
    fileType: string;        // e.g., 'chatimages', 'documents', 'assets'
    session: any;            // User session with tId and sId
    fileId: string;          // Unique file identifier
    useDefaults?: boolean;   // Use platform defaults if session missing (default: true)
}

/**
 * Generate standardized storage path with tenant/store isolation
 * 
 * @example
 * ```typescript
 * generateStoragePath({
 *     collection: 'chatSessions',
 *     fileType: 'chatimages',
 *     session: { tId: 5, sId: 12 },
 *     fileId: '1729833600000-user123'
 * })
 * // Returns: 'chatSessions/chatimages/5/12/1729833600000-user123'
 * ```
 */
export function generateStoragePath(options: StoragePathOptions): string {
    const { collection, fileType, session, fileId, useDefaults = true } = options;

    // Extract tenant and store IDs
    let tenantId: number | string;
    let storeId: number | string;

    if (session && (session.tId !== undefined || session.sId !== undefined)) {
        // Use session data
        tenantId = session.tId ?? (useDefaults ? ECOMSAI_PLATFORM_TENANT_ID : 'unknown');
        storeId = session.sId ?? (useDefaults ? ECOMSAI_PLATFORM_STORE_ID : 'default');
    } else if (useDefaults) {
        // Use platform defaults
        tenantId = ECOMSAI_PLATFORM_TENANT_ID;
        storeId = ECOMSAI_PLATFORM_STORE_ID;
    } else {
        // No session and defaults disabled
        tenantId = 'unknown';
        storeId = 'default';
    }

    // Construct path
    const path = `${collection}/${fileType}/${tenantId}/${storeId}/${fileId}`;
    
    // Log path generation for debugging (can be removed in production)
    console.log('📁 Generated storage path:', path, {
        collection,
        fileType,
        tId: tenantId,
        sId: storeId
    });
    
    return path;
}

/**
 * Parse storage path to extract metadata
 * Useful for reverse-engineering tenant/store info from file URLs
 * 
 * @example
 * ```typescript
 * parseStoragePath('chatSessions/chatimages/5/12/1729833600000-user123.jpeg')
 * // Returns: { collection: 'chatSessions', fileType: 'chatimages', tId: '5', sId: '12', fileId: '1729833600000-user123.jpeg' }
 * ```
 */
export function parseStoragePath(path: string): {
    collection: string;
    fileType: string;
    tId: string;
    sId: string;
    fileId: string;
} | null {
    const parts = path.split('/');
    
    if (parts.length < 5) {
        console.warn('Invalid storage path format:', path);
        return null;
    }

    return {
        collection: parts[0],
        fileType: parts[1],
        tId: parts[2],
        sId: parts[3],
        fileId: parts.slice(4).join('/') // Support nested fileIds
    };
}

/**
 * Get tenant directory path for bulk operations
 * Useful for deleting all tenant data or calculating tenant storage size
 * 
 * @example
 * ```typescript
 * getTenantPath('chatSessions', 'chatimages', 5)
 * // Returns: 'chatSessions/chatimages/5'
 * ```
 */
export function getTenantPath(collection: string, fileType: string, tenantId: number | string): string {
    return `${collection}/${fileType}/${tenantId}`;
}

/**
 * Get store directory path for bulk operations
 * Useful for store-specific backup/restore operations
 * 
 * @example
 * ```typescript
 * getStorePath('chatSessions', 'chatimages', 5, 12)
 * // Returns: 'chatSessions/chatimages/5/12'
 * ```
 */
export function getStorePath(
    collection: string,
    fileType: string,
    tenantId: number | string,
    storeId: number | string
): string {
    return `${collection}/${fileType}/${tenantId}/${storeId}`;
}
