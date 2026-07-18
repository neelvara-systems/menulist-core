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
| Owner chooses `WhatsApp sales pack` output | Filters loaded category/workspace summaries in memory by output type, channel, compatible kind, fact tags, and search tags. |
| Owner switches from WhatsApp to Google to print | No additional platform catalog, workspace index, Storage, provider, or Cloud Function call. |
| Owner chooses output intent with no matching template | Owner can still create a bounded channel pack from the current cue. |
| Owner chooses Campaign Proof Deck | Filters locally by `campaign_proof_deck_pdf` and keeps the proof deck as a review artifact inside the pack. |
| Owner chooses custom size | Opens the existing blank shared-editor flow; no template marketplace or new persistence path is created. |
| Owner chooses Reuse old poster/image | Opens the existing CueLayers upload path; it does not create a normal campaign record. |
| Output intent has grouped alternatives | Any confirmed alternative satisfies the group; unrelated fact matches do not bypass the requirement. |
| Booking intent has no booking/service candidate | UI stops before the request and the server rejects a forged request; the current unrelated campaign recipe is not relabeled as a booking pack. |
| Client changes channels while sending an output intent | Server derives channels from the canonical intent registry rather than trusting the client array. |
| Output intent is accepted | Existing campaign pack stores source-template id when present, output-intent id, and requested output types; derived output pack and bundle manifest preserve that focus. |
| Owner double-clicks a picker action | Picker action is disabled while the first open/create request is active. |
| Overflow doc exists | Not read until owner clicks "More templates". |
| Platform summary lacks payload path | Seed/admin verifier rejects it. |
| Platform doc exceeds soft limit | Seed/admin verifier rejects publish. |

## Workspace Saved Templates

| Case | Expected |
| --- | --- |
| Owner opens saved templates | Reads one `packTemplateIndexes/default` doc. |
| Owner saves pack | Transactionally reads/writes the bounded index and uploads immutable-version Storage artifacts. |
| Owner saves pack from active Campaign Pack editor | Saves only reusable layout truth; image layers, old text/QR values, source refs, and old campaign identity are removed. |
| Owner opens saved pack | Downloads payload and rehydrates current facts. |
| Owner opens saved pack with editor document and required fact slots | Routes to missing inputs before the editor can open. |
| Owner opens saved pack with editor document and no required slots | Hydrates current Business Brain values and opens the shared editor with task, protected-fact, Trust Center, delivery, result-memory, and mobile-review context intact. |
| Saved pack has old price | Shows missing/review state until current price is confirmed. |
| Saved pack has old phone | Uses current Business Brain phone or asks owner to choose. |
| Saved pack has Brand Playbook fields | Search/style tags use saved owner fields, then reopen against current Business Brain playbook truth. |
| Required fact exists in current Business Brain | Deterministic readiness marks that slot confirmed without a provider call. |
| Required fact type is unknown or evidence is stale/blocked | Slot remains unresolved and the owner is routed to inputs. |
| Summary required/optional fact types differ from payload slots | Template is rejected before application. |
| Owner deletes saved pack | Rewrites index and deletes workspace Storage payloads. |

## Trust and Safety

| Case | Expected |
| --- | --- |
| Template requires price but price missing | Pack cannot be marked ready. |
| Template includes date but end date missing | Missing-input card appears. |
| Template includes person photo | Rights/consent review is shown. |
| Template references external image URL | Rejected before save/use. |
| Template tries to persist signed URL | Rejected. |
| Workspace summary points to an arbitrary nested JSON file | Rejected before Storage download. |
| Catalog/index identity or payload template id/schema mismatches | Rejected before use. |
| Preview is not a PNG/JPEG/WebP data URL | Rejected instead of silently discarded. |
| Template payload includes Fabric JSON as truth | Rejected; durable truth must be CampaignCue pack payload and neutral editor document. |

## Product Boundary

| Case | Expected |
| --- | --- |
| CampaignCue code references `storeAssetTemplates` | Verifier fails. |
| Shared editor imports CampaignCue template DAL | Verifier fails. |
| Template action attempts direct social posting | Rejected; delivery is manual export/copy. |
| Campaign API receives custom-size/reuse intent | Rejected because those intents belong to the editor/CueLayers paths. |
| Campaign API receives unknown output intent or unknown request field | Strict schema rejects it. |
| Campaign reuse is combined with output intent/template provenance | Strict schema rejects the conflicting modes. |
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
