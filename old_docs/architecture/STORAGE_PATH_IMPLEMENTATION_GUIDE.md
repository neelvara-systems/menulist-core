# Storage Path Implementation Guide

This guide provides step-by-step instructions to implement the tenant/store-scoped storage pattern across the application.

---

## Table of Contents
1. [Step 1: Create Helper Function](#step-1-create-helper-function)
2. [Step 2: Update Chat Image Upload](#step-2-update-chat-image-upload)
3. [Step 3: Update Other Features](#step-3-update-other-features)
4. [Step 4: Update Storage Rules](#step-4-update-storage-rules)
5. [Step 5: Testing Checklist](#step-5-testing-checklist)

---

## Step 1: Create Helper Function

### Create `/src/lib/storage/pathGenerator.ts`

```typescript
/**
 * Storage Path Generator Utility
 * 
 * Generates standardized storage paths with tenant/store isolation
 * Pattern: {collection}/{fileType}/{tenantId}/{storeId}/{fileId}
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
 * generateStoragePath({
 *     collection: 'chatSessions',
 *     fileType: 'chatimages',
 *     session: { tId: 5, sId: 12 },
 *     fileId: '1729833600000-user123'
 * })
 * // Returns: 'chatSessions/chatimages/5/12/1729833600000-user123'
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
    return `${collection}/${fileType}/${tenantId}/${storeId}/${fileId}`;
}

/**
 * Parse storage path to extract metadata
 * 
 * @example
 * parseStoragePath('chatSessions/chatimages/5/12/1729833600000-user123.jpeg')
 * // Returns: { collection: 'chatSessions', fileType: 'chatimages', tId: '5', sId: '12', fileId: '1729833600000-user123.jpeg' }
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
 * 
 * @example
 * getTenantPath('chatSessions', 'chatimages', 5)
 * // Returns: 'chatSessions/chatimages/5'
 */
export function getTenantPath(collection: string, fileType: string, tenantId: number | string): string {
    return `${collection}/${fileType}/${tenantId}`;
}

/**
 * Get store directory path for bulk operations
 * 
 * @example
 * getStorePath('chatSessions', 'chatimages', 5, 12)
 * // Returns: 'chatSessions/chatimages/5/12'
 */
export function getStorePath(
    collection: string,
    fileType: string,
    tenantId: number | string,
    storeId: number | string
): string {
    return `${collection}/${fileType}/${tenantId}/${storeId}`;
}
```

---

## Step 2: Update Chat Image Upload

### Update `/src/database/chatSessions/index.ts`

```typescript
import { DB_COLLECTIONS } from '@constant/database';
import uploadBase64ToStorage from '@database/storage/uploadBase64ToStorage';
import { generateStoragePath } from '@lib/storage/pathGenerator'; // NEW IMPORT
import { requestBodyComposer } from '@lib/apiHelper';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { apiCallComposerClientWithoutLoader } from '@lib/apiHelper/apiCallComposerClientWithoutLoader';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { ChatSession } from '@type/chatSession';
import { UserUploadedFileType } from '@type/common';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.CHAT_SESSIONS;

/**
 * Upload chat image to Firebase Storage
 * Converts base64 images to storage URLs with tenant/store isolation
 * 
 * @param image - UserUploadedFileType with base64 data
 * @param session - User session containing tId and sId
 * @returns UserUploadedFileType with storage URL
 */
export const uploadChatImage = async (
    image: UserUploadedFileType,
    session: any // Changed from userId to full session
): Promise<UserUploadedFileType> => {
    return await apiCallComposer(
        async () => {
            // Check if image contains base64 data
            if (image.url?.includes('base64') || image.source?.includes('base64')) {
                const userId = session.uId || session.user?.id || 'anonymous';
                const imageId = `${Date.now()}-${userId}`;
                const base64String = image.url || image.source;
                
                // Generate tenant/store-scoped path
                const path = generateStoragePath({
                    collection: COLLECTION,
                    fileType: 'chatimages',
                    session,
                    fileId: imageId
                });
                
                // Upload to Firebase Storage
                const uploadedUrl = await uploadBase64ToStorage({
                    fileId: imageId,
                    url: base64String!,
                    path, // Using new scoped path
                    type: image.type || 'image/png'
                }) as string;
                
                // Return image with storage URL
                return {
                    ...image,
                    url: uploadedUrl,
                    source: uploadedUrl // Update source as well for preview
                };
            }
            
            // Return original if not base64
            return image;
        },
        image,
        'uploadChatImage'
    );
};
```

### Update Calling Code in `/src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts`

```typescript
// Handler: Send Message
const onSendMessage = async (content: string, image?: UserUploadedFileType) => {
    // Upload image to storage if present and is base64
    let uploadedImage = image;
    if (image) {
        // CHANGED: Pass full session instead of just user ID
        uploadedImage = await uploadChatImage(image, loggedInSession);
    }

    const newUserMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content,
        createdOn: Timestamp.now(),
        image: uploadedImage || null
    };

    // ... rest of the function
};
```

---

## Step 3: Update Other Features

### Support Tickets (`/src/database/tickets/index.ts`)

```typescript
import { generateStoragePath } from '@lib/storage/pathGenerator';

const uploadImage = async (data: any, type: string) => {
    let uploadedUrl: any = '';
    const docId = `${new Date().getTime()}-${data.uid}`;

    if (data.url?.includes('base64')) {
        // Get session from context (you may need to pass this as parameter)
        const session = await getActiveSession();
        
        const path = generateStoragePath({
            collection: COLLECTION,
            fileType: type, // 'documents' or 'attachments'
            session,
            fileId: docId
        });

        uploadedUrl = await uploadBase64ToStorage({
            fileId: docId,
            url: data.url,
            path, // Using new scoped path
            type: data.type
        });
    }
    return uploadedUrl || data.url;
};
```

### Projects (`/src/database/projects/index.ts`)

```typescript
import { generateStoragePath } from '@lib/storage/pathGenerator';

const uploadAsset = async (data: any, from: string) => {
    let fileUrl: any = '';
    const docId = `${new Date().getTime()}-${data.uid}`;

    if (data.url && data.url.includes('base64')) {
        const session = await getActiveSession();
        
        const path = generateStoragePath({
            collection: 'projects', // Or use DB_COLLECTIONS.PROJECTS
            fileType: 'assets',
            session,
            fileId: `${from}-${docId}` // Include 'from' in fileId if needed
        });

        fileUrl = await uploadBase64ToStorage({
            fileId: docId,
            url: data.url,
            path, // Using new scoped path
            type: data.type
        });
    }
    return fileUrl || "";
};
```

### Tenants/Stores/Users Logos

```typescript
import { generateStoragePath } from '@lib/storage/pathGenerator';

const uploadLogo = async (imageToUpdate: string, docId: string, session: any) => {
    if (imageToUpdate?.includes('base64')) {
        const path = generateStoragePath({
            collection: COLLECTION, // 'tenants', 'stores', or 'users'
            fileType: 'logos',
            session,
            fileId: docId
        });

        return await uploadBase64ToStorage({
            fileId: docId,
            url: imageToUpdate,
            path,
            type: 'png'
        });
    }
    return imageToUpdate;
};
```

---

## Step 4: Update Storage Rules

### Update `/storage.rules`

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function to check if user belongs to tenant
    function belongsToTenant(tenantId) {
      return request.auth != null 
        && get(/databases/(default)/documents/users/$(request.auth.uid)).data.tId == int(tenantId);
    }
    
    // Helper function to check if user belongs to store
    function belongsToStore(tenantId, storeId) {
      let userData = get(/databases/(default)/documents/users/$(request.auth.uid)).data;
      return request.auth != null 
        && userData.tId == int(tenantId)
        && userData.sId == int(storeId);
    }
    
    // Chat Sessions - Tenant/Store scoped
    match /chatSessions/chatimages/{tenantId}/{storeId}/{imageId=**} {
      // Read: User must belong to the tenant
      allow read: if belongsToTenant(tenantId);
      
      // Write: User must belong to the specific store
      allow write: if belongsToStore(tenantId, storeId);
      
      // Delete: Only store users can delete
      allow delete: if belongsToStore(tenantId, storeId);
    }
    
    // Support Tickets - Tenant/Store scoped
    match /supportTickets/documents/{tenantId}/{storeId}/{fileId=**} {
      allow read: if belongsToTenant(tenantId);
      allow write: if belongsToStore(tenantId, storeId);
      allow delete: if belongsToStore(tenantId, storeId);
    }
    
    // Projects - Tenant/Store scoped
    match /projects/assets/{tenantId}/{storeId}/{fileId=**} {
      allow read: if belongsToTenant(tenantId);
      allow write: if belongsToStore(tenantId, storeId);
      allow delete: if belongsToStore(tenantId, storeId);
    }
    
    // Tenant Logos - Tenant scoped (store ID not required)
    match /tenants/logos/{tenantId}/{fileId=**} {
      allow read: if belongsToTenant(tenantId);
      allow write: if belongsToTenant(tenantId);
      allow delete: if belongsToTenant(tenantId);
    }
    
    // Store Logos - Store scoped
    match /stores/logos/{tenantId}/{storeId}/{fileId=**} {
      allow read: if belongsToTenant(tenantId);
      allow write: if belongsToStore(tenantId, storeId);
      allow delete: if belongsToStore(tenantId, storeId);
    }
    
    // User Profile Images - User scoped
    match /users/profileImages/{tenantId}/{storeId}/{fileId=**} {
      allow read: if belongsToTenant(tenantId);
      allow write, delete: if request.auth != null 
        && belongsToStore(tenantId, storeId);
    }
    
    // Default: Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Step 5: Testing Checklist

### Unit Tests

```typescript
// tests/storage/pathGenerator.test.ts
import { generateStoragePath, parseStoragePath, getTenantPath, getStorePath } from '@lib/storage/pathGenerator';

describe('Storage Path Generator', () => {
    const mockSession = {
        tId: 5,
        sId: 12,
        uId: 'user123',
        user: { id: 'user123', name: 'Test User' }
    };

    test('generates correct storage path', () => {
        const path = generateStoragePath({
            collection: 'chatSessions',
            fileType: 'chatimages',
            session: mockSession,
            fileId: '1729833600000-user123'
        });

        expect(path).toBe('chatSessions/chatimages/5/12/1729833600000-user123');
    });

    test('parses storage path correctly', () => {
        const parsed = parseStoragePath('chatSessions/chatimages/5/12/1729833600000-user123.jpeg');

        expect(parsed).toEqual({
            collection: 'chatSessions',
            fileType: 'chatimages',
            tId: '5',
            sId: '12',
            fileId: '1729833600000-user123.jpeg'
        });
    });

    test('gets tenant path correctly', () => {
        const path = getTenantPath('chatSessions', 'chatimages', 5);
        expect(path).toBe('chatSessions/chatimages/5');
    });

    test('gets store path correctly', () => {
        const path = getStorePath('chatSessions', 'chatimages', 5, 12);
        expect(path).toBe('chatSessions/chatimages/5/12');
    });

    test('uses platform defaults when session missing', () => {
        const path = generateStoragePath({
            collection: 'chatSessions',
            fileType: 'chatimages',
            session: null,
            fileId: '1729833600000-user123'
        });

        // Should use ECOMSAI_PLATFORM_TENANT_ID and ECOMSAI_PLATFORM_STORE_ID
        expect(path).toContain('chatSessions/chatimages/');
    });
});
```

### Integration Tests

```typescript
// Test actual upload
describe('Chat Image Upload with Tenant Scoping', () => {
    test('uploads image with correct path', async () => {
        const mockImage: UserUploadedFileType = {
            url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
            type: 'image/png',
            name: 'test.png'
        };

        const mockSession = {
            tId: 5,
            sId: 12,
            uId: 'user123'
        };

        const result = await uploadChatImage(mockImage, mockSession);

        // Verify the returned URL contains the tenant/store path
        expect(result.url).toContain('/chatSessions%2Fchatimages%2F5%2F12%2F');
        expect(result.url).toContain('user123');
    });
});
```

### Manual Testing Checklist

- [ ] **Chat Images**
  - [ ] Upload image in new chat session
  - [ ] Verify path in Firebase Storage console: `chatSessions/chatimages/{tId}/{sId}/{imageId}`
  - [ ] Verify image displays correctly in chat
  - [ ] Test with different tenants/stores

- [ ] **Support Tickets**
  - [ ] Upload document to support ticket
  - [ ] Verify path: `supportTickets/documents/{tId}/{sId}/{fileId}`
  - [ ] Verify file download works

- [ ] **Projects**
  - [ ] Upload project asset
  - [ ] Verify path: `projects/assets/{tId}/{sId}/{fileId}`
  - [ ] Verify asset displays correctly

- [ ] **Security Rules**
  - [ ] Test cross-tenant access (should be denied)
  - [ ] Test unauthenticated access (should be denied)
  - [ ] Test authorized access (should work)

- [ ] **Edge Cases**
  - [ ] Test with missing session data (should use defaults)
  - [ ] Test with null/undefined values
  - [ ] Test with special characters in filenames

---

## Rollback Plan

If issues arise after deployment:

1. **Quick Rollback:**
   ```typescript
   // In generateStoragePath(), add fallback flag
   const USE_OLD_PATTERN = process.env.NEXT_PUBLIC_USE_OLD_STORAGE_PATTERN === 'true';
   
   if (USE_OLD_PATTERN) {
       return `${collection}/images/${fileId}`; // Old pattern
   }
   ```

2. **Environment Variable:**
   ```bash
   # .env.local
   NEXT_PUBLIC_USE_OLD_STORAGE_PATTERN=false
   ```

3. **Feature Flag:**
   ```typescript
   // src/config/features.ts
   export const FEATURE_FLAGS = {
       USE_TENANT_SCOPED_STORAGE: true
   };
   ```

---

## Performance Monitoring

### Add Logging

```typescript
export function generateStoragePath(options: StoragePathOptions): string {
    const start = performance.now();
    
    // ... path generation logic
    
    const duration = performance.now() - start;
    if (duration > 5) {
        console.warn('Slow storage path generation:', duration, 'ms');
    }
    
    console.log('Generated storage path:', path, {
        collection: options.collection,
        fileType: options.fileType,
        tId: tenantId,
        sId: storeId
    });
    
    return path;
}
```

### Monitor Storage Costs

```typescript
// Cloud Function to track storage per tenant
export const trackTenantStorage = functions.pubsub
    .schedule('0 0 * * *') // Daily at midnight
    .onRun(async (context) => {
        const tenants = await admin.firestore().collection('tenants').get();
        
        for (const tenant of tenants.docs) {
            const tId = tenant.id;
            const storagePath = `chatSessions/chatimages/${tId}/`;
            
            const { size } = await getStorageSize(storagePath);
            
            await admin.firestore()
                .collection('analytics')
                .doc(`${tId}-storage`)
                .set({
                    tenantId: tId,
                    storageBytes: size,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
        }
    });
```

---

## Summary

✅ **What You've Gained:**
- Multi-tenant data isolation at storage level
- Security rules that actually enforce tenant boundaries
- Easy per-tenant analytics and cost tracking
- GDPR-compliant data deletion
- Consistent pattern across all features
- Future-proof architecture

🚀 **Next Steps:**
1. Create the helper function
2. Update chat image upload
3. Test thoroughly
4. Roll out to other features
5. Update storage security rules
6. Monitor and optimize

---

**Need Help?** Refer to `STORAGE_PATH_PATTERN_ANALYSIS.md` for detailed reasoning and architecture decisions.
