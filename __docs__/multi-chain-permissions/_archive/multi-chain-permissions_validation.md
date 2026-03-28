# 📚 DOC ↔ CODE ALIGNMENT (POST-FEEDBACK)

**Feature:** Multi-Chain Permissions  
**Date:** January 26, 2026  
**Validation Type:** ChatGPT Feedback Review

---

## Doc Section Verification

| Doc Section | Status | Code Verification |
|-------------|--------|-------------------|
| impl.md §1.1 Store Path | ✅ FIXED | Now matches `src/constants/database.ts:6` → `STORES: "stores"` |
| impl.md §3.2 API Enforcement | ✅ CLARIFIED | Added per-request role resolution note |
| impl.md §3.3 Firestore Rules | ✅ CLARIFIED | Marked as SECONDARY, API is PRIMARY |
| impl.md §5.1 Migration | ✅ FIXED | Path corrected to `stores/{sId}` |
| spec.md Permissions | ✅ NO CHANGE | Already correct (7 flags, local categories gated) |
| marketing.md | ✅ NO CHANGE | Reality-based, no corrections needed |

---

## Feedback Applied

| # | Feedback Point | Action Taken |
|---|----------------|--------------|
| ✓ #1 | Store path wrong | Fixed: `tenants/{tId}/stores/{sId}` → `stores/{sId}` |
| ✓ #2 | Claims trap | Clarified: API resolves role per-request from DB |
| ✓ #3 | Rules incomplete | Added enforcement hierarchy, API is primary |
| ✗ #4 | Local categories | No change needed (already gated) |
| ✗ #5 | Single role enforcement | Rejected (existing design allows array) |

---

## Code References Used

| Claim | File:Line | Verified |
|-------|-----------|----------|
| Store path is `stores/{sId}` | `src/constants/database.ts:6` | ✅ |
| Store DAL uses `DB_COLLECTIONS.STORES` | `src/database/stores/index.tsx:13` | ✅ |
| Role resolved per storeId | `src/app/api/auth/set-claims/route.ts:64-66` | ✅ |
| User roles stored as array | `src/types/platform/user.ts:6` | ✅ |

---

## 🚦 STATUS

✅ **DOCS COMPLETE & ALIGNED**

- impl.md: 3 corrections applied (path, role resolution, enforcement hierarchy)
- spec.md: No changes needed
- marketing.md: No changes needed
- Audit trail created in `_archive/multi-chain-permissions_doc_feedback_audit.md`

---

## Git Diff Summary (Docs Only)

```
Modified:
  __docs__/multi-chain-permissions/multi-chain-permissions_impl.md
    - §1.1: Fixed store path
    - §3: Added enforcement hierarchy
    - §3.2: Added role resolution clarification
    - §3.3: Marked as secondary defense
    - §5.1: Fixed migration path

Created:
  __docs__/multi-chain-permissions/_archive/multi-chain-permissions_doc_feedback_audit.md
  __docs__/multi-chain-permissions/_archive/multi-chain-permissions_validation.md

No code files modified ✅
```
