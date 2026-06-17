# AI Menu Manager - Firebase Cost Tracking

**Status:** Initial implementation validated - cost model active for implemented foundation
**Cost posture:** Firestore cost is the top constraint
**Last Updated:** June 17, 2026

---

## Summary

AI Menu Manager must be compact by default.

It must not write one Firestore document per chat message, token, provider chunk, small event, card render, or internal state transition. The owner-facing session should be a compact current-state document, actionable cards should have proposal documents, and heavy artifacts should live in Storage.

Estimated default cost at 1,000 stores with 10 AMM commands per store per month:

- Session/inbox reads: low, because one compact session doc is the default load.
- Proposal writes: proportional to actionable cards only.
- Project writes: same cost as manual action because AMM uses existing project update path.
- AI/provider accounting: existing AI operation accounting where reused.
- Storage: low unless generated images/import artifacts are used heavily.

---

## Cost Tightening Requirements

These requirements are part of the implementation contract, not optional improvements.

### Compact Document Caps

AMM compact documents must have explicit caps so a busy owner session cannot grow toward Firestore document-size limits.

| Field | Required cap |
| --- | --- |
| `compactMessages` | Keep only recent compact message summaries, target max 20. Store full transcript/debug text in Storage only when needed. |
| `pendingCardSummaries` | Keep only active actionable card summaries, target max 25. Resolved card detail stays on proposal docs. |
| `recentReceiptSummaries` | Keep only recent receipts, target max 20. Full receipt stays on the proposal doc. |
| `artifactRefs` | Keep only current artifact pointers, target max 20. Large artifact manifests move to Storage. |
| `idempotencyKeys` | Keep only recent keys required for retry protection, target max 10 per proposal. |

If implementation needs a different cap, the cap must be named in code and the cost verifier must assert it.

### Active Inbox Pattern

Opening AMM must not query older daily sessions to find unresolved cards.

Required pattern:

- current day/session doc contains the fast owner timeline.
- active pending cards are available from the current session summary or a deterministic active-inbox summary.
- proposal detail docs load only when the owner opens a card or when the compact summary is stale.
- historical sessions load only from paginated history.

### Deterministic IDs

Use deterministic IDs where safe:

- daily session ID derived from tenant, store, project, and date.
- idempotency-keyed command/proposal creation to avoid duplicate proposal writes.
- deterministic manual-task/export IDs when retrying the same approved operation.

This avoids extra get-or-create reads and duplicate proposal documents during retries.

Implementation requirement: retry safety must cover the transaction body, not only the client-generated id. If a deterministic proposal document already exists, AMM must return the existing card and avoid appending duplicate compact messages, pending summaries, proposal writes, approval counters, execution counters, or receipt summaries.

### Batched Mutation Preference

When the owner approves multiple related cards together, AMM should merge safe project patches into one existing project update.

Examples:

- bulk price approval.
- batch availability approval.
- description repair batch.
- approve-all generated description updates.
- multi-card import review where the existing review flow already supports one save.

Do not batch across unrelated risk classes if it makes approval unclear.

### Storage Lifecycle Preference

Generated drafts, debug artifacts, raw provider traces, and upload review artifacts should prefer Firebase Storage lifecycle rules or existing cleanup paths.

Do not add a standalone AMM cleanup scheduler. If cleanup work must run in code, it must follow the existing consolidated scheduler discipline and include a Firestore lease and cost note.

### Polling Backoff

Job-card polling must be bounded:

- poll only visible active job cards.
- use backoff after the first short interval.
- stop polling when the tab, route, or mobile screen is backgrounded.
- stop polling when the proposal reaches terminal status.
- never poll all historical proposals.

---

## Collections

| Collection | Purpose | Access model |
| --- | --- | --- |
| `aiMenuManagerSessions` | Compact session/day timeline, pending summaries, recent receipts | Protected API or tenant-scoped client read only if explicitly approved |
| `aiMenuManagerProposals` | Actionable cards and operation records | Protected API; direct client writes not allowed |
| `aiMenuManagerRules` | Owner-approved deterministic rules | Protected API; explicit owner approval |
| `projects/{tId}/{sId}/{projectId}` | Existing menu truth | Existing `updateProject()` / approved mutation path |
| `menuChangeLog/{tId}/{sId}` | Existing silent menu change memory | Existing side effects only |
| `menuSnapshots/{tId}/{sId}` | Existing publish snapshots | Existing publish path only |
| `menuImageProcessingJobs` | Existing menu extraction jobs | Existing extraction API |
| AI operation/accounting collections | Existing provider accounting | Existing AI routes only |
| Guest feedback collections | Existing feedback inbox/reply/status truth | Existing guest feedback DAL only |
| Screen/campaign collections | Existing digital screen state and slide truth | Existing campaign/screen DAL only |
| PWA/customer app docs | Existing customer app settings/icon override truth | Existing PWA DAL only |

No new `aiMenuManagerEvents` collection by default.

---

## Storage Paths

| Path | Purpose |
| --- | --- |
| `aiMenuManager/{tId}/{sId}/{sessionId}/{artifactId}.json` | Full transcript, raw AI response, large diff, debug trace |
| `aiMenuManager/{tId}/{sId}/{sessionId}/uploads/{artifactId}` | Owner-uploaded command attachment refs when not already in existing upload paths |
| `aiMenuManager/{tId}/{sId}/{sessionId}/images/{artifactId}` | Generated image variants before owner applies one to menu |

Firestore stores only refs:

- storage path
- content type
- byte size
- checksum
- purpose
- retention marker

---

## Firestore Operations

Every executable adapter must mirror the cost class declared in [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md). If an implementation changes an action from local/export/manual to a project, store, job, staff, outlet, or provider-backed mutation, the checklist and this cost doc must be updated in the same change.

### Load AMM Screen

| Operation | Collection | Trigger | Docs read | Notes |
| --- | --- | --- | --- | --- |
| Load current session summary | `aiMenuManagerSessions` | AMM route open | 1 | Contains compact messages, pending card summaries, receipts. |
| Load proposal detail | `aiMenuManagerProposals` | Owner opens a card | 1 per opened card | Avoid loading all proposal details on first paint. |
| Load menu context packet | `projects` or cache | Command only when cache miss | 0-1 | Prefer cached packet keyed by project update marker. |

Cost rule: opening AMM should not query all proposals, all messages, all menu items, and all past receipts.

Cost rule: unresolved cards must not require scanning previous daily sessions.

Cost rule: AMM context packets are built for the selected store and selected project shown in the AMM selectors. Opening AMM must not load every project for the store by default.

### Submit Command

| Operation | Collection | Trigger | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| Get/create session | `aiMenuManagerSessions` | Command submit | 0-1 | 1 merge | Reuse deterministic current day/session doc. |
| Build context packet | cache / `projects` | Cache miss | 0-1 | 0 | No repeated project scans if cache is valid. |
| Create proposals | `aiMenuManagerProposals` | Actionable cards | 0 | N | N equals actionable cards, not messages. |
| Update session summary | `aiMenuManagerSessions` | After proposals | 0 | 1 merge | Store compact card summaries only. |

### Approve Card

| Operation | Collection | Trigger | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| Lock proposal | `aiMenuManagerProposals` | Approve/edit/cancel | 1 | 1 | Uses idempotency key. |
| Execute project mutation | `projects` | Approved project action | Existing `updateProject()` cost | Existing `updateProject()` cost | Preserves MCE/MOL/cache path. |
| Complete proposal | `aiMenuManagerProposals` | After execution | 0-1 | 1 | Store receipt summary and execution status. |
| Update session summary | `aiMenuManagerSessions` | After completion | 0 | 1 merge | Move card from pending to recent receipt. |

Existing `updateProject()` may fetch old project state when MCE/MOL/master awareness is enabled, then writes the project and triggers revalidation. Evidence: `src/database/projects/index.ts:931`, `src/database/projects/index.ts:995`, `src/database/projects/index.ts:1003`, `src/database/projects/index.ts:1070`.

If several approved cards share the same project, risk class, and approval scope, implementation should prefer one merged `updateProject()` call over multiple sequential project writes.

AMM must treat `storeId` and `projectId` as the current selector context. Store-level actions use the selected store. Project-level actions use the selected project. Cross-project, all-project, or all-store behavior is not the default and requires an explicit scope proposal before execution.

Production hardening note: approval and completion requests must echo the selected `projectId` and `actionType`. The server verifies them against the proposal before locking or completing the card. Approval also rebuilds the compact selected-project context and rejects stale cards when the stored base hash no longer matches.

### Image Generation

| Operation | Source | Cost behavior |
| --- | --- | --- |
| Generate image | Existing `/api/image-generation` | Existing capacity/accounting writes and provider logging. |
| Store generated variant | Storage | Only if persisted for approval card. |
| Apply selected image | Existing project update path | Same as manual image apply. |

Evidence: `src/app/api/image-generation/route.ts:106`, `src/app/api/image-generation/route.ts:220`.

### Menu Import

| Operation | Source | Cost behavior |
| --- | --- | --- |
| Start extraction job | Existing `/api/menu-extraction/jobs` | One job doc write after safe mode, tenant, validation, and rate limit. |
| Reuse active/completed job | Existing API | Can avoid duplicate job write and cleanup unreferenced uploads. |
| Review/apply result | Existing extraction review/project update flow | Same as current import. |

Evidence: `src/app/api/menu-extraction/jobs/route.ts:491`, `src/app/api/menu-extraction/jobs/route.ts:523`, `src/app/api/menu-extraction/jobs/route.ts:642`.

### Mobile PWA Operational Actions

Mobile AMM action costs must follow the existing manual mobile screen costs:

| Action family | Existing path | AMM cost rule |
| --- | --- | --- |
| Store profile, locale, hours, time slots | `updateStore()` and `updateTimeSlotPresets()` | Use existing store writes; no AMM-specific mirror doc beyond proposal/receipt. |
| Public presence, social links, business attributes, SEO, analytics, feedback settings | `updateStore()` | Use one approved store save where possible; public-impact cards must show before/after. |
| Domain checks/connect/verify/remove | Existing domain/subdomain APIs and store DAL checks | Reuse guarded API/check behavior; do not poll DNS/provider state unboundedly. |
| Customer app settings/icon | Existing PWA DAL and Storage upload paths | PWA settings stay in current docs; icon media uses existing Storage behavior. |
| Digital screens | Existing campaign/screen DAL and Storage slide paths | Screen state, override, slide upload/caption/delete stay in current screen docs; large slide media remains Storage-backed. |
| Feedback inbox/reply/status | Existing guest feedback DAL | Read bounded recent feedback only; status/reply updates touch the existing feedback doc. |
| POS sync | Existing store update path and POS test API | Settings/secret changes are guarded store writes; tests use existing API and should not become polling loops. |
| Integration status | Existing status/read surface | Read-only/status card unless a first-party mutation adapter exists. |
| Share/export/menu kits/QR/native share | Browser-local or native share/download | Keep `C0 local`; do not write proposal detail unless the owner explicitly asks AMM to track the task. |
| Compliance pages | Existing `/api/compliance` guarded API | Status loads use the existing API/cache behavior; override/reset writes stay in the compliance document only. |
| Customer communication templates | Existing browser-local template generator | Keep generation/copy/share `C0 local`; no proposal doc unless owner asks AMM to retain the message. |
| Sharable item cards, menu kit assets, print previews, physical surfaces | Browser-local canvas/PDF/native-share utilities | Keep preview/download/share `C0 local`; no AMM artifact write unless a durable receipt is required. |
| Menu presence monitor | Existing `updateMenuPresence()` store write | Confirm/unconfirm touches current store presence fields only; status uses loaded store context. |
| Reviews/reputation guard | Disabled review APIs and guarded suggestion route | No AMM polling or direct external posting; if enabled later, keep bounded status reads and suggestion accounting. |
| New item metadata and image editing | Existing accounted AI APIs | Draft-only proposal cards; applying output uses the normal item/image approval path. |
| POS setup helpers | Existing POS settings UI and store fields | Copy/download helpers stay local; instruction email draft may update the existing daily instruction count only. |

Cost optimization scope found in the mobile sweep:

- Mobile share/export operations should remain browser-local by default.
- Mobile action adapters should reuse the existing mobile screen DAL/API; do not add mobile-only AMM collections.
- Bounded read cards such as feedback inbox, digital screen status, POS test, domain verify, and integration status need explicit result caps and stop conditions.
- Store-level changes from multiple related cards can merge into one existing `updateStore()` call only when approval scope remains clear.
- Feature-doc sweep additions should prefer local cards first: communication templates, item share cards, physical surfaces, print previews, menu kit asset share, POS technical summary copy, and sample payload download must not create Firestore writes by default.
- Compliance and review-status cards should avoid repeated API calls from the same open AMM session; use the compact session/card summary or short-lived cache for already loaded status.
- Presence confirmations should write only the specific `menuPresence.{surface}` field through the current DAL and should not create a separate AMM mirror collection.
- POS instruction drafts must preserve the existing daily-send count and should never store the webhook secret in AMM proposal/session documents.

---

## Cache Plan

### Server Cache

Use `unstable_cache` or Redis/Upstash for:

- menu context packet.
- current pending inbox summary.
- recent receipt summary.
- action registry metadata.

Cache key:

```text
ai-menu-manager:{tId}:{sId}:{projectId}:{projectUpdatedAtOrHash}
```

Invalidate after:

- project update completion.
- proposal completion that changes project/store truth.
- import completion.
- generated image apply.
- rule execution.

### Browser Cache

Use browser cache only for:

- current composer draft.
- last opened card id.
- optimistic card state while request is in flight.

Do not store sensitive raw provider responses in browser local storage.

---

## Storage Retention

| Artifact | Default retention |
| --- | --- |
| Compact session doc | 30-90 days, configurable |
| Resolved low-risk proposal | 30 days |
| High-risk approved proposal/receipt | 180 days or product decision |
| Generated image draft not applied | 7-14 days |
| Debug prompt/response artifact | 14 days only when debug flag is enabled |
| Manual task/export artifact | 30-90 days depending use |

Use `expiresAt` where cleanup/TTL exists. If TTL is not configured, docs must not claim automatic deletion.

---

## Cost Rules By Action

The table below is the family-level cost rule. Exact per-action cost classes are tracked in `ai-menu-manager_action-type-checklist.md`.

| Action family | Additional Firebase cost over manual path |
| --- | --- |
| Price/availability/theme/item/category/attribute patch | 1 proposal write + 1 completion write + compact session merge; project write cost same as manual. |
| Image generation | Existing image generation accounting/storage plus proposal/session writes. |
| Menu import | Existing extraction job cost plus proposal/session writes. |
| Project metadata, active status, and cover image | Existing project metadata/summary/cache path plus proposal/session writes; cover image may add Storage cost. |
| Store/Official Business Page updates | Existing `updateStore()` store doc, summary sync, and cache invalidation plus proposal/session writes. |
| Outlet store customization | Existing outlet-save guarded API path plus proposal/session writes; no direct client bypass of outlet policy. |
| Browser export/share | Proposal/session write only when AMM needs a durable card or receipt; export artifact can remain browser-local when current manual flow is browser-local. |
| Staff/access actions | Existing guarded staff API cost plus proposal/session writes; no direct Firestore client mutation. |
| Manual task | Proposal/session writes only unless artifact export is generated. |
| Rule suggestion | Proposal/session writes; rule doc write only after explicit approval. |
| Rule execution | One proposal/receipt update plus existing project mutation path. |

---

## Forbidden Cost Patterns

- Firestore write per token.
- Firestore write per streamed word.
- Firestore document per non-action chat message.
- Unbounded listener on all sessions or all proposals.
- Scanning all historical sessions on screen load.
- Querying old daily sessions to find active cards.
- Re-reading full project data for every card render.
- Storing base64 generated images inside Firestore.
- New scheduled function for AMM outside consolidated scheduler discipline.
- Polling invisible, backgrounded, resolved, or historical job cards.

---

## Cost Verification Checklist

Before implementation can be accepted:

- [ ] Opening AMM reads no more than one session summary plus bounded active card details.
- [ ] Active pending cards are found without scanning historical daily sessions.
- [ ] Command submit reads no more than one project/store packet on cache miss.
- [ ] No raw provider payload is stored in Firestore.
- [ ] Session/proposal arrays enforce explicit max lengths.
- [ ] Deterministic IDs or idempotency keys prevent duplicate proposal creation on retry.
- [ ] Related approved patches merge into one project update where safe.
- [ ] Adapter metadata cost class matches `ai-menu-manager_action-type-checklist.md`.
- [ ] Every proposal write has an owner-visible card or receipt reason.
- [ ] Project-truth changes go through existing update/revalidation path.
- [ ] Image generation uses existing AI accounting.
- [ ] Extraction uses existing extraction job flow.
- [ ] Job-card polling stops on background, terminal status, and hidden card state.
- [ ] Generated drafts/debug artifacts use Storage retention or existing cleanup discipline.
- [ ] Rules are explicit docs only after owner approval.
- [ ] `git diff --check` passes.
- [ ] Dedicated verifier reports no unregistered write adapters.
