# Campaign Inbox

**Status:** Implemented and locally verified; authenticated visual QA remains environment-blocked
**Owner surface:** Daily Campaign Desk and Offers, events, and notes
**Delivery boundary:** Review and save facts only; no posting, sending, or provider mutation

Campaign Inbox gives a busy owner one short place to tell CampaignCue what changed. It converts explicitly labelled lines into reviewable candidates, keeps unlabelled prose as one note candidate, and saves only the candidates the owner confirms.

The feature is not a model-owned business-fact extractor. The first runtime is deterministic and browser-local. Canonical phone, WhatsApp, location, website, menu, and booking details are routed to Business Details instead of being silently promoted into protected truth.

## Documents

- [Specification](./campaign-inbox_spec.md)
- [Implementation](./campaign-inbox_impl.md)
- [Firebase and cost](./campaign-inbox_firebase.md)
- [Mobile support](./campaign-inbox_mobile-support.md)
- [Test cases](./campaign-inbox_test-cases.md)
- [Owner help](./campaign-inbox_helpdoc.md)
- [Marketing boundary](./campaign-inbox_marketing.md)
- [Website boundary](./campaign-inbox_website.md)
- [Validation](./campaign-inbox_validation.md)

## Governing Invariants

1. Draft text is not persisted.
2. Parsing does not call a model or Firebase.
3. Every saved candidate is visibly reviewed by the owner.
4. Canonical business details remain Business Brain-owned.
5. One confirmation uses one guarded API request and one Firestore transaction.
6. One batch writes one compact current source snapshot and one audit event.
7. Existing source inputs, Daily Desk decisions, and pack truth checks remain the consumers.
8. Direct posting and provider connections remain disabled.
