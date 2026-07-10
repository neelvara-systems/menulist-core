# AI Menu Manager - Firebase Cost Tracking

**Status:** Initial implementation validated - cost model active for implemented foundation
**Cost posture:** Firestore cost is the top constraint
**Last Updated:** July 10, 2026

---

## Summary

AI Menu Manager must be compact by default.

It must not write one Firestore document per chat message, token, provider chunk, small event, card render, or internal state transition. The owner-facing session should be a compact current-state document. Normal deterministic selected-project cards stay in that compact session as capped pending operations; proposal documents are reserved for server-backed adapters that need provider secrets, import/upload jobs, external integration policy, or a durable operation ledger. Heavy artifacts should live in Storage.

Estimated default cost at 1,000 stores with 10 AMM commands per store per month:

- Session/inbox reads: low, because one compact session doc is the default load.
- Proposal writes: zero for normal deterministic cards; proportional only to server-backed/durable cards.
- Project writes: same cost as manual action because AMM uses existing project update path. Desktop and mobile approval flows require project-write acknowledgement before local project state or executed receipts update; this adds no extra read/write. Failed project-update receipt/proposal completion diagnostics change only failure logging and add no Firestore operations beyond the already-attempted completion writes.
- AI/provider accounting: deterministic routing runs first. An unresolved in-domain planner call uses one existing AI operation log write after a valid provider result and is platform-absorbed at zero owner units. Compact action contracts, bounded aliases, and the structured response schema change provider input/output quality only; they add no Firestore operation.
- Read-only domain answers: known questions use no provider and no extra Firestore read. Only unresolved in-domain language may use the planner; either path still uses one compact session write for the owner command/card.
- Storage: low unless generated images/import artifacts are used heavily.
- Browser-local copy/open/download card actions add no Firestore operations. Local-action hardening changes only bounded runtime diagnostics for failed desktop/mobile card actions, blocked URL opens, unavailable clipboard support, and failed textarea-copy fallbacks.

---

## Cost Tightening Requirements

These requirements are part of the implementation contract, not optional improvements.

### Compact Document Caps

AMM compact documents must have explicit caps so a busy owner session cannot grow toward Firestore document-size limits.

| Field | Required cap |
| --- | --- |
| `compactMessages` | Keep only recent compact message summaries, target max 20. Store full transcript/debug text in Storage only when needed. |
| `pendingCardSummaries` | Keep only active actionable card summaries, target max 25. Deterministic card detail stays in capped `pendingOperations`; server-backed card detail may stay on proposal docs. |
| `recentReceiptSummaries` | Keep only recent receipts, target max 20. Deterministic receipt detail stays compact; server-backed receipt detail may stay on the proposal doc. |
| `artifactRefs` | Keep only current artifact pointers, target max 20. Large artifact manifests move to Storage. |
| `idempotencyKeys` | Keep only recent keys required for retry protection, target max 10 per proposal. |

If implementation needs a different cap, the cap must be named in code and the cost verifier must assert it.

### Active Inbox Pattern

Opening AMM must not query older daily sessions to find unresolved cards.

Required pattern:

- current day/session doc contains the fast owner timeline.
- active pending cards are available from the current session summary or a deterministic active-inbox summary.
- proposal detail docs load only for server-backed cards or when a compact summary explicitly points to durable proposal detail.
- historical sessions load only from paginated history.

### Deterministic IDs

Use deterministic IDs where safe:

- daily session ID derived from tenant, store, project, and date.
- idempotency-keyed command/session/proposal creation to avoid duplicate compact operations or proposal writes.
- deterministic manual-task/export IDs when retrying the same approved operation.

This avoids extra get-or-create reads and duplicate compact operations or proposal documents during retries.

Implementation requirement: retry safety must cover the persisted session/proposal state, not only the client-generated id. If a deterministic operation already exists in the loaded compact session, AMM must update the same card rather than appending duplicate compact messages or pending summaries. If a server-backed proposal document already exists, AMM must return that existing card and avoid duplicate proposal writes, approval counters, execution counters, or receipt summaries.

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

### Server Fallback Request Admission

The normal deterministic AMM path stays client-DAL-first. Server fallback routes are capped before schema validation or Firestore work:

- AMM route ID boundary: supplied `sessionId` values must match deterministic `amm_` session IDs, route `proposalId` values must match deterministic `amm_prop_` proposal IDs, and selected `projectId` values must be simple bounded Firestore document IDs before any session, proposal, or selected-project document read.
- AMM server DAL ID boundary: `src/database/aiMenuManager/server.ts` repeats the same session/proposal/project ID admission before building session, proposal, scoped project, or legacy project document refs, and it filters stored pending-card proposal IDs before inbox proposal hydration.
- AMM scope document-ID admission: `src/lib/ai-menu-manager/routeIds.ts`, `src/lib/ai-menu-manager/apiGuards.ts`, and `src/database/aiMenuManager/server.ts` require exact positive safe-integer MenuList tenant/store document IDs before selected-store authorization, tenant access fallback checks, limiter scope material, scoped project reads, session/proposal scope comparisons, or AMM proposal/session writes.
- `POST /api/ai-menu-manager/command`: `DATA_WRITE` rate limit, then 64KB bounded JSON, then selected-store scope and project/proposal reads.
- `POST /api/ai-menu-manager/plan`: AI-operation rate limit, then one SAFE_MODE read when cost protection is enabled, then a 48KB bounded body, selected-store permission, free-capacity admission, and one bounded provider call. It does not read or write selected project/session/proposal truth; a valid provider result records one existing AI operation log document.
- `POST /api/ai-menu-manager/proposals/{proposalId}/actions`: `DATA_WRITE` rate limit, then 16KB bounded JSON, then selected-store scope and proposal/project checks.
- `POST /api/ai-menu-manager/proposals/{proposalId}/complete`: `DATA_WRITE` rate limit, then 16KB bounded JSON, then selected-store scope and proposal/project checks.

Rejected malformed, oversized, rate-limited, or route/query ID-invalid fallback requests add no AMM session/proposal writes and do not reach session, proposal, or selected-project reads.

AMM scope document-ID admission is cost-neutral for valid fallback requests. Malformed tenant/store scope fails before Firestore session/proposal/project reads or writes, and valid command, inbox, proposal action, and proposal completion requests keep the same compact session/proposal/project read/write counts. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

Browser response parsing is also bounded. The shared AMM client API reader caps command, inbox, proposal-action, and completion response JSON at 64KB and logs `ai_menu_manager_response_parse_failed` for malformed, oversized, or empty successful responses. This does not add Firestore reads/writes/deletes; it only makes bad acknowledgement bodies visible before the existing fixed owner failure path runs.

June 30 browser request-policy hardening is Firebase-cost neutral. Command fallback, inbox fallback, proposal action, and proposal completion browser calls now use same-origin credentials, `no-store` cache policy, and manual redirect handling before the shared 64KB response reader runs. This changes no compact session writes, proposal writes, project writes, provider calls, route ordering, Firestore rules/indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action.

June 29 shared guard hardening is Firebase-cost neutral. The AMM API guard keeps the same route-specific prefixes, `DATA_WRITE` limits, and request ordering, but hashes owner, tenant, and store key segments before storage in Upstash and records only presence/length metadata for rate-limit and selected-store violation scope diagnostics. June 30 follow-up: the same guard now uses bounded route security metadata for selected-store, tenant-access, rate-limit, and invalid-request security events instead of raw `buildSecurityContext()` output. This resets existing AMM fallback buckets once and changes no Firestore reads/writes/deletes, provider calls, cache invalidations, rules, indexes, schema fields, or owner UI behavior.

---

## Collections

| Collection | Purpose | Access model |
| --- | --- | --- |
| `aiMenuManagerSessions` | Compact session/day timeline, pending operation cards, recent receipts | Tenant/store-scoped client DAL for deterministic cards; protected API may also write server-backed cards |
| `aiMenuManagerProposals` | Server-backed actionable cards and durable operation records | Protected API/Admin SDK only; direct client writes not allowed |
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
| Sync Firebase Auth claims | existing auth sync | Route/bootstrap before direct DAL access | existing auth-sync cost only when claims are missing/stale | Required before top-level compact-session reads/writes; reuse existing `/api/auth/set-claims` behavior instead of adding AMM-specific auth routes. |
| Load current session summary | `aiMenuManagerSessions` | AMM route open | 1 | Contains compact messages, full pending operation cards, receipts. |
| Load active pending proposal cards | `aiMenuManagerProposals` | Server-backed adapters only | 0 by default | Deterministic selected-project cards do not read proposal docs. |
| Load menu context packet | `projects` or cache | Command only when cache miss | 0-1 | Prefer cached packet keyed by project update marker. |
| Permission fallback inbox | `aiMenuManagerSessions` and `aiMenuManagerProposals` | Only after direct session read returns Firestore `permission-denied` | bounded server read | Authenticated API enforces `MANAGE_MENU` without widening client rules. The fallback must not scan historical sessions. |

Cost rule: opening AMM should not query all proposals, all messages, all menu items, and all past receipts. The normal screen open reads the current selected-project daily session doc only; proposal docs are reserved for server-backed adapters.

Cost rule: unresolved cards must not require scanning previous daily sessions.

Cost rule: AMM context packets are built for the selected store and selected project shown in the AMM selectors. Opening AMM may load the existing bounded project-selector summary list, but must not load every project's full menu data or build context packets for non-selected projects.

### Submit Command

| Operation | Collection | Trigger | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| Ensure selected-store Firebase Auth claims | existing auth sync | Before direct session write | existing auth-sync cost only when stale | Prevents permission failures when platform/HQ users switch active store context. |
| Write updated compact session | `aiMenuManagerSessions` | Command submit | 0 AMM session reads | 1 write | Uses the loaded current-session snapshot, appends capped compact messages and pending operations locally, then writes the same daily doc. |
| Build context packet | selected project already loaded | Command submit | 0 additional | 0 | Deterministic commands use the selected project already in desktop/mobile state. |
| Resolve store context | active session | Command submit | 0 additional | 0 | Use active session/store context; do not read `stores/{sId}` for deterministic cards. |
| Choose Work on context | none | Composer context picker | 0 | 0 | Uses the selected project already loaded in memory. Item/category selections only rewrite the next owner message before resolver execution. |
| Pick starter card | none | Empty-state contextual starter | 0 | 0 | Starter cards are derived from the selected project already loaded in memory and only draft text or open the second suggestion layer. |
| Browse suggestion groups | none | Opening desktop inline tray or mobile sheet | 0 | 0 | Suggestions and second-layer guided choices are derived from the selected project already loaded in memory. Selecting a final option only fills the composer. |
| Pick clarification option | `aiMenuManagerSessions` | Card option row click | 0 additional | 1 compact session write | Clarification choices submit the selected answer plus one bounded structured entity selection when present, remove the old clarification, and create the next card in one compact session write. No proposal doc and no separate cancel write. |
| Short follow-up to one pending card | `aiMenuManagerSessions` | "Actually 25", "Try warmer", "Restore it" | 0 additional | 1 compact session write | The DAL uses the loaded compact session snapshot to rewrite the resolver input, replace the previous pending card, and keep the owner text as typed. |
| Compound deterministic command | `aiMenuManagerSessions` | Up to four independent registered project changes in one owner message | 0 additional | 1 compact session write | All cards are appended to the same capped daily session write. No proposal doc and no provider call are required. |
| Immediate duplicate command | loaded `aiMenuManagerSessions` snapshot | Same normalized text/context/base hash within ten seconds | 0 | 0 | Returns the matching pending card group already in memory. A later deliberate repeat remains a new command. |
| Answer selected-menu question | selected project already loaded | Questions like "What should I fix today?" or "Which items have no photos?" | 0 additional | included in compact session write | Uses `system_context_answer` from the loaded context packet; no provider call, no proposal doc, no external lookup. |
| Plan unresolved in-domain language | existing SAFE_MODE + AI operation log | Only after deterministic routing returns no outcome | 1 SAFE_MODE read when cost protection is enabled; 0 project/session/proposal reads | 1 existing AI operation log write after a valid provider result; no project/session/proposal write | Sends at most 32 relevant items, 18 categories, and 5 pending summaries. Provider receipts/completion claims and invalid/fabricated clarification IDs are rejected. Invalid/provider-failed results fall back without an AI operation log write or extra session write. |
| Store pending operation | `aiMenuManagerSessions` | Actionable card | included above | included above | Full card plus exact patch/hash/base-project marker is capped in `pendingOperations`. |
| Create proposal doc | `aiMenuManagerProposals` | Server-backed adapters only | 0 | N | Only when secrets/jobs/external policy/durable ledger require the server path. |
| Permission fallback command | `aiMenuManagerSessions` + `aiMenuManagerProposals` | Only after direct compact-session write returns Firestore `permission-denied` | bounded server reads | up to 1 session/proposal write | Sends only the bounded command payload, not full project/session JSON. This is an exception for `MANAGE_MENU` users whose Firebase Auth token cannot directly write the compact session. |

### Approve Card

| Operation | Collection | Trigger | Reads | Writes | Notes |
| --- | --- | --- | --- | --- | --- |
| Verify pending operation | in-memory selected session state | Approve deterministic card | 0 | 0 | The approved patch comes from the stored pending operation, not from freeform card text. |
| Execute project mutation | `projects` | Approved project action | Existing `updateProject()` cost | Existing `updateProject()` cost | Preserves MCE/MOL/cache path. |
| Execute grouped project mutations | `projects` | Approve all for one non-overlapping command group | Existing single `updateProject()` cost | Existing single `updateProject()` cost | Patches are revalidated and merged on one cloned project before one existing save. |
| Complete operation | `aiMenuManagerSessions` | After execution/manual done/cancel | 0 AMM session reads when the loaded session snapshot is passed | 1 session write | Move card from pending to recent receipt and append its compact receipt timeline entry in the same capped write. |
| Complete grouped operations | `aiMenuManagerSessions` | After grouped project save | 0 AMM session reads | 1 session write | Removes every completed group card and appends all capped receipt summaries/messages together. |
| Lock/complete proposal | `aiMenuManagerProposals` | Server-backed adapters only | 1-2 | 1-2 | Use only when the adapter requires the protected API path. |

Existing `updateProject()` may fetch old project state when MCE/MOL/master awareness is enabled, then writes the project and triggers revalidation. Evidence: `src/database/projects/index.ts:931`, `src/database/projects/index.ts:995`, `src/database/projects/index.ts:1003`, `src/database/projects/index.ts:1070`.

If several approved cards share the same project, risk class, and approval scope, implementation should prefer one merged `updateProject()` call over multiple sequential project writes.

Route-quality counters (`deterministicRoutes`, `plannerAttempts`, `plannerAccepted`, `plannerFallbacks`, `compoundCommands`, and `clarifications`) are aggregate numbers inside the same compact session write. They do not store raw prompts, provider payloads, per-token events, or new documents.

AMM must treat `storeId` and `projectId` as the current selector context. Store-level actions use the selected store. Project-level actions use the selected project. Cross-project, all-project, or all-store behavior is not the default and requires an explicit scope proposal before execution.

Production hardening note: deterministic client approval rebuilds the selected-project context and rejects stale cards when the stored base hash no longer matches. Server-backed approval and completion requests must echo the selected `projectId` and `actionType`; the server verifies them against the proposal before locking or completing the card.

Permission fallback note: when the server-backed fallback is used only because direct compact-session access was denied, the additional proposal/session cost is accepted to preserve tenant security without broadening Firestore rules. The fallback remains bounded, rate-limited, schema-validated, and payload-limited; it must not become the default deterministic path.

Scale estimate for two successful deterministic project operations after the screen is already open:

- AMM command overhead: 0 AMM session reads + 2 session writes.
- AMM completion overhead: 0 AMM session reads + 2 session writes when the loaded session snapshot is passed.
- Existing project mutation overhead: 2 existing `updateProject()` saves plus any enabled MCE/MOL/cache side effects.
- No proposal-doc reads/writes are needed for those deterministic operations.

If the owner requests those two non-overlapping operations in one accepted compound command and uses **Approve all**, the same work becomes 0 AMM session reads + 1 command session write + 1 existing `updateProject()` save + 1 completion session write. This optimization is not used when patches overlap, scope differs, or any segment is not a registered deterministic project proposal.

Planner-assisted commands do not change these AMM session counts. They add a provider call only when deterministic routing has no result, plus the SAFE_MODE read and existing AI operation accounting write described above. Exact commands, known diagnostics, local exports, unsupported external requests, and general out-of-scope questions add no provider cost.

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

Evidence: `src/app/api/menu-extraction/jobs/route.ts:490`, `src/app/api/menu-extraction/jobs/route.ts:522`, `src/app/api/menu-extraction/jobs/route.ts:640`.

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
| Reviews/reputation guard | Disabled review APIs and guarded suggestion route | No AMM polling or external-platform posting; disabled review APIs stay out of AMM mutation scope. |
| New item metadata and image editing | Existing accounted AI APIs | Draft-only proposal cards; applying output uses the normal item/image approval path. |
| POS setup helpers | Existing POS settings UI and store fields | Copy/download helpers stay local; instruction email draft may update the existing daily instruction count only. |

Cost optimization scope found in the mobile sweep:

- Mobile share/export operations should remain browser-local by default.
- Desktop and mobile AMM local copy actions remain `C0 local`: rejected Clipboard API writes retry the acknowledged textarea fallback and do not create proposal detail, artifact docs, or extra reads.
- Feedback link copy/open and feedback QR download are `C0 local` card controls. AMM may keep the compact card/receipt summary only; it must not write QR image data, base64 payloads, or extra artifact docs for this flow.
- Mobile action adapters should reuse the existing mobile screen DAL/API; do not add mobile-only AMM collections.
- Bounded read cards such as feedback inbox, digital screen status, POS test, domain verify, and integration status need explicit result caps and stop conditions.
- Store-level changes from multiple related cards can merge into one existing `updateStore()` call only when approval scope remains clear.
- Feature-doc sweep additions should prefer local cards first: communication templates, item share cards, physical surfaces, print previews, menu kit asset share, POS technical summary copy, and sample payload download must not create Firestore writes by default.
- Exact local export cards such as menu link/QR, official page link/QR, feedback link/QR, customer app install link, digital screen link, POS setup copy, POS technical summary copy, and POS sample payload download use already-loaded selected project/store context and browser-local copy/download/QR generation. They must not create a standalone proposal document, store base64 QR data, or add a Firestore read only to render the card.
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
| Price/availability/theme/item/category/attribute patch | Deterministic path: command submit uses the loaded compact session snapshot and 1 compact session write; completion/cancel also uses the loaded compact session snapshot and 1 compact session write; no proposal-doc read/write and no deterministic-session transaction read. Project write cost same as manual. Server-backed path only when adapter needs server authority. |
| Unresolved-language planner | No project/session/proposal read or write inside the planner route. One SAFE_MODE read when enabled, one bounded Gemini call, and one existing AI operation accounting write after a valid result. The provider packet keeps the same 32-item/18-category/5-pending caps while adding bounded aliases and compact contracts for only the 19 current executable actions. The validated card still uses the normal single compact-session command write. |
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
- [ ] Desktop/mobile UI failure handling adds no extra reads/writes and persists only generic project-update failure text.
- [ ] `git diff --check` passes.
- [ ] Dedicated verifier reports no unregistered write adapters.
