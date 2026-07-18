# Decision Intelligence (Featured Choices)

**Last verified:** July 16, 2026
**Source status:** Local source-complete for item 15; Firebase QA deployment, browser/device QA, and release certification remain pending.

**Launch boundary:** Not current launch certification or deploy approval. Source completion still requires current production-readiness audit and External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:agent-readiness`, scoped scheduler deploy evidence, browser/mobile customer-menu QA, public-cache evidence, and production-host smoke before release.

Featured Choices is the customer-facing Decision Intelligence flow. It can render Featured, Quick, and Value choices above the full approved menu after strict data and runtime gates. Owners can also select eligible items from desktop or mobile.

This feature does not know completed orders, payments, POS sales, inventory counts, ratings, or reviews. It does not promise a result and does not appear on every menu.

## Runtime map

```text
settled customer-menu analytics + current project catalog
                    |
                    v
computeDecisionBlocksScores (hourly trigger, due stores only)
                    |
                    v
projects/{tId}/{sId}/{projectId}.publicDecisionBlocks
                    |
                    v
public route cache -> DecisionBlocks.tsx runtime safety filters
                    |
                    v
eligible Featured section or no section
```

Owner controls live at `project.menuSettings.decisionBlocks`. Generated output lives at `project.publicDecisionBlocks`; owner project writes strip the generated field.

## Current guarantees

- The current active project catalog is authoritative.
- Historical aliases merge analytics into the current item ID.
- Analytics-only/deleted items cannot become candidates.
- Quick choices require an explicit duration; `0` remains valid.
- Automatic popular choices require per-item behavioral evidence and use neutral wording.
- Public cache is invalidated once per affected store after backend projection writes.
- Stale or unsafe automatic output is hidden; valid owner-selected items remain eligible.
- Desktop, mobile, Functions, and public renderer have explicit feature gates.

## Documentation

| File | Authority |
| --- | --- |
| `decision-intelligence_spec.md` | Current product/runtime contract |
| `decision-intelligence_impl.md` | Current implementation map |
| `decision-intelligence_firebase.md` | Firestore cost, read/write, cache, and deploy boundary |
| `decision-intelligence_mobile-support.md` | Mobile owner/customer parity |
| `decision-intelligence_helpdoc.md` | Owner support copy |
| `decision-intelligence_marketing.md` | Approved claims and prohibited claims |
| `decision-intelligence_website.md` | Current Featured Choices website placement |
| `decision-intelligence_verification-2026-07-16.md` | Current audit evidence |
| `decision-intelligence_logic-verification.md` | Historical verification evidence only |

Pre-July 16 source documents are retained under `_archive/pre-2026-07-16/`.

## Primary code

- `functions/src/decisionBlocksScoring.ts`
- `functions/src/intelligence/shared/itemExtractor.ts`
- `src/data/shared/decisionBlockConfig.ts`
- `functions/src/sharedData/decisionBlockConfig.ts`
- `src/components/templates/main-app/projects/b2cView/output/DecisionBlocks.tsx`
- `src/components/templates/main-app/projects/editorView/decisionBlocks.shared.ts`
- `src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx`
- `src/components/mobile/sheets/SmartRecommendationsSheet.tsx`

## Release boundary

Source completion is not live completion. The Functions bundle must be deployed to `menulist-qa`, followed by current browser/mobile/public-host verification and the repository release gates. No Vercel deployment is implied by this audit.
