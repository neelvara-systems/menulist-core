# Public Truth Check - Test Cases

**Status:** Implemented - public self-report route and logged-in owner check
**Last Updated:** June 30, 2026
**Audience:** QA, developers

---

## Public Form Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| PTC-001 | Missing business name | Report marks business identity as `missing` |
| PTC-002 | Missing city/area | Report marks business identity as `missing` |
| PTC-003 | Menu/service text provided | Report checks source-present status |
| PTC-004 | No source provided | Report status is `missing_basics` or `not_checked` |
| PTC-005 | URL provided in default mode | URL is treated as reference only; no arbitrary server fetch |
| PTC-006 | Contact provided without consent | Contact is not stored |
| PTC-007 | Oversized pasted text | Input is capped or rejected |
| PTC-008 | Unsupported source | Report marks item as `not_checked` |

---

## Report Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| PTC-101 | Business has name, source, contact, hours, location | Status can be `ready` |
| PTC-102 | Hours missing | Check row is `missing`; next action points to hours/source setup |
| PTC-103 | Menu/source missing | Overall status is not `ready` |
| PTC-104 | Source is ambiguous | Check row is `unclear`, not guessed |
| PTC-105 | AI/search was not checked | Boundary says `aiOrSearchChecked: false` |
| PTC-106 | External sources were not fetched | Boundary says `externalSourcesFetched: false` |
| PTC-107 | Report footer | No ranking, citation, traffic, or external update promise |

---

## Owner Mode Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| PTC-201 | Store has complete OBP and active menu | Owner card shows ready/no action needed |
| PTC-202 | Store missing working hours | Owner card links to existing hours/settings flow |
| PTC-203 | Store missing contact | Owner card links to existing OBP/business settings |
| PTC-204 | Store has no active project/menu | Owner card links to existing menu/create flow |
| PTC-205 | Store missing photos | Owner card links to OBP photo flow |
| PTC-206 | Mobile owner views Public Truth Check | Card stays inside `MobileShell` and does not route to desktop |
| PTC-207 | Owner check runs with cached mobile project | Mobile uses cached project data rather than a separate mobile DAL |
| PTC-208 | Owner check runs without cached selected/default project | Hook reads at most one selected/default project through existing client DAL |

---

## Security Tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| PTC-301 | Public report API receives oversized body | Request rejected before expensive work |
| PTC-302 | Public report API receives malformed body | Generic validation error |
| PTC-303 | Public report API receives repeated requests | Rate limit applies |
| PTC-304 | Public URL points to private IP/local host | No fetch in default mode; approved adapter would reject |
| PTC-305 | Runtime error occurs | Bounded diagnostic, generic public error |
| PTC-306 | Raw contact/source text in logs | Verification fails |

---

## Language Tests

The public page and report must not contain:

- "AI-powered"
- "guaranteed visibility"
- "rank higher"
- "get cited"
- "boost traffic"
- "growth hack"

Owner app copy must not show:

- confidence percentages
- competitor comparisons
- guilt/urgency language
- technical schema explanations

---

## Mobile Tests

- Public route renders at 320px without horizontal overflow.
- Form controls are large enough for thumb use.
- Report rows wrap cleanly.
- Primary CTA remains reachable.
- Owner card inside MobileShell does not route to desktop.
- Fix action returns to the correct mobile sub-screen.

## Implemented Verifier

```bash
npm run verify:public-truth-check
```

Checks:

- route, component, report builder, and types exist
- safe feature flags are present
- public route has `WebsitePageStructuredData`
- no arbitrary external source fetch, Firebase imports, or direct Firestore write calls are present in the Public Truth Check files
- the only allowed browser `fetch(` is the consented `/api/public/contact` handoff
- owner mode uses the existing project summary and selected/default project DAL reads
- owner mode writes no report state and creates no report API route
- report boundaries remain `externalSourcesFetched: false`, `aiOrSearchChecked: false`, and `rankingPromise: false`
- route is present in discovery policy, static sitemap, `llms.txt`, and `llms-full.txt`
- English and Hindi website locale keys exist
