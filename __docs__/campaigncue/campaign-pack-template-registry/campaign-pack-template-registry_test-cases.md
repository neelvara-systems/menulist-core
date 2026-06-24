# Campaign Pack Template Registry - Test Cases

## Category Resolution

| Case | Expected |
| --- | --- |
| Store has `businessCategory=food` | Reads `campaigncuePlatformPackTemplates/food`. |
| Store has `businessType=Salon` and no stored category | Resolves to `service` and reads `campaigncuePlatformPackTemplates/service`. |
| Store has unknown type/category | Falls back to `specialty`. |
| Business category is invalid mixed case text | Normalizes only if it matches shared `BUSINESS_CATEGORIES`; otherwise fallback path applies. |

## Platform Catalog

| Case | Expected |
| --- | --- |
| Category catalog loads | Exactly one platform catalog doc is read. |
| Shared Diwali template applies to food and retail | Metadata summary exists in both category docs; payload path may be shared. |
| Search for `diwali` | Filters loaded in-memory summaries; no extra Firestore read. |
| Search by channel `whatsapp` | Filters loaded category data; no server query. |
| Owner chooses `Source-to-channel pack` output | Filters loaded category/workspace summaries in memory and can create a bounded WhatsApp/Google/local/creative/manual-task campaign pack from the current cue. |
| Owner chooses `WhatsApp sales pack` output | Filters loaded category/workspace summaries in memory by output type, channel, kind, required fact, and tags. |
| Owner switches from WhatsApp to Google to print | No additional platform catalog, workspace index, Storage, provider, or Cloud Function call. |
| Owner chooses output intent with no matching template | Owner can still create a bounded channel pack from the current cue. |
| Owner chooses Campaign Proof Deck | Filters locally by `campaign_proof_deck_pdf` and keeps the proof deck as a review artifact inside the pack. |
| Owner chooses custom size | Opens the existing blank shared-editor flow; no template marketplace or new persistence path is created. |
| Overflow doc exists | Not read until owner clicks "More templates". |
| Platform summary lacks payload path | Seed/admin verifier rejects it. |
| Platform doc exceeds soft limit | Seed/admin verifier rejects publish. |

## Workspace Saved Templates

| Case | Expected |
| --- | --- |
| Owner opens saved templates | Reads one `packTemplateIndexes/default` doc. |
| Owner saves pack | Reads current index, writes bounded summary, uploads Storage payload. |
| Owner saves pack from active Campaign Pack editor | Saves the neutral editor document as a Storage artifact with the template. |
| Owner opens saved pack | Downloads payload and rehydrates current facts. |
| Owner opens saved pack with editor document | Opens the shared editor with task, protected-fact, Trust Center, delivery, result-memory, and mobile-review context intact. |
| Saved pack has old price | Shows missing/review state until current price is confirmed. |
| Saved pack has old phone | Uses current Business Brain phone or asks owner to choose. |
| Saved pack has Brand Playbook fields | Search/style tags use saved owner fields, then reopen against current Business Brain playbook truth. |
| Owner deletes saved pack | Rewrites index and deletes workspace Storage payloads. |

## Trust and Safety

| Case | Expected |
| --- | --- |
| Template requires price but price missing | Pack cannot be marked ready. |
| Template includes date but end date missing | Missing-input card appears. |
| Template includes person photo | Rights/consent review is shown. |
| Template references external image URL | Rejected before save/use. |
| Template tries to persist signed URL | Rejected. |
| Template payload includes Fabric JSON as truth | Rejected; durable truth must be CampaignCue pack payload and neutral editor document. |

## Product Boundary

| Case | Expected |
| --- | --- |
| CampaignCue code references `storeAssetTemplates` | Verifier fails. |
| Shared editor imports CampaignCue template DAL | Verifier fails. |
| Template action attempts direct social posting | Rejected; delivery is manual export/copy. |
| Template recommendation asks a model what to promote | Rejected; Decision Engine and tags own ranking. |
| CueLayers reused image is saved as a generic pack template automatically | Rejected; CueLayers source-package preservation remains the durable reuse artifact. |
| Output picker labels become generic format catalog | Rejected; owner-facing labels must stay business-use based. |

## Mobile

| Case | Expected |
| --- | --- |
| Owner selects a template on phone | Template card and missing inputs are usable with 44px targets. |
| Owner selects output intent on phone | Uses short chips/cards and local filtering over already-loaded summaries. |
| Owner tries precise layer editing on phone | UI routes to limited editor behavior or desktop-preferred messaging. |
| Mobile template search | Uses loaded category doc; no mobile-only read path. |
