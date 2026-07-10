# SignalDesk Source Policy - Compliance Policy

**Status:** Initial planning doc
**Created:** June 23, 2026

## Core Rule

Source provider availability does not equal permission.

Every source needs a written policy before use.

## External Guardrails

The project-level research memo records current source constraints:

- Google Maps Platform terms restrict scraping/bulk storage and use to create or augment advertising products (`../menulist-signaldesk_compliance.md` links to the research memo).
- GBP APIs must not be used for lead generation.
- Foursquare PAYG Places terms prohibit using Places Data to contact businesses as prospective customers.
- FHRS/FHIS data is useful as official UK establishment identity/evidence, but it is not owner contact permission and public rating/image use needs separate accuracy and non-endorsement review.
- Apify-style scraping availability is not permission; the implemented Apify Source Broker still requires an env-controlled Actor, provider source policy, owner provider approval, budget cap, and source-policy contact-use enforcement.

## Required Policy Fields

| Field | Why |
| --- | --- |
| Provider | Determines source-specific restrictions. |
| Allowed fields | Prevents accidental storage/use of restricted fields. |
| Blocked fields | Explicitly drops risky data. |
| May use for outreach | Prevents "we have data, so contact them" logic. |
| May use in evidence | Controls what operators/AI can cite. |
| May use in outbound copy | Controls what can be said to a target. |
| Retention days | Prevents stale raw data accumulation. |
| Approval owner | Creates accountability. |

## Blocked Defaults

Unless explicitly approved:

- no source-provider data in outbound copy;
- no raw scraped payload in Firestore;
- no public artifact from provider content;
- no review/photo/menu/profile content storage;
- no cold WhatsApp from public phone data;
- no contact from Foursquare PAYG data;
- no GBP API lead mining.
- no Apify source data used for outreach unless contact use is explicitly approved and the normal suppression, evidence, draft, and human approval gates pass.
- no public-business research row gains contact or personalization permission without a separate permissioned manual introduction or referral basis.

## Approval Workflow

1. Draft source policy.
2. Record source URL/terms or internal source basis.
3. Define fields and retention.
4. Define outreach eligibility.
5. Founder/admin approves.
6. First source run uses small cap.
7. Review held/rejected rows before scale.

## Open Questions

| Question | Owner |
| --- | --- |
| First approved manual source | Founder |
| Whether paid source providers are allowed | Founder + compliance review |
| Exact retention classes | Founder + compliance review |
