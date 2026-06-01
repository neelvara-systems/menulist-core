# Growth Engine Non-Goals Charter

**Status:** Locked planning doctrine
**Product:** Growth Engine

---

## Permanent Non-Goals

Growth Engine will not:

1. Become MenuList owner/customer UI.
2. Become GrowthOS/Growth Kits.
3. Become a generic CRM.
4. Become a public lead database.
5. Sell leads to third parties.
6. Build public websites for scraped businesses.
7. Rehost Google Maps photos, reviews, menus, or profile content.
8. Store scraped third-party data as MenuList truth.
9. Automate WhatsApp/calling/SMS blasting.
10. Send messages without suppression checks.
11. Launch campaigns without dry-run reports.
12. Use Google Business Profile APIs for lead generation.
13. Claim a business is verified without owner confirmation.
14. Create or edit MenuList menu/business truth.
15. Own MenuList onboarding or activation.
16. Own MenuList billing.
17. Replace human legal/compliance review.
18. Let AI create free-form outreach outside approved templates.
19. Hide cost or provider spend.
20. Keep raw sensitive payloads forever.
21. Import from an unapproved source.
22. Send email before sender-domain readiness is complete.
23. Send WhatsApp API/template messages without opt-in proof.
24. Create artifacts without noindex, expiry, QA, and takedown state.
25. Treat generic CRM, enrichment, or cold-email tooling as the product moat.
26. Use third-party lead-gen, CRM, or outreach tools as the system of record.
27. Publish candidate-only facts to public pages, sitemaps, IndexNow, feeds, or truth packets.
28. Use Google Indexing API for MenuList menu or business pages.
29. Use Google Business Profile APIs or GoogleLocations for lead generation.
30. Create thin city/category pages from scraped leads.
31. Use third-party workflow builders, enrichment tables, sequencers, or CRMs as automation system of record.
32. Let AI act without typed schema, prompt version, eval pass, budget cap, and audit trail.
33. Send or publish without a decision snapshot.
34. Change sender identity midway through a target conversation to force delivery.
35. Use Apple Business Connect or Bing Places as lead-gen sources or truth authorities.
36. Treat Google Places content as durable MenuList truth.
37. Use Google Places wildcard field masks in production.
38. Store Google Places photos, reviews, profile content, or menu content as Growth Engine assets.
39. Use Foursquare Places API pay-as-you-go data to contact listed businesses as prospects without separate contract or written permission.
40. Treat Foursquare source content as MenuList truth.
41. Rehost Foursquare photos, tips, ratings, descriptions, popularity, menu, or profile content.
42. Publish Business Truth Graph candidate or low-confidence edges as public truth.

## Rejection Rule

If a proposed feature primarily increases message volume instead of owner-confirmed MenuList truth coverage with safety and cost control, reject it.

## Channel Rule

Email can be the first automated channel only when unsubscribe, bounce, suppression, and sender-identity rules exist.

Email also requires sender-domain readiness: SPF/DKIM/DMARC status, unsubscribe endpoint health, bounce webhook health, sender identity, ramp limits, and spam-rate thresholds.

WhatsApp starts assisted. API/template sends require opt-in proof, policy review, and provider readiness.

Instagram and Messenger stay inbound/warm unless policy review approves another mode.

## Automation Rule

Growth Engine owns automation workflows, enrichment waterfalls, decision snapshots, AI worker registry, sender assignment, operator work queues, and attribution.

Third-party tools may be low-level adapters only. They must not decide target state, channel eligibility, sender assignment, public publishing, discovery publishing, or attribution.

## Data Rule

Candidate intelligence is not truth.

MenuList truth starts only after owner confirmation or approved MenuList verification paths.

Google Places place IDs may be stored as provider identity handles. Broader Places API content must stay source-limited and must not become MenuList truth, public artifact content, sitemap content, feed content, or truth-packet content.

Foursquare place IDs, category IDs, and chain IDs may be stored as provider identity handles when source policy allows it. Foursquare Places API pay-as-you-go data must not be used for prospect outreach unless a separate contract or written permission explicitly allows it. Foursquare source content must not become MenuList truth, public artifact content, sitemap content, feed content, or truth-packet content.

The Business Truth Graph is a state model, not a shortcut around verification. Candidate edges describe where to inspect next. Confirmed truth edges require owner confirmation or approved MenuList verification.

## Distribution Rule

Public distribution must come from confirmed MenuList truth.

Allowed public distribution surfaces:

- canonical MenuList menu pages
- official business pages
- structured data
- sitemaps and sitemap indexes
- IndexNow submissions for meaningful changed public URLs
- menu feed exports from confirmed truth
- AI-readable public truth packets
- owner website widgets or embeds
- owner-authorized Google Business Profile, Apple Business Connect, and Bing Places handoffs

Blocked public distribution surfaces:

- noindex claim artifacts
- scraped candidate records
- unconfirmed menu facts
- private contact data
- source payloads
- Google Maps photos, reviews, menus, or profile content
- Foursquare photos, tips, ratings, descriptions, popularity, menu, or profile content
- Business Truth Graph candidate or low-confidence edges
- external listing facts that have not become confirmed MenuList truth
