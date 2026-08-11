# Read-Only Result Evidence

**Status:** Implemented for owner-copied report snapshots. Provider API connections remain disabled.

This feature lets an authorized CampaignCue workspace member copy a small set of totals from a report they can already access and attach that directional evidence to a campaign. It does not connect a social or advertising account, download provider data, post content, change spend, or claim that the campaign caused the reported numbers.

## Documents

- [Specification](read-only-result-evidence_spec.md)
- [Implementation](read-only-result-evidence_impl.md)
- [Firebase and cost](read-only-result-evidence_firebase.md)
- [Owner help](read-only-result-evidence_helpdoc.md)
- [Mobile support](read-only-result-evidence_mobile-support.md)
- [Marketing boundary](read-only-result-evidence_marketing.md)
- [Website boundary](read-only-result-evidence_website.md)
- [Test cases](read-only-result-evidence_test-cases.md)
- [Validation](read-only-result-evidence_validation.md)

## Active boundary

```text
Owner opens a provider report
-> copies a bounded date window and selected totals
-> CampaignCue validates and stores the latest compact snapshot on the campaign
-> a metadata-only audit event is recorded
-> Campaign Memory remains based on owner-reported outcomes
```

The future provider connector is a separate activation decision. It requires provider-approved OAuth, server-only credentials and revocation, read-method allowlists, bounded quotas, response validation, and operational evidence before it can be enabled.
