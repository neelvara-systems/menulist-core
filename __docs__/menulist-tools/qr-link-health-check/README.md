# QR Link Health Check - Documentation Hub

> **Feature:** QR Link Health Check
> **Status:** Implemented - public V0 browser-local checker
> **Last Updated:** July 1, 2026
> **Version:** 0.1

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./qr-link-health-check_spec.md) | Business requirements and scope |
| Developers | [Implementation](./qr-link-health-check_impl.md) | Technical blueprint and contracts |
| Sales | [Marketing](./qr-link-health-check_marketing.md) | Internal positioning and GTM |
| Website | [Website](./qr-link-health-check_website.md) | Public page copy |
| Help | [Help Doc](./qr-link-health-check_helpdoc.md) | Owner-facing help article |
| Firebase | [Firebase](./qr-link-health-check_firebase.md) | Cost tracking |
| Mobile | [Mobile Support](./qr-link-health-check_mobile-support.md) | Mobile admission |
| QA | [Test Cases](./qr-link-health-check_test-cases.md) | Test scenarios |

---

## What Is This Feature?

**One-liner:** QR Link Health Check shows whether a QR code points customers to a clear, current customer link.

**Problem Solved:** SMB owners print QR codes on tables, counters, flyers, packaging, cards, and signs. When the QR opens an old PDF, an unclear website page, a broken-looking URL, or a link with no customer action, the owner loses trust at the exact moment the customer is trying to act.

**Solution:** The owner scans the QR code with any camera app, pastes the opened URL into MenuList, marks what customers can see around that QR/link, and receives a short gap report with one fix path: create or replace the QR target with one current MenuList customer link.

---

## Product Role

QR Link Health Check is a member of the [Public Truth Tools](../public-truth-tools/README.md) family.

It is:

- a public free tool and lead magnet
- a customer-link readiness check
- a route into MenuList setup when the target is stale, unclear, or not MenuList-owned

It is not:

- a QR image decoder in V0
- a link crawler
- a Google, Instagram, WhatsApp, or AI visibility audit
- a per-scan analytics tool
- a replacement for MenuList's QR/share features

---

## Version Ladder

| Version | Product shape | Primary user | Input | Output | Runtime boundary | Status |
| --- | --- | --- | --- | --- | --- | --- |
| V0 | Public free tool / lead magnet | Prospect, owner, agency | Pasted URL that the QR opens, business name, city/locality, intended destination, and owner-marked visible facts | Basic QR target report, copy/download checklist, MenuList setup handoff, optional consented follow-up | Browser-local deterministic check; QR image is not decoded; target URL is not fetched; no AI/provider call; optional follow-up reuses `/api/public/contact` | Implemented |
| V1 | Logged-in MenuList owner check | Existing MenuList owner | Existing MenuList store/project/public link truth | QR/share readiness inside Business Health, Public Discovery, or Share surfaces | Reuses owner store/project truth and current QR/link generation contracts; no report storage by default | Planned |
| V2 | Paid add-on behavior | Multi-location owner, partner, agency | Owner-approved locations, printed QR inventory, schedule, and report scope | Recurring QR health history, multi-location QR table, monthly report, agency export | Paid entitlement, capped history, owner-approved locations, no per-scan ledger | Planned |

---

## Architecture Overview

```txt
Owner scans QR with camera
  -> owner pastes opened URL
  -> browser-local QR target checks
  -> report states exactly what was checked and not checked
  -> MenuList fix path creates one current customer link
```

Implemented V0 route:

| Layer | Path |
| --- | --- |
| Public route | `src/app/(website)/tools/qr-link-health-check/page.tsx` |
| Website component | `src/components/website/qrLinkHealthCheck/QrLinkHealthCheckPage.tsx` |
| Report builder | `src/lib/public-truth-tools/qrLinkHealthReport.ts` |
| Types | `src/lib/public-truth-tools/qrLinkHealthTypes.ts` |
| Verifier | `scripts/verification/verify-qr-link-health-check.js` |

The public route is browser-local. It does not decode uploaded QR images, fetch external pages, store report state, inspect external profiles, call AI/search providers, or update external platforms. Every row includes explicit `evidenceText` that states what was actually checked.

---

## Existing Anchors

| Existing source | Why it matters |
| --- | --- |
| `src/config/features.ts` | Feature flag gate for Public Truth Tools and QR Link Health Check |
| `src/app/(website)/tools/public-truth-check/page.tsx` | Public tool route pattern |
| `src/components/website/publicTruthCheck/PublicTruthCheckPage.tsx` | Public tool form/report/handoff pattern |
| `src/lib/public-truth-tools/publicTruthCheckReport.ts` | Deterministic report pattern with evidence text |
| `src/components/templates/main-app/qrCodeGenerator/QRCodeGenerator.tsx` | Existing MenuList QR generation surface |
| `public/llms.txt` | Public agent boundary and no-guessing policy |

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | July 1, 2026 | Added V0 public browser-local QR Link Health Check route, docs, feature flag, discovery entries, locale copy, and verifier |
