# Public Truth Check - Documentation Hub

> **Feature:** Public Truth Check
> **Status:** Implemented - public self-report route and exact logged-in owner fix loop
> **Last Updated:** July 1, 2026
> **Version:** 0.7

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./public-truth-check_spec.md) | Business requirements and scope |
| Developers | [Implementation](./public-truth-check_impl.md) | Technical blueprint and contracts |
| Sales | [Marketing](./public-truth-check_marketing.md) | Internal positioning and GTM |
| Website | [Website](./public-truth-check_website.md) | Public page copy |
| Help | [Help Doc](./public-truth-check_helpdoc.md) | Owner-facing help article |
| Firebase | [Firebase](./public-truth-check_firebase.md) | Cost tracking |
| Mobile | [Mobile Support](./public-truth-check_mobile-support.md) | Mobile admission |
| QA | [Test Cases](./public-truth-check_test-cases.md) | Test scenarios |
| Validation | [Validation](./public-truth-check_validation.md) | Implementation parity record |

---

## What Is This Feature?

**One-liner:** Public Truth Check shows whether an SMB's menu or service source, hours, location, contact, and customer links are clear enough to use as a public source.

**Problem Solved:** Owners often have correct business information somewhere, but the public version is scattered across PDFs, Google, WhatsApp, Instagram, old QR links, websites, or screenshots.

**Solution:** A simple report marks what is present, missing, unclear, or not checked, then routes the owner to create one current MenuList customer link.

---

## Product Role

Public Truth Check is the first member of the [Public Truth Tools](../public-truth-tools/README.md) family.

It is both:

- a public acquisition tool for prospects
- an owner-side readiness check when the business already uses MenuList

It is not:

- a ranking tool
- a citation tracker
- an external posting service
- a full discovery audit
- a replacement for MenuList setup

---

## Version Ladder

Public Truth Check should grow through three lanes, not by becoming a separate product.

| Version | Product shape | Primary user | Input | Output | Runtime boundary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| V0 | Public free tool / lead magnet | Prospect, owner, agency | Business URL, menu link, Google profile link, pasted text, and owner-marked visible facts | Basic public truth gap report, copy/download checklist, MenuList setup handoff, optional consented follow-up | Browser-local self-report; URLs are references only and are not fetched; no AI/provider call; optional follow-up reuses `/api/public/contact` | Implemented |
| V1 | Logged-in MenuList owner check | Existing MenuList owner | Existing MenuList store/project truth | Better gaps inside Business Health, Public Discovery, and OBP readiness | Reuses owner store context, project summary DAL, selected/default project DAL, public truth index gate, and Business Health desktop/mobile surfaces; no report API route, no writes, no external scan | Implemented |
| V2 | Paid add-on behavior | Multi-location owner, partner, agency | Owner-approved store set, schedule, and report scope | Saved history, recurring checks, monthly report, multi-location scan, and partner/agency reports | Paid entitlement, capped report history, source policy, rate limits, audit logs, and explicit cost approval | Planned |

The tool list can grow over time, but every new check should be assigned to V0, V1, or V2 before implementation.

---

## Architecture Overview

```txt
Public input or owner store context
  -> normalize source facts
  -> check required public facts
  -> produce short report
  -> route missing facts to MenuList setup/fix flow
```

Current implemented route:

| Layer | Path |
| --- | --- |
| Public route | `src/app/(website)/tools/public-truth-check/page.tsx` |
| Website component | `src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx` |
| Report builder | `src/lib/public-truth-tools/publicTruthCheckReport.ts` |
| Owner report builder | `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` |
| Owner hook | `src/hooks/publicTruthTools/useOwnerPublicTruthReadiness.ts` |
| Desktop owner card | `src/components/templates/main-app/ownerBusinessAssistant/PublicTruthOwnerCheckCard.tsx` |
| Mobile owner card | `src/components/mobile/components/MobilePublicTruthOwnerCheckCard.tsx` |
| Types | `src/lib/public-truth-tools/publicTruthCheckTypes.ts` |
| Verifier | `scripts/verification/verify-public-truth-check.js` |

Implemented public route behavior is browser-local `self_report`. It does not fetch external URLs, inspect Google profiles, store uploaded files, or call AI/search providers. Each report row includes explicit evidence text that states what was checked. The optional follow-up form submits to the existing bounded MenuList public contact route only after explicit consent.

Implemented owner behavior is `menulist_owner`. It appears inside Business Health on desktop and mobile, reads MenuList store/project truth through existing owner context and client DAL, reuses `evaluatePublicTruthIndexability`, and writes no report state.

The July 1 V1 expansion keeps the same owner hook and report builder, but adds eight module rows aligned to the public tool family:

- Public truth basics
- QR link health
- Menu or service clarity
- WhatsApp action link
- Hours readiness
- Photo and visual identity
- Google profile handoff
- Menu freshness

These module rows are read-only reports with exact owner fix targets. Desktop Business Health links each missing or unclear module to an existing MenuList fix surface such as Business Settings, Projects, or QR tools with a focused query target. Mobile Business Health uses shell callbacks to open the Menu tab, Share tab, or More sub-screens without desktop-route bypasses.

---

## Existing Anchors

| Existing source | Why it matters |
| --- | --- |
| `src/lib/seo/publicTruthIndexing.ts` | Existing public truth gate |
| `src/app/client/obp/schema.ts` | Existing business schema output |
| `src/app/client/[[...slug]]/page.tsx` | Existing menu/catalog schema output |
| `public/llms.txt` | Public agent boundary and no-guessing policy |
| `__docs__/menulist-tools/public-truth-tools/` | Parent framework |
| `__docs__/main-website/main-website_seo-aeo.md` | Current discovery/claim boundary |

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.7 | July 1, 2026 | Added exact V1 owner fix targets for desktop and mobile so each missing module routes to an existing MenuList fix surface without creating a new dashboard |
| 0.6 | July 1, 2026 | Expanded V1 owner check into six module rows for public basics, QR link health, menu/service clarity, WhatsApp action, hours, and photos inside desktop/mobile Business Health |
| 0.5 | June 30, 2026 | Added explicit per-row evidence text to V0/V1 reports and clarified that Public Truth Check V0 does not store uploaded files |
| 0.4 | June 30, 2026 | Implemented V1 owner-side Public Truth Check inside desktop and mobile Business Health using existing MenuList store/project truth and no new API route or report storage |
| 0.3 | June 30, 2026 | Added report copy/download actions, consented follow-up through existing public contact route, website analytics events, and V0 verifier coverage |
| 0.2 | June 30, 2026 | Implemented `/tools/public-truth-check` as browser-local self-report tool with feature flags, discovery registration, localized copy, and verifier |
| 0.1 | June 30, 2026 | Initial planning doc set |
