# Multi-Chain Permissions — Documentation Hub

> **Feature:** #4B — Multi-Chain Permissions (Extension of Multi-Outlet)  
> **Status:** 📋 SPEC LOCK — Ready for Implementation  
> **Last Updated:** January 26, 2026  
> **Version:** 1.0

---

## Quick Navigation

| Audience       | Document                                                             | Purpose                      |
| -------------- | -------------------------------------------------------------------- | ---------------------------- |
| **CEO / PM**   | [\_spec.md](./multi-chain-permissions_spec.md)                       | Business requirements        |
| **Developers** | [\_impl.md](./multi-chain-permissions_impl.md)                       | Technical blueprint          |
| **Sales**      | [\_marketing.md](./multi-chain-permissions_marketing.md)             | Pitch deck, messaging        |

---

## What Is This Feature?

**One-liner:** Two-level permission system controlling what stores can do and what staff can do within those stores.

**Problem Solved:** When a restaurant chain (2-10 stores) uses MenuList, HQ needs to control:
1. What features each outlet store can access (AI tools, theme changes, etc.)
2. What each staff member can do within their store (edit master vs. only override)

Without this, outlets could drift from brand standards or staff could make unauthorized changes.

**Solution:** 
- **Store-level permissions:** HQ controls what each outlet can do (7 flags)
- **Staff-level roles:** Predefined roles control what users can do (2 roles)
- Both levels must pass for action to be allowed (intersection model)

---

## Architecture Overview (60-Second Summary)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ACCESS CHECK FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   User tries action (e.g., "Generate AI Image")                     │
│                              │                                       │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────┐                   │
│   │  1. STAFF ROLE CHECK                         │                   │
│   │     Does user's role allow this action?      │                   │
│   │     HQ_ADMIN → YES (full access)             │                   │
│   │     STORE_MANAGER → Check store permissions  │                   │
│   └─────────────────────────────────────────────┘                   │
│                              │                                       │
│                              ▼                                       │
│   ┌─────────────────────────────────────────────┐                   │
│   │  2. STORE PERMISSION CHECK                   │                   │
│   │     Does this store have this feature?       │                   │
│   │     canGenerateImages: true/false            │                   │
│   └─────────────────────────────────────────────┘                   │
│                              │                                       │
│                              ▼                                       │
│              ALLOWED ✅  or  BLOCKED ❌                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Permission Categories (The 3 Buckets)

Permissions exist to gate three types of features:

| Category | Why Gate It | Examples |
|----------|-------------|----------|
| **💰 Expensive** | AI costs money, could drain budget | AI Extraction, AI Images, AI Descriptions |
| **🎨 Brand-Risky** | Could break brand consistency | Theme, Layout, Logo, Brand Identity |
| **🏗️ Structural** | Changes menu architecture | Local Categories (structural additions) |

**NOT Gated (Always Allowed):**
- Price overrides (core outlet value)
- Availability overrides (operational need)
- Item ordering (local optimization)
- Local items (adding, not structure)
- Best seller marking (store knowledge)

---

## Key Files in Codebase

| Purpose | File Path |
|---------|-----------|
| Store Permissions Type | `src/types/multiOutlet.types.ts:136-157` |
| User Role Mapping | `src/types/platform/user.ts:3-7` |
| Auth Claims | `src/app/api/auth/set-claims/route.ts` |
| Permission Resolution | `src/utils/store/permissions.ts` |
| Store Doc (where perms live) | `tenants/{tId}/stores/{sId}` |

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_MULTI_OUTLET: true  // Permissions are part of multi-outlet feature
```

---

## Final Decisions (Doctrine-Aligned)

| Decision | ChatGPT Proposal | Final Decision | Reason |
|----------|------------------|----------------|--------|
| Permission count | 13 flags | **7 flags** | FR-5 allows overrides; only gate expensive/risky |
| Role count | 3 roles | **2 roles** | Law 6: No Cognitive Load |
| `canPublishChanges` | Include it | **Skip** | Spec says "no approval workflows" |
| Per-staff overrides | Yes | **Skip P0** | Over-engineering for 2-10 stores |
| Storage location | Per-store doc | **Yes** | Avoids hot-doc contention |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 26, 2026 | Initial release — spec, impl, marketing docs |

---

**Related Documentation:**
- [Multi-Outlet Consistency Spec](../multi-outlet-consistency/multi-outlet-consistency_spec.md)
- [Multi-Outlet Consistency Impl](../multi-outlet-consistency/multi-outlet-consistency_impl.md)
- [Core Doctrine](../constitution/01-core-doctrine.md)
