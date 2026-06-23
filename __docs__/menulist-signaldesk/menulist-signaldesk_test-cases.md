# MenuList SignalDesk - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026
**Scope:** Product boundary, source policy, compliance, AI, cost, operator workflow, mobile, and MenuList bridge.

## Product Boundary Tests

| Test | Expected |
| --- | --- |
| User tries to access SignalDesk as a MenuList owner | Blocked. Internal users only. |
| SignalDesk creates a public page | Fails. No public SignalDesk routes. |
| SignalDesk writes MenuList menu/business truth directly | Fails. Only outcome bridge allowed. |
| SignalDesk is marketed as public SaaS | Fails. Internal-only. |
| SignalDesk sends without human approval in first build | Fails. |

## Source Policy Tests

| Test | Expected |
| --- | --- |
| Target import has no source policy | Import blocked or target held. |
| Source field has no allowed-use record | Field cannot be used in draft or decision. |
| Google Maps scraped payload is stored as prospect truth | Fails. |
| GBP API is used for lead generation | Fails. |
| Foursquare PAYG data is used to contact prospective customer | Fails. |
| Source retention period is missing | Import blocked. |
| Source run exceeds budget cap | Run pauses or requires admin approval. |

## Dedupe And Provenance Tests

| Test | Expected |
| --- | --- |
| Same business appears in two imports | Existing target merged or held, not duplicated. |
| Same email appears across targets | Contact identity linked and reviewed. |
| Existing suppressed identity appears in import | Target is suppressed/held. |
| Evidence lacks source reference | Decision snapshot cannot approve action. |

## AI Tests

| Test | Expected |
| --- | --- |
| AI output does not match schema | Blocked and review item created. |
| AI invents menu item, price, traffic, or customer claim | Blocked. |
| AI recommends WhatsApp cold outreach from public phone | Blocked. |
| AI suggests source data can be used for outreach | Blocked unless source policy says so. |
| AI draft uses unapproved variable | Blocked. |
| AI classifier marks DNC reply as interested | Eval failure and human review. |

## Approval And Send Tests

| Test | Expected |
| --- | --- |
| Draft approved without suppression recheck | Fails. |
| Email send requested without unsubscribe path | Blocked. |
| Email send requested without sender-domain readiness | Blocked. |
| Export includes suppressed contact | Fails. |
| WhatsApp API send requested in first build | Blocked. |
| Instagram cold DM send requested | Blocked. |
| Message claims platform partnership | Blocked. |

## Inbox Tests

| Test | Expected |
| --- | --- |
| Reply says stop/unsubscribe | Suppression event created immediately. |
| Reply says wrong person | Wrong-contact suppression created. |
| Reply asks pricing | Classified and routed to operator. |
| Reply is interested | MenuList route can be created after review. |
| Reply classifier confidence is low | Human review. |

## Attribution Tests

| Test | Expected |
| --- | --- |
| Target receives MenuList route | Route token links target/source/channel/template. |
| Upload starts | Outcome event records upload started. |
| Preview prepared | Outcome event records preview prepared. |
| Public link published | Outcome event records publish. |
| QR/WhatsApp/Google placement marked done | Two-surface activation summary updates. |
| Dashboard loads attribution | Reads summaries only, not raw events. |

## Cost Tests

| Test | Expected |
| --- | --- |
| Dashboard scans raw messages | Fails. |
| Target list reads full target detail docs | Fails. Uses summaries. |
| AI scoring reruns on unchanged evidence | Cached output reused or duplicate spend blocked. |
| Source run has no max result count | Blocked. |
| Provider cost exceeds cap | Paused or requires approval. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile pauses all outbound | Allowed with confirmation and audit. |
| Mobile sends/export messages | Not available. |
| Mobile reveals raw contact | Not available. |
| Mobile approves draft | Not available. |
| Mobile configures provider | Not available. |

## Operator Runbook Tests

| Test | Expected |
| --- | --- |
| Operator works target without evidence packet | Held. |
| Operator approves message with unsupported claim | Blocked. |
| Operator closes complaint without admin review | Blocked. |
| Operator changes source policy | Blocked unless role allows. |
| Operator exports contact after DNC | Fails. |

## First Build Acceptance Test

The first build is acceptable only if this path works end to end:

```txt
manual target import
-> dedupe/provenance
-> AI score
-> evidence packet
-> safe draft
-> human approval
-> email/export
-> reply capture
-> MenuList outcome recorded
-> summary dashboard updated
```
