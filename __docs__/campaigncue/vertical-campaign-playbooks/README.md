# Vertical Campaign Playbooks

**Status:** Implemented locally; authenticated owner QA remains externally blocked
**Owner surface:** Daily Campaign Desk, Campaign Inbox, and Campaign Pack review
**Authority:** Static CampaignCue playbook registry plus the deterministic Campaign Decision Engine

Vertical Campaign Playbooks turn CampaignCue recipes into a bounded operating library for restaurants, salons, retail, local services, fitness businesses, clinics, and uncategorized local businesses. They describe useful owner jobs, required source truth, allowed recipes, and claim boundaries. They are not design templates and do not let a model decide what a business should promote.

The registry is bundled with the application. It adds no Firebase read, write, collection, listener, Storage object, or provider call.

## Documents

- [Specification](./vertical-campaign-playbooks_spec.md)
- [Implementation](./vertical-campaign-playbooks_impl.md)
- [Firebase and cost](./vertical-campaign-playbooks_firebase.md)
- [Mobile support](./vertical-campaign-playbooks_mobile-support.md)
- [Test cases](./vertical-campaign-playbooks_test-cases.md)
- [Owner help](./vertical-campaign-playbooks_helpdoc.md)
- [Marketing boundary](./vertical-campaign-playbooks_marketing.md)
- [Website boundary](./vertical-campaign-playbooks_website.md)
- [Validation](./vertical-campaign-playbooks_validation.md)

## Invariants

1. Recipes are deterministic source data, not model output.
2. Every recipe points to approved business facts, missing-input gates, trust checks, manual outputs, and a result question.
3. High-risk claims, contact details, prices, dates, stock, availability, and rights remain fact-gated.
4. Multi-location and agency are operating modes, not substitute business verticals.
5. The owner sees one useful recommendation, not a template catalog.
6. Direct posting and sending remain disabled.
