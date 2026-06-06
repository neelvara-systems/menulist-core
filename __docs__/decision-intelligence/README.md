# Decision Intelligence (Decision Blocks)

**Customer-facing menu recommendations with optional owner control**

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

**Shared Infrastructure:** Both run inside the unified timezone-aware scheduler. The Cloud Scheduler trigger fires hourly at `:30`, and the function processes only stores whose local settlement window is due.

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

---

## Extending This Feature

To extend Decision Blocks:

1. **Add new block type:** Update `decisionBlocks.ts` + scoring in `decisionBlocksScoring.ts`
2. **Add business category:** Update category configs in `decisionBlocks.ts`
3. **Add language:** Update `decisionBlockTranslations.ts`
4. **Change scoring:** Update `calculateXxxScore()` functions in scheduler

---

_Last Updated: May 7, 2026_
_Status: 🔒 LOCKED — Production Ready_
