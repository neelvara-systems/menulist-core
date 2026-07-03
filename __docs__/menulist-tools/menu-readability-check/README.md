# Menu Readability Check - Documentation Hub

> **Feature:** Menu / Service Readability Check
> **Status:** Implemented - public V0 browser-local checker
> **Last Updated:** July 1, 2026
> **Version:** 0.1

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./menu-readability-check_spec.md) | Business requirements and scope |
| Developers | [Implementation](./menu-readability-check_impl.md) | Technical blueprint and contracts |
| Sales | [Marketing](./menu-readability-check_marketing.md) | Internal positioning and GTM |
| Website | [Website](./menu-readability-check_website.md) | Public page copy |
| Help | [Help Doc](./menu-readability-check_helpdoc.md) | Owner-facing help article |
| Firebase | [Firebase](./menu-readability-check_firebase.md) | Cost tracking |
| Mobile | [Mobile Support](./menu-readability-check_mobile-support.md) | Mobile admission |
| QA | [Test Cases](./menu-readability-check_test-cases.md) | Test scenarios |

---

## What Is This Feature?

**One-liner:** Menu Readability Check shows whether pasted menu, service, catalog, rate-card, or package text is clear enough for customers to understand what is sold, what it costs, and how to act.

**Problem Solved:** Owners often have their offer list in WhatsApp messages, PDFs, screenshots, old websites, social captions, or rough notes. Customers can see something, but it may be hard to scan, missing prices, missing details, or missing the next action.

**Solution:** The owner pastes the current menu/service text, optionally adds the public link they share today, and receives a short report that routes cleanup into one current MenuList customer link.

---

## Product Role

Menu Readability Check is a member of the [Public Truth Tools](../public-truth-tools/README.md) family.

It is:

- a public free tool and lead magnet
- a source-import readiness check
- a setup path into MenuList for restaurants and non-restaurant SMBs

It is not:

- a menu generator
- an AI rewrite tool in V0
- a PDF/file upload tool in V0
- an SEO or ranking audit
- an external website crawler
- a saved history or paid monitor

---

## Version Ladder

| Version | Product shape | Primary user | Input | Output | Runtime boundary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| V0 | Public free tool / lead magnet | Prospect, owner, agency | Pasted menu/service text, optional public link, business name, city/locality, and owner-marked clarity facts | Basic readability gap report, copy/download checklist, MenuList setup handoff, optional consented follow-up | Browser-local deterministic check; no file upload; no URL fetch; no AI/provider call; optional follow-up reuses `/api/public/contact` | Implemented |
| V1 | Logged-in MenuList owner check | Existing MenuList owner | Existing MenuList project/menu/service truth | Missing prices, vague categories, missing descriptions, weak action gaps inside Business Health, Public Discovery, or OBP readiness | Reuses owner store/project truth and existing DAL/cache; no report storage by default | Planned |
| V2 | Paid add-on behavior | Multi-location owner, partner, agency | Owner-approved stores/projects, schedule, report scope | Monthly clarity report, agency setup checklist, multi-location content consistency | Paid entitlement, capped history, source policy, and cost controls | Planned |

---

## Architecture Overview

```txt
Owner pastes current menu/service text
  -> browser-local readability checks
  -> report says exactly what was checked and not checked
  -> MenuList fix path creates one current customer link
```

Implemented V0 route:

| Layer | Path |
| --- | --- |
| Public route | `src/app/(website)/tools/menu-readability-check/page.tsx` |
| Website component | `src/components/website/menuReadabilityCheck/MenuReadabilityCheckPage.tsx` |
| Report builder | `src/lib/public-truth-tools/menuReadabilityReport.ts` |
| Types | `src/lib/public-truth-tools/menuReadabilityTypes.ts` |
| Verifier | `scripts/verification/verify-menu-readability-check.js` |

Every report row includes explicit `evidenceText`. V0 does not fetch URLs, store uploaded files, call AI/search providers, rewrite the pasted source, or update external platforms.

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | July 1, 2026 | Added V0 public browser-local Menu Readability Check route, docs, feature flag, discovery entries, locale copy, and verifier |
