# GBP Sync — Mobile Support

**Last Updated:** July 2, 2026
**Decision:** No active GBP mobile surface while `ENABLE_GBP_SYNC` is false

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ⚠️ MIXED | Owners do not use it daily, but may check status on phone |
| **Speed** | ✅ PASS | Read-only status checks are quick on mobile |
| **Touch** | ⚠️ MIXED | OAuth/linking remains poor on mobile |
| **Value** | ✅ PASS | Verifying connection and drift status away from desk is useful |

**Current source boundary:** Mobile shows no Google sync surface while `ENABLE_GBP_SYNC` is false. OAuth, mapping, sync status, and apply-hours actions are not current runtime.

Reserved mobile support after provider gates may show operational status only:
- connection status
- linked location
- menu link state
- hours sync state

OAuth, mapping, and full setup remain desktop-first.
