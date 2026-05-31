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

## Rejection Rule

If a proposed feature primarily increases message volume instead of completed MenuList onboardings with safety and cost control, reject it.

## Channel Rule

Email can be the first automated channel only when unsubscribe, bounce, suppression, and sender-identity rules exist.

Email also requires sender-domain readiness: SPF/DKIM/DMARC status, unsubscribe endpoint health, bounce webhook health, sender identity, ramp limits, and spam-rate thresholds.

WhatsApp starts assisted. API/template sends require opt-in proof, policy review, and provider readiness.

Instagram and Messenger start inbound/warm only unless a later policy review approves otherwise.

## Data Rule

Candidate intelligence is not truth.

MenuList truth starts only after owner confirmation or approved MenuList verification paths.
