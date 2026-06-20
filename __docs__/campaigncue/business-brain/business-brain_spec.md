# Business Brain — Spec

## Summary

Business Brain is the source context CampaignCue uses to create campaigns. It holds business name, type, locality, logo, brand colors, WhatsApp/contact CTA, language, tone, Brand Playbook, restaurant menu items, salon services, photos, offers, and source confidence.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Multi-vertical profile | Restaurant, cafe, cloud kitchen, salon, spa, barbershop, retail, local service, and other are supported. |
| Catalog model | Restaurant items/categories/prices/photos and salon services/packages/prices/photos are stored separately. |
| Source confidence | Each fact records whether it came from MenuList, upload, website, manual entry, connected source, or generated fallback. |
| Brand kit | Logo, colors, tone, local-language preference, and Brand Playbook direction are stored once and reused. |
| Brand Playbook | Target audience, brand feel, style references, visual motifs, product/service focus, typography notes, and avoid list can be saved as bounded owner-edited fields. |
| Campaign readiness | Business Brain exposes missing data such as no WhatsApp number, no photos, no prices, or low-confidence extraction. |

## User Flows

1. A restaurant connects MenuList or uploads a menu, confirms detected items, and sees campaign cues.
2. A salon uploads a service list, adds booking CTA, confirms before/after consent only when needed, and sees booking cues.
3. An agency creates a client Business Brain and generates weekly packs.
4. A multi-location manager links each location to local source data and inherits shared brand defaults.

## Risks

- Wrong source authority can create wrong public campaigns.
- Over-collecting data slows onboarding.
- Generic brand settings can make outputs look repetitive.
- Brand Playbook must guide briefs and proof review without becoming a generic brand-generation tool.
- Missing consent on salon assets can block campaigns later.
