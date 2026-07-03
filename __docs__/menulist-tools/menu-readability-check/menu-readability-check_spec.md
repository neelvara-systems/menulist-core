# Menu Readability Check - Product Spec

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 1, 2026
**Audience:** Product, design, engineering

---

## 1. Purpose

Menu Readability Check helps an SMB owner answer:

```txt
Can customers quickly understand what I sell, what it costs, and how to act?
```

The tool exists to reveal source cleanup gaps and route owners into MenuList setup. It must not become a generic copywriting, SEO, AI visibility, or crawler product.

---

## 2. Owner Job

Check whether the pasted menu, service list, catalog, rate card, package list, or price list is clear enough for a customer to scan and act on.

---

## 3. Target User

| User | Need |
| --- | --- |
| Restaurant owner | See whether a pasted menu is readable before turning it into a public link |
| Salon, clinic, repair, rental, or service owner | Check packages, services, rates, and booking/contact clarity |
| Agency/freelancer | Show a client why rough source material needs cleanup |
| Existing MenuList owner | Later, find missing prices, weak categories, and missing descriptions from actual MenuList truth |

---

## 4. V0 Scope

Allowed:

- owner enters business name and city/locality
- owner selects source type
- owner pastes current menu/service text
- owner optionally enters the public link they share today
- owner marks whether categories, prices, descriptions, notes, and customer action are visible
- browser-local deterministic report
- copy/download report
- optional consented follow-up through existing `/api/public/contact`

Not allowed in V0:

- file upload
- PDF parsing
- image OCR
- arbitrary URL fetch
- page crawling
- AI rewrite or generated menu output
- saved report history
- external platform mutation
- ranking, citation, traffic, or conversion promises

V0 does not store uploaded files because V0 has no upload control. Persisted uploads belong to approved setup/manual-review flows only.

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
| Source material | Whether enough pasted text exists to review |
| Categories or sections | Whether the source is grouped enough for scanning |
| Items or services | Whether the source lists concrete things customers can choose |
| Prices or rates | Whether prices are visible when needed |
| Descriptions or details | Whether details help customers understand choices |
| Customer action | Whether the next step is clear |
| Current customer link | Whether there is a browser-openable link to share |

---

## 6. Status Logic

| Status | Rule |
| --- | --- |
| `missing_basics` | Pasted source text is missing or too short to review |
| `ready` | Source material, items/services, prices or not-needed state, and customer action are present; categories and descriptions are at least present/acceptable |
| `unclear` | Enough source exists, but one or more customer-facing details are unclear or missing |
| `manual_review_needed` | Reserved for future setup/manual-review flow; not used by V0 unless explicitly added later |
| `not_checked` | Reserved for invalid/empty reports; V0 normally returns `missing_basics` for empty source |

Do not infer that an external link works. V0 never opens it.

---

## 7. Source Policy

| Source | Allowed? | Storage rule | Notes |
| --- | --- | --- | --- |
| Owner-entered fields | Yes | Browser-local only | Used for report |
| Pasted menu/service text | Yes | Browser-local only | Primary V0 source |
| Uploaded file | No in V0 | Not stored | Future setup/manual-review flow only |
| Existing MenuList store/project truth | Not in V0 | N/A | V1 owner check only |
| External public URL | Reference only | Not stored by report | URL parsed locally but not fetched |
| Google/Instagram/WhatsApp profile | Reference only | Not stored by report | No inspection |
| AI/search provider answer | No | N/A | Not part of V0 |

---

## 8. Public Copy Boundaries

Allowed language:

- "Paste your current menu or service text."
- "The link was not opened."
- "No file is uploaded."
- "Create one current customer link."

Forbidden language:

- "We crawled your menu."
- "We read your PDF."
- "We rewrote your menu."
- "Your Google ranking will improve."
- "Your AI visibility is poor."
- "Guaranteed more orders."

---

## 9. V1 Owner Direction

V1 should appear inside existing owner surfaces:

- Business Health
- Public Discovery
- OBP readiness
- menu/project readiness

V1 should use actual MenuList project truth to show missing prices, vague categories, missing descriptions, missing dietary/service notes, weak customer actions, and missing public link readiness.

---

## 10. V2 Paid Direction

V2 is paid only when recurrence/history/reporting adds value:

- monthly menu/service clarity report
- multi-location content consistency
- agency/client setup checklist
- owner-approved cleanup workflow

Do not charge for a better one-time V0 report.

---

## 11. Acceptance Criteria

- `/tools/menu-readability-check` exists and is feature-flagged.
- Report generation is browser-local.
- No external URL is fetched.
- No file upload exists in V0.
- Every row includes explicit evidence text.
- Copy/download works without server storage.
- Optional contact handoff requires consent and uses the existing bounded public contact route.
- Website discovery, sitemap, LLM context, locales, docs, and verifier are updated.
