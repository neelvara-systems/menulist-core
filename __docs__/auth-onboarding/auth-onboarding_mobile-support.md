# Auth & Onboarding — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ⚠️ DESKTOP-FIRST — Onboarding is one-time setup, works via mobile browser but not optimized

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | One-time flow (signup → payment → dashboard) |
| **Speed** | ❌ FAIL | Multi-step: pricing → business details → OAuth → payment |
| **Touch** | ⚠️ PARTIAL | Works in mobile browser but not touch-optimized |
| **Value** | ❌ FAIL | Setup done once, typically at desk |

**Decision:** Desktop-first. The flow works in mobile browser (responsive pages), but no MobileShell-specific onboarding UI. Acceptable because it's a one-time flow.

---

## How It Works on Mobile

1. User visits `/pricing` on mobile browser → responsive pricing page
2. Clicks "Get Started" → Onboarding modal (works in mobile browser)
3. Google OAuth → works in mobile browser/PWA
4. Razorpay payment → works in mobile browser
5. Dashboard loads → MobileShell renders (if `ENABLE_MOBILE_UI`)

The entire flow runs on standard responsive web pages, not inside MobileShell.
