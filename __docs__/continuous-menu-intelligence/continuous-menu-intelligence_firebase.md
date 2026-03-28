# Continuous Menu Intelligence — Firebase Cost Tracking

**Feature:** Menu Behavioral Observation Layer (Two-Layer Architecture)  
**Status:** ✅ Production Ready (Observation Active, Optimization GrowthOS-Deferred)  
**Last Updated:** March 15, 2026  
**Priority:** HIGH — Nightly Cloud Functions reading analytics + writing scores. Scales with project count.

> **Note:** Autonomous actions (AUTO_HIDE, AUTO_PROMOTE, etc.) are computed and logged but architecturally belong to GrowthOS. Firebase cost covers the full computation including deferred actions.

---

## Summary

- **Collections Used:** `analytics`, `projects/{tId}/{sId}`, `decisionBlocks`, `menuIntelligence/{tId}_{sId}_{projectId}`, `stores`
- **Storage Buckets:** None
- **Cloud Functions:** `computeDecisionBlocksScores` (scheduled nightly 02:30 UTC — CMI runs as Step 2 inside this function)
- **Estimated Monthly Cost:** **Medium** — Analytics reads dominate. Scales linearly with active projects.

---

## Firestore Operations

### Reads

| Operation                  | Collection                                 | Trigger     | Frequency               | Docs Read        | Indexed?              | Notes                                      |
| -------------------------- | ------------------------------------------ | ----------- | ----------------------- | ---------------- | --------------------- | ------------------------------------------ |
| Read analytics (scoring)   | `analytics`                                | Nightly job | Per project × 7-30 days | 7-30 per project | Yes (date, projectId) | Daily analytics docs for scoring period.   |
| Read project data          | `projects/{tId}/{sId}/{projectId}`         | Nightly job | Per active project      | 1                | Direct doc            | Full project for item analysis.            |
| Read store config          | `stores/{storeId}`                         | Nightly job | Per store               | 1                | Direct doc            | Business type, calibration settings.       |
| Read existing intelligence | `menuIntelligence/{tId}/{sId}/{projectId}` | Nightly job | Per project             | 1                | Direct doc            | Previous confidence scores for comparison. |

### Writes

| Operation                  | Collection                                       | Trigger               | Frequency        | Docs Written | Fields                                                         | Notes                                          |
| -------------------------- | ------------------------------------------------ | --------------------- | ---------------- | ------------ | -------------------------------------------------------------- | ---------------------------------------------- |
| Write intelligence results | `menuIntelligence/{tId}/{sId}/{projectId}`       | After nightly scoring | Per project      | 1            | Item confidence scores, suppression windows, calibration state | Full scoring results.                          |
| Update decision blocks     | `decisionBlocks/{tId}_{sId}_{projectId}`         | After scoring         | Per project      | 1            | popular, quickPick, bestValue candidates                       | Refreshed recommendations based on new scores. |
| Write audit log            | `menuIntelligence/{tId}/{sId}/{projectId}/audit` | Per autonomous action | Per action taken | 1            | Action type, reason, reversible flag                           | Internal audit trail for autonomous decisions. |

### Deletes

None — intelligence data is overwritten, never deleted.

---

## Cloud Functions

| Function                      | Trigger               | Frequency | Duration           | Memory | Notes                                                                                                    |
| ----------------------------- | --------------------- | --------- | ------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| `computeDecisionBlocksScores` | Scheduled (02:30 UTC) | 1x/day    | 10-30s per project | 256MB  | Step 1: Decision Blocks scoring. Step 2: CMI computation. File: `functions/src/decisionBlocksScoring.ts` |

---

## Cost Optimization Notes

### Current Optimizations

- **Nightly batch**: Single scheduled run, not real-time — predictable cost
- **Feature flag gating**: Intelligence state is used when `MENU_INTELLIGENCE_ENABLED` is true (`src/config/features.ts`)
- **Suppression windows**: Prevents redundant scoring of recently-scored items
- **21-day calibration lock**: Store-specific learning locks after 21 days, reducing computation

### Warnings: Expensive Patterns

- **Analytics reads**: 30 daily docs × 1000 projects = 30,000 reads/night
- **Linear scaling**: Every new active project adds ~32 reads + 2 writes per night

---

## Cost Estimate (per 1000 active projects)

| Resource                            | Operations/month          | Unit Cost         | Monthly Cost     |
| ----------------------------------- | ------------------------- | ----------------- | ---------------- |
| Firestore Reads (analytics)         | 30 × 1,000 × 30 = 900,000 | $0.06/100K        | $0.54            |
| Firestore Reads (projects + stores) | 60,000                    | $0.06/100K        | $0.04            |
| Firestore Writes (results)          | 60,000                    | $0.18/100K        | $0.11            |
| Cloud Functions                     | 30,000                    | $0.40/M + compute | $0.05            |
| **Total**                           |                           |                   | **~$0.74/month** |

---

## DAL Functions Used

| Function                   | File                                             | Operation Type                |
| -------------------------- | ------------------------------------------------ | ----------------------------- |
| `computeIntelligenceState` | `functions/src/intelligence/menuIntelligence.ts` | Compute (called by scheduler) |
| `fetchCurrentIntelligence` | `functions/src/intelligence/menuIntelligence.ts` | Read (admin SDK)              |
| `getMenuIntelligence`      | `src/lib/intelligence/dal.ts`                    | Read (client SDK)             |
| `shouldShowItem`           | `src/lib/intelligence/dal.ts`                    | Read (client SDK)             |
| `getHighConfidenceItems`   | `src/lib/intelligence/dal.ts`                    | Read (client SDK)             |
