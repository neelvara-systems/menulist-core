# Authority Control Stack — Strategic Reference

**Purpose:** Maps MenuList's authority across the 5 layers of the commercial chain.  
**Type:** Strategic reference (complements Constitution Docs 15, 17, and Surface Maturity Index)  
**Source:** ChatGPT Strategic Session (March 2026) → Cascade Review + Full Codebase Cross-Check  
**Last Updated:** 2026-03

---

## Why This Document Exists

Constitution Doc 15 (Category Dominance) defines the **"Cleanest Source" 5-Layer Framework** — focused on data quality depth (structural, semantic, temporal, sync, output cleanliness).

This document provides a **complementary view**: the **commercial chain perspective** — where MenuList holds authority in the lifecycle between a business creating an offer and a customer reacting to it.

Both views describe the same system. This one focuses on **control surfaces**, not data quality layers.

---

## The Commercial Chain

For any customer-facing SMB:

```
1. Offer is created       → Owner decides what to sell (human intent, unstructured)
2. Offer is structured    → Intent becomes typed, validated data
3. Offer is presented     → Structured truth rendered for humans
4. Customer discovers     → External platforms mediate visibility
5. Customer decides       → Expectation formation from what they see
6. Customer visits/orders → Physical revenue moment (POS territory — NOT ours)
7. Customer reacts        → Reviews, feedback, perception
```

**MenuList's authority zone: Steps 2–5 (and partially 7)**  
**Permanently excluded: Step 6** (transactions, POS, billing — per Constitution Doc 11 Rule 2)

---

## 5-Layer Control Stack

### Layer 1 — Structured Offer (DOMINANT)

**Definition:** The canonical, machine-readable definition of what the business publicly sells.

**MenuList Authority:**
- Items, categories, prices, variants, availability — typed in Firestore
- Hours, holidays, temporary status — computed layer
- Business identity — name, logo, phone, address, service modes
- Multi-language translations — structured per language
- Multi-outlet inheritance — master → outlet governance

**Existing Systems:**

| System | Location | Purpose |
|--------|----------|---------|
| MCE (18 rules) | `src/lib/mce/` | Structural validation on every save |
| MOL (Menu Observation Layer) | `src/database/menuChangeLog/` | Append-only change ledger |
| Menu Snapshots | `menuSnapshots/{tId}/{sId}/` | Immutable publish-time state |
| Menu Versioning | `project.menuVersion` | Monotonic publish counter |
| Publish Gate | `Editor.tsx → onContinueClick()` | Blocks broken publishes |
| Business Type Taxonomy | `src/data/shared/businessTypes.ts` | 60+ types, 7 categories |
| Schema.org output | `src/lib/schema/index.ts` | Machine-readable structured data |

**Infrastructure completeness test:**
- [x] Single write surface (Editor only)
- [x] Every field has type constraints
- [x] Publish prevented if broken
- [x] Historical state reconstructible (snapshots)
- [x] Multi-outlet inheritance deterministic
- [x] No free-text escape routes

**Status:** Layer 1 is **infrastructure-grade complete.**

---

### Layer 2 — Presentation (DOMINANT)

**Definition:** Deterministic rendering of structured truth across all surfaces, with zero mutation.

**MenuList Authority:**
- 12 surfaces (see `__docs__/surface-maturity-index.md`)
- All surfaces read-only from same Firestore source
- No surface mutates canonical data
- MCE stamps `menuVersion` for surface invalidation cascade

**Existing Systems:**

| Surface | Status | Consistency |
|---------|--------|-------------|
| QR/Web Menu | Production | Real-time Firestore read |
| OBP | Built (flag off) | Server-rendered from store + project |
| Digital Screens | Production | Version polling, auto-refresh |
| PDF Surface | Production | Client-side jsPDF from project |
| POS Webhook | Built (flag off) | Debounced full snapshot |
| Social Content | Production | Campaign derived from menu |
| Physical Surfaces | Spec ready | Tent cards/stickers from project |
| Menu Kit | Spec ready | ZIP bundle from project |

**Infrastructure completeness test:**
- [x] Same structured input → identical output across surfaces
- [x] No blank categories or missing prices at render
- [x] Atomic publish propagation (version-based)
- [x] Read-only consumption (no shadow edits)
- [x] 60s cache TTL with `stale-while-revalidate`

**Status:** Layer 2 is **infrastructure-grade complete.**

---

### Layer 3 — Distribution (BUILDING)

**Definition:** How structured truth propagates to and remains consistent across external discovery surfaces.

**MenuList Authority (Built):**
- OBP as canonical identity page
- Schema.org JSON-LD on all public pages
- `llms.txt` + `llms-full.txt` for agent discovery
- `dateModified` consistency on publish
- Sitemap with `/menu` URLs
- BreadcrumbList + FAQ schema
- sameAs governance (schema.org)

**MenuList Authority (Pending GBP API):**
- GBP hours sync (architecture built, `ENABLE_GBP_SYNC: false`)
- GBP hours drift detection
- External mismatch detection

**What can be strengthened WITHOUT external APIs:**
1. Harden OBP canonical tag discipline
2. Enforce entity consistency (name, address, phone normalization)
3. Ensure deterministic `dateModified` on every publish
4. Build volatility resistance internally (price drift detection)

**Status:** Layer 3 is **partially built.** OBP + schema are strong. GBP sync blocked on API access.

---

### Layer 4 — Perception (FOUNDATIONAL)

**Definition:** Structured reaction to structured offer — detecting where customer expectation diverges from presentation.

**MenuList Authority (Built):**
- Internal feedback system (`ENABLE_GUEST_FEEDBACK: true`)
- MOL tracks all structured changes
- Extraction correction logging (10.2 learning loop)
- Store truth confidence scoring (10.3 nightly computation)
- Staleness check with reconfirmation (10.4)

**Not yet built (future, post-scale):**
- Item-level feedback mapping (feedback → specific item)
- Dissatisfaction clustering by category
- Offer-change → feedback correlation logging
- Structured escalation logic

**Status:** Layer 4 has **foundations built.** Deep perception coupling requires scale (100+ active stores with feedback data).

---

### Layer 5 — Optimization (MINIMAL — Intentionally)

**Definition:** Controlled, rule-bound evolution of structured offer based on accumulated truth + perception.

**MenuList Authority (Built):**
- Decision Intelligence (decision blocks with confidence scoring)
- Authority Maturation (3-phase: observation → assisted → autonomous)
- Menu Drift detection (30-day rolling analysis)
- Continuous Menu Intelligence (menu health scoring)

**What optimization must NEVER become:**
- A/B testing dashboards
- Revenue optimization tools
- Conversion analytics
- Marketing experimentation
- Growth hacking features

**Optimization vectors (all silent, internal-only):**
1. Structural clarity enforcement (duplicate detection, naming normalization)
2. Volatility stabilization (publish cooldown, rapid-change dampening)
3. Expectation alignment (perception → offer clarity suggestions)

**Status:** Layer 5 has **minimal but correct foundations.** Per doctrine, optimization only deepens AFTER Layers 1-3 are dominant.

---

## Removal Pain Analysis

| Layer | Current Removal Pain | Target (12 months) |
|-------|---------------------|-------------------|
| L1 — Structured Offer | **High** — versioned history, validated structure | Very High |
| L2 — Presentation | **Medium** — surfaces replaceable individually | High (with more surfaces live) |
| L3 — Distribution | **Medium** — OBP adoption still growing | High (when OBP = official link) |
| L4 — Perception | **Low** — early stage | Medium |
| L5 — Optimization | **Low** — minimal scope | Low–Medium |

**Key insight:** Distribution (L3) creates the strongest removal pain because it creates *external dependency*. When Google/Maps/agents read from MenuList, the business cannot casually remove it.

---

## Relationship to Existing Doctrine

| Document | Relationship |
|----------|-------------|
| `constitution/15-category-dominance-doctrine.md` | Doc 15's "Cleanest Source" framework = data quality view. This doc = commercial chain view. Complementary. |
| `constitution/17-infrastructure-compounding-doctrine.md` | Doc 17's 19-layer checklist maps to specific items within these 5 layers. |
| `constitution/11-product-evolution-doctrine.md` | Stage 0 (MenuList Dominance) = Layers 1-3. Stage 1 (Control Layer) = Layer 4-5 deepening. |
| `surface-maturity-index.md` | Lists all Layer 2 surfaces with status and governance. |
| `canonical-truth-infrastructure/` | Documents Layer 1 implementation details. |
| `infrastructure-compounding/` | Documents Layer 1-3 deepening features (10.1-10.4). |

---

## The Strategic Sequence

```
Year 1: Dominate L1 + L2 (structured offer + presentation) ← CURRENT
Year 2: Strengthen L3 (distribution authority, OBP adoption)
Year 3: Connect L4 (perception coupling, only with real data)
Year 3+: Deepen L5 (controlled evolution, only after L1-3 dominant)
```

**Never reverse this order.** Optimization without canonical truth = chaos.

---

**Author:** Cascade (validated from ChatGPT strategic session)  
**ChatGPT Accuracy for this topic:** ~30% genuinely new. ~70% already existed in codebase and doctrine docs.  
**Action taken:** Documented as complementary strategic reference, NOT new constitution doc.
