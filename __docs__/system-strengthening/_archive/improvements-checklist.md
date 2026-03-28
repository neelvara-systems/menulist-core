# ✅ System Strengthening - Implementation Checklist

**Created:** January 4, 2026  
**Status:** 🔍 Stage 4 Complete  
**Purpose:** Actionable implementation checklist with file-level tasks

---

## How to Use This Document

Each improvement item has:

- **Estimated Time** - Development effort
- **Dependencies** - What must be done first
- **Tasks** - File-level checkboxes
- **Testing** - Verification steps
- **Docs** - Documentation updates required

Mark items `[x]` as you complete them.

---

## Week 1: Critical Safety (5 days)

### 🔴 P0-4: AI Kill Switch (Est: 1 day)

**Dependencies:** None

**Tasks:**

- [ ] Add to `src/config/features.ts`:
  ```typescript
  ENABLE_AI_GENERATION: true,  // Master AI kill switch
  ```
- [ ] Create `src/lib/ai/killSwitch.ts`:
  - [ ] `isAIEnabled()` function
  - [ ] `AI_DISABLED_MESSAGE` constant
  - [ ] Export both
- [ ] Modify `src/app/api/descriptions/route.ts`:
  - [ ] Import `isAIEnabled`
  - [ ] Check at start of POST handler
  - [ ] Return 503 with message if disabled
- [ ] Modify `src/app/api/image-generation/route.ts`:
  - [ ] Same pattern as above
- [ ] Modify `src/app/api/campaigns/generate/route.ts`:
  - [ ] Same pattern
- [ ] Modify `src/app/api/campaigns/caption/route.ts`:
  - [ ] Same pattern
- [ ] Modify `src/app/api/translations/route.ts`:
  - [ ] Same pattern
- [ ] Modify `src/app/api/new-item-metadata/route.ts`:
  - [ ] Same pattern

**Testing:**

- [ ] Set `ENABLE_AI_GENERATION: false`
- [ ] Call each AI endpoint
- [ ] Verify 503 response with correct message
- [ ] Set back to `true`, verify AI works

**Docs:**

- [ ] Update `src/config/features.ts` comments
- [ ] Add to `__docs__/security/README.md` kill switch section

---

### 🔴 P0-2: Orphan Item Detection (Est: 1 day)

**Dependencies:** None

**Tasks:**

- [ ] Create `src/lib/menu/dataIntegrity.ts`:
  - [ ] `detectOrphanItems(items, categories)` function
  - [ ] `detectGhostCategories(categories, items)` function
  - [ ] `healOrphanItems(items)` function
  - [ ] Export all
- [ ] Add to `src/config/features.ts`:
  ```typescript
  ENABLE_DATA_INTEGRITY_CHECK: true,
  ```
- [ ] Modify `src/database/projects/index.ts`:
  - [ ] Import data integrity functions
  - [ ] In `updateProject()`, call `detectOrphanItems()` before save
  - [ ] Log if orphans found and healed
  - [ ] Ensure "Uncategorized" category exists
- [ ] Add to `src/types/project.types.ts`:
  - [ ] `UNCATEGORIZED_CATEGORY_ID = 'uncategorized'` constant

**Testing:**

- [ ] Create item with invalid category ID
- [ ] Save project
- [ ] Verify item moved to "Uncategorized"
- [ ] Verify console log shows healing

**Docs:**

- [ ] Add to `__docs__/projects/11-database-layer.md` data integrity section

---

### 🔴 P0-3: Cost Anomaly Alerts (Est: 2 days)

**Dependencies:** None

**Tasks:**

**Day 1: Types & DAL**

- [ ] Create `src/types/telemetry.ts`:
  - [ ] `DailyCostMetrics` interface
  - [ ] `CostAlert` interface
  - [ ] `COST_ALERT_THRESHOLDS` constants
- [ ] Create `src/database/telemetry/index.ts`:
  - [ ] `logDailyCost(metrics)` function
  - [ ] `getCostHistory(days)` function
  - [ ] `getAverageBaseline(days)` function

**Day 2: Cloud Function**

- [ ] Create `functions/src/costMonitoring.ts`:
  - [ ] Scheduled function (daily 3 AM UTC)
  - [ ] Query Firebase usage (manual for now)
  - [ ] Compare against baseline
  - [ ] Log to `systemTelemetry/costs_{date}`
- [ ] Create `functions/src/alerts/costAlert.ts`:
  - [ ] `checkCostAnomaly(today, baseline)` function
  - [ ] Sentry alert if >150%
  - [ ] Return alert object
- [ ] Update `functions/src/index.ts`:
  - [ ] Export `costMonitoringScheduler`

**Testing:**

- [ ] Manually trigger function
- [ ] Verify metrics logged
- [ ] Force threshold breach
- [ ] Verify Sentry alert received

**Docs:**

- [ ] Create `__docs__/monitoring/COST_MONITORING.md`

---

## Week 2: Operational Readiness (4 days)

### 🟠 P1-1: Rebuild Summary Scripts (Est: 2 days)

**Dependencies:** None

**Tasks:**

**Day 1: Cloud Functions**

- [ ] Create `functions/src/maintenance/rebuildSummary.ts`:
  - [ ] `rebuildProjectsSummary(sId)` function
  - [ ] `rebuildCampaignsSummary(sId)` function
  - [ ] `rebuildAllSummaries(sId)` function
  - [ ] Log before/after counts
- [ ] Make functions callable via HTTP
- [ ] Update `functions/src/index.ts`:
  - [ ] Export `rebuildProjectsSummary`
  - [ ] Export `rebuildCampaignsSummary`

**Day 2: Admin UI**

- [ ] Create `src/app/api/admin/rebuild-summary/route.ts`:
  - [ ] POST handler
  - [ ] Auth: platform admin only
  - [ ] Call Cloud Function
  - [ ] Return result
- [ ] Create `src/components/templates/platform/admin/RebuildTools.tsx`:
  - [ ] Store ID selector
  - [ ] "Rebuild Projects Summary" button
  - [ ] "Rebuild Campaigns Summary" button
  - [ ] Result display
- [ ] Add to admin page routing

**Testing:**

- [ ] Select store in admin UI
- [ ] Click rebuild projects
- [ ] Verify summary updated
- [ ] Check counts match

**Docs:**

- [ ] Create `__docs__/admin/MAINTENANCE_TOOLS.md`

---

### 🔴 P0-5: Blank Screen Detection (Est: 2 days)

**Dependencies:** Digital screens implementation started

**Tasks:**

**Day 1: Client-Side Monitoring**

- [ ] Create `src/app/screen/[token]/ScreenMonitor.tsx`:
  - [ ] `useScreenHealth(slides)` hook
  - [ ] Blank detection (slides.length === 0)
  - [ ] Heartbeat every 5 minutes
  - [ ] Report function
- [ ] Create `src/app/api/screen/health/route.ts`:
  - [ ] POST handler (no auth - public screen)
  - [ ] Rate limit: 20 req/min per token
  - [ ] Log to `systemTelemetry/screen_{date}`

**Day 2: Alerting**

- [ ] Create `functions/src/alerts/screenHealth.ts`:
  - [ ] Triggered on blank report
  - [ ] Check consecutive blank count
  - [ ] Alert if >=3 consecutive
  - [ ] Sentry event: "Screen Blank Alert"
- [ ] Add health status to screen display
- [ ] Add admin view of screen health

**Testing:**

- [ ] Load screen with 0 slides (force)
- [ ] Verify health report sent
- [ ] Verify 3 blanks triggers alert
- [ ] Verify heartbeat continues

**Docs:**

- [ ] Add to `__docs__/digital-screens/digital-screens_impl.md` monitoring section

---

## Week 3: Trust Psychology (4 days)

### 🟠 P1-2: Central Copy Registry (Est: 3 days)

**Dependencies:** None

**Tasks:**

**Day 1: Create Registry**

- [ ] Create `src/config/copyRegistry.ts`:
  - [ ] `OWNER_COPY` object with all strings
  - [ ] Sections: today, dashboard, campaigns, settings, errors
  - [ ] `_forbidden` array (not exported directly)
  - [ ] Type exports
- [ ] Create `src/hooks/useCopy.ts`:
  - [ ] `useCopy(section)` hook
  - [ ] Type-safe string access
  - [ ] Placeholder support

**Day 2: Migrate Today Tab**

- [ ] Update `src/components/templates/main-app/today/index.tsx`:
  - [ ] Import `useCopy`
  - [ ] Replace inline strings
- [ ] Update `src/components/templates/main-app/today/components/PrimaryCard/index.tsx`:
  - [ ] Same pattern
- [ ] Update `src/components/templates/main-app/today/components/OperationalSection/index.tsx`:
  - [ ] Same pattern

**Day 3: Migrate Owner Dashboard**

- [ ] Update `src/components/templates/main-app/dashboard/OwnerDashboard/OverviewView.tsx`:
  - [ ] Replace "Your menu is working!" etc.
- [ ] Update `src/components/templates/main-app/dashboard/OwnerDashboard/DailyView.tsx`:
  - [ ] Replace metric labels
- [ ] Document migration pattern for other components

**Testing:**

- [ ] Verify Today tab displays correctly
- [ ] Verify Owner Dashboard displays correctly
- [ ] Test placeholder interpolation
- [ ] Check TypeScript types

**Docs:**

- [ ] Create `__docs__/development/COPY_REGISTRY.md`
- [ ] Add migration guide

---

### 🟠 P1-3: Forbidden Phrase Guard (Est: 1 day)

**Dependencies:** P1-2 (Copy Registry)

**Tasks:**

- [ ] Create `src/lib/trust/phraseGuard.ts`:
  - [ ] `FORBIDDEN_PHRASES` array
  - [ ] `containsForbiddenPhrase(text)` function
  - [ ] `sanitizeAIOutput(text, fallback)` function
  - [ ] Export all
- [ ] Modify `src/app/api/campaigns/caption/route.ts`:
  - [ ] Import `sanitizeAIOutput`
  - [ ] Wrap AI response before return
  - [ ] Log if sanitization needed
- [ ] Modify `src/app/api/descriptions/route.ts`:
  - [ ] Same pattern

**Testing:**

- [ ] Generate caption with prompt that might produce "improved"
- [ ] Verify phrase is caught
- [ ] Verify fallback text used
- [ ] Check security log

**Docs:**

- [ ] Add to `__docs__/development/COPY_REGISTRY.md` forbidden phrases section

---

## Week 4: Data Safety (5 days)

### 🔴 P0-1: Menu Versioning & Rollback (Est: 3 days)

**Dependencies:** None

**Tasks:**

**Day 1: Types & Storage**

- [ ] Create `src/types/menuVersion.ts`:
  - [ ] `MenuVersionSnapshot` interface
  - [ ] `MenuVersionTrigger` type
  - [ ] `MAX_VERSIONS_PER_PROJECT = 10` constant
- [ ] Create `src/database/menuVersions/index.ts`:
  - [ ] `createSnapshot(project, trigger)` function
  - [ ] `getVersions(projectId)` function
  - [ ] `rollbackToVersion(versionId)` function
  - [ ] Storage: `platformSummary/menuVersions_{sId}`

**Day 2: Auto-Snapshot Triggers**

- [ ] Create `src/lib/menu/snapshotTriggers.ts`:
  - [ ] `shouldCreateSnapshot(beforeState, afterState)` function
  - [ ] Triggers: category delete, bulk edit, AI extraction
- [ ] Modify `src/database/projects/index.ts`:
  - [ ] Import snapshot functions
  - [ ] In `updateProject()`, check trigger
  - [ ] Create snapshot before applying changes

**Day 3: Rollback UI**

- [ ] Create `src/components/templates/main-app/projects/ProjectVersions.tsx`:
  - [ ] Version list display
  - [ ] Rollback button per version
  - [ ] Confirmation modal
- [ ] Add to project settings/menu
- [ ] Connect rollback to DAL function

**Testing:**

- [ ] Delete a category
- [ ] Verify snapshot created
- [ ] Delete 11 categories
- [ ] Verify only 10 versions exist (rolling)
- [ ] Rollback to version
- [ ] Verify data restored

**Docs:**

- [ ] Create `__docs__/projects/MENU_VERSIONING.md`

---

### 🟠 P1-4: QR Menu Offline Fallback (Est: 2 days)

**Dependencies:** None

**Tasks:**

**Day 1: Service Worker**

- [ ] Create `public/menu-sw.js`:
  - [ ] Cache name and duration constants
  - [ ] Install event: precache shell
  - [ ] Fetch event: cache-first for menu data
  - [ ] Activate event: cleanup old caches
- [ ] Register in `src/app/menu/[token]/page.tsx`:
  - [ ] Check SW support
  - [ ] Register on mount
- [ ] Create cache manifest for menu assets

**Day 2: Offline UI**

- [ ] Create `src/app/menu/[token]/OfflineBanner.tsx`:
  - [ ] "You're offline" message
  - [ ] "Data may be stale" warning
  - [ ] Auto-hide when online
- [ ] Create `src/hooks/useOfflineMenu.ts`:
  - [ ] Detect online/offline state
  - [ ] Check cache freshness
  - [ ] Return status object
- [ ] Integrate banner into menu page

**Testing:**

- [ ] Visit menu page online
- [ ] Go offline (DevTools)
- [ ] Refresh page
- [ ] Verify cached menu loads
- [ ] Verify offline banner shows
- [ ] Go online, verify banner hides

**Docs:**

- [ ] Create `__docs__/customer-menu/OFFLINE_SUPPORT.md`

---

## Future Phase (Post-Launch)

### 🟡 P2-1: Server-Side Caching (Redis)

- [ ] Create `src/lib/cache/redis.ts`
- [ ] Implement `getCached()` utility
- [ ] Add to menu data fetching
- [ ] Add to analytics aggregation
- [ ] Monitor cache hit rate

### 🟡 P2-2: Summary Drift Detection

- [ ] Create `functions/src/maintenance/driftDetection.ts`
- [ ] Implement nightly integrity check
- [ ] Add alerting on drift
- [ ] Create auto-repair option

---

## Progress Tracking

### Overall Progress

| Week   | Focus                 | Items | Completed |
| ------ | --------------------- | ----- | --------- |
| 1      | Critical Safety       | 3     | 0/3       |
| 2      | Operational Readiness | 2     | 0/2       |
| 3      | Trust Psychology      | 2     | 0/2       |
| 4      | Data Safety           | 2     | 0/2       |
| Future | Performance           | 2     | 0/2       |

**Total: 0/11 items complete** (Future items not counted)

---

## Implementation Notes

### Before Starting Each Item

- [ ] Read the improvement spec for full context
- [ ] Check dependencies are complete
- [ ] Create feature branch: `strengthen/[item-name]`

### After Completing Each Item

- [ ] Run existing tests
- [ ] Test manually per checklist
- [ ] Update this document (mark complete)
- [ ] Commit with message: `strengthen: [item-name] - [brief description]`
- [ ] Update affected feature docs

### Quality Gates

Before marking any item complete:

- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Feature flag works as expected
- [ ] Tested in dev environment
- [ ] Documentation updated

---

**Document Status:** ✅ Stage 4 Complete  
**Last Updated:** January 4, 2026
