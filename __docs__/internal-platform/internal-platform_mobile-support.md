# Internal Platform — Mobile Support

**Last Updated:** July 1, 2026
**Decision:** Platform-admin mobile access only for active management screens

---

Internal platform tools are restricted to platform administrators (`MENULIST_PLATFORM_USER_ROLE`). They are not owner-facing mobile features.

Mobile More exposes the active platform management screens that are practical as responsive admin forms: Entity Blocks, Tenants, Stores, and Users. These screens reuse the existing desktop admin components and DAL inside the shared mobile internal wrapper; they do not create separate mobile-only data logic.

Deprecated or low-frequency platform settings such as Assets and Fonts stay desktop-only. Tenant, store, and user blocks remain audit-sensitive internal controls. Block results are enforced by shared auth/public lookup code, not by mobile-only logic. Tenant blocks transactionally commit the canonical tenant state, inherited `tenantBlocked` markers on up to 200 exact-scope store docs, and `platformSummary/storesSummary`; ambiguous persisted identity fails closed. Desktop and mobile Entity Blocks share `updatePlatformEntityBlockState()`, which calls `/api/platform/entity-blocks` with no-store cache, same-origin credentials, and manual redirect handling, then caps responses at 64KB and requires `success: true`, matching entity ID, and matching blocked state before the local platform list updates.
