# GBP Sync — Mobile Support

**Last Updated:** April 5, 2026
**Decision:** ⚠️ LIMITED MOBILE SUPPORT — Status visibility supported, full setup remains desktop-first

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ⚠️ MIXED | Owners do not use it daily, but may check status on phone |
| **Speed** | ✅ PASS | Read-only status checks are quick on mobile |
| **Touch** | ⚠️ MIXED | OAuth/linking remains poor on mobile |
| **Value** | ✅ PASS | Verifying connection and drift status away from desk is useful |

**Decision:** Mobile shows operational status only:
- connection status
- linked location
- menu link state
- hours sync state

OAuth, mapping, and full setup remain desktop-first.
