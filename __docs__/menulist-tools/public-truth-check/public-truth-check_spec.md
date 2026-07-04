# Public Truth Check - Product Specification

**Status:** V0 and V1 implemented; V2 planned
**Last Updated:** July 4, 2026
**Audience:** CEO, PM, product owner

---

## 1. Executive Summary

Public Truth Check is a small MenuList tool that reviews whether a business has a clear public source for the facts customers need:

- business name
- menu, catalog, service list, package list, or rate card
- prices where needed
- hours
- location
- phone/WhatsApp/contact
- public action links
- photos or basic visual identity
- one current customer link

The output is a short report. It does not promise ranking, citations, traffic, or external platform updates.

### 1.1 Version Ladder

Public Truth Check should be sequenced as a small tool that can later become an owner check and then a paid add-on. Do not skip directly to paid recurring behavior before the public and owner truth loops are proven.

| Version | Product shape | User | Source model | Report value | Boundary |
| --- | --- | --- | --- | --- | --- |
| V0 | Public free tool / lead magnet | Prospect, owner, agency | Owner enters a business URL, menu link, Google profile link, pasted source text, and visible facts | Basic gap report, copy/download checklist, setup handoff, optional consented follow-up | Current implementation is browser-local self-report for the check; it does not fetch the URL, inspect Google, call AI, or write report state; optional follow-up reuses the existing public contact route |
| V1 | Logged-in MenuList owner check | Existing MenuList owner | Actual MenuList store/project truth | Stronger gaps in Business Health, Public Discovery, OBP readiness, share/QR readiness | Current implementation reuses owner context, existing project summary/project DAL, mobile project cache, and public truth indexability; it writes no report state |
| V2 | Paid add-on behavior | Multi-location owner, partner, agency | Owner-approved locations and recurring scope | Recurring checks, saved history, monthly report, multi-location scan, agency/client export | Requires paid entitlement, source policy, rate limits, cost ledger, history cap, and audit trail |

This keeps V0 useful for acquisition, V1 useful for current owners, and V2 valuable only when recurrence and history create a real paid product.

Implemented V1 location:

- Desktop Business Health card
- Mobile Business Health card inside `MobileShell`
- Shared owner readiness report builder
- Shared hook for owner store/project truth

---

## 2. Core Job

The tool answers:

```txt
Can customers understand this business from the public source currently available?
```

It does not answer:

```txt
Will Google rank this business?
Will ChatGPT cite this business?
Can MenuList post into external communities?
```

---

## 3. Target Users

### Primary

- SMB owner with an existing menu, service list, catalog, package list, or rate card
- owner who uses WhatsApp/Instagram/Google but lacks one current public source
- restaurant, cafe, bakery, cloud kitchen, salon, clinic, studio, repair shop, event service, or local service business

### Secondary

- website designer helping an SMB
- local SEO freelancer
- WhatsApp/Instagram operator
- POS/booking consultant
- MenuList internal setup team

---

## 4. Use Cases

### 4.1 Prospect Public Check

An owner lands on MenuList, enters a business name, city, and current public source. The tool returns a simple gap report and routes them to create one customer link.

### 4.2 Existing Owner Check

An existing MenuList owner opens Business Health or Public Discovery and sees whether their current public source is ready, missing basics, or unclear.

### 4.3 Agency Setup Report

A partner runs the check for a client before starting a website/menu/WhatsApp setup. The output becomes a setup checklist.

### 4.4 Internal Manual Report

The MenuList team can manually review a submitted source and send a report when automated source access is unsafe or unclear.

---

## 5. Report Sections

| Section | Public/prospect | Existing owner | Notes |
| --- | --- | --- | --- |
| Business identity | Yes | Yes | Name, category, city/locality |
| Menu/service source | Yes | Yes | Uploaded/pasted/provided source or MenuList project |
| Prices | Yes | Yes | Present/missing/unclear where relevant |
| Hours | Yes | Yes | Present/missing/unclear |
| Contact | Yes | Yes | Phone, WhatsApp, email where provided |
| Location | Yes | Yes | Address/area/city/map link |
| Customer actions | Yes | Yes | Call, WhatsApp, directions, order, booking |
| Public link | Yes | Yes | One current link status |
| Photos | Optional | Yes | OBP photo gap if available |
| Structured source | Optional | Yes | Schema/llms/public API status when MenuList-owned |
| AI/search readability | Internal first | Optional paid mode | Must not promise ranking/citation |

---

## 6. Status Model

Overall report status:

| Status | Meaning |
| --- | --- |
| `ready` | The core public facts are present |
| `missing_basics` | One or more required public facts are missing |
| `unclear` | A source exists, but customers may not understand it |
| `not_checked` | The tool did not check enough facts |
| `manual_review_needed` | Automated check is not safe or reliable |

Individual check result:

| Result | Meaning |
| --- | --- |
| `present` | Fact is available and usable |
| `missing` | Fact is absent |
| `unclear` | Fact exists but is not clear |
| `not_applicable` | Business type does not need it |
| `not_checked` | Not checked in this run |

---

## 7. In Scope

- public route on MenuList website
- source input form
- owner-authenticated check using MenuList store/project data
- deterministic report generation
- lead capture or setup handoff
- report copy/download
- short report export/share after approval
- Business Health/public discovery integration
- clear source policy
- Firebase cost tracking
- mobile support assessment

---

## 8. Out Of Scope

- automatic external posting
- third-party account engagement
- review/reputation manipulation
- rank tracking
- guaranteed AI answer or citation monitoring
- general SEO crawler
- scraping private sources
- storing unverified third-party facts as MenuList truth
- direct public-agent writes
- MCP endpoint
- broad multi-source directory product

---

## 9. Input Requirements

Public form should ask only for useful fields:

| Field | Required? | Reason |
| --- | --- | --- |
| Business name | Yes | Report identity |
| City/locality | Yes | Avoid wrong-business ambiguity |
| Business type | Optional | Improves check categories |
| Current public link | Optional | URL reference only unless adapter approved |
| Menu/service source upload | Not in V0 | Future setup or manual-review flow only |
| Menu/service text | Optional | Safe fallback when URL fetch is not allowed |
| Contact method | Optional | Lead follow-up only |

V0 does not store uploaded files. The public free route supports pasted source text, URL references, and owner-marked visible facts only. Any persisted upload belongs to an approved setup or manual-review flow with its own consent, retention, Firebase cost, and cleanup rules.

Do not require the owner to understand "schema", "AI visibility", "MCP", or "AEO".

---

## 10. Output Requirements

Public output must include:

- overall status
- 5-8 check rows
- one clear next step
- no ranking/citation promises
- no fake external scan claims
- no hidden confidence math
- explicit evidence text for every row, including what was checked and what was not checked

Example:

```txt
Public source status: Missing basics

Present:
- Business name
- Menu source
- Phone

Missing:
- Hours
- One customer link
- Location

Next step:
Create one customer link from this source.
```

---

## 11. Owner App Integration

Existing owner integration should be light:

- Business Health card
- Public Discovery status
- Official Business Page readiness
- Share/QR warning when link is stale or weak

Avoid a new owner dashboard until repeated use proves it.

---

## 12. Add-on Packaging

Free/included:

- one-time public/prospect check
- current store readiness status
- setup handoff

Paid/eligible later when implemented:

- saved report history
- recurring scheduled checks
- multi-location reports
- agency export
- AI/search readability sampling

The paid value is recurrence and history, not one-time diagnosis.

V2 should not be positioned as "better truth checking" for a single report. It should be positioned as ongoing monitoring and reporting for owners or partners who manage repeated public truth work.

---

## 13. Risks And Controls

| Risk | Control |
| --- | --- |
| Public report overclaims what was checked | Show `not_checked` clearly |
| URL fetch creates SSRF/legal risk | Do not fetch arbitrary URLs by default |
| Owner anxiety | Use calm status and one fix path |
| Looks like SEO software | Keep report to public business facts |
| AI audit costs grow | Keep AI/search readability disabled until cost and source policy are approved |
| Duplicate MenuList truth model | Reuse OBP/menu/store/project contracts |

---

## 14. Doctrine Preservation Decision

No new constitution doc is required. This spec preserves the durable decision:

```txt
Public Truth Check belongs inside MenuList's public truth layer, as the first Public Truth Tool.
```

It does not change MenuList's product identity or create a separate product boundary.
