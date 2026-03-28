# Onboarding — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ⚠️ DESKTOP-FIRST — One-time flow, works in mobile browser but not MobileShell-optimized

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | One-time flow per user |
| **Speed** | ❌ FAIL | Multi-step: pricing → details → OAuth → payment |
| **Touch** | ⚠️ PARTIAL | Works in mobile browser |
| **Value** | ❌ FAIL | Account setup done once |

**Decision:** Desktop-first. The onboarding pages are responsive web pages that work in mobile browsers. After onboarding completes, the dashboard loads with MobileShell on mobile devices.
