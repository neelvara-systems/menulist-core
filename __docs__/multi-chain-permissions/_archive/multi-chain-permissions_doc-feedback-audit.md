# 📝 DOC FEEDBACK AUDIT - Multi-Chain Permissions (DOCS ONLY)

**Date:** January 26, 2026  
**Reviewer:** ChatGPT  
**Auditor:** Cascade (with codebase access)

---

## Summary

| Total Points | Accepted | Rejected | Clarify |
|--------------|----------|----------|---------|
| 5 | 3 | 2 | 0 |

---

## Audit Table

| # | ChatGPT Comment | Valid? | Code/Doc Evidence | Action | Target Doc |
|---|-----------------|--------|-------------------|--------|------------|
| 1 | Store permissions path wrong: `tenants/{tId}/stores/{sId}` should be `stores/{sId}` | ✅ | `src/constants/database.ts:6` → `STORES: "stores"`, `src/database/stores/index.tsx:13` → `const COLLECTION = DB_COLLECTIONS.STORES` | Fix path | impl.md |
| 2 | Firebase custom claims trap for multi-store users | ⚠️ Partial | `src/app/api/auth/set-claims/route.ts:64-66` → role resolved per active storeId, not global | Clarify resolution | impl.md |
| 3 | Firestore rules incomplete/unsafe | ✅ | Current impl.md has oversimplified example; API should be primary gatekeeper | Add clarification | impl.md |
| 4 | Local categories should be gated | ❌ | Already gated: `canAddLocalCategories` in spec.md permission table | No change | None |
| 5 | Enforce exactly one role per store | ❌ | Not a requirement - `roles: string[]` allows multiple (existing design) | Reject | None |

---

## Detailed Analysis

### #1: Store Path (ACCEPTED ✅)

**ChatGPT Said:**
> "Store permissions must live on the canonical store doc: `stores/{sId}`"

**Codebase Evidence:**
```typescript
// src/constants/database.ts:6
STORES: "stores",

// src/database/stores/index.tsx:13
const COLLECTION = DB_COLLECTIONS.STORES;

// src/database/stores/index.tsx:19-21
const getDocRef = (docId: any) => {
    return doc(firebaseClient, `${COLLECTION}`, `${docId}`)
}
```

**My impl.md Said:**
> `tenants/{tId}/stores/{sId}.permissions`

**Verdict:** ChatGPT is **CORRECT**. Canonical store path is `stores/{sId}`, not nested under tenants.

**Action:** Update impl.md to use correct path `stores/{sId}.permissions`

---

### #2: Firebase Custom Claims (PARTIALLY ACCEPTED ⚠️)

**ChatGPT Said:**
> "Role is store-scoped, not global. Claims don't update instantly."

**Codebase Evidence:**
```typescript
// src/app/api/auth/set-claims/route.ts:64-66
const userRole = dbUser.stores
    ? dbUser.stores.find((store: any) => store.storeId === dbUser.storeId)?.roles[0]
    : null;
```

**Analysis:** 
- Current implementation DOES resolve role per-store (uses `dbUser.storeId` to find role)
- Role is set for the user's currently active store
- When user switches stores, claims would need refresh

**Verdict:** Partially valid. Docs should clarify that role is resolved per active store, and API checks should verify role per-request.

**Action:** Clarify in impl.md that API-level checks are primary, claims are convenience

---

### #3: Firestore Rules Incomplete (ACCEPTED ✅)

**ChatGPT Said:**
> "Rules must enforce store isolation, master edit restrictions. API must be the gatekeeper."

**My impl.md Said:**
```javascript
allow write: if isHQAdmin() || !isMasterProject();
```

**Verdict:** ChatGPT is **CORRECT**. This simplified example is dangerous. API should be primary enforcement, Firestore rules are secondary defense.

**Action:** Update impl.md to clarify enforcement layers hierarchy

---

### #4: Local Categories Gating (REJECTED ❌)

**ChatGPT Said:**
> "Local categories are structural and already gated."

**My spec.md Already Has:**
| `canAddLocalCategories` | 🏗️ Structural | `false` |

**Verdict:** Not an issue. My docs already gate local categories correctly. ChatGPT is confirming, not correcting.

**Action:** None

---

### #5: Enforce One Role Per Store (REJECTED ❌)

**ChatGPT Said:**
> "Enforce exactly one role per store to avoid confusion."

**Codebase Evidence:**
```typescript
// src/types/platform/user.ts:3-7
export type UserStoreMappingType = {
    storeId: number;
    name: string;
    roles: string[];  // Array, not single value
}
```

**Verdict:** Existing design allows multiple roles (array). This is intentional flexibility. We shouldn't enforce single role without business requirement.

**Action:** Reject - don't change existing architecture

---

## 🎯 DOC UPDATE PLAN

| # | Change | Target | Section |
|---|--------|--------|---------|
| ✅ #1 | Fix store path from `tenants/{tId}/stores/{sId}` to `stores/{sId}` | impl.md | §1.1 |
| ✅ #2 | Clarify role resolution is per active store, API is primary check | impl.md | §2.1, §3 |
| ✅ #3 | Clarify enforcement hierarchy: API > Firestore Rules | impl.md | §3 |
| ❌ #4 | No change (already correct) | - | - |
| ❌ #5 | Rejected (don't enforce single role) | - | - |

---

## ChatGPT Questions (Answered)

**Q1: Where is your canonical store document today?**
**A:** `stores/{sId}` — NOT `tenants/{tId}/stores/{sId}`

**Q2: Do you currently allow direct Firestore writes from client to projects?**
**A:** Yes, client writes directly via DAL functions. API routes handle some operations. Firestore rules provide secondary protection.
