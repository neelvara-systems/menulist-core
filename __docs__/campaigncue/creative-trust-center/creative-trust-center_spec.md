# Creative Trust Center - Spec

## Summary

Creative Trust Center is the review layer that checks campaign outputs before export, scheduling, publishing, or agency handoff.

## Goals

- Prevent unsupported campaign claims from reaching customers.
- Keep source evidence visible.
- Distinguish safe, warning, blocked, and owner-acknowledged states.
- Apply channel-specific rules for WhatsApp, Google, ads, static creative, videos, and UGC briefs.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Source check | Price, date, location, item/service, availability, and CTA are compared against source facts. |
| Claim check | Performance, health/beauty, testimonial, urgency, scarcity, and review-like claims are flagged. |
| Channel check | Platform-specific restrictions are reported per output. |
| Approval gate | Blocked outputs cannot be exported, scheduled, or handed off until fixed or allowed by policy. |
| Evidence view | Owner can see which source facts support a claim. |
| Brand Playbook check | Saved avoid-list terms, brand feel, and visual motifs are shown as review context before export or handoff. |
| Proof deck check | Campaign Proof Deck remains a review brief with source trace; it cannot be represented as final rendered creative, website, or video output. |
| UGC experience check | UGC/video outputs with first-person usage, recommendation, or result wording require source proof, consent, and disclosure before handoff. |
| Version-specific | A trust result applies to a specific output version only. |

## Research-Backed Rule Families

| Rule family | Trust behavior |
| --- | --- |
| Fake review/testimonial | Block fabricated reviews, fake customer stories, fake celebrity/creator endorsements, and first-person claims without source evidence. |
| Endorsement/disclosure | Require disclosure notes for paid creator, employee, agency, or incentivized endorsements where relevant. |
| Salon/beauty claim | Flag before/after, transformation, health, skin, hair, body, or guaranteed-result claims unless supported and consented. |
| Restaurant accuracy | Check price, item name, availability, photo match, allergen-sensitive wording, offer date, and public menu link. |
| WhatsApp consent | Block direct send/export workflows that lack consent posture, opt-out posture, or audience exclusion rules. |
| Google/local | Block ranking, SEO, or visibility guarantees; treat Google product-post automation as manual unless API support is proven. |
| Ads policy | Flag misleading claims, personal-attribute assertions, restricted categories, deceptive urgency, unsupported offers, and unsafe destinations. |
| Synthetic media/likeness | Flag synthetic voice, staff likeness, customer likeness, and creator likeness unless permission and disclosure are recorded. |
| Rights and assets | Block unknown-rights assets from paid ads and public posts until source/permission is recorded. |
| Attribution | Prevent reports and copy from claiming bookings, orders, revenue, leads, or ROI unless the metric source supports it. |
| Brand avoid list | Warn when public-facing copy uses saved avoid-list wording; missing playbook details are review posture, not a blocker by themselves. |

## Hard Blockers

- Fake customer testimonial or review.
- Undisclosed paid/creator/employee endorsement where disclosure is required.
- Before/after salon asset without consent metadata.
- Direct WhatsApp marketing send without opt-in posture.
- Ad spend action without permission, approval, and budget/spend confirmation.
- Cross-client agency data access.
- Cross-location output using wrong address, phone, Google profile, WhatsApp number, price, or service availability.

## Non-Goals

- It is not legal advice.
- It does not guarantee platform approval.
- It does not certify third-party media rights.

## Risks

- Overblocking makes owners ignore trust checks.
- Underblocking creates policy and reputation risk.
- Trust reports can become expensive if recomputed unnecessarily.
