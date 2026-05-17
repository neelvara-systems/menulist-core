# Stage 7.5 Output — Supporting Page Revenue Polish

**Date:** May 17, 2026  
**Scope:** All main website supporting pages, pricing visual copy, shared website hero/proof system  
**Runtime protected:** pricing, payment, subscription, Razorpay, auth, onboarding, and `/create-menu` runtime logic

---

## What Changed

- Added `WebsitePageHero.tsx` and `WebsiteProofStrip.tsx` so supporting pages use the same official-source hierarchy and proof rhythm.
- Strengthened `/about` with mission, principles, proof strip, and final CTA.
- Strengthened `/contact` with menu-source framing and a proof strip while preserving the existing enquiry form logic.
- Strengthened `/get-started` with a clearer setup path, owner-review proof, and Google sign-in card while preserving auth redirect behavior.
- Rebuilt `/trust-security` copy around owner-readable trust language and moved raw implementation details into safer factual statements.
- Hardened `/pricing` marketing copy with `WebsiteHeadline`, locale-backed copy, no viewport-scaled heading, no negative letter spacing, and safer setup/propagation claims.
- Updated `/how-it-works` and `/multi-location` wording to avoid unsupported "instant" propagation language where the more accurate claim is owner-approved source alignment.
- Updated docs in `README.md`, `main-website_content.md`, `main-website_impl.md`, and `main-website_design-system.md`.

---

## Product Decision

The current website remains the canonical default. This pass did not introduce an alternate website version, source-code backup, or restoration path.

The implementation keeps MenuList positioned as:

- the official source for what customers see,
- public menu and business information truth infrastructure,
- simple for owners at the surface,
- stronger underneath through source control, publishing, analytics, trust, and location governance.

---

## Protected Logic Decision

Pricing and onboarding contain live payment/subscription behavior. This pass only changed safe presentation copy and heading treatment in pricing UI. It did not change:

- plan data,
- purchase intent flow,
- Razorpay execution,
- onboarding modal submit behavior,
- session/auth handling,
- subscription management,
- credit-pack logic.

---

## Remaining Launch Notes

- Real product screenshots should still replace synthetic draft assets after a founder-approved demo tenant exists.
- Legal pages remain mostly unchanged except for one wording hardening in the refund policy.
- Pricing FAQ is still mostly hardcoded in the pricing component and can be locale-backed in a later focused pass if needed.
