# Feedback System — Mobile Support Assessment

> **Version:** 1.7.0
> **Last Updated:** 2026-07-11
> **Audience:** Mobile team, Product

---

## 1. Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|:-----:|
| **Frequency** | Used daily/multiple times per day? | No — feedback submitted occasionally (monthly at best) | ❌ |
| **Speed** | Completes in <5 seconds? | Partial — one selected category can be submitted directly, but thoughtful text feedback takes longer | ⚠️ Partial |
| **Touch** | Works with thumb-only? | Partially — star rating, checkboxes, and buttons are touch-friendly; long text entry remains deliberate | ⚠️ Partial |
| **Value** | Needed away from desk? | No — feedback is a deliberate task, not urgent | ❌ |

**Result: 0 FULL PASS + 2 PARTIAL + 2 FAIL -> dedicated mobile UI is NOT required**

Feedback collection is an infrequent, deliberate task that benefits from desktop screen space. The shared responsive form is acceptable because users can now submit the selected category directly without completing unrelated categories.

The shared form and DAL use the same 1,000-character text cap and canonical issue/request lists. Feature-usage submission requires at least one selected area or a comment on every viewport; this is validation parity, not a separate mobile business rule.

Content feedback (likes/dislikes) on articles and changelog is already simple enough to work on mobile without dedicated components (single tap on icon).

Reaction buttons and the dislike modal share an in-flight lock/loading state, so repeated taps cannot create duplicate counter/audit mutations before the first acknowledgement returns.

Mobile browser acknowledgement is partitioned by Answerlattice tenant, store and user and resets on a workspace/content switch; another workspace cannot inherit the previous like/dislike state.

---

## 2. Content Feedback on Mobile

Article and changelog likes/dislikes are **single-tap actions** that work on any screen size. No dedicated mobile component needed — the existing icons are touch-friendly (>44px tap targets).

## 3. Platform Feedback Admin on Mobile

**Updated 2026-05-19:** Feedback Admin is available to `PLATFORM` users from MenuList Mobile More -> Answerlattice -> Feedback Admin.

This route mounts the existing platform Feedback Admin template through `MobilePlatformInternalScreen`. It is a real operator screen with feedback stats, feedback list, and detail modal. The mobile wrapper must keep cards, descriptions, and modals within the viewport; it must not create a duplicate MenuList-only feedback admin screen.

## 4. Answerlattice Owner Feedback Review On Mobile

`/answerlattice/feedback` uses the same responsive dashboard shell as other Answerlattice management routes. It is acceptable on mobile for urgent review, but it remains a low-frequency owner task. Product Surface filtering and assignment use the same Ant Design select controls as the desktop route and remain optional. The route must keep buttons at 44px touch targets through the existing Answerlattice dashboard mobile CSS and must not introduce a separate mobile-only feedback module.
