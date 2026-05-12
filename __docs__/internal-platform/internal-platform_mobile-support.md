# Internal Platform — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ NOT APPLICABLE — Internal admin tooling, no mobile UI needed

---

Internal platform tools are restricted to platform administrators (`ECOMSAI_PLATFORM_USER_ROLE`). These are desktop-only admin interfaces.

Entity Blocks follows the same decision: tenant, store, and user blocking is an internal platform-admin operation with audit implications, so the control stays in desktop Platform Settings and is not exposed in mobile owner screens. The block result is enforced by shared auth/public lookup code, not by a mobile owner control.
