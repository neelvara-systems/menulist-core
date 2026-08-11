# Campaign Inbox - Implementation

## Architecture

```text
Owner draft in browser
  -> deterministic parser
  -> reviewable candidates
  -> source candidates OR Business Details routing
  -> owner selection
  -> POST /api/campaigncue/sources { action: "confirm_inbox" }
  -> auth + workspace guard + rate limit + Zod validation
  -> one idempotent Firestore transaction
  -> existing sourceInputs + current sourceSnapshot + one event
  -> local overview merge and Daily Desk recomputation
```

## Code Contract

| Responsibility | Location |
| --- | --- |
| Feature gates | `src/config/features.ts` |
| Candidate types | `src/types/campaigncue.ts` |
| Deterministic parser and mappings | `src/lib/campaigncue/campaignInbox.ts` |
| Runtime request validation | `src/lib/validation/campaigncueSchemas.ts` |
| Guarded route | `src/app/api/campaigncue/sources/route.ts` |
| Idempotent batch persistence | `src/lib/campaigncue/server.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| UI styling | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.module.scss` |
| Regression verifier | `scripts/verification/test-campaigncue-campaign-inbox.ts` |

## Deterministic Parser

The browser parser:

1. normalizes line endings and whitespace;
2. splits only at the first explicit colon separator;
3. matches a fixed label registry;
4. maps dynamic campaign facts to existing source-input types;
5. routes canonical business fields to Business Details;
6. groups unrecognized prose into one note candidate;
7. deduplicates exact normalized candidate content;
8. returns warnings instead of truncating semantic content silently.

The parser never infers a price, date, phone number, discount, availability state, or URL from free prose.

## Batch Persistence

The existing sources endpoint keeps its single-source contract and adds a discriminated `confirm_inbox` action. The server validates a maximum of eight candidates and creates deterministic source IDs from the idempotent request identity.

One transaction reads the current workspace access, Business Brain, source snapshot, and idempotency claim. It then creates the selected source-input documents, replaces the compact `sourceSnapshots/current` document, writes one aggregate audit event, and completes the idempotency record.

Idempotent replay derives the same source IDs and returns the already-saved records. Reusing the key for different content remains a conflict.

## Source Snapshot Bound

The snapshot builder prioritizes:

1. current Business Brain facts;
2. facts from the newly confirmed batch;
3. newest retained prior source-input facts.

It remains within the persisted record boundary of 200 facts and 120 source references. This prevents repeated Inbox use from eventually making the current snapshot unreadable.

## Model-Assist Boundary

Future model assist may return candidate objects only through the shared CampaignCue AI gateway and structured-output validation. Durable logic must select a capability from the repo model registry, estimate/reserve/capture/refund cost, and fail closed to the deterministic parser. Model output may not write data or mark a candidate ready.

Google documents structured JSON output as suitable for extraction and classification. That capability is relevant to a future adapter, not a reason to enable paid calls in the current runtime: https://ai.google.dev/gemini-api/docs/structured-output
