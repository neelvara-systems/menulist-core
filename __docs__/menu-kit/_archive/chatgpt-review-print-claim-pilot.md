# Menu Kit — Print Claim Pilot ChatGPT Review

**Date:** June 3, 2026
**Source:** User-provided ChatGPT print kit proposal covering postcards, table tents, signed claim links, UTM tracking, staff PINs, print specs, and pilot metrics.
**Reviewer:** Codex
**Status:** Validated for partial adoption

---

## Executive Verdict

The proposal is useful, but it is not a drop-in implementation plan.

MenuList already has the strongest part of the idea in production: Menu Kit creates stable physical QR surfaces that point to the current public menu, with per-surface UTM attribution and zero Firebase cost. The pasted table-tent and QR-size guidance should reinforce that system, not replace it.

The genuinely new part is a separate acquisition surface: a printed owner-claim postcard or staff-side claim QR that sends an unclaimed business to a signed claim flow. That is valid as a future feature, but it requires docs-first security design before code because it introduces signed public links, redirect logging, short-link routing, staff PINs, and claim binding.

---

## Existing Repo Reality

| Proposal Area | Current MenuList Reality | Verdict | Action |
| --- | --- | --- | --- |
| Customer table tent QR to public menu | Menu Kit already generates a dual-sided A5 table tent that folds to A6 and points to the menu URL. | Agree, already implemented | Keep current Menu Kit as canonical. |
| Postcard claim QR | No `go.menulist.ai/claim?m=...` or signed print-claim resolver exists. | Valid new feature | Treat as a Public Menu Entry / acquisition extension, not Menu Kit runtime. |
| Staff-side owner tools QR + PIN | No staff PIN claim model exists for public printed surfaces. | Partially valid | Requires separate threat model and rate limits. Do not add casually. |
| HMAC `m|audit|exp` | Security direction is sound, but the repo currently uses draft tokens, `withAuth`, public rate limits, SAFE_MODE, and SSRF-safe acquisition in `/create-menu`. | Partially valid | Any new resolver must reuse existing security/logging patterns. |
| Scan logging with IP and user agent | Public Menu Entry hashes IP for abuse control; Menu Kit scan attribution uses public menu analytics. Raw IP storage is not the current privacy posture. | Revise | Prefer hashed IP or bounded security logs, not raw PII event storage. |
| UTM per print surface | Supported for Menu Kit via `utm_source=menu_kit&utm_medium={surface}` and for print-pilot variants via `utm_content`. | Agree, implemented | Keep source/medium/content split. |
| Offer vs no-offer print variants | Useful for acquisition tests, but A/B testing of Menu Kit customer surfaces is intentionally rejected. | Partial | Allow only for unclaimed acquisition collateral, not canonical customer QR assets. |
| QR print guardrails | Mostly align with existing Menu Kit: large QR, error correction H, short link fallback, matte finish, print safety margins. | Agree | Preserve in help/print instructions. |
| "Keep your public menu accurate everywhere" | Overclaims external-platform sync if read literally. | Revise | Use "Keep one official menu link current" or "Keep your official customer menu current." |
| "Scan to update menu — staff pin" | Adds staff authority and operational risk. | Needs design | Require docs, limits, rotation, audit, and owner review before implementation. |

---

## Adopt Now

Use these parts immediately in operational planning and copy drafts:

- A simple claim postcard for owner acquisition can be designed as a review-ready pilot artifact, but it should point to the existing `/create-menu` funnel until a signed resolver exists.
- Keep QR sizes, quiet-zone, matte finish, short-link fallback, and print-safety guidance.
- Keep `utm_medium=postcard` and `utm_medium=tabletent` as the preferred source split for future claim assets.
- Use `utm_content=offer` or `utm_content=no_offer` variants only on acquisition collateral, not on stable in-restaurant customer QR surfaces.
- Track success as claim-start, claim-completion, menu publish within 48h, starter distribution actions, and support assists.

Approved acquisition copy after correction:

- Headline: "Claim your official MenuList menu."
- Subhead, offer variant: "Free first menu setup from your current menu."
- Subhead, no-offer variant: "Keep one official customer menu current."
- CTA: "Claim menu"
- Privacy note: "Scanning records a visit for security and claim protection. No marketing without consent."

Rejected or postponed copy:

- "Keep your public menu accurate everywhere." Reason: implies unsupported external-platform sync.
- "Fix prices, and publish the correct version everywhere." Reason: overstates multi-channel publishing.
- "Staff pin: XXXX." Reason: no current staff PIN claim model.

---

## Do Not Implement Without New Feature Docs

The following require a new feature doc set or a Public Menu Entry extension spec before code:

1. `go.menulist.ai` short-link resolver.
2. Signed `claim?m={merchant_id}&audit={audit_id}&sig={hmac}` links.
3. Server-side scan logging for print claim links.
4. Claim prebinding by merchant/audit.
5. Staff PIN issue, rotation, and validation.
6. Any public route that redirects to a prefilled authenticated claim flow.

Minimum acceptance gates for that future work:

- Feature flag for the whole resolver.
- Zod validation on all query parameters.
- HMAC expiry and replay protection.
- Public rate limiting before any read or redirect side effect.
- No raw sensitive payloads in logs.
- Hashed IP or privacy-bounded security logging.
- Generic errors and safe redirects only.
- Firestore cost section covering scan writes, claim reads, and cleanup.
- Public cache impact review if the claim creates or modifies a public store/project.

---

## Decision

Menu Kit remains the canonical customer-facing physical surface system.

The pasted proposal is best used as:

1. A print-pilot checklist for existing Menu Kit assets.
2. A corrected owner-acquisition postcard concept.
3. A future Public Menu Entry extension input for signed physical claim links.

It should not be used to replace current Menu Kit table tents, add staff PINs directly, or promise external-platform sync that the runtime does not verify.

---

**Document Signature:** ChatGPT Conversation Review
