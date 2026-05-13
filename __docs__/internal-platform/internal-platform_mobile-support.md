# Internal Platform — Mobile Support

**Last Updated:** May 13, 2026
**Decision:** Platform-admin mobile access only for active management screens

---

Internal platform tools are restricted to platform administrators (`ECOMSAI_PLATFORM_USER_ROLE`). They are not owner-facing mobile features.

Mobile More exposes the active platform management screens that are practical as responsive admin forms: Entity Blocks, Tenants, Stores, and Users. These screens reuse the existing desktop admin components and DAL inside the shared mobile internal wrapper; they do not create separate mobile-only data logic.

Deprecated or low-frequency platform settings such as Assets and Fonts stay desktop-only. Tenant, store, and user blocks remain audit-sensitive internal controls. Block results are enforced by shared auth/public lookup code, not by mobile-only logic. Tenant blocks also write the inherited `tenantBlocked` marker into `platformSummary/storesSummary` so summary-backed public filters can reflect the block immediately.
