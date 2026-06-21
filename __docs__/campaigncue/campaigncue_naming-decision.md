# CampaignCue Naming Decision

**Decision date:** June 11, 2026
**Selected name:** CampaignCue
**Primary domain target:** `campaigncue.ai`

## Decision

Use **CampaignCue.ai** as the working product name.

CampaignCue fits the product loop better than the earlier ChatGPT preference `SignalPack`. The product does not only package signals. It gives the business a cue, creates the campaign, checks it, and prepares it for use.

## Naming Criteria

| Criterion | CampaignCue fit |
| --- | --- |
| Explains the product | Strong: a campaign starts from a cue. |
| Avoids generic AI-tool framing | Strong: not "AI banner", "AI UGC", or "content generator". |
| Works for restaurants and salons | Strong: cue can mean top item, open slots, festival, new service, missing asset, stale source. |
| Works for agencies and multi-location | Strong: cue can be per client or per outlet. |
| Same-repo product boundary | Strong: distinct from MenuList, Answerlattice, GrowthOS, KitStamp. |
| Domain path | `campaigncue.ai` had an available-looking WHOIS signal during validation; registrar checkout remains final. |

## Current Domain Signals

Domain availability can change at any time. During live validation:

| Name | Domain | Signal | Decision |
| --- | --- | --- | --- |
| CampaignCue | `campaigncue.ai` | Available-looking WHOIS signal | Preferred |
| PromoCue | `promocue.ai` | Available-looking WHOIS signal | Backup |
| OfferCue | `offercue.ai` | Available-looking WHOIS signal | Backup |
| BriefPack | `briefpack.ai` | Available-looking WHOIS signal | Backup, agency leaning |
| PackCue | `packcue.ai` | Available-looking WHOIS signal | Backup, less natural |
| BriefCue | `briefcue.com` | Registered on June 9, 2026 in WHOIS validation | Rejected |
| SignalPack | `signalpack.ai` | Available-looking, but visible exact-name packaging/social conflicts | Rejected as weaker fit |
| StoreCue | `storecue.ai` | Visible Shopify app conflict | Rejected |
| DailyCue | `dailycue.ai` | Visible active products/conflicts | Rejected |
| PromoForge | `promoforge.ai` | Visible product/app conflicts | Rejected |

## Naming Guardrails

- Use `CampaignCue` as the product display name.
- Use `campaigncue` as the product slug.
- Use `CC` as the internal product code for stored product identity and product-scoped metadata.
- Do not use `CC` as an env-key prefix, route slug, Firebase file prefix, Storage path prefix, or public domain label.
- Do not use `GrowthOS`, `SignalPack`, `Local Business Campaign Engine`, or `Campaign Engine` as public names.
- Do not market it as "AI Canva", "UGC generator", "social scheduler", or "MenuList marketing".
