# 🔐 Object Sanitization Pattern - Complete Guide

**Date:** November 6, 2025
**Status:** Security pattern guide; not current launch certification
**Pattern:** Reusable security utilities

---

## Current Launch Boundary

Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, current source usage review for dangerous-key filtering and Firestore undefined-value sanitization, and focused tests for touched auth/database paths. This pattern guide is not production-launch approval.

---

## 📋 Table of Contents

1. [The Problem](#the-problem)
2. [Why Two Different Approaches](#why-two-different-approaches)
3. [The Solution](#the-solution)
4. [Usage Examples](#usage-examples)
5. [Common Mistakes](#common-mistakes)

---

## 🐛 The Problem

### **Prototype Pollution Attack**

Firestore documents can contain dangerous keys that enable prototype pollution attacks:

```typescript
// Malicious data in Firestore
{
  email: "user@example.com",
  __proto__: { isAdmin: true }  // ❌ Dangerous!
}
```

### **Why JavaScript Destructuring Doesn't Work**

```typescript
// ❌ THIS DOESN'T WORK
const { __proto__, constructor, prototype, ...safe } = data;

// Reason: __proto__ is a special property that accesses prototype chain
// Destructuring tries to access the prototype, not extract the key
```

---

## 🤔 Why Two Different Approaches

### **Question:**
> "We have different filtering in `auth/index.ts` vs `database/users/index.ts`. Why not use the same approach?"

### **Answer:** They filter DIFFERENT keys for DIFFERENT purposes!

---

### **Approach 1: Database Read (users/index.ts)**

**Purpose:** Read user data from Firestore

**Filters:** ONLY dangerous keys
```typescript
removeDangerousKeys(data)  // Removes: __proto__, constructor, prototype
```

**Keeps:** ALL user data (email, name, type, provider, stores, custom fields, etc.)

**Example:**
```typescript
// Firestore data:
{
  id: "123",
  email: "user@example.com",
  name: "John Doe",
  type: "premium",          // ✅ Keep this
  provider: "stripe",       // ✅ Keep this
  stores: [...],            // ✅ Keep this
  __proto__: {...}          // ❌ Remove this
}

// After removeDangerousKeys:
{
  id: "123",
  email: "user@example.com",
  name: "John Doe",
  type: "premium",          // ✅ Still here
  provider: "stripe",       // ✅ Still here
  stores: [...]             // ✅ Still here
}
```

---

### **Approach 2: Session Preparation (auth/index.ts)**

**Purpose:** Prepare user data for JWT session token

**Filters:** OAuth keys + dangerous keys
```typescript
removeKeys(dbUser, [...OAUTH_KEYS, ...DANGEROUS_KEYS])
```

**OAuth keys filtered:**
- `scope`
- `providerAccountId`
- `type`
- `provider`
- `token_type`
- `id_token`
- `access_token`

**Dangerous keys filtered:**
- `__proto__`
- `constructor`
- `prototype`

**Example:**
```typescript
// User data from OAuth:
{
  id: "123",
  email: "user@example.com",
  name: "John Doe",
  scope: "openid email",        // ❌ Remove (OAuth only)
  provider: "google",            // ❌ Remove (OAuth only)
  access_token: "abc123",        // ❌ Remove (OAuth only)
  stores: [...],                 // ✅ Keep
  __proto__: {...}               // ❌ Remove (dangerous)
}

// After removeKeys with OAuth + dangerous:
{
  id: "123",
  email: "user@example.com",
  name: "John Doe",
  stores: [...]                  // ✅ Only essential data
}
```

---

## ✅ The Solution

### **Created Utility: `/src/lib/security/sanitizeObject.ts`**

```typescript
/**
 * Remove ONLY dangerous keys (for database reads)
 */
export function removeDangerousKeys<T>(data: T): Partial<T> {
    const safeData: any = {};
    
    for (const key in data) {
        // Skip: __proto__, constructor, prototype
        if (!['__proto__', 'constructor', 'prototype'].includes(key)) {
            safeData[key] = data[key];
        }
    }
    
    return safeData;
}

/**
 * Remove SPECIFIC keys (for session preparation)
 */
export function removeKeys<T>(
    data: T, 
    excludeKeys: readonly string[]
): Partial<T> {
    const excludeSet = new Set(excludeKeys);
    const safeData: any = {};
    
    for (const key in data) {
        if (!excludeSet.has(key)) {
            safeData[key] = data[key];
        }
    }
    
    return safeData;
}

// Export constant for reuse
export const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
```

---

## 📁 Usage Examples

### **1. Database Read (Keep Everything Except Dangerous)**

**File:** `src/database/users/index.ts`

```typescript
import { removeDangerousKeys } from "@lib/security/sanitizeObject";

export const getUserByEmail = (email: string) => {
    return new Promise(async (res, rej) => {
        const querySnapshot = await getDocs(query);
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            
            // ✅ Remove ONLY dangerous keys
            const safeData = removeDangerousKeys(data);
            
            res({ ...safeData, id: doc.id });
        });
    });
}
```

**Before:**
```typescript
// ❌ Manual filtering (verbose, error-prone)
const safeData: any = {};
for (const key in data) {
    if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
        safeData[key] = data[key];
    }
}
```

**After:**
```typescript
// ✅ One line, reusable
const safeData = removeDangerousKeys(data);
```

---

### **2. Session Preparation (Remove OAuth + Dangerous)**

**File:** `src/lib/auth/index.ts`

```typescript
import { removeKeys, DANGEROUS_KEYS } from "@lib/security/sanitizeObject";

const getDatabaseUserForSession = (dbUser: any): any => {
    if (!dbUser) return {};
    
    // OAuth keys that shouldn't be in session
    const OAUTH_KEYS = [
        'scope',
        'providerAccountId',
        'type',
        'provider',
        'token_type',
        'id_token',
        'access_token'
    ];
    
    // ✅ Combine and remove both types
    const excludeKeys = [...OAUTH_KEYS, ...DANGEROUS_KEYS];
    return removeKeys(dbUser, excludeKeys);
}
```

**Before:**
```typescript
// ❌ Manual Set creation (verbose)
const excludeKeys = new Set([
    'scope',
    'providerAccountId',
    // ... 10 more keys
]);

const safeData: any = {};
for (const key in dbUser) {
    if (!excludeKeys.has(key)) {
        safeData[key] = dbUser[key];
    }
}
```

**After:**
```typescript
// ✅ Clean, declarative
const excludeKeys = [...OAUTH_KEYS, ...DANGEROUS_KEYS];
return removeKeys(dbUser, excludeKeys);
```

---

## ⚠️ Common Mistakes

### **Mistake 1: Using Same Filter Everywhere**

```typescript
// ❌ BAD - Filters out legitimate user data
const safeData = removeKeys(firestoreData, [...OAUTH_KEYS, ...DANGEROUS_KEYS]);

// Firestore data:
{
    email: "user@example.com",
    type: "premium",      // ← Lost! (matched OAuth 'type')
    provider: "stripe"    // ← Lost! (matched OAuth 'provider')
}
```

**Fix:** Use `removeDangerousKeys()` for database reads
```typescript
// ✅ GOOD - Only filters dangerous keys
const safeData = removeDangerousKeys(firestoreData);
```

---

### **Mistake 2: Trying to Destructure __proto__**

```typescript
// ❌ DOESN'T WORK
const { __proto__, constructor, prototype, ...safe } = data;
```

**Why?** `__proto__` is a special property, not a normal key.

**Fix:** Use utility functions
```typescript
// ✅ WORKS
const safe = removeDangerousKeys(data);
```

---

### **Mistake 3: Not Filtering at All**

```typescript
// ❌ DANGEROUS - Prototype pollution possible
const user = { ...doc.data(), id: doc.id };
```

**Fix:** Always sanitize Firestore reads
```typescript
// ✅ SAFE
const data = doc.data();
const safe = removeDangerousKeys(data);
const user = { ...safe, id: doc.id };
```

---

## 📊 Summary Table

| Location | Function | Filters | Purpose |
|----------|----------|---------|---------|
| **Database Read** | `removeDangerousKeys()` | 3 dangerous keys | Get ALL user data safely |
| **Session Prep** | `removeKeys()` | OAuth + dangerous (10 keys) | Create clean JWT token |

---

## 🎓 Key Learnings

### **1. Context Matters**
Different parts of the app need different filtering strategies.

### **2. Reusable Utilities**
Extract common patterns into utilities instead of copying code.

### **3. Document Intent**
Clear function names (`removeDangerousKeys` vs `removeKeys`) show intent.

### **4. Type Safety**
Utilities use generics for better TypeScript support.

### **5. Performance**
Using `Set` for lookups is O(1) instead of O(n).

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `/src/lib/security/sanitizeObject.ts` | Utility functions |
| `/src/database/users/index.ts` | Database reads (use `removeDangerousKeys`) |
| `/src/lib/auth/index.ts` | Session prep (use `removeKeys`) |
| `/src/lib/auth/security.ts` | Has `sanitizeForFirestore` for writes |

---

## ✅ Testing

### **Test dangerous key removal:**
```typescript
const data = {
    email: "test@example.com",
    name: "Test User",
    type: "premium",
    __proto__: { isAdmin: true }  // Dangerous!
};

const safe = removeDangerousKeys(data);

console.log(safe);
// Output: { email: "test@example.com", name: "Test User", type: "premium" }
// ✅ __proto__ removed, type kept
```

### **Test OAuth key removal:**
```typescript
const oauth = {
    email: "test@example.com",
    scope: "openid",
    access_token: "secret",
    __proto__: { isAdmin: true }
};

const excludeKeys = [...OAUTH_KEYS, ...DANGEROUS_KEYS];
const safe = removeKeys(oauth, excludeKeys);

console.log(safe);
// Output: { email: "test@example.com" }
// ✅ Both OAuth and dangerous keys removed
```

---

## 🚀 Production Impact

### **Before (Manual Filtering):**
- ❌ Code duplication (3+ locations)
- ❌ Inconsistent filtering logic
- ❌ Easy to forget dangerous keys
- ❌ Hard to maintain

### **After (Utility Functions):**
- ✅ Single source of truth
- ✅ Consistent filtering everywhere
- ✅ Easy to add new dangerous keys
- ✅ Testable and maintainable

---

**Last Updated:** November 6, 2025  
**Maintainer:** Security Team  
**Pattern Status:** Security pattern documented - verify current usage before launch
