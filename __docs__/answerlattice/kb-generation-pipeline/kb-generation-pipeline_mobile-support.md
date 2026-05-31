# KB Generation Pipeline — Mobile Support Assessment

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Mobile team, Product

---

## 1. Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|:-----:|
| **Frequency** | Used daily/multiple times per day? | No — infrequent, maybe 1-2 times/month | ❌ |
| **Speed** | Completes in <5 seconds? | No — file upload + AI processing takes minutes | ❌ |
| **Touch** | Works with thumb-only? | No — file management, content review, TipTap editing | ❌ |
| **Value** | Needed away from desk? | No — content generation is a desktop workflow | ❌ |

**Result: ALL 4 GATES FAIL → Dedicated mobile-first UI is not justified**

This is a platform-admin-only feature with complex file management, content review, and editing workflows. Desktop remains the primary environment.

**Updated 2026-05-19:** the real KB Generation product screen is still exposed to `PLATFORM` users from MenuList Mobile More -> Answerlattice -> KB Generation. It mounts the existing platform template through `MobilePlatformInternalScreen`, not a separate overview page.

---

## 2. Justification

- File uploads from multiple sources (PDF, document, video) are desktop workflows
- AI-generated content review requires side-by-side comparison (reconciliation)
- Article editing uses TipTap rich text editor — not mobile-friendly
- Processing takes minutes — not a quick mobile task
- Used infrequently (1-2 times/month) — not worth mobile investment
- Platform admin only — not a customer-facing feature

## 3. Mobile Operator Contract

- Mobile must allow checking active job status, opening history, and reaching review/reconciliation flows.
- Upload and rich review remain desktop-preferred, but the route must be readable and must not overflow horizontally.
- Expensive generation actions must remain explicit button actions and modal-driven; no Firebase work should start from simply opening the mobile route.
