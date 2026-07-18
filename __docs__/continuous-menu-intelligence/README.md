# Continuous Menu Intelligence

**Last verified:** July 16, 2026
**Source status:** Private read-model layer is local source-complete for item 15. Firebase QA deployment and downstream-consumer certification remain pending.

**Launch boundary:** Not current launch certification or deploy approval. Release still requires current production-readiness audit and External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped Functions deploy evidence for the scheduler bundle, runtime smoke, downstream-consumer certification, and production-host smoke.

CMI creates one bounded private observation document per active project from the current catalog and the compact settled 7-day analytics snapshot. It never writes canonical project/menu truth and is not a public or owner-facing feature.

## Runtime map

```text
current active project items + compact settled analytics
                         |
                         v
unified store-local scheduler
                         |
                         v
menuIntelligence/{tId}_{sId}_{projectId}
                         |
                         v
private DAL, neutral when disabled or expired
```

## Current guarantees

- Catalog-first extraction excludes deleted and analytics-only IDs.
- Alias history is merged into current IDs.
- Full projection replacement prunes deleted nested item keys.
- Manual reruns of one settled date do not age confidence or calibration.
- Fatigue uses the preceding stable streak and can now be reached correctly.
- Stored nightly priority is independent of Cloud Function server hour.
- Time-slot observations require at least 10% of recorded slot clicks.
- Priority remains annotation only; no item is hidden or reordered by CMI.

## Documentation

| File | Authority |
| --- | --- |
| `continuous-menu-intelligence_spec.md` | Current product/runtime boundary |
| `continuous-menu-intelligence_impl.md` | Current implementation map |
| `continuous-menu-intelligence_firebase.md` | Firestore cost and access contract |
| `continuous-menu-intelligence_mobile-support.md` | No-UI mobile boundary |
| `continuous-menu-intelligence_helpdoc.md` | Support boundary |
| `continuous-menu-intelligence_marketing.md` | Internal-only communications boundary |
| `continuous-menu-intelligence_website.md` | No-public-page decision |
| `continuous-menu-intelligence_logic-verification.md` | Historical evidence only |
| `continuous-menu-intelligence_validation.md` | Historical evidence only |

Pre-July 16 maintained source documents are retained under `_archive/pre-2026-07-16/`.

## Primary code

- `functions/src/intelligence/menuIntelligence.ts`
- `functions/src/intelligence/shared/itemExtractor.ts`
- `functions/src/intelligence/shared/analyticsAggregator.ts`
- `functions/src/decisionBlocksScoring.ts`
- `src/lib/intelligence/dal.ts`
- `src/types/intelligence.ts`
- `firestore.rules`

## Release boundary

CMI source completion does not certify a downstream GrowthOS, campaign, digital-screen, owner, or public-menu use. Each consumer needs its own flow audit before relying on this private state.
