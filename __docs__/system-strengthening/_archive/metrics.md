# 📊 System Strengthening - Metrics & Measurement Plan

**Created:** January 4, 2026  
**Status:** 🔍 Stage 5 Complete  
**Purpose:** Define before/after metrics for all strengthening improvements

---

## Executive Summary

This document defines **measurable success criteria** for each improvement item. Metrics are designed to be:

- **Measurable** - Can be quantified
- **Comparable** - Before vs after
- **Actionable** - Clear pass/fail threshold

---

## Measurement Approach

### Data Collection Points

| Point           | Tool            | Frequency |
| --------------- | --------------- | --------- |
| Errors          | Sentry          | Real-time |
| Firebase Usage  | Cloud Console   | Daily     |
| Performance     | Lighthouse      | Weekly    |
| Security Events | Security Logger | Real-time |
| User Actions    | Analytics       | Real-time |

### Baseline Period

**Collect "before" data for 7 days before implementation begins**

---

## P0 Items: Critical Safety Metrics

### P0-4: AI Kill Switch

| Metric              | Before          | Target      | How to Measure        |
| ------------------- | --------------- | ----------- | --------------------- |
| Time to disable AI  | N/A (no switch) | <10 seconds | Manual test           |
| Graceful error rate | N/A             | 100%        | Monitor 503 responses |
| False disables      | N/A             | 0           | Monitor production    |

**Success Criteria:**

- [ ] AI can be disabled in <10 seconds
- [ ] All AI endpoints return 503 when disabled
- [ ] No data loss or corruption on disable

**How to Test:**

```bash
# 1. Set ENABLE_AI_GENERATION: false
# 2. Time from save to all endpoints returning 503
# 3. Verify no errors in Sentry
```

---

### P0-2: Orphan Item Detection

| Metric                     | Before  | Target | How to Measure       |
| -------------------------- | ------- | ------ | -------------------- |
| Orphan items in production | Unknown | 0      | One-time audit       |
| Auto-heal rate             | 0%      | 100%   | Monitor healing logs |
| False positives            | N/A     | 0      | Manual review        |

**Success Criteria:**

- [ ] Audit finds 0 orphan items after cleanup
- [ ] New orphans auto-healed immediately
- [ ] No valid items incorrectly categorized

**How to Test:**

```typescript
// Run orphan detection on all projects
const results = await auditAllProjects();
console.log(`Orphans found: ${results.orphanCount}`);
// Target: 0
```

---

### P0-3: Cost Anomaly Alerts

| Metric                     | Before          | Target    | How to Measure        |
| -------------------------- | --------------- | --------- | --------------------- |
| Alert latency              | N/A (no alerts) | <24 hours | Check alert timestamp |
| False positive rate        | N/A             | <5%       | Review alerts         |
| Anomaly detection accuracy | N/A             | >90%      | Compare to actual     |

**Success Criteria:**

- [ ] Alerts fire within 24 hours of anomaly
- [ ] Less than 1 false positive per week
- [ ] Real anomalies (>150%) always detected

**Threshold Configuration:**

```typescript
COST_ALERT_THRESHOLDS = {
  firestoreReads: 1.5, // Alert at 150% of baseline
  geminiCalls: 2.0, // Alert at 200% of baseline
  estimatedCost: 1.5, // Alert at 150% of baseline
};
```

---

### P0-5: Blank Screen Detection

| Metric                    | Before             | Target                 | How to Measure          |
| ------------------------- | ------------------ | ---------------------- | ----------------------- |
| Mean time to detect blank | N/A (no detection) | <5 minutes             | Health report timestamp |
| Alert accuracy            | N/A                | >95%                   | Review alerts           |
| Heartbeat coverage        | 0%                 | 100% of active screens | Telemetry               |

**Success Criteria:**

- [ ] Blank detected within 5 minutes
- [ ] Alert fires after 3 consecutive blanks
- [ ] All active screens sending heartbeats

**How to Test:**

```typescript
// Force blank screen scenario
// 1. Remove all slides from store
// 2. Wait for health report
// 3. Verify alert fires after 3 reports
```

---

### P0-1: Menu Versioning & Rollback

| Metric                   | Before | Target | How to Measure       |
| ------------------------ | ------ | ------ | -------------------- |
| Version creation success | N/A    | 100%   | Monitor failures     |
| Rollback success         | N/A    | 100%   | Test rollbacks       |
| Storage per project      | N/A    | <5 MB  | Check document sizes |

**Success Criteria:**

- [ ] Every qualifying edit creates snapshot
- [ ] Rollback restores exact previous state
- [ ] 10-version limit enforced

**How to Test:**

```typescript
// 1. Delete category (should trigger snapshot)
// 2. Verify snapshot exists
// 3. Rollback
// 4. Verify category restored with all items
```

---

## P1 Items: Operational Readiness Metrics

### P1-1: Rebuild Summary Scripts

| Metric                     | Before | Target      | How to Measure  |
| -------------------------- | ------ | ----------- | --------------- |
| Rebuild time per store     | N/A    | <30 seconds | Time execution  |
| Data accuracy post-rebuild | N/A    | 100%        | Compare counts  |
| Admin accessibility        | 0      | 100%        | UI availability |

**Success Criteria:**

- [ ] Any summary doc can be rebuilt in <30 seconds
- [ ] Rebuilt summary matches source data exactly
- [ ] Admin can trigger via UI

---

### P1-2: Central Copy Registry

| Metric                        | Before  | Target | How to Measure |
| ----------------------------- | ------- | ------ | -------------- |
| Strings in registry           | 0       | >80%   | Audit codebase |
| Inline strings (owner-facing) | Unknown | <20%   | ESLint check   |
| Type safety coverage          | 0%      | 100%   | TypeScript     |

**Success Criteria:**

- [ ] > 80% of owner-facing strings in registry
- [ ] Type-safe access enforced
- [ ] No runtime string errors

**Migration Tracking:**

```markdown
| Component       | Total Strings | In Registry | %    |
| --------------- | ------------- | ----------- | ---- |
| Today Tab       | 15            | 15          | 100% |
| Owner Dashboard | 25            | 25          | 100% |
| Campaigns       | 20            | 0           | 0%   |
| Settings        | 30            | 0           | 0%   |
```

---

### P1-3: Forbidden Phrase Guard

| Metric                 | Before | Target      | How to Measure |
| ---------------------- | ------ | ----------- | -------------- |
| Blocked phrases        | 0      | All defined | Test coverage  |
| AI output sanitization | 0%     | 100%        | Route coverage |
| False positives        | N/A    | <1%         | Manual review  |

**Success Criteria:**

- [ ] All 10+ forbidden phrases blocked
- [ ] All AI output routes protected
- [ ] No valid text incorrectly blocked

**Phrase List (track blocking):**

```
| Phrase | Blocked | Last Triggered |
|--------|---------|----------------|
| "worked" | ✅ | - |
| "improved" | ✅ | - |
| "analytics" | ✅ | - |
| "best time" | ✅ | - |
| "AI says" | ✅ | - |
```

---

### P1-4: QR Menu Offline Fallback

| Metric                        | Before | Target                 | How to Measure |
| ----------------------------- | ------ | ---------------------- | -------------- |
| Offline load success          | 0%     | >95%                   | Test on device |
| Cache hit rate                | N/A    | >80% (returning users) | SW analytics   |
| Time to interactive (offline) | N/A    | <3 seconds             | Lighthouse     |

**Success Criteria:**

- [ ] Menu loads offline after first visit
- [ ] Cache refreshes when online
- [ ] Offline banner displays correctly

**How to Test:**

```bash
# Chrome DevTools:
# 1. Visit menu page
# 2. Application > Service Workers
# 3. Check "Offline"
# 4. Refresh page
# 5. Verify menu loads with banner
```

---

## P2 Items: Performance Metrics (Future)

### P2-1: Server-Side Caching

| Metric                 | Before | Target         | How to Measure   |
| ---------------------- | ------ | -------------- | ---------------- |
| Cache hit rate         | 0%     | >60%           | Redis stats      |
| Firestore reads saved  | 0      | >50% reduction | Firebase console |
| Response time (cached) | ~500ms | <100ms         | API timing       |

### P2-2: Summary Drift Detection

| Metric               | Before | Target | How to Measure |
| -------------------- | ------ | ------ | -------------- |
| Drift detection rate | 0%     | 100%   | Nightly check  |
| False positive rate  | N/A    | <5%    | Manual review  |
| Auto-repair success  | N/A    | >99%   | Repair logs    |

---

## Composite Metrics

### System Reliability Score

**Formula:**

```
Reliability = (
    (AI_Kill_Switch_Works × 15) +
    (Orphan_Detection_Working × 10) +
    (Cost_Alerts_Active × 15) +
    (Screen_Monitoring_Active × 15) +
    (Menu_Versioning_Active × 15) +
    (Summary_Scripts_Available × 10) +
    (Phrase_Guard_Active × 10) +
    (Offline_Fallback_Working × 10)
) / 100

Target: >0.9 (90%)
```

### Trust Preservation Score

**Formula:**

```
Trust = (
    (Copy_Registry_Coverage × 40) +
    (Phrase_Guard_Coverage × 30) +
    (No_Forbidden_Phrases_Leaked × 30)
) / 100

Target: >0.85 (85%)
```

### Operational Readiness Score

**Formula:**

```
Readiness = (
    (Kill_Switches_Working × 25) +
    (Recovery_Scripts_Available × 25) +
    (Monitoring_Active × 25) +
    (Alerts_Configured × 25)
) / 100

Target: >0.9 (90%)
```

---

## Measurement Schedule

### Daily

- [ ] Review Sentry for new errors
- [ ] Check cost anomaly alerts
- [ ] Monitor screen health reports

### Weekly

- [ ] Run Lighthouse on QR menu
- [ ] Review cache hit rates (when implemented)
- [ ] Audit orphan detection logs

### Monthly

- [ ] Calculate composite scores
- [ ] Compare to baseline
- [ ] Document improvements

---

## Reporting Template

### Weekly Strengthening Report

```markdown
# System Strengthening - Week [N] Report

## Summary

- Items Completed: X/11
- Reliability Score: X%
- Trust Score: X%
- Readiness Score: X%

## Key Metrics

| Metric           | Baseline | Current | Target | Status |
| ---------------- | -------- | ------- | ------ | ------ |
| AI Kill Switch   | ❌       | ✅      | ✅     | ✅     |
| Orphan Detection | 0%       | 100%    | 100%   | ✅     |
| ...              | ...      | ...     | ...    | ...    |

## Issues

- [Any blockers or concerns]

## Next Week

- [Planned items]
```

---

## Success Definition

### Minimum Viable Strengthening

**Must achieve before declaring "strengthened":**

- [ ] P0-4: AI Kill Switch working
- [ ] P0-2: Orphan detection working
- [ ] P0-3: Cost alerts configured
- [ ] P0-5: Screen monitoring active (when screens launch)
- [ ] P0-1: Menu versioning working

**Total: 5/5 P0 items**

### Full Strengthening

**All items complete:**

- [ ] All 5 P0 items ✅
- [ ] All 4 P1 items ✅
- [ ] Composite scores >85%
- [ ] Documentation complete

---

## Data Retention

### Metrics Storage

| Data Type     | Retention | Location        |
| ------------- | --------- | --------------- |
| Daily costs   | 90 days   | systemTelemetry |
| Screen health | 30 days   | systemTelemetry |
| Error logs    | 90 days   | Sentry          |
| Performance   | 30 days   | Analytics       |

### Baseline Preservation

Store baseline metrics in: `__docs__/system_strengthening/baselines/`

```
baselines/
├── pre-strengthening-2026-01-04.json
├── week-1-2026-01-11.json
├── week-2-2026-01-18.json
└── ...
```

---

**Document Status:** ✅ Stage 5 Complete  
**Last Updated:** January 4, 2026
