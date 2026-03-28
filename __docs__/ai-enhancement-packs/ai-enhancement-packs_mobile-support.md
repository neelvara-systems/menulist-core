# AI Enhancement Packs — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ❌ DESKTOP-ONLY — AI pack purchase and usage is infrequent setup/billing

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ❌ FAIL | Pack purchased rarely (when AI capacity exhausted) |
| **Speed** | ❌ FAIL | Purchase flow is multi-step (review → payment) |
| **Touch** | ⚠️ PARTIAL | Razorpay modal works on mobile |
| **Value** | ❌ FAIL | AI operations (image gen, description rewrite) are desktop editor features |

**Decision:** Desktop-only. AI Enhancement Packs are purchased through the billing system, which redirects to desktop on mobile. AI operations themselves (image generation, description generation) are desktop-only editor features that fail the 4-gate test.

---

## How Mobile Relates

The AI operations that consume pack credits (menu extraction, description generation) are triggered from:
- `MenuUploadSheet` (mobile) — menu photo extraction uses included AI capacity
- Desktop editor — image generation, description rewrite, bulk operations

Pack purchase is handled via the billing system, accessible through `MobileBillingScreen` → desktop redirect.
