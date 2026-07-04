# QR Link Health Check - Product Spec

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** Product, design, engineering

---

## 1. Purpose

QR Link Health Check helps an SMB owner answer:

```txt
Does my printed or shared QR code open the right current customer link?
```

The tool exists to reveal a public setup gap and route the owner into MenuList. It should not become a broad QR analytics, scan tracking, SEO, crawling, or reputation product.

---

## 2. Owner Job

Check whether the QR code customers scan opens a clear, current business link with an obvious next action.

---

## 3. Target User

| User | Need |
| --- | --- |
| Restaurant owner | Verify table/counter/menu QR codes before customers scan |
| Salon, clinic, shop, or service owner | Confirm printed QR codes lead to current services, hours, booking, or contact |
| Agency/freelancer | Show a client that old QR links need one current customer link |
| Existing MenuList owner | Later, confirm that MenuList QR/share links are ready and current |

---

## 4. V0 Scope

V0 is a public free lead magnet.

Allowed:

- owner enters business name and city/locality
- owner pastes the URL that the QR opens
- owner selects the intended destination type
- owner marks whether the QR/link appears current, whether customer action is visible, and whether the printed context is clear
- browser-local deterministic report
- copy/download report
- optional consented follow-up through existing `/api/public/contact`

Not allowed in V0:

- QR image upload or image decoding
- arbitrary URL fetch
- page crawling
- Google profile inspection
- WhatsApp account inspection
- AI/search provider checks
- saved report history
- per-scan analytics ledger
- external platform updates
- ranking, citation, visibility, traffic, or conversion promises

The owner can scan the QR with their phone or camera app and paste the opened URL. V0 checks that pasted/decoded target string only.

---

## 5. Report Contract

Every report must include:

| Field | Rule |
| --- | --- |
| Overall status | `ready`, `missing_basics`, `unclear`, `not_checked`, or `manual_review_needed` |
| Check rows | 3-7 rows using `present`, `missing`, `unclear`, `not_applicable`, or `not_checked` |
| Evidence text | Required for every row; says exactly what was checked |
| What was not checked | Required boundary copy |
| Next action | One MenuList fix path |
| Export | Browser-local copy/download |
| Storage posture | No report storage in V0 |

Required V0 rows:

| Row | Meaning |
| --- | --- |
| QR target | Whether a target URL was entered |
| URL format | Whether the pasted target looks like a valid public HTTPS customer-openable URL |
| MenuList customer link | Whether the URL appears to be MenuList-owned from the host only |
| Current link confidence | Owner-marked current/stale/unknown state |
| Customer action | Owner-marked action visibility or action hint in the URL |
| Printed context | Owner-marked clarity around where the QR is printed or shared |
| Target page inspection | Always `not_checked` in V0 |

---

## 6. Status Logic

| Status | Rule |
| --- | --- |
| `not_checked` | No meaningful input exists |
| `missing_basics` | Missing target URL or target URL is not public HTTPS |
| `ready` | Target URL is valid, appears MenuList-owned, current state is marked current, customer action is visible, and printed context is clear |
| `manual_review_needed` | Owner says the QR is old/stale/replacement-needed even if a URL exists |
| `unclear` | Any valid target has unresolved gaps but is not clearly broken |

Do not infer that the destination page works. V0 never opens it.

---

## 7. Source Policy

| Source | Allowed? | Storage rule | Notes |
| --- | --- | --- | --- |
| Owner-entered fields | Yes | Browser-local only | Used for report |
| Pasted QR target URL | Yes | Browser-local only | Public HTTPS URL is parsed locally but not fetched |
| Uploaded QR image | No in V0 | Not stored | Add only after approved decoder/source policy |
| Existing MenuList store/project truth | Not in V0 | N/A | V1 owner check only |
| External public HTTPS URL | Reference only | Not stored by report | No fetch |
| Google/Instagram/WhatsApp profile | Reference only | Not stored by report | No inspection |
| AI/search provider answer | No | N/A | Not part of QR V0 |

---

## 8. Public Copy Boundaries

Allowed language:

- "Check the URL your QR opens."
- "Target page was not opened."
- "QR image was not decoded."
- "Create one current customer link."

Forbidden language:

- "We scanned your QR."
- "We checked your website."
- "Your Google ranking will improve."
- "Your AI visibility is poor."
- "We updated your QR everywhere."
- "Guaranteed conversions."

---

## 9. V1 Owner Direction

V1 should not create a new dashboard. It should appear inside one or more existing owner surfaces:

- Business Health
- Public Discovery
- Share / QR readiness
- OBP readiness

V1 should use actual MenuList truth and current link generation contracts to warn when a MenuList QR/share link is unpublished, stale, or missing a clear customer action.

---

## 10. V2 Paid Direction

V2 is paid only when recurrence/history/reporting adds value:

- recurring QR link health checks
- saved monthly QR report
- multi-location QR table
- partner/agency export
- printed QR replacement plan

V2 must remain owner-approved and should not create per-scan ledgers by default.

---

## 11. Acceptance Criteria

- `/tools/qr-link-health-check` exists and is feature-flagged.
- Report generation is browser-local.
- No external URL is fetched.
- No QR image upload exists in V0.
- Every row includes explicit evidence text.
- Copy/download works without server storage.
- Optional contact handoff requires consent and uses the existing bounded public contact route.
- Website discovery, sitemap, LLM context, locales, docs, and verifier are updated.
