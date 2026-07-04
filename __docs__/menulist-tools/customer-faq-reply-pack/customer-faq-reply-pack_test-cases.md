# Customer FAQ Reply Pack - Test Cases

**Last Updated:** July 4, 2026

## Acceptance

| ID | Scenario | Expected |
| --- | --- | --- |
| CFRP-001 | Owner enters business name, repeated questions, source facts, and current link | Report is generated locally with FAQ answer blocks |
| CFRP-002 | Owner leaves repeated questions empty | Status is missing basics and evidence says no owner-entered fact was provided |
| CFRP-003 | Owner enters current customer link | URL is format-checked locally and not opened |
| CFRP-004 | Owner copies one FAQ answer block | Only the generated block text and evidence are copied |
| CFRP-005 | Owner copies shareable report link | Encoded client-side report link is copied; no report collection is written |
| CFRP-006 | Owner submits follow-up form with consent | Existing `/api/public/contact` route receives the bounded message |

## Refusal/Boundary

| ID | Scenario | Expected |
| --- | --- | --- |
| CFRP-101 | Tool claims it read customer conversations, created a chatbot, configured automation, sent a message, fetched links, stored reports, checked rankings, or called AI/search providers | Verification fails |
| CFRP-102 | Tool adds a chatbot/inbox API call, external source fetch, report API, report collection, or provider call in V0 | Verification fails |
| CFRP-103 | Public copy presents the tool as a chatbot, inbox, sender, broadcast tool, or support automation system | Verification fails |

## Source Gate

```bash
npm run verify:customer-faq-reply-pack
```
