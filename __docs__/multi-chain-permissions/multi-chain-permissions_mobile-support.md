# Multi-Chain Permissions — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ DESKTOP-ONLY for management — Chain-level restrictions inherited on mobile

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | Chain permission setup is rare (new outlet onboarding) |
| **Speed** | ❌ FAIL | Complex policy configuration |
| **Touch** | ❌ FAIL | Policy matrix needs large screen |
| **Value** | ❌ FAIL | Chain management done at HQ desk |

**Decision:** Desktop-only for management. OutletPolicy enforcement applies to mobile automatically via shared DAL permission checks.
