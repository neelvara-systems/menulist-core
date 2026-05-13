# Internal Platform — Mobile Support

**Last Updated:** May 13, 2026
**Decision:** Platform-admin mobile access only

---

Internal platform tools are restricted to platform administrators (`ECOMSAI_PLATFORM_USER_ROLE`). They are not owner-facing mobile features.

Entity Blocks is available to PLATFORM users from the mobile More tab Platform hub and from the desktop Platform settings flow. The mobile surface reuses the shared Entity Blocks control and DAL; it does not create a separate blocking model.

Tenant, store, and user blocks remain audit-sensitive internal controls. Block results are enforced by shared auth/public lookup code, not by mobile-only logic. Tenant blocks also write the inherited `tenantBlocked` marker into `platformSummary/storesSummary` so summary-backed public filters can reflect the block immediately.
