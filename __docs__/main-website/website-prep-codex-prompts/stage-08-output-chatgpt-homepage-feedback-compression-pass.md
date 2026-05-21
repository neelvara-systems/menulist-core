# Stage 8 Output — ChatGPT Homepage Feedback Compression Pass

**Date:** May 21, 2026  
**Status:** Implemented  
**Scope:** Homepage flow, website copy, metadata, header proof path, public brand display, docs sync  

## Source Input

The user shared an external ChatGPT audit of the live MenuList homepage. The feedback was treated as review input, not as source-of-truth. The current codebase, website docs, and implemented product capability remained the authority.

## Accepted Feedback

- The homepage was too dense for a first-time SMB owner and tried to explain too much at once.
- The public drift/problem section should appear earlier.
- `RevenuePathSection` and `InteractiveWorkflowSection` overlapped in meaning.
- The header needed a clearer demo/customer-preview path.
- Hero setup copy needed to align with the 7-day setup/pricing language.
- Public branding should render as `MenuList` instead of `MenuList AI`.
- `Customer app` can sound like a native app-store claim on the homepage; homepage-facing copy should use saved-menu-shortcut language.
- The security FAQ should avoid absolute password-breach wording.
- Metadata should avoid stale "instantly" / "business online" style promises.

## Rejected Or Deferred Feedback

- Removing advanced product proof from the codebase was rejected. Analytics, SEO/AEO, POS Sync, staff access, industry breadth, and business-fit sections remain useful supporting/future page material.
- Creating a new fake demo route was deferred. The current secondary proof path now anchors to the existing customer menu preview section.
- Pricing/payment/subscription/Razorpay/auth/onboarding runtime changes were explicitly out of scope.

## Homepage Flow After Pass

1. `HeroSection`
2. `ProblemSection`
3. `SolutionSection`
4. `InteractiveWorkflowSection`
5. `SetupReliefSection`
6. `SurfacesSection`
7. `CustomerBrowseSection`
8. `PreparedForYouSection`
9. `FaqSection`
10. `FinalCtaSection`
11. `StickyCta`

## Implementation Summary

- Removed the repeated/advanced sections from the mounted homepage composition.
- Added a header `Demo` link to `/#customer-demo`.
- Added `id="customer-demo"` to `CustomerBrowseSection`.
- Moved the hero secondary CTA to `#customer-demo`.
- Added explicit CTA `aria-label` support to `WebsiteButton`.
- Aligned hero microcopy to the 7-day setup funnel.
- Changed public wordmark display from `MenuList AI` to `MenuList`.
- Rephrased homepage-facing `Customer app` copy to `saved menu shortcut`.
- Tightened FAQ security language to say MenuList does not store a password for Google sign-in accounts, rather than saying there are no passwords to breach.
- Updated default homepage metadata description and schema description.
- Updated supported website locale hero proof keys for consistency.

## Protected Areas Not Changed

- Pricing/payment/subscription components and hooks
- Razorpay APIs
- Auth wrappers and account runtime
- `/create-menu` extraction, preview, claim, and publish internals
- POS Sync runtime
- SEO/AEO runtime
- Analytics runtime
- Owner dashboard/mobile owner runtime

