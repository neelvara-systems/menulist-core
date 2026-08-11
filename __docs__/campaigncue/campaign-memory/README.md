# Campaign Memory 2.0

**Status:** Implemented locally; authenticated owner QA remains externally blocked
**Owner surface:** Campaign results and Daily Campaign Desk
**Authority:** Owner-reported outcomes with explicit confidence; no provider attribution

Campaign Memory turns bounded result receipts into practical evidence about recipes and channels. It helps an owner repeat a useful campaign pattern, avoid repeating an unhelpful one unchanged, or record more results before CampaignCue draws a conclusion.

The feature reuses the existing campaign result receipt and `analyticsSummaries/dashboard` document. It adds no collection, raw-event scan, realtime listener, provider call, or background job.

## Documents

- [Specification](./campaign-memory_spec.md)
- [Implementation](./campaign-memory_impl.md)
- [Firebase and cost](./campaign-memory_firebase.md)
- [Mobile support](./campaign-memory_mobile-support.md)
- [Test cases](./campaign-memory_test-cases.md)
- [Owner help](./campaign-memory_helpdoc.md)
- [Marketing boundary](./campaign-memory_marketing.md)
- [Website boundary](./campaign-memory_website.md)
- [Validation](./campaign-memory_validation.md)

## Governing Invariants

1. Every memory signal is labelled `owner_reported` unless a separately approved connector supplies another source.
2. A model never decides what worked.
3. Result identifiers must belong to the selected campaign recipe.
4. The summary stores counters and identifiers, not duplicate owner notes or raw event payloads.
5. Recipe and channel signals are bounded and deterministically ordered.
6. One outcome mutation updates the campaign, event, and existing dashboard summary transactionally.
7. Recommendation memory is evidence, not revenue attribution or a performance forecast.
8. `not_used` is not treated as a positive or negative campaign result.
