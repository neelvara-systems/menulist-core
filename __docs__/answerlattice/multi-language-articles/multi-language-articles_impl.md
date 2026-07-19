# Multi-Language Articles Implementation

## Runtime Files

| File | Responsibility |
|---|---|
| `src/config/features.ts` | Default-off rollout gate |
| `src/types/answerlattice/index.ts` | Translation draft/approval/source fields |
| `src/lib/answerlattice/articleTranslationServer.ts` | Source extraction/hash, strict provider parsing, draft content, conflict decision |
| `src/lib/answerlattice/articleTranslationContracts.ts` | Client-safe draft/approval classification |
| `src/app/api/answerlattice/translate/route.ts` | Authenticated draft-generation route |
| `src/components/templates/answerlattice/governance/MultiLanguageArticles.tsx` | Private draft status/preparation UI |
| `src/components/templates/answerlattice/governance/index.tsx` | Bounded browser request/response contract |
| `src/lib/answerlattice/publicContentBoundary.ts` | Customer projection intentionally excludes translations |
| `src/lib/answerlattice/supportTruthExport.ts` | Exports only explicitly approved and reviewed translations |
| `scripts/verification/test-answerlattice-multi-language-contracts.ts` | Executable contracts |

## Write Flow

`flag -> session scope -> safe mode with private response handling -> fail-closed rate limit -> MANAGE_KNOWLEDGE -> 4 KiB strict body -> exact AL/article/workspace read -> existing-locale check -> 8,000-character source cap -> provider -> 64 KiB provider-response cap -> strict JSON -> transaction re-read with exact AL/workspace checks -> source-hash and overwrite checks -> one draft field write -> bounded response`

## Draft Shape

Required draft fields are locale, title, content, `status: draft`, `sourceLocale: en-US`, SHA-256 `sourceHash`, `translatedBy`, and `translatedAt`.

`approved` is a reserved state. Client-safe classification treats a record as approved only when status is explicitly `approved` and both reviewer identity and review time exist. No current UI or API grants that state.

## Failure Behavior

- malformed, partial, extra-field, empty, oversized, or truncated provider output: `502`, no draft;
- source changed during generation: `409`, no draft;
- locale record already exists: `409`, no overwrite;
- missing or cross-workspace article: `404`;
- limiter-provider outage: `503 RATE_LIMIT_UNAVAILABLE`;
- ordinary exhaustion/provider busy: `429`;
- all responses are private/no-store and `nosniff`.

## Deliberate Omission

The private draft write does not bump KB/context versions because no approved public or retrieval consumer reads it. A future approval action, not draft generation, must own propagation.
