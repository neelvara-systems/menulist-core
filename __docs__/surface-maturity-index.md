# MenuList — Surface Maturity Index

**Purpose:** Cross-surface navigation reference. Maps every customer-facing and operational surface to its documentation, feature flag, implementation status, and governance constraints.

**Last Updated:** 2026-03

---

## Surface Map

| # | Surface | Docs Location | Feature Flag | Status | Spec Lock |
|---|---------|--------------|-------------|--------|-----------|
| 1 | **PDF Surface** | `__docs__/pdf-surface/` | Always-on compatibility adapter | ✅ Implemented | v2.1 |
| 2 | **OBP (Official Business Page)** | `__docs__/official-business-page/` | `ENABLE_OBP: false` | ✅ Built, flag off | Draft |
| 3 | **Digital Screens** | `__docs__/digital-screens/` | `DIGITAL_SCREENS_ENABLED: true` | ✅ Production | 🔒 v2.2 LOCKED |
| 4 | **POS Webhook Sync** | `__docs__/pos-webhook-sync/` | `ENABLE_POS_SYNC: false` | ✅ Built, flag off | v2.0 |
| 5 | **Reviews & Reputation** | `__docs__/reviews-reputation/` + `__docs__/reputation-protection/` | `ENABLE_REVIEWS_REPUTATION: false` | ✅ Built, blocked on GBP API | 🔒 LOCKED |
| 6 | **Internal Feedback** | `__docs__/projects/internal-feedback-system/` | `ENABLE_GUEST_FEEDBACK: true` | ✅ Production | v1.0 |
| 7 | **Social Content / Today** | `__docs__/social-content/` | `SOCIAL_CONTENT_ENABLED: true` | ✅ Production | 🔒 LOCKED |
| 8 | **Staff Prompt** | `__docs__/staff-prompt/` | Part of Social Content | Spec ready | 🔒 LOCKED |
| 9 | **Menu Command Center** | `__docs__/menu-command-center/` | `ENABLE_MENU_COMMAND_CENTER: true` | ✅ Production | v1.2 |
| 10 | **Menu Correctness Engine** | `__docs__/menu-correctness-engine/` | `ENABLE_MCE: true` | ✅ Production | v1.0 |
| 11 | **Physical Surfaces** | `__docs__/physical-surfaces/` | `ENABLE_PHYSICAL_SURFACES: false` | Spec ready | v1.0 |
| 12 | **Menu Kit** | `__docs__/menu-kit/` | `ENABLE_MENU_KIT: false` | Spec ready | v1.0 |

---

## Authority Flow

All surfaces derive from the same canonical data:

```
Menu Editor (single mutation gateway)
  └── updateProject() → Firestore projectsData/{id}
        ├── QR/Web Menu (live Firestore read)
        ├── OBP (server-rendered from store + project data)
        ├── Digital Screens (version polling, auto-refresh)
        ├── PDF Surface (client-side jsPDF from project data)
        ├── POS Sync (debounced webhook, full snapshot)
        ├── Social Content / Today (campaign derived from menu data)
        ├── Staff Prompt (derived from menu + decision intelligence)
        ├── Physical Surfaces (tent cards, stickers from project data)
        └── Menu Kit (ZIP bundle from project data)
```

**Rule:** No surface mutates canonical data. Only the Editor mutates. All surfaces read.

---

## Validation Layer

Menu Correctness Engine (MCE) validates on every save:
- Item names present for active languages
- Category references valid
- Prices non-negative and properly formatted
- No orphaned outlet overrides
- Stamps `menuVersion` for surface invalidation cascade

---

## Governance References

| Governance Area | Document |
|----------------|----------|
| Product separation (MenuList vs GrowthOS vs KitStamp) | `__docs__/constitution/12-product-separation-doctrine.md` |
| Category dominance (upstream positioning) | `__docs__/constitution/15-category-dominance-doctrine.md` |
| Feature rejection gate | `__docs__/constitution/08-feature-rejection-gate.md` |
| Language governance (public-facing copy) | `__docs__/constitution/02-language-governance.md` |
| Core doctrine (10 Laws) | `__docs__/constitution/01-core-doctrine.md` |
| Pricing integrity (cross-surface price parity) | `__docs__/pricing-integrity-system/` |
| Multi-outlet consistency | `__docs__/multi-outlet-consistency/` |

---

## Surface Addition Rules

Before adding any new surface, it must pass:

1. **Feature Rejection Gate** (`constitution/08`) — 5 questions
2. **Product Separation Check** (`constitution/12`) — does it belong in MenuList or GrowthOS?
3. **Category Dominance Test** (`constitution/15`) — does it strengthen upstream positioning?
4. **Full doc set required** — spec, impl, firebase, mobile-support, marketing, helpdoc, website
5. **Feature flag required** — `ENABLE_[SURFACE_NAME]` in `src/config/features.ts`
6. **MCE integration** — new surface must read from validated project data

---

## What MenuList Surfaces Must Never Become

Per constitution and locked specs:

- ❌ Marketing automation tools
- ❌ Design/layout editors
- ❌ Analytics dashboards
- ❌ Social media management
- ❌ CRM or customer communication
- ❌ Review solicitation or gating
- ❌ Inventory management
- ❌ POS middleware

Every surface is **truth infrastructure** — it reflects canonical menu state, it does not create marketing content or optimize engagement.
