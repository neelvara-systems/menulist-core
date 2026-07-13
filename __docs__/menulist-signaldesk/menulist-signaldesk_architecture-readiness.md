# MenuList SignalDesk - Architecture Readiness Review

**Status:** Pre-implementation decision record
**Created:** June 23, 2026
**Scope:** Firebase optimization, product separation, and code splitting before runtime implementation.

## Verdict

SignalDesk should be implemented as an isolated internal product module inside this monorepo first, with extraction-ready boundaries.

This is different from building it as a MenuList owner/customer feature. The shared repo can host the code, but SignalDesk data, routes, API namespace, Firebase config, functions, constants, roles, and operational controls must stay product-scoped.

## Codebase Evidence

| Evidence | What it proves |
| --- | --- |
| `src/constants/product.ts:13` | Product identity is centralized in `PRODUCT_IDS`. |
| `src/constants/product.ts:4` | Database-backed product documents are expected to use `pId / tId / sId / docId`. |
| `src/config/features.ts:24` | Internal separate-product-style systems can live in the repo without public routes. |
| `src/config/features.ts:33` | CampaignCue is separate inside the shared app and guarded by product flags. |
| `src/constants/answerlattice/database.ts:4` | Answerlattice uses product-local collection constants for a dedicated Firebase project. |
| `firebase-answerlattice.json:1` | Answerlattice has a separate Firebase CLI config and functions codebase. |
| `firebase-campaigncue.json:1` | CampaignCue has separate Firebase rules/indexes/storage config. |
| `__docs__/answerlattice/doctrine/08-product-separation-playbook.md:8` | Existing product-separation doctrine supports shared app plus separate product surfaces and Firebase targets. |

## Product Identity Decision

| Field | Decision |
| --- | --- |
| Human name | MenuList SignalDesk |
| Route slug | `signaldesk` |
| Proposed product code | `SD` |
| Public product | No |
| MenuList owner/customer feature | No |
| Runtime home | Current monorepo first, isolated by product folders |
| Extraction path | Can move to separate private repo later because folders/config stay product-scoped |

Implementation must add a `PRODUCT_IDS.SIGNALDESK = "SD"` entry before writing database-backed SignalDesk documents. Do not reuse `GR` because GrowthOS/Growth Kits is a different product boundary.

## Code Splitting Contract

Use product-local folders only:

```txt
src/app/(signaldesk)/signaldesk/
src/app/api/signaldesk/
src/components/signaldesk/
src/constants/signaldesk/
src/database/signaldesk/
src/hooks/signaldesk/
src/lib/signaldesk/
src/providers/signaldesk/
src/types/signaldesk/
functions-signaldesk/
firebase-signaldesk.json
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
storage-signaldesk.rules
```

Do not place SignalDesk runtime in:

- `src/app/(website)/`
- `src/app/client/`
- `src/components/templates/main-app/`
- MenuList owner dashboard navigation
- MenuList customer public routes
- default `functions/src/` unless it is a narrow bridge owned by MenuList

## Allowed Shared Imports

SignalDesk may import stable shared utilities:

- auth/session helpers,
- secure logging,
- Zod validation patterns,
- rate limiting helpers,
- UI primitives when product-neutral,
- shared editor only if a future SignalDesk workflow explicitly needs it,
- Firebase client factory patterns, not MenuList Firebase clients.

SignalDesk must not import MenuList DAL files that read/write MenuList business truth. Any MenuList connection must go through the outcome bridge contract.

## Firebase Separation Contract

Create a dedicated Firebase target:

| Environment | Project |
| --- | --- |
| Local/QA | `menulist-signaldesk-qa` |
| Production | `menulist-signaldesk` |

Required implementation files:

```txt
src/lib/firebase/signaldeskConfig.ts
src/lib/firebase/signaldeskFirebaseClient.ts
src/lib/firebase/signaldeskFirebaseAdmin.ts
firebase-signaldesk.json
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
storage-signaldesk.rules
functions-signaldesk/package.json
functions-signaldesk/src/index.ts
functions-signaldesk/src/constants/database.ts
functions-signaldesk/src/constants/features.ts
functions-signaldesk/src/firebaseAdmin.ts
```

Environment variables must use full names:

```txt
NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MODE=separate
NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_API_KEY=...
NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID=menulist-signaldesk-qa
NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_MENULIST_SIGNALDESK_FIREBASE_APP_ID=...
MENULIST_SIGNALDESK_FIREBASE_MODE=separate
MENULIST_SIGNALDESK_FIREBASE_PROJECT_ID=menulist-signaldesk-qa
MENULIST_SIGNALDESK_FIREBASE_CLIENT_EMAIL=...
MENULIST_SIGNALDESK_FIREBASE_PRIVATE_KEY=...
MENULIST_SIGNALDESK_FIRESTORE_DATABASE_ID=
MENULIST_SIGNALDESK_GEMINI_AI_KEY=...
MENULIST_SIGNALDESK_GEMINI_AI_KEY_2=
MENULIST_SIGNALDESK_GEMINI_AI_KEY_3=
MENULIST_SIGNALDESK_GEMINI_AI_KEY_4=
MENULIST_SIGNALDESK_AI_MODEL=
```

Do not introduce shorthand prefixes such as `SD_*` or `MLSD_*`.
SignalDesk AI provider calls must not fall back to MenuList `GEMINI_AI_KEY*` or Answerlattice credentials. The app creates a SignalDesk-scoped key manager while reusing the shared retry gateway implementation.

## Firebase Optimization Contract

### Read Model

Every default UI screen reads summaries:

| Screen | Default collection |
| --- | --- |
| `/signaldesk` | `signaldeskControlRoomSummaries` |
| `/signaldesk/targets` | `signaldeskTargetSummaries` |
| `/signaldesk/imports` | `signaldeskSourceRunSummaries` |
| `/signaldesk/approvals` | `signaldeskApprovalQueue` plus compact target summary refs |
| `/signaldesk/inbox` | `signaldeskConversationSummaries` |
| `/signaldesk/attribution` | `signaldeskOutcomeSummaries` |
| `/signaldesk/control-room` | control-room, channel, cost, queue, source, and AI summaries |

Detail views can read detail collections, but only after an explicit operator action.

### Write Model

Each mutation writes:

1. canonical detail doc or append-only event;
2. compact summary doc;
3. audit event;
4. idempotency key when external or retryable;
5. cost/operation ledger row when AI, provider, import, or webhook work runs.

### Import Optimization

- Store original CSV/import file in Storage with lifecycle policy.
- Normalize rows before Firestore writes.
- Create identity hashes and `signaldeskIdentityIndex` docs for dedupe.
- Use batched writes in chunks.
- Write `signaldeskSourceRunSummaries` for UI.
- Store row-level failures compactly; do not render dashboards from raw rows.

### AI Optimization

- Cache scoring by `targetEvidenceHash + workerVersion + ruleVersion`.
- Cache drafts by `templateVersion + variableHash + evidenceHash`.
- Store AI run detail separately from target summaries.
- Track daily AI budgets in `signaldeskCostDailySummaries`.
- Add `signaldeskAiOperationLedger` for operation-level accounting.
- No list screen may trigger AI.
- Low-confidence AI output writes review work, not sends.

### Inbox and Webhook Optimization

- Normalize webhook payloads before Firestore.
- Dedupe by provider event ID.
- Store raw payloads only in Storage when retention policy requires proof.
- Update `signaldeskConversationSummaries` synchronously.
- Use paginated message detail reads.
- Suppression writes must happen before follow-up work is created.

### MenuList Bridge Optimization

SignalDesk does not write MenuList truth directly.

Allowed bridge outputs:

- route token,
- outcome event,
- linked MenuList reference,
- compact attribution touch,
- manual operator evidence note.

Disallowed:

- writing `stores`,
- writing `projects`,
- publishing menus,
- changing owner billing,
- editing public MenuList output,
- reading broad MenuList owner/customer data for dashboards.

## Implementation Gate

Before writing runtime code:

1. Add `PRODUCT_IDS.SIGNALDESK = "SD"`.
2. Add `ENABLE_MENULIST_SIGNALDESK_*` feature flags.
3. Add product-local constants and route definitions.
4. Add dedicated Firebase config/client/admin files.
5. Add `firebase-signaldesk.json`, rules, indexes, and storage rules.
6. Add `functions-signaldesk/` only for workers/webhooks/AI/provider flows that must not run in browser or Next route handlers.
7. Keep all first-build sending/export paths behind kill switches and approval.
8. Verify no SignalDesk route appears in MenuList public website, owner sidebar, customer menu, sitemap, or public docs.
