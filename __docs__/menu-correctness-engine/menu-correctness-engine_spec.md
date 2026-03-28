# Menu Correctness Engine — Product Specification

**Version:** 3.1  
**Status:** ✅ IMPLEMENTED — Flag OFF (ENABLE_MCE: false)  
**Owner:** Product  
**Last Updated:** February 14, 2026

---

## 1. Executive Summary

The Menu Correctness Engine (MCE) is a validation layer that runs on every menu save, ensuring project data is complete, valid, and safe before it reaches customer-facing surfaces. MCE validates — it does not duplicate, route, or store separate copies of data.

All surfaces (QR code, website, digital screen, PDF, POS, staff prompt) already read from the same Firestore project document. MCE adds the missing piece: **deterministic validation that catches errors at save-time** and stamps the project data as verified.

This is invisible infrastructure. Owners never interact with it. They save their menu, MCE validates it silently, and surfaces serve verified data.

---

## 2. Goals

### Primary Goal

**Ensure menu data is validated and correct before it reaches any customer-facing surface.**

No invalid price, no missing item name, no broken category reference, no orphaned outlet data should ever reach customers.

### Secondary Goals

- **Reduce owner anxiety:** Owners should never need to manually check each surface after making a change.
- **Prevent revenue-damaging errors:** Wrong prices, missing items, or stale menus cause real financial harm to restaurant owners.
- **Build permanent trust:** When MenuList is always correct, it becomes the system owners open first for any menu issue.
- **Enable future surface expansion:** New surfaces (e.g., Google Business Profile, third-party aggregators) automatically inherit correctness guarantees.

### Non-Goals

- MCE does not change how owners edit menus (the editor stays the same).
- MCE does not add new UI screens or dashboards.
- MCE does not require owner configuration or setup.
- MCE does not replace existing features — it strengthens them.
- MCE does not create separate data copies or snapshot collections (see §17 Architectural Decisions).
- MCE does not add background monitoring Cloud Functions in v1 (see §17 Architectural Decisions).

### What MCE Is NOT (Anti-Patterns — Kill These Early)

MCE must never become any of the following. If it starts drifting toward these, it stops being infrastructure:

| Anti-Pattern              | Why It's Forbidden                                                  |
| ------------------------- | ------------------------------------------------------------------- |
| Analytics dashboard       | Infrastructure doesn't report — it enforces                         |
| "Menu health score"       | Scoring implies monitoring; MCE prevents problems, not scores them  |
| Alert/notification center | If it nags, it's SaaS. Infrastructure is silent                     |
| AI suggestions engine     | MCE uses deterministic rules, not probabilistic AI                  |
| Owner education tool      | If it explains, it's a consultant. Infrastructure just works        |
| Correctness reports       | Owners don't read reports. They want zero problems                  |
| Manual "verify" button    | Verification is automatic. Manual checks = tool, not infrastructure |
| Separate data storage     | Project data IS the truth. No duplicate collections needed          |

**Governing principle:** If an owner ever "uses" MCE, the design is wrong. They should only _feel_ that MenuList never lets wrong menus exist.

---

## 3. Target Customers

### Primary: Indian SMB Restaurant Owners

- Non-technical operators who manage 1-5 outlets
- Change prices and availability frequently (daily or weekly)
- Share menus via QR codes, WhatsApp links, and printed materials
- Biggest fear: "Customers see wrong prices and I don't know about it"

### Secondary: Multi-Outlet Chain Operators

- Manage master menu with outlet-level overrides
- Need consistency guarantee across all locations
- Biggest fear: "One outlet shows different prices than others"

---

## 4. Problem Statement

### The Inconsistency Problem

Today, when an owner edits a menu item in the dashboard:

1. The QR/web menu updates immediately (Firestore live read)
2. Digital screens update on next refresh cycle (version polling)
3. PDF menus become stale (no automatic regeneration)
4. POS webhooks send data on next debounced trigger
5. Staff prompts update immediately (Firestore live read)

**The gap:** There is no single system that verifies "the menu I just saved is complete, valid, and ready for all surfaces." Each surface independently reads data with different timing, different logic, and different failure modes.

### Real-World Failure Scenarios

| #   | Scenario                                           | Impact                                                   | Current Protection                    |
| --- | -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------- |
| 1   | Owner changes price but forgets to save            | QR shows old price                                       | None — relies on auto-save            |
| 2   | Price saved but screen hasn't refreshed            | Screen shows old price for up to 18 seconds              | Version polling (partial)             |
| 3   | Outlet inherits wrong price from master            | Wrong price in one location                              | Multi-outlet resolution (partial)     |
| 4   | Item marked unavailable but PDF already downloaded | PDF shows unavailable item as available                  | Staleness tracking (partial)          |
| 5   | Editor save fails silently                         | All surfaces show stale data                             | Error toast (easy to miss)            |
| 6   | Bulk price change via Command Center               | Some surfaces update before others                       | None                                  |
| 7   | Peak-hour price edit during rush                   | QR correct, screen old, staff confused, billing conflict | None                                  |
| 8   | Item runs out mid-rush, staff disables             | Still visible on screen/QR until cache refreshes         | None                                  |
| 9   | Screen device offline, menu updated                | QR shows new menu, screen shows old                      | None — screen catches up on reconnect |
| 10  | Master edit across 12 outlets, 3 have overrides    | Override lost, all outlets same price                    | resolveProjectForRender (partial)     |
| 11  | Owner disappears for 30 days, no edits             | Screens cache stale, PDF outdated                        | localStorage cache (partial)          |
| 12  | Rapid 10 edits in 5 minutes                        | Snapshot flood, surface flicker, race conditions         | None                                  |
| 13  | Staff shares old PDF via WhatsApp                  | Customer sees wrong prices from stale PDF file           | None                                  |
| 14  | New outlet added but not fully configured          | Partial menu inherited, broken rendering                 | None                                  |
| 15  | Temporary discount not reverted after festival     | Wrong prices live for weeks                              | None                                  |

---

## 5. Solution: The Menu Correctness Engine

### How It Works (Non-Technical)

1. **Owner edits menu** — nothing changes in their workflow.
2. **MCE validates the edit** — checks that all required fields are present, prices are valid, categories are intact, and multi-outlet rules are respected.
3. **If valid:** MCE stamps the project data as verified (`_mce.verified: true`). All surfaces continue serving this verified data directly from the same project document.
4. **If invalid:** The data is still saved (raw write always succeeds) but marked as unverified (`_mce.verified: false`). The **Publish-Gate** (separate from MCE core) reads this metadata and blocks "Continue to UI Editor" until critical issues are fixed. Surfaces continue reading from the project document directly — MCE v1 does not gate surface exposure (see §18 Exposure Control Doctrine).

### The Four Guarantees

| #   | Guarantee                     | What It Means                                                                                  |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | **Single Source of Truth**    | Every surface reads from the same Firestore project document — no duplicate copies             |
| 2   | **Validation Before Marking** | No menu data is marked as verified (`_mce.verified: true`) without passing all critical checks |
| 3   | **Never Block the Owner**     | If validation fails, the raw data write still succeeds — the owner's work is never lost        |
| 4   | **Zero Owner Configuration**  | MCE works automatically — no setup, no settings, no toggles                                    |

### The Five Correctness Laws

These are the permanent, deterministic rules that define "correct" for MCE. Not probabilistic. Not AI-driven. Hard rules that must pass before project data is marked as verified.

| Law | Name                       | Definition                                                                                                                                                               | Scope for v1                      |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| 1   | **Price Integrity**        | A single item must have one correct, valid price per outlet per context. No conflicting price sources, no overwrite conflicts, no empty/invalid prices for visible items | All surfaces                      |
| 2   | **Availability Integrity** | Customer never sees an item that cannot be sold. Disabled items must disappear everywhere simultaneously. Outlet-specific overrides respected                            | All surfaces                      |
| 3   | **Hours Data Consistency** | Store open/closed state and working hours must be consistent across all surfaces that display them. If hours data exists, all surfaces reflect the same truth            | QR/web, official page, future GBP |
| 4   | **Data Completeness**      | All customer-facing fields must be present and valid. No empty names, no orphan categories, no broken references, no duplicate IDs                                       | All surfaces                      |
| 5   | **Structural Integrity**   | Master-to-outlet inheritance must remain stable. Local overrides preserved during master edits. No orphan items, no broken category references after merge               | Multi-outlet stores               |

> **Note on Law 3:** MenuList does not currently have scheduled menus (breakfast vs. dinner). The Hours Status Display feature (`ENABLE_HOURS_STATUS_DISPLAY`) handles open/closed logic via `src/lib/hours/hoursEngine.ts`. MCE validates that hours data, when present, is consistent — it does not build automatic time-based menu switching.

### MCE Authority Model (6 Rules)

These rules define how MCE governs exposure without becoming annoying software.

| #   | Rule                                     | What It Means                                                                                                         |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **Controls validation, not editor**      | Owner can type anything, change anything, experiment freely. MCE only validates what gets stamped as verified         |
| 2   | **Validate on every save**               | Every save goes through CSR validation. Verification is silent and fast (< 100ms, client-side)                        |
| 3   | **Never block the save**                 | Raw data write always succeeds. MCE adds verification metadata but never prevents the Firestore write                 |
| 4   | **Silent authority, zero notifications** | MCE never says "Error", "Fix this", "Warning". If something unsafe is detected, validation result is stamped silently |
| 5   | **Per-outlet independence**              | Each outlet has its own project document. One outlet's validation state has zero impact on other outlets              |
| 6   | **Multi-outlet protection**              | Master edits cannot erase outlet overrides. `resolveProjectForRender()` handles this; MCE validates the result        |

---

## 6. Scope

### In Scope (v1)

| Component                            | Description                                                                |
| ------------------------------------ | -------------------------------------------------------------------------- |
| **Correctness State Resolver (CSR)** | Validates menu data completeness and safety on every save                  |
| **Verification Metadata (`_mce`)**   | Stamps project document with verification status — no separate collection  |
| **Centralized Sanitization Utility** | Extracts `sanitizeForClient()` to shared module for all surface data paths |
| **Publish-Gate Integration**         | Blocks "Continue to UI Editor" if menu data fails critical validation      |
| **Multi-Outlet Validation**          | Ensures master→outlet propagation doesn't break correctness                |

### Out of Scope (v1)

| Item                                   | Reason                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Separate snapshot collection           | Over-engineering — project data IS the truth (see §17 Architectural Decisions) |
| Surface Exposure Controller            | No routing needed — surfaces already read from project document directly       |
| Drift Guardian (background monitoring) | CSR validates at save-time; data can't become invalid between saves (see §17)  |
| Menu version history / rollback UI     | Separate feature (Menu Change Log); MOL already logs changes                   |
| Scheduled menu publishing              | Separate feature (time-based menus)                                            |
| Owner-facing correctness dashboard     | Violates "Zero Cognitive Load" principle                                       |
| Third-party surface integrations       | Future scope — architecture supports it                                        |
| Manual "verify" button for owners      | Violates "Zero Owner Configuration" guarantee                                  |

---

## 7. User Stories

### Owner Stories

| ID   | Story                                                                                                  | Acceptance Criteria                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| US-1 | As an owner, I want every surface to show the same menu so customers never see conflicting information | All surfaces read from the same verified project data                                |
| US-2 | As an owner, I want to be told if my menu has issues before it goes live so I can fix them             | Validation errors shown clearly before proceeding to UI Editor                       |
| US-3 | As an owner, I don't want to manually check each surface after making changes                          | MCE validates automatically on every save — zero manual steps                        |
| US-4 | As a multi-outlet owner, I want all locations to reflect my master menu changes correctly              | MCE validates master→outlet propagation correctness on every outlet save             |
| US-5 | As an owner, I want my menu to stay available even if something goes wrong in the system               | Existing caching (screen localStorage, Vercel ISR) keeps menus visible during issues |

### System Stories

| ID   | Story                                                        | Acceptance Criteria                                              |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| SS-1 | As the system, I validate every menu state on save           | CSR runs on every `updateProject()` call when MCE enabled        |
| SS-2 | As the system, I stamp project data with verification status | `_mce.verified`, `_mce.verifiedAt`, `_mce.warnings` fields added |
| SS-3 | As the system, I never show customers a blank or broken menu | Surfaces use existing caching (localStorage, Vercel cache)       |

---

## 8. Requirements

### Functional Requirements

| ID   | Requirement                                                                                        | Priority |
| ---- | -------------------------------------------------------------------------------------------------- | -------- |
| FR-1 | MCE validates menu data on every save (required fields, price validity, category integrity)        | P0       |
| FR-2 | Verification metadata (`_mce`) added to project document as part of existing `setDoc` call         | P0       |
| FR-3 | If validation fails, raw data write still succeeds — MCE never blocks saves                        | P0       |
| FR-4 | MCE integrates with existing `updateProject()` flow without changing owner UX                      | P0       |
| FR-5 | MCE validates multi-outlet consistency (master→outlet propagation via `resolveProjectForRender()`) | P1       |
| FR-6 | MCE logs validation failures to console for debugging                                              | P1       |
| FR-7 | MCE operates behind a feature flag (`ENABLE_MCE`) for safe rollout                                 | P0       |
| FR-8 | Centralized `sanitizeForClient()` utility available for all surface data paths                     | P1       |

### Non-Functional Requirements

| ID    | Requirement                  | Target                                       |
| ----- | ---------------------------- | -------------------------------------------- |
| NFR-1 | Validation latency           | < 100ms (client-side, no Firebase calls)     |
| NFR-2 | Firebase cost impact         | $0.00/month additional (no new reads/writes) |
| NFR-3 | Zero downtime deployment     | Feature flag allows instant disable          |
| NFR-4 | No new Firestore collections | `_mce` metadata on existing project document |

---

## 9. Success Metrics

| Metric                     | Target         | How Measured               |
| -------------------------- | -------------- | -------------------------- |
| Validation pass rate       | > 95% of saves | CSR console logs           |
| Owner-reported menu errors | 0              | Support ticket tracking    |
| System availability        | 99.95%         | Uptime monitoring          |
| Firebase cost increase     | $0.00          | Firebase billing dashboard |

---

## 10. Risks and Mitigations

| Risk                                           | Impact                                  | Mitigation                                                           |
| ---------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| Validation too strict — flags legitimate saves | Owner sees unnecessary warnings         | Progressive severity: warn for soft issues, block only critical ones |
| MCE hook in updateProject() causes error       | Save fails                              | try/catch with silent fail — MCE never blocks raw write              |
| False positives in price validation            | Valid prices flagged as suspicious      | Configurable threshold (200% change), warning not blocking           |
| Feature flag stuck on — MCE can't be disabled  | No rollback path                        | Feature flag tested in staging, instant kill switch                  |
| Multi-outlet validation complexity             | Edge cases in master→outlet propagation | Comprehensive test matrix, gradual rollout                           |

---

## 11. Timeline Alignment

MCE is designed for the 3-Year Architecture Freeze. Once implemented:

- No validation logic needs to change for 3+ years
- New validation rules are added to the CSR without touching surface code
- New surfaces automatically benefit from validated project data
- If future needs require snapshot collections or background monitoring, the `_mce` metadata provides the foundation

---

## 12. Dependencies

| Dependency                     | Status                    | Impact on MCE                           |
| ------------------------------ | ------------------------- | --------------------------------------- |
| Editor save flow (syncChanges) | ✅ Implemented            | MCE hooks into `updateProject()` flow   |
| Multi-outlet resolution        | ✅ Implemented            | MCE validates resolved output           |
| POS Webhook Sync               | ✅ Implemented (flag OFF) | POS reads same verified project data    |
| Digital Screens                | ✅ Implemented            | Screens read same verified project data |
| PDF Generator                  | ✅ Implemented            | PDF generates from same project data    |
| Pricing Integrity System       | ✅ Implemented            | PIS rules migrate into CSR              |

---

## 13. Relationship to Existing Features

MCE does not replace existing features. It strengthens them by adding a validation layer:

- **Pricing Integrity System:** PIS price validation rules become CSR validation rules. PIS remains unchanged; CSR adds centralized enforcement.
- **Multi-Outlet Consistency:** MCE validates that `resolveProjectForRender()` output is correct. The resolution logic is unchanged.
- **POS Webhook Sync:** POS continues reading from project data. MCE ensures that data is validated before the save completes.
- **Digital Screens:** Screens continue using `getMenuItemsForScreen()` + `contentVersion` polling. MCE ensures the underlying project data is validated.
- **Existing caching:** `MenuBoardDisplay.tsx` localStorage cache, Vercel ISR cache, `guardedReload()` — all continue working as-is. MCE doesn't touch surface-level caching.

---

## 14. Stress Test Acceptance Criteria

MCE must pass all three stress tests before production rollout. These are derived from real-world SMB chaos scenarios.

### Test 1: 30-Day No-Owner Test (Single Store)

**Setup:** Restaurant owner creates menu correctly, then disappears for 30 days. No dashboard usage, no checking, no maintenance. Only occasional real-world events happen.

| Day | Event                             | Pass Condition                                                                  |
| --- | --------------------------------- | ------------------------------------------------------------------------------- |
| 4   | Item out of stock, staff disables | CSR validates on save; item removed from project data; surfaces update normally |
| 6   | Screen device restarts            | Screen loads from localStorage cache + fetches fresh data on reconnect          |
| 8   | Staff shares old PDF via WhatsApp | PDF generates on-demand from current project data — always fresh                |
| 12  | Staff bulk-edits wrong price      | CSR catches invalid price format; stamps `_mce.verified: false` with warnings   |
| 15  | Weak internet inside store        | Screen shows localStorage cached version; reconnects auto-refresh               |
| 18  | Multiple rapid edits              | Editor debounce handles this natively; CSR validates final state                |
| 30  | Owner returns                     | Zero complaints, zero mismatches, no manual intervention needed                 |

**Ultimate criterion:** Owner can disappear indefinitely and customers never see wrong menu.

### Test 2: Multi-Outlet Chain Chaos Test (12 Outlets)

| Day | Event                                              | Pass Condition                                                          |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 6   | One outlet changes local price                     | Only that outlet's project data updates; other 11 unchanged             |
| 8   | Master menu edited centrally (new item)            | `resolveProjectForRender()` inherits safely; local overrides preserved  |
| 10  | One outlet disables item locally                   | Disappears only in that outlet's project data                           |
| 12  | Master changes 20 prices; 3 outlets have overrides | Overrides preserved by existing resolution logic; CSR validates result  |
| 15  | One outlet screen offline 3 days                   | Zero impact on other outlets — each has independent project document    |
| 18  | New outlet #13 added, partially configured         | CSR validates on first save; `_mce.verified: false` until data complete |
| 20  | Local manager accidentally deletes category        | CSR catches orphan items (no category reference); warns on save         |

**Ultimate criterion:** Per-outlet independence. One outlet's problem never affects others.

### Test 3: Murphy's Law Test (Everything Fails Simultaneously)

**Setup:** 12-outlet chain, Saturday peak, owner traveling, weak internet in some stores, staff making edits, festival week, devices unstable.

| Event                                              | Pass Condition                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| HQ updates 5 prices; 2 outlets have screen offline | Online outlets update normally; offline screens serve localStorage cache |
| Item runs out in 3 outlets simultaneously          | Each outlet independently saves; CSR validates each independently        |
| Internet drops in one store completely             | Screen + staff view show cached data; reconnect fetches fresh data       |
| Rapid 10 edits in 10 minutes                       | Editor debounce handles natively; CSR validates each final state         |
| PDF generation fails                               | Other surfaces unaffected — PDF failure is isolated                      |
| 3 screens reconnect simultaneously                 | Each independently fetches fresh data via `contentVersion` listener      |

**Ultimate criterion:** Customer never sees wrong menu, even when everything goes wrong.

---

## 15. Codebase Features That Already Handle Hardening

During stress testing, we evaluated 10 hardening requirements. **8 of 10 are already handled by existing codebase features.** Only 2 are new CSR validation rules.

| #    | Original Requirement               | Status             | How It's Already Handled                                                 |
| ---- | ---------------------------------- | ------------------ | ------------------------------------------------------------------------ |
| H-1  | Per-outlet data isolation          | ✅ Already handled | Each outlet has its own `projectId` and project document                 |
| H-2  | Override preservation              | ✅ CSR rule (new)  | CSR validates `resolveProjectForRender()` output preserves overrides     |
| H-3  | Per-outlet sync independence       | ✅ Already handled | Independent project documents — no cross-outlet dependencies             |
| H-4  | New outlet safe activation         | ✅ Already handled | `_client/[[...slug]]/page.tsx` handles missing data gracefully           |
| H-5  | Rapid edit consolidation           | ✅ Already handled | Editor's `syncChanges` already has debounce; CSR is client-side (<100ms) |
| H-6  | Screen/device localStorage cache   | ✅ Already exists  | `MenuBoardDisplay.tsx` → `MENU_BOARD_CACHE_KEY` + `ScreenDisplay.tsx`    |
| H-7  | Offline screen non-blocking        | ✅ Already handled | No blocking concept — each surface reads independently                   |
| H-8  | Dynamic PDF generation             | ✅ Already handled | `generateMenuPdf()` generates on-demand from project data, not cached    |
| H-9  | Structural completeness validation | ✅ CSR rule (new)  | CSR rules: `FILE_HAS_DATA`, `REQUIRED_NAME`, `CATEGORY_EXISTS`           |
| H-10 | Staff view = customer view         | ✅ Already true    | Staff prompt reads from same Firestore project document                  |

**Key insight:** The MenuList codebase is already well-architected for correctness. MCE's job is to add the missing **validation layer** — not to rebuild data flow, caching, or routing.

---

## 16. Strategic Alignment: 3-Layer Future

MCE is not just a correctness feature. It is the foundation for MenuList's strategic evolution.

### Layer 1 — Truth Infrastructure (NOW — MCE)

MCE ensures: correct menu data through validation on every save. Everything internally verified. This is MenuList Core.

### Layer 2 — Presence Authority (NEXT)

Once validation is in place, MenuList becomes the single source of verified business information: menu, hours, availability, official page, QR, screens.

### Layer 3 — Distribution Control (LATER)

Once truth + presence are stable, MenuList can push verified data to external surfaces: Google Business Profile, WhatsApp catalog, discovery platforms. Distribution becomes trivial because the truth layer already validates data.

**Why MCE must be right before Layer 2–3:** You cannot distribute incorrect data globally. MCE is the prerequisite.

---

## 17. Architectural Decisions (Why We Built It This Way)

These decisions were made during the design phase after evaluating the full ChatGPT conversation, cross-checking against the codebase, and applying practical engineering judgment.

### Decision 1: No Separate Snapshot Collection

**Evaluated:** Creating a `menuSnapshots` Firestore collection with immutable verified copies of menu data.

**Decided:** Don't build it. Project data IS the truth.

**Rationale:**

- All surfaces already read from the same Firestore project document. There is no routing problem to solve.
- All write points are already controlled through `updateProject()`. There is no untrusted data path.
- A separate collection would add 3 extra writes per save ($0.000360/save) and extra reads per surface request.
- The `sanitizeForClient()` function already strips internal metadata at read-time. Snapshots would just move this to write-time — same result, more complexity.
- MOL (Menu Observation Layer) already logs change history via `menuChangeLog`. We don't need snapshot versioning for audit.
- For the 0.1% edge case where "last known good" rollback is needed, the owner can manually fix the data. No system in the world handles 100% of corner cases — handling them adds cost and complexity that outweighs the benefit.

**Cost saved:** ~$1.26/month per 1000 stores eliminated.

### Decision 2: No Surface Exposure Controller (SEC)

**Evaluated:** A routing layer that directs each surface to the correct snapshot.

**Decided:** Don't build it. Without snapshots, there's no routing problem.

**Rationale:**

- QR/web reads from project data via Firestore → already works
- Screens read via `getMenuItemsForScreen()` → already works
- PDF generates via `generateMenuPdf()` with project data passed in → already works
- POS reads via webhook sync → already works
- SEC was solving a problem that the snapshot architecture created. Without snapshots, it's unnecessary.

### Decision 3: No Drift Guardian in v1

**Evaluated:** A daily Cloud Function that re-validates all stores and detects inconsistencies.

**Decided:** Defer to Phase 2. Not needed for v1 launch.

**Rationale:**

- CSR validates on every save. Data cannot become invalid between saves unless someone bypasses `updateProject()` (which would be a security breach, not a correctness issue).
- The only scenario where drift could occur: direct Firestore writes bypassing the DAL. This is protected by Firestore security rules.
- Adding a Cloud Function increases Firebase cost (~$0.15/month for 1000 stores), requires `functions/` directory changes, and adds maintenance burden.
- If we ever need it, it's a simple addition later — re-run CSR on all active stores' project data, log failures.

### Decision 4: No Snapshot Debounce

**Evaluated:** A 3-second consolidation window to prevent snapshot flood from rapid edits.

**Decided:** Don't build it. No snapshots means no flood.

**Rationale:**

- The editor already has save debounce in `syncChanges`. Rapid typing doesn't trigger rapid saves.
- CSR runs client-side in < 100ms with zero Firebase calls. Even if it ran 100 times per minute, the cost is $0.00.
- The "rapid edit consolidation" problem was a snapshot-specific concern. Without snapshots, it doesn't exist.

### Decision 5: Verification Metadata on Existing Document

**Decided:** Add `_mce` field to existing project document instead of separate collection.

**Rationale:**

- Zero extra Firebase writes (metadata is part of the same `setDoc` merge call)
- Zero extra Firebase reads (surfaces already read the project document)
- Zero new collections
- Provides foundation for future features (Drift Guardian can check `_mce.verified` field)

---

## 18. Exposure Control Doctrine (v1 vs Future)

This section documents an explicit architectural decision about what MCE v1 controls and what it does not.

### What MCE v1 Controls

- **Validation:** CSR validates menu data on every save. This is the core protection.
- **Marking:** `_mce` metadata stamps whether data passed validation. This is the record.
- **Publish-Gate:** Blocks "Continue to UI Editor" if critical validation fails. This is the owner-facing enforcement.

### What MCE v1 Does NOT Control

- **Surface exposure:** MCE v1 does not gate what surfaces display. Surfaces read from the project document directly. If invalid data is saved, surfaces will show it.
- **Surface fallback:** MCE v1 does not instruct surfaces to fall back to cached data when `_mce.verified = false`. Existing caching (screen localStorage, Vercel ISR 60s TTL) provides natural buffering but is not MCE-controlled.

### Why This Is Acceptable for v1

1. **The Publish-Gate is the real enforcement.** Most critical errors (empty names, broken categories) are caught before the owner can proceed to make the menu "live" in the UI Editor.
2. **The editor already has existing validation.** Most invalid states are prevented by existing field validation in the editor UI before the save even happens.
3. **Surface-level gating = rebuilding SEC.** Making every surface check `_mce.verified` and conditionally fall back is routing logic — that's the Surface Exposure Controller we explicitly rejected in §17 Decision 2.
4. **The practical risk is minimal.** For an owner to get truly broken data onto surfaces, they would need to: bypass editor validation, ignore Publish-Gate warnings, and save data that is structurally broken. This is the 0.1% edge case we chose not to over-engineer for.

### Phase 2 Enhancement (If Ever Needed)

If surface-level exposure gating becomes necessary (e.g., for external distribution in Layer 3):

- Surfaces check `_mce.verified` before rendering fresh data
- If `false`, surface serves last rendered version from cache
- This is a ~50-line change per surface, not a redesign

The `_mce` metadata provides the foundation for this. We are not blocking future capability — we are choosing not to build it prematurely.

---

## 19. Trust Model Doctrine

**MenuList trusts the controlled dashboard write path.**

All Firestore writes to project data go through `updateProject()` in the DAL. There is no public API, no third-party write access, no untrusted write path.

Direct Firestore writes that bypass the DAL are treated as a **security breach**, not a correctness scenario. Firestore security rules enforce `_mce` field structure (see impl §9), but MCE does not attempt to protect against intentionally malicious writes from outside the application.

This is the correct trust boundary for an SMB product where all writes originate from the authenticated dashboard.

---

## 20. External Review Log (Decision History)

This section captures decisions from external reviews (ChatGPT, internal reviews) so the rationale is preserved across sessions.

### ChatGPT Architecture Review (February 14, 2026)

Full MCE documentation (v3.0) was shared with ChatGPT for independent architecture review. ChatGPT identified 2 structural risks and 3 clarity gaps.

| #   | ChatGPT's Point                                                                                                                | Our Verdict                                                                                   | Action Taken                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Surfaces show unverified data** — If `_mce.verified = false`, surfaces still show new broken data because nothing stops them | Observation valid. Proposed fix rejected — surfaces checking `_mce.verified` = rebuilding SEC | Added §18 Exposure Control Doctrine. Fixed misleading "surfaces serve cached data" wording                                        |
| 2   | **Client-side trust model** — Malicious client could bypass CSR                                                                | Already documented in §17 D3 and impl §9                                                      | Added §19 Trust Model Doctrine for explicit statement                                                                             |
| 3   | **Silent vs shows errors contradiction** — Docs said "silent authority" AND "shows owner what needs fixing"                    | Valid contradiction in docs                                                                   | Fixed: MCE core = silent (stamps metadata). Publish-Gate = separate UX (shows errors at "Continue to UI Editor"). Added impl §2.4 |
| 4   | **sanitizeForClient scope** — No explicit invariant that all surfaces must use it                                              | Minor but valid                                                                               | Added INVARIANT block in impl §2.3                                                                                                |
| 5   | **Outlet re-validation timing** — When do outlets re-validate after master change?                                             | Already documented in impl §7                                                                 | No change — ChatGPT missed it                                                                                                     |

**Key rejection:** ChatGPT proposed surfaces check `_mce.verified` and fall back to cached data (their "Option A — Strict infra"). We rejected this because it equals rebuilding the Surface Exposure Controller (SEC) we explicitly excluded in §17 Decision 2. Surface-level gating is a Phase 2 enhancement if ever needed.

### V1 Implementation Limitations (February 14, 2026)

These are known limitations documented in code comments, accepted for v1:

| Limitation                              | Rule                                            | Rationale                                                                                   |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `SUSPICIOUS_PRICE_CHANGE` skipped in v1 | Needs `oldProject` data comparison              | CSR only receives current state. Will implement when oldProject is passed to CSR            |
| `HOURS_DATA_PRESENT` always passes      | Hours data lives on store document, not project | MCE validates project data only. Hours validation handled by `src/lib/hours/hoursEngine.ts` |
| `OUTLET_MASTER_SYNC` always passes      | Requires master vs outlet state comparison      | Master update awareness system handles notification. Outlet validates on next save          |

### ChatGPT Post-Implementation Audit (February 14, 2026)

Full implementation (v3.1) shared with ChatGPT for production readiness audit. Rating: Architecture 9.5/10, Implementation 9/10, Production ready: Yes.

| #   | Feedback Point                                                         | Our Action                                                              |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | `sanitizeForClient` duplication in page.tsx + utils.ts                 | **Already fixed** — page.tsx now imports from `@lib/mce/utils`          |
| 2   | Add INVARIANT comment in `updateProject()` above MCE hook              | **Implemented** — added trust model comment referencing spec §19        |
| 3   | Add lightweight console logging for MCE results                        | **Implemented** — `[MCE] verified=true rules=17/18 warnings=0 errors=0` |
| 4   | Do NOT add drift guardian, background revalidation, fallback rendering | **Already aligned** — per spec §17 D3, §18                              |
| 5   | MCE is DONE once stable — resist urge to keep improving                | **Documented** — added MCE Stability Doctrine to marketing doc          |

**Key validation from external review:**

- Integration point choice (before setDoc inside updateProject) confirmed as "the only correct place"
- Silent infra discipline confirmed — "if owners ever see MCE, you've failed"
- Cost discipline confirmed — zero extra reads/writes/collections
- Strategic impact: "MenuList is no longer just menu builder — it becomes validated customer-facing truth system"

### Owner's Design Philosophy (Captured from Session)

Direct quotes and reasoning from the product owner that shaped MCE architecture:

- **"Our project data is minimal and we already tightened all angles of updations. There is no single point left where we didn't trust the original project data."** — This is why we rejected snapshot collections.
- **"Doing changes for this 0.1% use case will increase load, cost, and sometimes over-complicate the system."** — This is why we chose not to over-engineer for rare edge cases.
- **"No system in the world handles 100% of each and every use case or corner case."** — This is the practical philosophy behind the lean architecture.
- **"SMB owner can handle rare issues manually."** — This confirms the 0.1% edge case resolution path.

---

_Document Classification: Internal — Product Team_  
_Next Step: Implementation Blueprint (`menu-correctness-engine_impl.md`)_
