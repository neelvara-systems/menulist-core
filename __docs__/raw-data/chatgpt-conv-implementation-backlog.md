# ChatGPT Conversations — Implementation Backlog

**Source:** `__docs__/raw-data/chatgpt-conv.md` (10 threads, ~19,507 lines)
**Extracted:** 2025-02-24
**Purpose:** Actionable implementation items derived from all 10 ChatGPT conversation threads. Separated from strategic/marketing insights (see `chatgpt-conv-analysis.md`).

---

## Priority Legend

- **P0 — Pre-Launch Critical:** Must exist before real launch
- **P1 — Authority Phase (0-6 mo):** Needed to establish canonical source status
- **P2 — Growth Phase (6-18 mo):** Strengthens moat and data gravity
- **P3 — Upstream Phase (18+ mo):** Enables ecosystem dependency

---

## CATEGORY 1: SCHEMA & DATA INTEGRITY (P0)

### 1.1 Strict Price Schema Enforcement

**Source:** Conv 10 (Clean Source Framework)
**What:** Ensure all prices are stored as numeric values with currency code. No string prices like "₹199 onwards", "Market price", "199/-".
**Where:** Menu item schema, validation layer, editor UI
**Why:** Machine-readable canonical source requires zero ambiguity in pricing

### 1.2 Explicit Availability Model

**Source:** Conv 10 (Clean Source Framework)
**What:** Every item must be exactly one of: `available`, `temporarily_unavailable`, `permanently_removed`, `scheduled`
**Where:** Item schema, editor, publish pipeline
**Why:** No grey states. Agents and external systems cannot interpret ambiguity.

### 1.3 Semantic Normalization Layer

**Source:** Conv 10 (Clean Source Framework)
**What:** Normalize variant labels to single canonical enums internally. Examples: "Veg"/"Vegetarian"/"V"/"Green dot" → single enum `vegetarian`. Apply to dietary tags, spice levels, allergens.
**Where:** Item schema, import pipeline, editor
**Why:** Machine consistency across all businesses

### 1.4 Zero-Blank Enforcement on Publish

**Source:** Conv 6/7 (Zero-blank guarantee)
**What:** Prevent publishing menus with: empty categories, missing prices, broken images, invalid menu structures, no items in category
**Where:** Publish pipeline validation
**Why:** Agents trust only consistently correct sources. Existing MCE partially covers this — verify completeness.

### 1.5 Deterministic Output Guarantee

**Source:** Conv 10 (Idempotent Output)
**What:** If no changes and same version ID → output must be byte-level stable. No AI rephrasing, field reordering, or format drift.
**Where:** Render pipeline (QR, web, screen, PDF, API output)
**Why:** External systems cache and compare. Unstable output = distrust.

### 1.6 Atomic Publish System

**Source:** Conv 10 (Phase 0)
**What:** When user hits publish, everything updates together or nothing does. No partial states (screen updated but PDF not, QR updated but web not).
**Where:** Publish pipeline
**Why:** Atomicity = trust. Partial sync = drift.

---

## CATEGORY 2: EVENT TRACKING / DATA GRAVITY (P1)

### 2.1 Global Event Ledger (`menuEvents` Collection)

**Source:** Conv 6/7 (Event-first architecture)
**What:** Create append-only global Firestore collection for all menu change events.
**Schema:**

```
menuEvents/{autoId}
{
  tId: string,           // tenant ID
  sId: string,           // store ID
  entityType: "item" | "category" | "store" | "menu",
  entityId: string,
  eventType: string,     // "item_created", "item_price_changed", etc.
  oldValue: {},
  newValue: {},
  changedFields: [],
  timestamp: serverTimestamp,
  actor: "owner" | "ai" | "system" | "import",
  source: "editor" | "import" | "api" | "bulk"
}
```

**Rules:** Never overwrite. Never delete. Append only. Server timestamps only. Keep payloads small (only changed fields).

### 2.2 Explicit Price Change Events

**Source:** Conv 6/7 (Price history — separate explicit log)
**What:** Even if inside item_updated, create explicit `item_price_changed` event with: storeId, itemId, oldPrice, newPrice, currency, timestamp.
**Why:** Price dataset becomes extremely valuable later for intelligence layer.

### 2.3 Availability Change Events

**Source:** Conv 6/7
**What:** Track every: available→unavailable, unavailable→available, temporary disable, permanent removal with timestamps.
**Why:** Builds real-world availability behavior dataset. Future agents will value availability reliability.

### 2.4 Category/Menu Structure Events

**Source:** Conv 6/7
**What:** Track: category_created, category_deleted, category_renamed, item_moved_category, menu_reordered, section_restructured. Store before/after state.
**Why:** Builds global menu structure dataset.

### 2.5 Publish Event Logging

**Source:** Conv 6/7
**What:** Every publish creates `menu_published` event: storeId, menuVersion, itemsChangedCount, categoriesChangedCount, timestamp, publishSource (manual/auto). Also track `publish_correction` if publish followed by quick fix.
**Why:** Reveals operational discipline + reliability patterns.

### 2.6 Store-Level Truth Events

**Source:** Conv 6/7
**What:** Track: hours_changed, phone_changed, location_changed, store_status_changed.
**Why:** Becomes business reliability graph.

### 2.7 Menu Snapshot on Publish

**Source:** Conv 6/7
**What:** Every publish creates snapshot in `menuSnapshots` collection: storeId, version, fullMenuJson (compressed), itemCount, timestamp.
**Where:** Publish pipeline (post-event, post-state-update)
**Why:** Enables menu reconstruction at any point in time. Only on publish (not every edit) — cost manageable.

### 2.8 Store Truth Metrics Document

**Source:** Conv 6/7
**What:** Maintain internal `storeTruthMetrics` per store: lastMenuUpdate, lastPublish, priceChangeFrequency, availabilityChangeFrequency, correctionFrequency, publishFrequency, completenessScore.
**Update:** Via nightly Cloud Function job.
**Why:** Foundation for future reliability scoring. Internal use only — do NOT expose.

---

## CATEGORY 3: RELIABILITY & CORRECTNESS (P1)

### 3.1 Truth Completeness Score (Per Store)

**Source:** Conv 6/7
**What:** Track internally: % items with images, % with price, % with description, % with availability state, publish health.
**Where:** Internal metrics dashboard (not user-facing)
**Why:** Stores with complete data → higher trust weight for future agent queries.

### 3.2 Drift Detection (Silent)

**Source:** Conv 10 (Drift Elimination System)
**What:** Silently detect inconsistencies between surfaces — POS vs public, Google vs menu, screen vs QR, staff override vs master, language version mismatch.
**Where:** Background monitoring system
**Why:** If MenuList becomes the "drift alarm layer", it becomes critical infrastructure. Detection > automation.

### 3.3 Source Authority Score (Per Store)

**Source:** Conv 6/7
**What:** Track per store: Is MenuList primary link? QR installed? Google link connected? Website uses MenuList? WhatsApp share used? Screens active?
**Where:** Internal store metrics
**Why:** If score low → store not locked. Primary activation metric.

### 3.4 Remove AI Randomness from Canonical Data

**Source:** Conv 10
**What:** AI layers must NEVER: modify structured fields, auto-correct prices, reinterpret availability, reformat without version change. AI can assist content, never alter canonical data without explicit publish.
**Where:** AI pipeline guardrails
**Why:** Infrastructure cannot be probabilistic.

---

## CATEGORY 4: VERSIONING & TEMPORAL INTEGRITY (P0-P1)

### 4.1 Global Version ID per Publish

**Source:** Conv 10 (Temporal Cleanliness)
**What:** Every publish generates new immutable version ID + timestamp. All surfaces reference that version. If any surface shows older version, it is explicitly outdated.
**Where:** Publish pipeline, surface rendering
**Why:** Single source current state. No silent divergence.

### 4.2 Monotonic Version Updates

**Source:** Conv 10
**What:** Versions only move forward. Never mutate old versions. If correction required → new version.
**Where:** Publish pipeline
**Why:** Infrastructure is append-only. Rollbacks create new versions, not mutations.

### 4.3 Version + Timestamp on Every Surface

**Source:** Conv 10 (Phase 0)
**What:** Every rendered surface (QR, web, screen, PDF) includes version ID and last updated timestamp.
**Where:** Render pipeline
**Why:** External systems can verify currency. Builds trust.

---

## CATEGORY 5: MACHINE READABILITY & SCHEMA (P1-P2)

### 5.1 Schema.org Alignment

**Source:** Conv 10 (Machine-First Public Representation)
**What:** Ensure MenuList public pages output schema.org structured data (Restaurant, Menu, MenuItem, etc.) for search engine and agent ingestion.
**Where:** Public OBP (Official Business Page) rendering
**Why:** Google indexing, AI agent structured data consumption, SEO.

### 5.2 Canonical Public Offer Endpoint (Future Architecture)

**Source:** Conv 10 (Upstream Strategy)
**What:** Design internal architecture for eventual: `GET /public-offer/{businessId}` that returns fully structured authoritative state (menu, prices, availability, hours, metadata, version, last updated).
**Where:** API architecture planning
**When:** Not exposed publicly yet. Architect for it now so data model supports it.
**Why:** When agents exist, they query this. When discovery apps exist, they sync this.

### 5.3 Deterministic Structured Export

**Source:** Conv 10
**What:** If two engineers export MenuList data, they should get identical structure every time. No interpretation required.
**Where:** Export/API layer
**Why:** Machine trust requires determinism.

---

## CATEGORY 6: ONBOARDING & ACTIVATION (P1)

### 6.1 Google Link Replacement as Activation Gate

**Source:** Conv 1 (Activation = Google link replacement)
**What:** Redefine activation metric internally. A restaurant is not truly onboarded until MenuList link is live on their Google profile. Track: % of paying restaurants using MenuList link on Google.
**Where:** Onboarding flow, internal analytics
**Why:** Google link replacement = authority installation. Without it, product stays optional.

### 6.2 Guided Google Link Replacement in Onboarding

**Source:** Conv 1
**What:** After menu creation and publish, immediately guide owner to replace Google Business Profile website/menu link with MenuList link. Make it feel like standard step, not optional suggestion.
**Where:** Onboarding UI flow
**Why:** "Final step to make menu live" framing. Owners follow guided authority.

### 6.3 Onboarding Time-to-Authority Target

**Source:** Conv 1
**What:** Time from start to "official link live on Google" must be < 20 minutes. Import menu → Publish → Replace Google link → Replace QR → Share on WhatsApp.
**Where:** Onboarding flow optimization
**Why:** Fast time-to-authority. If they don't replace links → you don't have authority.

---

## CATEGORY 7: INTERNAL METRICS & DASHBOARDS (P1-P2)

### 7.1 MenuList Authority Metrics Dashboard (Internal Only)

**Source:** Conv 6/7
**What:** Create internal-only dashboard tracking:

- % stores using as primary link
- Avg update frequency
- Reliability score distribution
- Completeness score distribution
- Multi-surface usage per store
  **Where:** Admin/Ops Control Room
  **Why:** Tracks data gravity formation. NOT user-facing.

### 7.2 Menu Behavior Dataset Growth Tracker

**Source:** Conv 6/7
**What:** Track: total items tracked, total price changes tracked, total availability changes, image dataset size, languages dataset size.
**Where:** Internal metrics
**Why:** Monitors whether moat (behavioral dataset) is actually compounding.

### 7.3 Presence Lock-In Tracker

**Source:** Conv 6/7
**What:** Track: QR installs, Google links connected, direct link traffic growth.
**Where:** Internal metrics
**Why:** If these grow → data gravity forming. If stagnant → authority not forming.

---

## CATEGORY 8: COST & INFRASTRUCTURE (P2)

### 8.1 Cold Archive Strategy for Events

**Source:** Conv 6/7
**What:** After ~18-24 months per event, move old events to Firebase Storage (JSON gzip). Keep Firestore only recent window if cost rises.
**Where:** Cloud Function scheduled job
**When:** Only when event volume makes Firestore costs significant
**Why:** Retain full history cheaply without Firestore cost pressure.

### 8.2 Weekly Firestore Backup to Storage

**Source:** Conv 6/7
**What:** Export event collections weekly to Firebase Storage for safety.
**Where:** Scheduled Cloud Function
**Why:** Long-term data safety. Also prepares for future BigQuery mirror.

### 8.3 BigQuery Mirror (Future — Not Now)

**Source:** Conv 6/7
**What:** When 5k-10k active stores + millions of events → mirror events nightly to BigQuery for cross-store analysis, ML, reliability scoring.
**Where:** Future infrastructure
**When:** Only when: 5k+ stores, millions of events, real need for cross-store analysis, ML/reliability scoring needed
**Why:** Firestore stays source-of-truth ledger. BigQuery for analytics.

---

## CATEGORY 9: VALIDATION CHECKPOINTS (P1-P2)

### 9.1 After First 50 Real Stores

- Is MenuList their primary menu link?
- Do customers actually open MenuList link?
- Are menus kept updated?
- Do they send MenuList link to customers?
  → If not → fix positioning before scaling.

### 9.2 After 200-500 Stores

- Do you see menu behavior patterns in event data?
- Are updates happening regularly?
- Is dataset compounding?
- Are stores dependent?
  → If yes → gravity forming.

### 9.3 After 1000+ Stores

- Largest structured SMB menu dataset?
- Most updated dataset?
- Most reliable dataset?
- Presence across real world (QRs, Google links)?
  → If yes → MenuList becomes hard to replace.

---

## IMPLEMENTATION PRIORITY SEQUENCE

### Phase 0 — Pre-Launch (Now) — VERIFIED 2025-02-24

1. ✅ **Price schema:** MCE validates numeric prices on every save (`VALID_PRICE_FORMAT`, `NO_NEGATIVE_PRICE`, `NO_ZERO_PRICE_ACTIVE`). String storage — sufficient for P0.
2. ✅ **Availability model:** `available?: boolean` + `active: boolean` covers temporarily_unavailable + permanently_removed.
3. ✅ **Atomic publish:** Single Firestore `setDoc` = inherently atomic. All surfaces read same doc.
4. ⚠️ **Deterministic rendering:** No byte-level guarantee yet. Deferred to P1 (no AI rephrasing in render path currently).
5. ✅ **Version + timestamp:** IMPLEMENTED — `menuVersion` (monotonic increment) + `lastPublishedAt` on project doc. Displayed on public menu footer with `data-menu-version` attribute for machines.
6. ✅ **Zero-blank enforcement:** MCE enabled (`ENABLE_MCE: true`) — 18 rules, Publish-Gate blocks UI if critical rules fail.

### Phase 1 — Authority Formation (0-6 months post-launch) — PARTIALLY IMPLEMENTED 2025-02-24

1. ✅ **Event ledger:** `menuChangeLog/{tId}/{sId}` — append-only, debounced, feature-flag gated (`ENABLE_MENU_OBSERVATION: true`). Existed as MOL, now enabled.
2. ✅ **Price change events:** MOL tracks `PRICE` changes with old/new values automatically on every `updateProject()`.
3. ✅ **Availability change events:** MOL tracks `AVAILABILITY` changes automatically.
4. ✅ **Publish events + snapshots:** IMPLEMENTED — `PUBLISH` event type added to MOL. `menuSnapshots/{tId}/{sId}` collection stores immutable snapshot on every publish.
5. 🔲 Implement store truth metrics (nightly job) — needs Cloud Function
6. 🔲 Implement source authority score per store
7. 🔲 Implement truth completeness score per store — MCE `_mce.verified` is foundation
8. 🔲 Build Google link replacement into onboarding flow
9. 🔲 Track activation metric: % with MenuList on Google

### Phase 2 — Data Gravity (6-18 months)

1. Implement category/structure events
2. Implement store-level truth events
3. Silent drift detection system
4. Schema.org structured data on public pages
5. Internal authority metrics dashboard
6. Menu behavior dataset growth tracking
7. Presence lock-in tracking
8. Multi-location chain consistency features

### Phase 3 — Upstream (18+ months)

1. Canonical public offer endpoint (API)
2. Deterministic structured export
3. Cold archive strategy for events
4. BigQuery mirror (when scale warrants)
5. Selective Google Business Profile sync
6. Ecosystem feed capabilities

---

## CROSS-REFERENCE: WHAT ALREADY EXISTS

Based on codebase knowledge, the following likely already exist (verify):

- **MCE (Menu Correctness Engine):** Validates menu quality → aligns with zero-blank enforcement
- **MOL (Menu Observation Layer):** Nightly observation → aligns with drift detection
- **Decision Blocks:** Scoring system → aligns with reliability metrics
- **Audit logs:** Partial change tracking → needs expansion to full event ledger
- **Publish pipeline:** Exists → needs atomic guarantee verification
- **Version tracking:** Partial → needs global version ID enforcement

Items marked with ✅ in Phase 0 need **verification against codebase**, not implementation from scratch.

---

## CATEGORY 10: INFRASTRUCTURE COMPOUNDING (Session 15 — Feb 24, 2026)

**Source:** ChatGPT Strategic Conversation (Infrastructure Compounding & Canonical Public-Offer Infrastructure)
**Governance:** `__docs__/constitution/17-infrastructure-compounding-doctrine.md`
**Review:** `__docs__/raw-data/_archive/chatgpt-review-session15-infrastructure-compounding.md`

### 10.1 Extraction Confidence Scoring (P1)

**What:** Add per-item confidence score to extraction output (HIGH/MEDIUM/LOW based on parsing certainty). Items below threshold flagged for owner review.
**Where:** Extraction pipeline (`functions/src/logic/processMenuImagesJob.ts`), extraction output types
**Why:** Reduces post-extraction correction burden. Highest-leverage extraction improvement.
**Status:** ❌ NOT BUILT

### 10.2 Extraction Learning Loop (P1)

**What:** Track owner corrections after extraction (what was wrong, what they fixed). Aggregate correction patterns. Use to refine extraction prompts over time.
**Where:** Editor save handler, extraction prompt config, internal analytics
**Why:** Continuous extraction accuracy improvement. The single most impactful unbuilt system.
**Status:** ❌ NOT BUILT

### 10.3 Store Truth Confidence Score (P1)

**What:** Composite internal score per store: `lastConfirmation` + `updateFrequency` + `schemaCompleteness` + `MCEPassRate` + `menuVersion`. Computed nightly.
**Where:** Nightly scheduler (`functions/src/decisionBlocksScoring.ts`), new task
**Why:** Powers future prioritization, staleness detection, authority metrics.
**Status:** ⚠️ PARTIAL — Authority Maturation exists but no composite score

### 10.4 Periodic Staleness Check + Reconfirmation (P1)

**What:** In nightly scheduler: flag stores where menu hasn't been confirmed/updated in 90+ days. Send lifecycle message: "Your menu information is still live. Everything still correct?"
**Where:** Nightly scheduler, lifecycle messaging system
**Why:** Keeps data fresh without dashboards. Infrastructure-grade freshness guarantee.
**Status:** ❌ NOT BUILT

### 10.5 Silent Enrichment Layer (P2)

**What:** Post-extraction: auto-detect dietary attributes (veg/non-veg), cuisine type, combo items. No UI — just better schema silently.
**Where:** Extraction pipeline, item schema
**Why:** Deepens schema without adding complexity. Agents prefer richer data.
**Status:** ❌ NOT BUILT

### 10.6 Edge-Case Menu Library (P2)

**What:** Internal collection of messy menus (multi-language, poor quality photos, combo-heavy, image-only PDFs). Use for extraction regression testing.
**Where:** Internal test dataset, extraction test suite
**Why:** Systematic extraction quality improvement. Prevents regressions.
**Status:** ❌ NOT BUILT

### 10.7 MCE Price Anomaly Rule (P2)

**What:** New MCE validation rule: flag if item price changes >50% from previous value. Prevents extraction errors from silently corrupting prices.
**Where:** MCE rules (`src/lib/menuCorrectness/`), publish validation
**Why:** Silent error detection. Catches extraction mistakes before publish.
**Status:** ❌ NOT BUILT

### 10.8 Propagation Latency Tracking (P2)

**What:** Measure: edit → Firestore write → cache invalidation → public page update. Track p50/p95. Log in nightly scheduler.
**Where:** Nightly scheduler, internal metrics
**Why:** Speed advantage measurement. Internal authority metric.
**Status:** ❌ NOT BUILT

### 10.9 External Inconsistency Detection (P3)

**What:** Expand GBP drift detection to crawl store's Google listing weekly. Compare hours, phone, menu link. Alert on mismatch.
**Where:** Nightly scheduler, GBP sync infrastructure
**Why:** MenuList becomes the correctness engine. Detects when external info diverges.
**Status:** ⚠️ PARTIAL — GBP hours drift exists (flag OFF). Broader crawl not built.
**Prerequisite:** 50+ active stores

### 10.10 Geographic Density Metrics (P3)

**What:** Simple tracking: stores per city, active rate per city, link dominance per city.
**Where:** Manual spreadsheet initially, then Ops dashboard
**Why:** Go-to-market intelligence. Win one city before expanding.
**Status:** ❌ NOT BUILT — Manual tracking sufficient until 100+ stores
