# AI Menu Manager - Implementation Plan

**Status:** Initial implementation validated - enabled behind AMM feature flags in current config
**Audience:** Engineering / implementation maintainers
**Last Updated:** June 30, 2026

---

## 1. Technical Summary

AI Menu Manager is an action-registry system with a chat-style UI.

The model may help resolve intent, but the registered action adapter owns:

- what data can be read.
- what card can be created.
- what approval is required.
- what existing MenuList path applies the change.
- what receipt and rollback behavior are allowed.

No AMM code may write live menu truth outside registered adapters.

AMM also has a read-only domain conversation layer. It answers selected-menu questions from the current context packet with `system_context_answer` cards. This layer must not call AI providers, perform external lookups, read additional Firestore documents, or create project/store mutations. Suggested replies from these cards only draft the next owner command.

Desktop and mobile AMM proposal cards can render browser-local actions such as copy link, open URL, download text, and download QR. These local actions do not mutate live menu truth. URL-bearing local actions route through `normalizeAiMenuManagerLocalActionUrl()` before copy/open/QR generation; only HTTPS URLs are allowed in normal use, with HTTP limited to known local-development tenant hosts. Local action failures log `ai_menu_manager_local_action_failed` or `mobile_ai_menu_manager_local_action_failed` through bounded runtime diagnostics with action type, card kind/risk, copy-support metadata, and presence/length metadata only. Blocked `open_url` handoffs are detected before the fixed owner-visible failure copy is shown. Clipboard fallbacks also require acknowledgement: rejected Clipboard API writes fall through to the acknowledged textarea fallback, and unavailable browser copy support or a false textarea-copy result throws coded local errors before copied state can be shown.

Server-backed AMM browser calls use `AI_MENU_MANAGER_REQUEST_POLICY`: same-origin credentials, `no-store` cache policy, and manual redirect handling for command fallback, inbox fallback, proposal actions, and proposal completion before the shared 64KB bounded response reader accepts acknowledgements.

---

## 2. Source-Of-Truth Mapping

| Domain | Existing source | AMM rule |
| --- | --- | --- |
| Menu items/categories | `Project.files[].extractedData.data` | Mutate through project action adapters only. |
| Store and project selection | Existing selected store context and selected project state | AMM screen must expose selectors and build context for the selected store/project only. |
| Design/theme | `Project.config.design` | Use existing menu design presets and settings fields. |
| Menu settings | `Project.menuSettings` | Use existing project settings update path. |
| Multi-outlet | `Project.masterProjectId`, overrides, outlet save path | Show scope before approval. |
| Images | Existing image generation/upload/project image paths | Generated image is draft until applied. |
| New item metadata and image editing | Existing accounted AI APIs | AMM can create draft proposal cards only; owner approval applies output through item/image paths. |
| Extraction/import | `MENU_IMAGE_PROCESSING_JOBS` and extraction job API | Reuse existing job creation/review flow. |
| Change log | `menuChangeLog/{tId}/{sId}` | Let existing `updateProject()` side effects log changes. |
| Public cache | `/api/revalidate/menu` via public cache helper | Preserve existing invalidation path. |
| Compliance, communication, presence, review, POS helpers, and print/export utilities | Existing feature-specific DAL/API/browser-local paths | AMM action discovery is tracked in `ai-menu-manager_feature-action-audit.md`; adapters must reuse those paths or stay manual/read-only. |

Evidence:

- `updateProject()` invariant: `src/database/projects/index.ts:945`
- Mobile project selector context: `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:464`
- MobileShell route/context boundary: `src/components/mobile/MobileShell.tsx:424`
- Public cache revalidation: `src/lib/cache/publicClientCache.ts:77`
- Menu data shape: `src/components/templates/main-app/projects/types/extractedData.types.ts:149`
- Project config shape: `src/components/templates/main-app/projects/types/project.types.ts:337`
- Theme config shape: `src/components/templates/main-app/projects/types/theme.types.ts:16`

---

## 3. Proposed File Structure

```text
src/
  app/api/ai-menu-manager/
    command/route.ts
    inbox/route.ts
    proposals/[proposalId]/actions/route.ts
    proposals/[proposalId]/complete/route.ts
    sessions/[sessionId]/route.ts
  components/templates/main-app/aiMenuManager/
    AiMenuManagerRoute.tsx
    AiMenuConversation.tsx
    AiMenuComposer.tsx
    AiMenuContextBar.tsx
    AiMenuInboxPanel.tsx
    cards/
      ProposalCard.tsx
      ReceiptCard.tsx
      ImageGenerationCard.tsx
      MenuDesignCard.tsx
      ManualTaskCard.tsx
  components/mobile/ai-menu-manager/
    MobileAiMenuManagerScreen.tsx
    MobileAiMenuCardStack.tsx
    MobileAiMenuComposer.tsx
  database/aiMenuManager/
    index.ts
    sessionRepository.ts
    proposalRepository.ts
    ruleRepository.ts
  hooks/
    useAiMenuManager.ts
    useAiMenuManagerInbox.ts
  lib/ai-menu-manager/
    actionRegistry.ts
    actionTypes.ts
    approvalPolicy.ts
    cardBuilder.ts
    commandResolver.ts
    contextPacket.ts
    domainConversationRouter.ts
    entityResolver.ts
    idempotency.ts
    proposalState.ts
    receiptBuilder.ts
    storageArtifacts.ts
    actions/
      priceUpdate.ts
      availabilityUpdate.ts
      menuDesignUpdate.ts
      imageGeneration.ts
      imageEditing.ts
      newItemMetadata.ts
      menuImportReview.ts
      descriptionBatch.ts
      specialMenu.ts
      publishMenu.ts
      communicationTemplate.ts
      compliancePage.ts
      presenceMonitor.ts
      printAndShareExport.ts
      posSupportHelpers.ts
      reviewReputationGuard.ts
      rollbackOperation.ts
      manualTask.ts
      ruleSuggestion.ts
  types/
    aiMenuManager.ts
```

Naming note: React component folders may follow local codebase casing. Docs remain lowercase. The action module names above are illustrative implementation files; exact action type IDs, readiness states, source evidence, and cost classes are governed by `ai-menu-manager_action-type-checklist.md`.

Implementation note, June 17, 2026: the initial foundation uses the shared registry and resolver files above, plus `src/database/aiMenuManager/server.ts`, `src/database/aiMenuManager/index.ts`, `src/components/templates/main-app/aiMenuManager/AiMenuManagerRoute.tsx`, and `src/components/mobile/ai-menu-manager/MobileAiMenuManagerScreen.tsx`. Adapter-specific files such as `priceUpdate.ts`, `imageGeneration.ts`, and `publishMenu.ts` remain the expansion points for deeper adapters.

---

## 4. Feature Flags

Add to `src/config/features.ts`:

```ts
ENABLE_AI_MENU_MANAGER: true,
ENABLE_AI_MENU_MANAGER_MOBILE: true,
ENABLE_AI_MENU_MANAGER_VOICE_INPUT: true,
ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS: true,
ENABLE_AI_MENU_MANAGER_RULES: true,
ENABLE_AI_MENU_MANAGER_MODEL_ROUTER: false,
ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER: false,
ENABLE_AI_MENU_MANAGER_LOCAL_ASSIST: false,
ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES: true,
ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS: false,
AI_MENU_MANAGER_SESSION_STORAGE_MODE: "daily_compact" as "daily_compact" | "detailed",
```

Flag meaning:

| Flag | Purpose |
| --- | --- |
| `ENABLE_AI_MENU_MANAGER` | Main route/API visibility. |
| `ENABLE_AI_MENU_MANAGER_MOBILE` | MobileShell screen and mobile entry points. |
| `ENABLE_AI_MENU_MANAGER_VOICE_INPUT` | Voice-input readiness only until a production speech-to-command UI is verified. Voice commands must enter the same text resolver and approval flow. |
| `ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS` | Generated-image cards. |
| `ENABLE_AI_MENU_MANAGER_RULES` | Rule suggestion/registry visibility only until rule execution infra is verified. |
| `ENABLE_AI_MENU_MANAGER_MODEL_ROUTER` | Enables the model-provider abstraction only; defaults off to preserve deterministic cost. |
| `ENABLE_AI_MENU_MANAGER_CLOUD_PLANNER` | Allows a future cloud planner such as Gemini after a guarded adapter exists. Defaults off. |
| `ENABLE_AI_MENU_MANAGER_LOCAL_ASSIST` | Allows a future local/on-device assist provider after browser/device support is verified. Defaults off. |
| `ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES` | Allows approved cards to execute menu/store mutations. |
| `ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS` | Enables detailed Storage artifacts for bounded debugging. |

Flags are kill switches, not product scope reducers.

---

## 4A. Future Model Provider Contract

The current shipped path is deterministic and DAL-first. Future Gemini, Gemma, or other model providers may improve conversation routing only through the disabled-by-default model-router lane.

Model provider contract:

| Contract area | Rule |
| --- | --- |
| Input | Use a compact selected store/project/menu context packet. Do not send full raw project JSON, staff data, billing data, secrets, or unrelated store history. |
| Output | Return one router outcome: answer, diagnostic, recommendation, clarification, prepare action, local export, manual handoff, unsupported, or receipt/status. |
| Allowed tools | Read and prepare tools only: search menu items, get selected menu status, get item/category detail, prepare cards, prepare local exports, prepare clarification, or prepare unsupported card. |
| Forbidden tools | No execute, write, publish, delete, external post, Firestore write, `updateProject()`, `updateStore()`, billing/account, staff mutation, or third-party posting tools. |
| Validation | MenuList validates action type, selected store/project scope, entity IDs, feature flags, approval policy, patch whitelist, base hash, and unsupported boundaries before any card is executable. |
| Authority | Provider output is never authority. MenuList builds cards and patches; owner approval triggers existing MenuList execution paths. |

Provider flags do not make checklist rows executable. A model may choose what to prepare, but only the registered adapter and approval policy decide what can be shown, approved, or executed.

---

## 5. Action Adapter Contract

Read-only domain answers are not execution adapters, but they still use the registry contract:

- action type: `system_context_answer`.
- execution mode: `read_only_card`.
- approval: `none`.
- cost: `C0 local plus compact session doc`.
- source of truth: selected `AiMenuManagerContextPacket`.
- allowed topics: menu readiness, missing prices/photos/descriptions, hidden/unavailable entries, share readiness, and price-change guidance.
- forbidden topics: live weather, news, sports, markets, jokes, poems, stories, or any non-MenuList general assistant behavior.
- resolver precedence: direct operation commands must win before this layer; imperative edits such as "increase all drinks price by 10" must create the matching proposal card instead of an answer card.
- suggested replies: draft-only; sending a reply must re-enter the normal command resolver and action-card flow.

Clarification cards are different from read-only answer suggestions. A clarification option may submit the selected answer, replace the pending clarification, and create the next card in one compact session write. It must not approve, execute, publish, or persist menu truth by itself.

Every action adapter implements:

```ts
export interface AiMenuManagerActionAdapter<TIntent, TProposal, TExecution> {
  type: AiMenuManagerActionType;
  manualEquivalent: string;
  resolveIntent(input: CommandContext): Promise<TIntent | null>;
  resolveEntities(intent: TIntent, context: MenuContextPacket): Promise<EntityResolution>;
  buildProposal(resolution: EntityResolution): Promise<TProposal>;
  getApprovalPolicy(proposal: TProposal): ApprovalPolicy;
  buildCard(proposal: TProposal): AiMenuManagerCardPayload;
  executeApproved(input: TExecution): Promise<ExecutionResult>;
  buildReceipt(result: ExecutionResult): AiMenuManagerReceipt;
}
```

Hard requirements:

- Adapter must declare its manual equivalent.
- Adapter must declare Firebase cost class.
- Adapter must declare whether it is client-executed, API-executed, or existing-job-executed.
- Adapter must not call a provider directly unless the feature already has safe mode, rate limiting, capacity/accounting, and logging.
- Adapter must not write project/store truth unless `ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES` is true and approval policy is satisfied.

---

## 6. Execution Modes

### Client Project Mutation Mode

Use for actions already handled by existing project editor/save behavior and explicitly exported in `AI_MENU_MANAGER_EXECUTABLE_ACTIONS`:

- price update
- availability update
- item active/hidden
- category active/hidden
- item/category name, item description, item category assignment, bestseller, and prep-time updates
- Featured section / decision block updates
- menu design update

Lower-level extracted-data fields such as nested attributes, tags, metadata, quality-review flags, category icons, category time slots, and category/order fields stay in the checklist as field coverage until resolver/card fixtures prove the exact owner journey. Image apply, import review apply, publish, and special-menu writes also stay outside the current executable list until their existing API/job adapters are connected and verified.

Default flow:

1. The AMM screen already has the selected project/menu context.
2. Client DAL resolves the command and stores the pending operation in the capped daily compact session doc.
3. Owner reviews and approves the card.
4. Client DAL rebuilds the execution directive from the stored operation, validates action-scoped patch shape, patch hash, and base project hash.
5. Client adapter applies the approved patch to the current project object.
6. Client calls existing `updateProject()` / `updateProjectWithoutLoader()`.
7. Desktop and mobile UI require `assertProjectUpdateSucceeded()` before local project state changes or receipt completion.
8. Client DAL moves the operation to a compact receipt in the same session doc.

Server-backed proposal routes are reserved for missing client context, provider-backed jobs, imports/uploads, external integration policy, durable ledger work, or a direct compact-session permission fallback. They are not the normal path for deterministic selected-project price, availability, visibility, featured, note, or design cards when direct client DAL access is available.

Why: existing `updateProject()` already owns MCE, linked-outlet save routing, public cache revalidation, and MOL detection. The acknowledgement guard blocks fallback-array or mismatched-project results from completing cards as executed.

Execution directive integrity:

```ts
{
  proposalId: string;
  executionId: string;
  actionType: AiMenuManagerActionType;
  scope: OperationScope;
  baseProjectUpdatedAt?: string;
  baseProjectHash?: string;
  patchHash: string;
  patch: ProjectPatch;
  patchSummary: BeforeAfterSummary;
  expiresAt: string;
}
```

The proposal stores the canonical patch summary and `patchHash`. The client may apply only that approved directive through the existing DAL path. The approval route must re-check the selected project base hash before issuing the directive; if the project changed after card creation, AMM must ask the owner to prepare a fresh card. The completion route must verify proposal status, idempotency key, action type, selected store/project scope, `executionId`, `patchHash`, directive expiry, and resulting project update marker before marking the proposal executed.

### Existing API/Job Mode

Use for server-owned or already-protected flows:

- menu extraction/import job
- image generation
- batch image generation
- provider-backed description generation if existing route is reused
- manual task export/generation where server artifacts are required

Flow:

1. Proposal action route validates approval.
2. Adapter calls existing protected API or creates existing job type.
3. Proposal doc stores job id/status.
4. UI polls bounded job status or reads proposal summary.

Evidence:

- Menu extraction job route uses `withAuth`, tenant checks, zod validation, safe mode, rate limit, Storage URL ownership, identity check, and job creation. See `src/app/api/menu-extraction/jobs/route.ts:473`, `src/app/api/menu-extraction/jobs/route.ts:483`, `src/app/api/menu-extraction/jobs/route.ts:505`, `src/app/api/menu-extraction/jobs/route.ts:551`, `src/app/api/menu-extraction/jobs/route.ts:670`, `src/app/api/menu-extraction/jobs/route.ts:685`, `src/app/api/menu-extraction/jobs/route.ts:758`.
- Image generation route uses `withAuth`, safe mode, rate limit, validation, outlet policy, capacity, and accounting. See `src/app/api/image-generation/route.ts:24`, `src/app/api/image-generation/route.ts:31`, `src/app/api/image-generation/route.ts:36`, `src/app/api/image-generation/route.ts:106`, `src/app/api/image-generation/route.ts:220`.
- Image generation UI filters outlet image generation to allowed items only. Outlet stores are limited to local-only items unless image override policy allows inherited image override. Evidence: `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:231`, `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:233`.

### Server Project Mutation Mode

Do not enable until a server mutation adapter proves parity with `updateProject()`.

Minimum requirement:

- same sanitization and localization normalization.
- same MCE behavior or explicit equivalent.
- same linked-outlet save policy.
- same image-generation outlet governance for inherited/overridden items.
- same public cache revalidation tags.
- same MOL/menu snapshot behavior.
- same security/rate limit/logging rules.

Until then, server should create proposals and execution directives, not write project truth directly.

---

## 7. Command Resolver Rules

Command resolution must prefer the smallest existing manual equivalent that matches owner intent.

### Today Special

| Owner command shape | Resolver output |
| --- | --- |
| Single item special, for example "Add today special Rajma Chawal 129" | `item_create` in the selected project, with Today Special category/label/placement when available. |
| Alternate or scheduled menu, for example "Create weekend special menu" | `special_menu_create`. |
| Public banner/note, for example "Show today's special note" | `menu_special_note_update`. |

If more than one interpretation is plausible, `system_clarification_request` is required before proposal creation.

---

## 8. API Contracts

Default path rule: normal deterministic selected-project cards should use the client DAL compact-session path when the AMM screen already has the selected project context. The API routes below remain required for server-backed adapters, missing client context fallback, provider-backed jobs, imports/uploads, external integration policy, durable proposal-ledger work, and the explicit direct-DAL permission fallback. Do not route ordinary price, availability, visibility, featured, menu note, or design preset edits through AMM proposal APIs unless a server-only invariant is required and documented.

Direct-DAL permission fallback:

- Desktop and mobile first try the compact client DAL path.
- If the compact session read/write fails with Firestore `permission-denied`, the screen may call the authenticated AMM API routes instead of widening Firestore rules.
- The fallback exists for users whose NextAuth session has `MANAGE_MENU` but whose Firebase Auth token cannot write the compact session directly.
- The fallback request must send only API-safe command fields: selected `storeId`, `projectId`, `inputType`, owner text/upload refs, structured `composerContext`, `clientContextVersion`, `replaceOperationId`, `idempotencyKey`, and `sessionId`.
- The fallback must not send the full selected project JSON, full compact session JSON, staff data, billing data, secrets, or unrelated store history.
- Fallback cards are rendered as server-backed operations in the same owner UI. They still use proposal action and completion routes, approval policy, patch hash, base hash, and existing `updateProject()` execution.
- Clarification and short follow-up replacement must preserve `replaceOperationId` so the server-backed fallback removes the previous clarification/pending card instead of duplicating cards.
- Browser clients must parse AMM API fallback responses through the shared 64KB bounded JSON reader. Malformed, oversized, or empty successful responses log `ai_menu_manager_response_parse_failed` with phase/status metadata only and then use fixed owner-safe failure handling.

### `POST /api/ai-menu-manager/command`

Purpose: convert owner input into card-ready proposals when client context is unavailable or the requested adapter requires server-side authority.

Input:

```ts
{
  sessionId?: string;
  storeId: string; // selected store context
  projectId: string; // selected project context
  inputType: "text" | "voice_transcript" | "upload" | "suggested_action";
  text?: string;
  uploadRefs?: Array<{ storagePath: string; mimeType: string; size: number }>;
  composerContext?: AiMenuManagerComposerContext;
  clientContextVersion?: string;
  replaceOperationId?: string;
  idempotencyKey: string;
}
```

Output:

```ts
{
  sessionId: string;
  messageId: string;
  cards: AiMenuManagerCardPayload[];
  nextRequiredAction: "none" | "owner_approval" | "clarification";
}
```

Security:

- `withAuth()`
- `verifyTenantAccess()`
- `DATA_WRITE` rate limit before body parsing or provider calls; shared AMM limiter keys hash owner, tenant, and store segments before storage in Upstash
- bounded guard security metadata for selected-store, tenant-access, rate-limit, and invalid-request events; guard logs must not spread raw `buildSecurityContext()` output
- 64KB bounded JSON body before Zod input validation
- SAFE_MODE before expensive AI path
- generic owner errors
- no raw provider text in response
- reject or clarify when the requested action does not match the selected store/project and no explicit scope-change approval exists

### `GET /api/ai-menu-manager/inbox`

Purpose: return compact pending cards and recent receipts.

Input:

```ts
{
  storeId: string; // selected store context
  projectId: string; // selected project context; required
  sessionId?: string;
  sessionDate?: "YYYY-MM-DD";
}
```

Reads:

- one current session/day summary doc when possible.
- proposal detail docs only when a compact summary explicitly points to server-backed durable detail.
- session/project mismatch returns an empty inbox instead of showing cards from another selected menu.

### `POST /api/ai-menu-manager/proposals/{proposalId}/actions`

Supported actions:

- `approve`
- `cancel`
- `reject`
- `mark_done`
- `approve_all`
- `review_one_by_one`
- `publish`
- `try_again`
- `create_manual_task`
- `rollback`
- `create_rule`
- `extend`
- `ask_retake`
- `choose_another_item`
- `keep_menulist_value`
- `change_to_external_value`
- `mark_done`
- `archive`

Response returns:

- updated proposal status.
- tamper-resistant execution directive if approval is accepted.
- owner-facing message.
- next card state.

Security:

- `withAuth()`
- `DATA_WRITE` rate limit before body parsing.
- 16KB bounded JSON body before Zod input validation.
- selected store permission and proposal tenant/store/project/action checks before approval, status updates, or execution directives.

### `POST /api/ai-menu-manager/proposals/{proposalId}/complete`

Purpose: record execution result after a client-executed existing DAL save.

Input:

```ts
{
  storeId: string;
  executionId: string;
  result: "executed" | "failed";
  projectId: string;
  actionType: AiMenuManagerActionType;
  patchHash: string;
  message?: string;
  idempotencyKey: string;
}
```

Security:

- `withAuth()`
- `DATA_WRITE` rate limit before body parsing.
- 16KB bounded JSON body before Zod input validation.
- selected store permission and proposal tenant/store/project/action checks before completion writes.

---

## 9. Firestore Shape

Use compact root collections with tenant/store/project fields and security-rule coverage.

### `aiMenuManagerSessions/{sessionId}`

Compact session/day doc.

```ts
{
  sessionId: string;
  tId: number;
  sId: number;
  projectId: string; // selected project; inbox reads reject mismatched sessions
  sessionDate: "YYYY-MM-DD";
  storageMode: "daily_compact" | "detailed";
  status: "active" | "closed";
  compactMessages: CompactMessage[];
  pendingCardSummaries: CardSummary[];
  pendingOperations: PendingOperation[]; // full current cards plus approved patch metadata, capped
  recentReceiptSummaries: ReceiptSummary[];
  counters: {
    commands: number;
    proposalsCreated: number;
    approvals: number;
    executions: number;
  };
  artifactRefs?: StorageArtifactRef[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}
```

Required caps:

- `compactMessages` max target: 20 recent summaries.
- `pendingCardSummaries` max target: 25 active summaries.
- `pendingOperations` max target: 25 active cards with exact patch/hash/base-project metadata.
- `recentReceiptSummaries` max target: 20 recent receipts.
- `artifactRefs` max target: 20 current pointers.
- larger transcripts, manifests, and debug payloads move to Storage.

Use a deterministic session id where safe, derived from tenant, store, project, and `sessionDate`, so retrying command submit does not create duplicate session docs.

Deterministic selected-project actions such as price, availability, visibility, featured section, menu note, and design preset do not create a separate proposal document by default. The client DAL stores the pending operation in this capped session doc, applies the exact stored patch through the existing `updateProject()` path after approval, then moves the card to `recentReceiptSummaries` in the same session doc.

Command submit, completion, and cancel use the current compact session already loaded by the AMM screen. Desktop and mobile pass that session snapshot into the client DAL, the DAL appends or removes capped pending operations locally, and then writes the daily session doc once. Completion and cancel verify the loaded session scope/card id before writing; they do not transaction-read the session again for deterministic cards.

Before any direct client-DAL session read/write, AMM must reuse the existing Firebase Auth claim sync for the selected store context. This prevents platform/HQ or multi-store owners from preparing a card under one store context while the Firebase token still carries another store.

If direct compact-session access still fails with Firestore `permission-denied`, AMM may fall back to the authenticated server-backed command/inbox/proposal routes. This is a permission fallback, not the default deterministic cost path. It preserves `MANAGE_MENU` authorization through the API, avoids broadening client Firestore rules, and must keep the bounded API-safe payload rule above.

AMM Firestore sanitization may remove `undefined`, but it must preserve Firebase `Timestamp` and `FieldValue` sentinel objects. Do not JSON-round-trip compact session payloads before writing them.

### `aiMenuManagerProposals/{proposalId}`

Server-backed actionable card and operation record. Use this only when an adapter needs server-only authority, provider secrets, upload/import/publish jobs, external integration policy, or a durable operation ledger beyond the compact session doc.

```ts
{
  proposalId: string;
  sessionId: string;
  tId: number;
  sId: number;
  projectId: string; // selected project for proposal scope and completion verification
  actionType: AiMenuManagerActionType;
  status: ProposalStatus;
  risk: "low" | "medium" | "high";
  approvalPolicy: ApprovalPolicy;
  entityRefs: EntityRef[];
  scope: OperationScope;
  beforeAfterSummary: BeforeAfterSummary;
  cardPayload: AiMenuManagerCardPayload;
  executionMode: "client_project_mutation" | "existing_api_job" | "server_project_mutation";
  executionStatus?: ExecutionStatus;
  approvalRecord?: ApprovalRecord;
  receipt?: AiMenuManagerReceipt;
  artifactRefs?: StorageArtifactRef[];
  idempotencyKeys: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}
```

Required caps:

- `idempotencyKeys` max target: 10 recent keys.
- `artifactRefs` max target: 20 current pointers.
- full approval trace, raw model payload, and large diff payloads use Storage refs.
- direct client writes are not allowed.

Proposal ids should be deterministic when the same idempotent command creates the same actionable card. This protects against duplicate proposal writes after client retry. The repository must also no-op inside the transaction when the deterministic proposal already exists, so retries cannot increment compact-session counters or duplicate pending-card summaries.

### `aiMenuManagerRules/{ruleId}`

Owner-approved deterministic rule.

```ts
{
  ruleId: string;
  tId: number;
  sId: number;
  projectId?: string;
  actionType: AiMenuManagerActionType;
  ruleStatus: "active" | "paused" | "archived";
  ruleTrigger: RuleTrigger;
  approvedOperationTemplate: Record<string, unknown>;
  approvedBy: string;
  approvedAt: Timestamp;
  lastExecutedAt?: Timestamp;
  executionCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 10. Storage Artifacts

Use Firebase Storage for:

- full transcripts.
- raw provider prompts/responses.
- large diff payloads.
- uploaded command attachments.
- generated image variants.
- debug traces when enabled.

Suggested path:

```text
aiMenuManager/{tId}/{sId}/{sessionId}/{artifactId}.json
aiMenuManager/{tId}/{sId}/{sessionId}/images/{artifactId}.png
```

Firestore stores only path, content type, size, checksum, purpose, and retention marker.

---

## 11. Context Packet

AMM command resolution should not scan full project data repeatedly.

Create a compact menu context packet:

```ts
{
  projectId: string;
  projectUpdatedAt?: string;
  defaultLanguage: string;
  storeName: string;
  businessType?: string;
  menuDesign: ResolvedDesignSummary;
  items: Array<{
    id: string;
    name: string;
    aliases: string[];
    categoryId: string;
    categoryName: string;
    price?: string;
    available?: boolean;
    active: boolean;
    hasImage: boolean;
    hasDescription: boolean;
  }>;
  categories: Array<{ id: string; name: string; active: boolean }>;
}
```

Cache rules:

- key by `tId`, `sId`, `projectId`, and project update marker/hash.
- use `unstable_cache` or Redis/Upstash for server reuse.
- invalidate on successful project update completion.
- fallback to one bounded project read when cache is absent.
- do not use the context packet cache as a second menu source of truth; it is discarded when the project update marker changes.

---

## 12. UI Components

Desktop route:

- owner app route: `/menu-manager`.
- public marketing route remains `/ai-menu-manager`.
- legacy `/use-menulist/ai-menu-manager` redirects to `/menu-manager` for compatibility only.
- full-height workspace.
- selected project context in the chat header.
- conversation timeline.
- card stack.
- composer with text, upload, voice-ready button.
- empty-state starter cards for daily draft prompts: store closed today, working-hours changes, and contextual sold-out/time-slot work. Starter cards use the same suggestion helper as the full suggestion sheet and never submit automatically.
- separate composer tools for Work on and Suggestions below the input.
- Work on context picker inside the composer. It uses selected-project data already loaded in the screen, supports item multi-select and single category selection, and can scope commands to menu design, digital menu, official page, digital screens, feedback, or store settings. Item/category choices render as compact selectable rows/grid cells; search is shown only for longer lists or active search text.
- Work on selection rewrites the outgoing owner message into explicit text before resolver execution. It does not create cards, write Firestore, or bypass the resolver/action registry.
- suggestion chooser opens as an inline tray inside the chat frame; suggestions are grouped from selected-menu context and may use a two-layer guided flow: first choose the action area, then choose the exact option. Final options fill the composer without submitting automatically.
- Work on and Suggestions are mutually exclusive; opening either panel closes the other and clears any active nested suggestion view.
- proposal and clarification cards can expose option rows. Clarification option rows resolve the pending clarification into the next card in one compact session write; other suggestion rows remain draft-only. No option row approves or executes by itself.
- menu link/QR, official page link/QR, feedback link/QR, customer app install link, digital screen link, POS setup copy, POS technical summary copy, and POS sample payload requests render as exact browser-local export cards with Copy, Open, Download QR, or Download text controls as appropriate. They use already-loaded selected project/store context, do not mutate menu truth, and do not store generated QR image or text export data in Firestore.
- known Mobile More/manual surfaces resolve to exact action-family cards such as `store_working_hours_update`, `menu_temp_status_set`, `digital_screen_status_card`, `billing_screen_open`, and `print_menu_open`. `system_manual_task_create` remains only for true ad hoc owner tasks that do not map to a known MenuList flow.
- theme, layout, color, and display-option cards reuse the existing Menu design tone/layout/color/display settings and show those choices before preparing specific changes.
- card Edit drafts an owner-readable command back into the composer instead of mutating the pending card silently.
- inbox/history side panel.

Mobile:

- `MobileShell` sub-screen.
- bottom composer.
- empty-state starter cards above the composer for common daily drafts, including closed today, working hours, and sold-out/time-slot work.
- Work on context picker opens as a MobileShell-friendly bottom sheet with large target rows. Item/category choices use the same selected-project context as desktop, render as compact 44px selectable rows, and only affect the next message sent.
- suggestion chooser opens as a bottom sheet; suggestions are grouped from selected-menu context and may use a two-layer guided flow: first choose the action area, then choose the exact option. Final options fill the composer without submitting automatically.
- Work on and Suggestions are mutually exclusive MobileShell sheets; opening either sheet closes the other and clears any active nested suggestion view.
- clarification option rows resolve the pending clarification into the next card in one compact session write; card Edit remains draft-first composer behavior.
- theme, layout, color, and display-option clarification cards use the same choices already shown in Mobile More > Menu design.
- card stack.
- approval-first view.
- no heavy dashboard.

No visible UI text should explain internal AI, confidence, algorithms, token details, or implementation.

---

## 13. Security Checklist

All protected AMM APIs must use:

- `withAuth()`.
- `verifyTenantAccess()`.
- Zod validation before database or provider work.
- Upstash rate limiting before expensive operations.
- SAFE_MODE before AI/provider calls.
- secure logging with sanitized fields only.
- idempotency key for command, approval, execution, and retry.
- generic owner-facing error messages.

No API response should expose raw provider prompts, raw debug traces, full security context, or stack traces.

---

## 14. Firebase Cost Controls

Implementation must preserve these controls:

- no per-token Firestore writes.
- no one-document-per-message default.
- no real-time listener for the whole AMM history.
- session doc loads before proposal details.
- proposal docs only for server-backed cards that need provider secrets, jobs, external policy, or durable ledger detail.
- Storage for large artifacts.
- cache menu context packets.
- use existing project summary/cache patterns where possible.
- no new scheduled function outside existing scheduler discipline.
- explicit array caps on compact session and proposal docs.
- deterministic IDs or idempotency keys for retry-safe compact session operations and server-backed proposal creation.
- active pending cards available without scanning old daily sessions.
- safe approve-all flows merge related project patches into one `updateProject()` call.
- active job polling backs off and stops when hidden, backgrounded, or terminal.

---

## 15. Implementation Workstreams

| Workstream | Output |
| --- | --- |
| Types and flags | Feature flags, shared types, statuses, schemas. |
| Repository layer | Session/proposal/rule repositories with compact writes. |
| Context packet | Cached menu context builder from current project/store truth. |
| Action registry | Adapter contract and initial action adapters. |
| APIs | Command, inbox, proposal action, completion routes. |
| Desktop UI | Conversation, cards, composer, context/inbox panels. |
| Mobile UI | MobileShell screen, card stack, composer, approval sheets. |
| Existing action integrations | Extraction, image generation, project update, menu design, Command Center logic. |
| Rules/receipts | Approval records, rule suggestions, completion/failure receipts. |
| Verification | Unit/API/UI/mobile/cost tests and manual QA. |

---

## 16. Action Registry Source Of Truth

The exact action adapter catalog lives in [ai-menu-manager_action-type-checklist.md](./ai-menu-manager_action-type-checklist.md). Implementation must not create a second competing list in code comments, tests, or API schemas.

Adapter metadata must include desktop/manual evidence, mobile handling, Firebase cost class, and unsupported-surface behavior. Mobile PWA actions discovered from `MobileShell` screens are first-class registry entries; account, billing, platform, reseller, Answerlattice, and internal screens are explicit unsupported/handoff surfaces, not hidden future actions.

Implementation note, June 20, 2026 production hardening: current code-level adapter definitions include `manualEquivalent`, `executionMode`, `approvalLevel`, `costClass`, `mobileBehavior`, `sourceEvidence`, and readiness. The dedicated verifier fails if any current adapter definition omits these fields.

The checklist currently covers these adapter families:

- item, attribute, category, bulk, and repair actions.
- import, extraction, identity preflight, and upload-queue actions.
- item image, generated image, batch image, OBP cover, and gallery actions.
- project lifecycle, active status, cover image, language, public content, and AI default actions.
- menu design, temporary status, publish, share, export, and print actions.
- special menu, outlet, public presence, store, domain, customer app, digital screen, feedback, POS sync, integration-status, staff, AMM system, and rule actions.

The current production executable client-project mutation list is the `AI_MENU_MANAGER_EXECUTABLE_ACTIONS` export in `src/lib/ai-menu-manager/actionTypes.ts`. As of June 20, 2026 it is limited to:

- `item_price_update`
- `item_name_update`
- `item_description_update`
- `item_category_update`
- `item_availability_update`
- `item_visibility_update`
- `item_bestseller_update`
- `item_prep_time_update`
- `category_name_update`
- `category_visibility_update`
- `decision_blocks_update`
- `menu_special_note_update`
- `menu_design_mood_update`
- `menu_design_layout_update`
- `menu_design_preset_apply`
- `menu_design_color_update`
- `menu_design_visibility_update`
- `bulk_price_update`
- `bulk_availability_update`

Every action in that list must have resolver fixture coverage, an approval/card path, and approved-patch verification through the existing project update path. The broader production priority order remains in the checklist for future adapter connection, but it is not a claim that image, import, publish, special-menu, staff, domain, compliance, or integration actions are directly executable from AMM today.

Implementation note, June 27, 2026 UI failure hardening: desktop and mobile Menu Manager screens use fixed owner-safe copy for load, prompt, apply, project-update, and cancel failures. The original exception is logged only through `src/lib/runtime/runtimeDiagnostics.ts` with coded failure names and bounded store/project/session/card metadata. Failed project-update receipts persist the generic `Project update failed` reason instead of raw exception text. June 30 follow-up: if that failed-receipt/proposal completion attempt also fails, desktop and mobile log bounded `*_project_update_failed_*_completion_failed` diagnostics instead of silently dropping the secondary failure.

---

## 17. Validation Commands

Docs-only creation does not require TypeScript.

Before implementation handoff:

```bash
git diff --check
```

During implementation:

```bash
npx tsc --noEmit --incremental false
npm run verify:menu-extraction-pipeline
npm run verify:menu-extraction-pipeline:dry-run
```

Add a dedicated verifier:

```bash
npm run verify:ai-menu-manager
```

Verifier should check:

- feature flags exist.
- action registry metadata includes every action type in the checklist.
- `AI_MENU_MANAGER_EXECUTABLE_ACTIONS` includes only owner-reachable `ready_adapter` + `client_project_mutation` actions.
- every current executable action type has resolver fixture coverage and approved-patch verification.
- every adapter declares manual equivalent.
- every write adapter declares execution mode.
- all protected APIs use auth/tenant validation/rate limits where required.
- protected API guards use bounded route security metadata instead of raw request/session context.
- card payloads include approval policy.
- no unsupported action executes project/store truth writes.
- desktop/mobile UI does not surface raw `error?.message` / `error.message` failure text.
- failed project-update receipts persist generic failure text only.
