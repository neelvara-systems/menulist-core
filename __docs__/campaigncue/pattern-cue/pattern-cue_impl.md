# Pattern Cue - Implementation

## Code Map

| Concern | File |
| --- | --- |
| Feature gates | `src/config/features.ts` |
| Durable types | `src/types/campaigncue.ts` |
| Pattern analysis and validation | `src/lib/campaigncue/patternCue.ts` |
| API validation | `src/lib/validation/campaigncueSchemas.ts` |
| Persistence and pack projection | `src/lib/campaigncue/server.ts` |
| Decision/freshness exclusion | `src/lib/campaigncue/operatingLoop.ts`, `src/lib/campaigncue/decisionEngine.ts`, `src/lib/campaigncue/dailyDesk.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Navigation/locales | `src/constants/campaigncue/navigations.ts`, `public/locales/menulist.ai/*` |
| Verification | `scripts/verification/verify-campaigncue-pattern-cue.ts` |

## Data Flow

1. Owner opens **Examples** and submits a link plus notes.
2. Existing protected `POST /api/campaigncue/sources` authenticates, tenant-scopes, rate-limits, bounds, and validates the request.
3. `buildCampaignCuePatternCueObservation()` validates the public HTTPS URL and derives a compact deterministic observation.
4. The raw notes leave memory after the request and are not written to Firestore, Storage, logs, events, or output metadata.
5. The current observation is stored as `workspace.patternCueSource` using fixed ID `cc_source_pattern_current`.
6. Overview and campaign-create paths project that workspace field into the existing in-memory `sourceInputs` list without another read.
7. Decision readiness filters out `inspiration_pattern`.
8. Campaign creation selects the current pattern only when the requested pack contains a video or UGC output, then adds it to that output's brief text, handoff fields, source references, metadata, and trust review. The compact metadata includes source hash, platform, rights posture, hook type, format, pacing, and duration band.
9. Only a pack that actually contains a pattern-backed video or UGC output pins `patternCueSourceInputId` and `patternCueSourceHash`.
10. Public-use actions compare the pinned hash with the current workspace hash.
11. Video Reel Studio snapshots the compact classification with its project, binds result memory to an exact rendered version, and groups owner-reported outcomes client-side. Pattern Cue itself adds no history collection or monitoring job.

Persisted-observation type guards are total and non-coercive. Unknown values,
hostile property access, and malformed URL values return `false`/`other`
instead of invoking user-controlled coercion or throwing into an overview or
campaign read.

## Feature Flags

- `ENABLE_CAMPAIGNCUE_PATTERN_CUE: true` enables the deterministic workflow.
- `ENABLE_CAMPAIGNCUE_PATTERN_CUE_MODEL_ASSIST: false` reserves model-assisted classification.
- `ENABLE_CAMPAIGNCUE_AI_PROVIDER_CALLS: false` blocks all CampaignCue provider calls.

Model assist must not be enabled until CampaignCue-specific capacity accounting, SAFE_MODE, AI-operation rate limiting, provider configuration, candidate validation, and cost reporting are active.
