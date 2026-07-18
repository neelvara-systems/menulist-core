# Campaign Pack Template Registry - Firebase Cost

## Cost Verdict

The selected architecture is Firebase-cost optimized:

- one platform category catalog read for normal template browsing,
- optional one workspace saved-template index read when saved templates are shown,
- full payloads in Storage only when the owner opens a template,
- no realtime listener,
- no provider call,
- no Cloud Function required for owner browsing.

## Firestore Collections

```text
campaigncuePlatformPackTemplates/{businessCategory}
campaigncueWorkspaces/{workspaceId}/packTemplateIndexes/default
```

Allowed platform doc ids must come from the shared category values:

```text
service
retail
food
professional
creative
health
specialty
```

Overflow docs are allowed only with suffixes such as:

```text
food_2
service_2
```

They are not loaded by default.

## Storage Paths

```text
campaigncue/templates/platform/{businessCategory}/{templateId}/pack-template-{contentHash}.json
campaigncue/templates/platform/{businessCategory}/{templateId}/editor-document-{contentHash}.json
campaigncue/templates/platform/{businessCategory}/{templateId}/preview-{contentHash}.webp
campaigncue/templates/platform/shared/{templateId}/pack-template-{contentHash}.json
campaigncue/templates/workspaces/{workspaceId}/{templateId}/versions/{saveId}/pack-template.json
campaigncue/templates/workspaces/{workspaceId}/{templateId}/versions/{saveId}/editor-document.json
campaigncue/templates/workspaces/{workspaceId}/{templateId}/versions/{saveId}/preview.webp
```

## Operation Ledger

| Operation | Firestore Reads | Firestore Writes | Storage | Cloud Functions | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Resolve owner category | 0 | 0 | 0 | 0 | Uses already-loaded business type/category from overview/session state. |
| Load platform templates | 1 | 0 | 0 | 0 | Reads one `campaigncuePlatformPackTemplates/{businessCategory}` doc. |
| Search/filter templates | 0 | 0 | 0 | 0 | In-memory filtering over loaded summary metadata. |
| Choose campaign output intent | 0 | 0 | 0 | 0 | In-memory filter plus deterministic requirement/decision preflight over already-loaded overview and template summaries. |
| Create campaign from output intent | Existing campaign-create reads | Existing campaign batch only | 0 | 0 | Server rechecks canonical intent requirements/decision/channels and stores bounded intent, requested-output, and optional template provenance in the existing campaign document. No extra document or write. |
| Choose Campaign Proof Deck intent | 0 | 0 | 0 | 0 | Uses the same in-memory output picker and existing output-pack proof deck field. |
| Open platform template | 0 | 0 | 1-2 downloads | 0 | Downloads pack payload and optional editor document from Storage. |
| Load saved workspace templates | 1 | 0 | 0 | 0 | Reads `campaigncueWorkspaces/{workspaceId}/packTemplateIndexes/default` only when saved templates are shown. |
| Save workspace template | 1 baseline | 1 | 1-3 uploads | 0 | A Firestore transaction reads/writes the bounded index; contention may retry the transaction read. Immutable payload/editor/preview artifacts upload first. Ambiguous write failures probe the index before cleanup. Unexpected cleanup failures log bounded diagnostics; missing objects are expected no-ops. |
| Delete workspace template | 1 baseline | 0-1 | Up to 3 deletes | 0 | A transaction removes the summary only when present; contention may retry the read. Storage cleanup follows visible index removal, with an ambiguity probe on failure. |
| Load overflow templates | 1 | 0 | 0 | 0 | Only after explicit owner action such as "More templates". |
| Admin seed platform catalogs | 0 | One batched write per category doc | Up to N create attempts | 0 | Platform/admin tooling only; explicit project/bucket target, create-only content-hashed payloads first, then one atomic catalog batch. Existing hash objects are not overwritten on rerun. |

## Default Owner Cost

Normal CampaignCue owner template browsing:

```text
1 Firestore read
0 writes
0 Storage downloads until open
0 provider calls
0 Cloud Function calls
```

If saved templates are visible in the same panel:

```text
2 Firestore reads total
0 writes
0 Storage downloads until open
```

Changing the selected output intent after the templates are loaded, including Source-to-channel pack and Campaign Proof Deck:

```text
0 additional Firestore reads
0 writes
0 Storage downloads
0 provider calls
```

When a selected template opens a saved editor document, the output intent stays local: CampaignCue adds the intent as editor context, task guidance, output/print format focus, and manual delivery instruction after the template payload is hydrated. It does not read a separate output catalog. If the owner creates a campaign, the existing campaign write stores only compact intent/provenance fields.

## Why Category Docs Instead Of One Global Doc

One global doc is cheapest for a small universal catalog, but CampaignCue must support category-aware usefulness. A food business should not scan salon-heavy metadata, and a salon should not see restaurant-first template ranking.

Category docs keep the normal cost at one read while improving:

- search relevance,
- business-type alignment,
- soft limit control,
- category-specific curation,
- template quality review.

Shared event templates can be repeated as metadata in relevant category docs. This small duplication is cheaper than reading a shared/generic catalog every time.

## Overflow Rule

Overflow docs must be treated as optional second-read surfaces.

Allowed:

- owner clicks "More templates",
- owner opens a seasonal library view,
- platform/admin manager edits overflow content.

Not allowed:

- reading `default` plus all overflow docs on page load,
- reading all category docs for search,
- hidden background reads for global template counts.

## Firestore Document Growth Guardrails

- Store summaries only.
- No full `CreativeEditorDocument` in Firestore.
- No generated PNG/PDF in Firestore.
- No base64 thumbnail in Firestore.
- No signed URL in Firestore.
- No external/signed URL, old visible business text, QR destination, or image layer in a saved workspace layout artifact.
- Storage downloads enforce payload/editor byte limits before the full object is returned.
- Workspace saves use immutable `{saveId}` paths, then transactionally replace the one bounded index summary.
- Enforce a soft byte limit in seed/admin tooling before publish.
- Cap active templates per category.
- Move retired templates out of active docs.
- Keep `default` category docs focused on active curated templates only.
- Keep source-to-channel, WhatsApp, Google, Instagram, print, staff, ads, reuse, and custom-size output choices as local filters over loaded summaries.

## Rules Expectations

| Path | Read | Write |
| --- | --- | --- |
| `campaigncuePlatformPackTemplates/{businessCategory}` | Signed-in CampaignCue workspace user or platform user | Platform/admin only |
| `campaigncueWorkspaces/{workspaceId}/packTemplateIndexes/default` | Workspace member | Workspace member under the current workspace-claim rule |
| `campaigncue/templates/platform/...` | Signed-in CampaignCue workspace user or platform user | Platform/admin only |
| `campaigncue/templates/workspaces/{workspaceId}/...` | Workspace member | Workspace member under the current workspace-claim rule and exact artifact allowlist |

## Rejected Cost Patterns

| Pattern | Reason |
| --- | --- |
| Read all platform category docs | Multiplies reads and exposes irrelevant templates. |
| Read generic plus category docs by default | Breaks the one-read platform goal. |
| Store full template payloads in Firestore | Bloats documents and creates document size risk. |
| Realtime listener for templates | Low value; templates change rarely. |
| Clone platform template on open | Creates writes for exploratory browsing. |
| Save workspace template automatically | Expensive and not owner-requested. |
| Provider call for template recommendations | Decision Engine and tags can rank templates deterministically. |
| Read a separate catalog for each output intent | Breaks the MenuList-style asset filtering cost pattern; filter already-loaded summaries instead. |
