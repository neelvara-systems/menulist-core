# Winning Pack Refresh

**Status:** Implemented locally; authenticated owner QA remains externally blocked
**Owner surface:** Daily Campaign Desk and campaign list
**Authority:** Current facts, current recipe registry, current trust gates, and owner-reported result evidence

Winning Pack Refresh lets an owner repeat a campaign pattern that helped before without copying stale prices, dates, contacts, approvals, or files. CampaignCue rebuilds a new pack from current truth and keeps compact provenance back to the original useful campaign.

The feature extends the existing `reuseCampaignId` campaign-create path. It adds no collection, listener, provider call, Storage object, or overview read.

## Documents

- [Specification](./winning-pack-refresh_spec.md)
- [Implementation](./winning-pack-refresh_impl.md)
- [Firebase and cost](./winning-pack-refresh_firebase.md)
- [Mobile support](./winning-pack-refresh_mobile-support.md)
- [Test cases](./winning-pack-refresh_test-cases.md)
- [Owner help](./winning-pack-refresh_helpdoc.md)
- [Marketing boundary](./winning-pack-refresh_marketing.md)
- [Website boundary](./winning-pack-refresh_website.md)
- [Validation](./winning-pack-refresh_validation.md)

## Invariants

1. Only owner-reported positive evidence can nominate a source pack.
2. The source recipe must still exist in the current deterministic registry.
3. Missing facts, commercial gates, rights, trust, and current readiness are rerun before creation.
4. Old outputs, source snapshots, approvals, trust reports, and result receipts are never cloned.
5. Refresh provenance stays bounded through root campaign ID and generation count.
6. A current owner-entered local or seasonal moment may be shown as context; CampaignCue does not infer a holiday or event.
7. Direct posting remains disabled.
