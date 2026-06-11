# Decision Intelligence (Decision Blocks)

**Customer-facing menu recommendations with optional owner control**

**Audit status:** Controlled owner testing ready for the audited runtime slice as of June 11, 2026. Full MenuList production certification is still pending the remaining feature-by-feature audit and global validation.

---

## What This Is

Decision Blocks are 3 recommendation cards shown at the top of every QR menu:

| Block                    | Purpose                  |
| ------------------------ | ------------------------ |
| ⭐ **Popular Right Now** | What others are ordering |
| ⚡ **Quick Pick**        | What's ready fast        |
| 💰 **Best Value**        | Best price/value ratio   |

---

## Documentation

| File                                          | Purpose                                         |
| --------------------------------------------- | ----------------------------------------------- |
| `decision-intelligence_spec.md`               | Product specification (non-tech, for CEO/teams) |
| `decision-intelligence_impl.md`               | Implementation details (dev-only)               |
| `decision-intelligence_marketing.md`          | Marketing & sales collateral                    |
| `decision-intelligence_website.md`            | Website page content & SEO                      |
| `decision-intelligence_helpdoc.md`            | Customer help documentation                     |
| `decision-intelligence_firebase.md`           | Firebase cost tracking                          |
| `decision-intelligence_logic-verification.md` | Logic verification report                       |

---

## Relationship with CMI

**Decision Blocks** and **Continuous Menu Intelligence (CMI)** are **related but different**:

| Feature        | Decision Blocks         | CMI                            |
| -------------- | ----------------------- | ------------------------------ |
| **Purpose**    | Customer-facing UI      | Backend intelligence           |
| **Output**     | 3 recommendation blocks | Confidence scores, suppression |
| **Storage**    | `projects.publicDecisionBlocks` | `menuIntelligence`             |
| **Visibility** | Customers see it        | Internal only                  |

**Shared Infrastructure:** Both run inside the unified timezone-aware scheduler. The Cloud Scheduler trigger fires hourly at `:30`, and the function processes only stores whose local settlement window is due. Platform-only manual recovery uses the same compact 7-day analytics snapshot path as the scheduler.

```
decisionBlocksScoring.ts (hourly trigger, store-local settlement window)
├── STEP 1: Decision Blocks → projects/{tId}/{sId}/{projectId}.publicDecisionBlocks
└── STEP 2: CMI → menuIntelligence/{tId}_{sId}_{projectId}
```

---

## Key Files (Codebase)

| File                                                 | Purpose             |
| ---------------------------------------------------- | ------------------- |
| `src/config/decisionBlocks.ts`                       | Block configuration |
| `src/components/.../DecisionBlocks.tsx`              | Customer UI         |
| `src/components/.../DecisionBlocksSettingsModal.tsx` | Owner settings      |
| `functions/src/decisionBlocksScoring.ts`             | Timezone-aware scheduler + platform-only manual recovery |
| `src/components/mobile/sheets/SmartRecommendationsSheet.tsx` | Mobile owner controls |

Runtime safety notes:

- Customer rendering uses the store timezone for category time-slot checks.
- Malformed or missing precomputed timestamps are treated as stale instead of trusted.
- Hard-stale analytics suppress automatic recommendations, but explicit owner pins can still render if the item is active, available, in-slot, and otherwise safe.

---

## Extending This Feature

To extend Decision Blocks:

1. **Add new block type:** Update `decisionBlocks.ts` + scoring in `decisionBlocksScoring.ts`
2. **Add business category:** Update category configs in `decisionBlocks.ts`
3. **Add language:** Update `decisionBlockTranslations.ts`
4. **Change scoring:** Update `calculateXxxScore()` functions in scheduler

---

_Last Updated: June 11, 2026_
_Status: Controlled owner testing ready in audited slice; full MenuList certification pending_
