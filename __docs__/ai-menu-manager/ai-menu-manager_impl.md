# AI Menu Manager - Implementation Plan

**Status:** Initial implementation validated - feature flagged off by default
**Audience:** Engineering / implementation maintainers
**Last Updated:** June 17, 2026

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
ENABLE_AI_MENU_MANAGER: false,
ENABLE_AI_MENU_MANAGER_MOBILE: false,
ENABLE_AI_MENU_MANAGER_VOICE_INPUT: false,
ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS: false,
ENABLE_AI_MENU_MANAGER_RULES: false,
ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES: false,
ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS: false,
AI_MENU_MANAGER_SESSION_STORAGE_MODE: "daily_compact" as "daily_compact" | "detailed",
```

Flag meaning:

| Flag | Purpose |
| --- | --- |
| `ENABLE_AI_MENU_MANAGER` | Main route/API visibility. |
| `ENABLE_AI_MENU_MANAGER_MOBILE` | MobileShell screen and mobile entry points. |
| `ENABLE_AI_MENU_MANAGER_VOICE_INPUT` | Voice/transcription adapter. |
| `ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS` | Generated-image cards. |
| `ENABLE_AI_MENU_MANAGER_RULES` | Owner-approved rules. |
| `ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES` | Allows approved cards to execute menu/store mutations. |
| `ENABLE_AI_MENU_MANAGER_DEBUG_ARTIFACTS` | Enables detailed Storage artifacts for bounded debugging. |

Flags are kill switches, not product scope reducers.

---

## 5. Action Adapter Contract

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

Use for actions already handled by existing project editor/save behavior:

- price update
- availability update
- item active/hidden
- category active/hidden
- item/category name, order, and metadata updates where the existing editor path owns the field
- nested attribute name, price, active, and order updates
- menu design update
- generated image apply
- description patch
- special menu metadata patch where the current editor path already supports it

Flow:

1. Server command route creates proposal.
2. Owner approves.
3. Proposal action route locks proposal and returns a tamper-resistant execution directive.
4. Client adapter applies patch to current project object.
5. Client calls existing `updateProject()`.
6. Client calls proposal completion route with result and project update marker.

Why: existing `updateProject()` already owns MCE, linked-outlet save routing, public cache revalidation, and MOL detection. Evidence: `src/database/projects/index.ts:931`, `src/database/projects/index.ts:973`, `src/database/projects/index.ts:987`, `src/database/projects/index.ts:1070`.

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

- Menu extraction job route uses `withAuth`, tenant checks, zod validation, safe mode, rate limit, Storage URL ownership, identity check, and job creation. See `src/app/api/menu-extraction/jobs/route.ts:402`, `src/app/api/menu-extraction/jobs/route.ts:427`, `src/app/api/menu-extraction/jobs/route.ts:554`, `src/app/api/menu-extraction/jobs/route.ts:642`.
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

### `POST /api/ai-menu-manager/command`

Purpose: convert owner input into card-ready proposals.

Input:

```ts
{
  sessionId?: string;
  storeId: string; // selected store context
  projectId: string; // selected project context
  inputType: "text" | "voice_transcript" | "upload" | "suggested_action";
  text?: string;
  uploadRefs?: Array<{ storagePath: string; mimeType: string; size: number }>;
  clientContextVersion?: string;
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
- Zod input validation
- rate limit before provider calls
- SAFE_MODE before expensive AI path
- generic owner errors
- no raw provider text in response
- reject or clarify when the requested action does not match the selected store/project and no explicit scope-change approval exists

### `GET /api/ai-menu-manager/inbox`

Purpose: return compact pending cards and recent receipts.

Reads:

- one current session/day summary doc when possible.
- proposal detail docs only when summaries are stale or missing.

### `POST /api/ai-menu-manager/proposals/{proposalId}/actions`

Supported actions:

- `approve`
- `edit`
- `cancel`
- `reject`
- `ignore`
- `change_scope`
- `change_time`
- `select_items`
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

### `POST /api/ai-menu-manager/proposals/{proposalId}/complete`

Purpose: record execution result after a client-executed existing DAL save.

Input:

```ts
{
  executionId: string;
  result: "executed" | "failed";
  projectId?: string;
  actionType: AiMenuManagerActionType;
  patchHash?: string;
  baseProjectUpdatedAt?: string;
  baseProjectHash?: string;
  resultingProjectUpdatedAt?: string;
  resultingProjectHash?: string;
  receiptSummary?: string;
  errorCode?: string;
  idempotencyKey: string;
}
```

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
  projectId?: string; // selected project when the session is project-scoped
  sessionDate: "YYYY-MM-DD";
  storageMode: "daily_compact" | "detailed";
  status: "active" | "closed";
  compactMessages: CompactMessage[];
  pendingCardSummaries: CardSummary[];
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
- `recentReceiptSummaries` max target: 20 recent receipts.
- `artifactRefs` max target: 20 current pointers.
- larger transcripts, manifests, and debug payloads move to Storage.

Use a deterministic session id where safe, derived from tenant, store, project, and `sessionDate`, so retrying command submit does not create duplicate session docs.

### `aiMenuManagerProposals/{proposalId}`

Actionable card and operation record.

```ts
{
  proposalId: string;
  sessionId: string;
  tId: number;
  sId: number;
  projectId?: string; // selected project when the proposal is project-scoped
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
- inbox/history side panel.

Mobile:

- `MobileShell` sub-screen.
- bottom composer.
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
- proposal docs only for cards.
- Storage for large artifacts.
- cache menu context packets.
- use existing project summary/cache patterns where possible.
- no new scheduled function outside existing scheduler discipline.
- explicit array caps on compact session and proposal docs.
- deterministic IDs or idempotency keys for retry-safe session/proposal creation.
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

Implementation note, June 17, 2026 production hardening: current code-level adapter definitions include `manualEquivalent`, `executionMode`, `approvalLevel`, `costClass`, `mobileBehavior`, `sourceEvidence`, and readiness. The dedicated verifier fails if any current adapter definition omits these fields.

The checklist currently covers these adapter families:

- item, attribute, category, bulk, and repair actions.
- import, extraction, identity preflight, and upload-queue actions.
- item image, generated image, batch image, OBP cover, and gallery actions.
- project lifecycle, active status, cover image, language, public content, and AI default actions.
- menu design, temporary status, publish, share, export, and print actions.
- special menu, outlet, public presence, store, domain, customer app, digital screen, feedback, POS sync, integration-status, staff, AMM system, and rule actions.

The first executable adapters should follow the priority order in the checklist, starting with:

- `item_price_update`
- `item_availability_update`
- `item_visibility_update`
- `category_visibility_update`
- `menu_special_note_update`
- `menu_design_mood_update`
- `bulk_price_update`
- `bulk_availability_update`
- `image_item_generate`
- `image_item_apply_generated`
- `menu_file_upload`
- `menu_link_import`
- `menu_import_review_apply`
- `special_menu_create`
- `special_menu_activate`
- `menu_publish`

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
- action registry includes every executable action type marked `ready_adapter`, `existing_api_only`, or approved `needs_adapter_glue` in `ai-menu-manager_action-type-checklist.md`.
- every adapter declares manual equivalent.
- every write adapter declares execution mode.
- all protected APIs use auth/tenant validation/rate limits where required.
- card payloads include approval policy.
- no unsupported action executes project/store truth writes.
