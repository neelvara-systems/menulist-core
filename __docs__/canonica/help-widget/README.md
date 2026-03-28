# Canonica Embeddable Help Widget

> **Feature:** Embeddable context-aware help widget for SaaS products
> **Status:** v1 IMPLEMENTED / v2 DOCUMENTED (ready for implementation)
> **Date:** 2026-03-08
> **Feature Flags:** `ENABLE_CANONICA_WIDGET` (core), `ENABLE_CANONICA_CONTEXT_AWARE` (context layer)
> **Auth:** API key via `X-API-Key` header (reuses existing `publicApi.apiKey` on store)

---

## Document Index

| #   | Document                  | Audience       | Purpose                                                               |
| --- | ------------------------- | -------------- | --------------------------------------------------------------------- |
| 1   | **README.md** (this file) | Everyone       | Master index, architectural position, key decisions                   |
| 2   | `help-widget_spec.md`     | CEO/PM         | Business requirements, user stories, embed flow, customization        |
| 3   | `help-widget_impl.md`     | Developers     | Technical blueprint, file structure, API contracts, phased build plan |
| 4   | `help-widget_firebase.md` | Developers/Ops | Firestore reads/writes, cost projections                              |

---

## What This Is

An embeddable JavaScript widget that SaaS founders add to their product with a single script tag. End-users click a launcher button, a popup opens, they ask questions, and Canonica searches the KB and returns answers using canonical-first retrieval with RAG fallback.

The widget is a **distribution surface** (Layer 4 in Canonica's architecture), not a product feature. It contains no intelligence of its own. All knowledge retrieval flows through the same `coreSearch()` pipeline used by the Help Center.

---

## Architectural Position in Canonica

```
┌───────────────────────────────────┐
│  Layer 1: Knowledge Source        │
│  KB articles / docs / signals     │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│  Layer 2: Canonical Truth Engine  │
│  Entities / Canonical Answers     │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│  Layer 3: Retrieval + Generation  │
│  coreSearch() — single pipeline   │
│  Canonical → Entity RAG → Gemini  │
└──────────────┬────────────────────┘
               │
┌──────────────▼────────────────────┐
│  Layer 4: Distribution Surfaces   │
│  Help Center / Widget / API       │
└───────────────────────────────────┘
```

The widget sits entirely in Layer 4. It is a query entry point. The intelligence lives in Layers 1-3.

---

## Key Architectural Decisions

| #   | Decision                                         | Rationale                                                                                                                                    |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **iframe isolation**                             | XSS protection, CSS isolation, JS isolation. Industry standard (Intercom, Zendesk, Crisp).                                                   |
| 2   | **Two-layer model** (loader script + iframe app) | Loader is ~4KB vanilla JS. App loads lazily on click. Prevents React/CSS conflicts with host.                                                |
| 3   | **API key auth, not session auth**               | Widget serves end-users of SaaS products (anonymous). API key resolves tenant identity only.                                                 |
| 4   | **Unified coreSearch() pipeline**                | Both Help Center and Widget call the same function. No logic duplication. Widget gains all improvements for free.                            |
| 5   | **SDK-first context collection**                 | SaaS developer passes structured context (page, feature, entityHints). More reliable than DOM scraping.                                      |
| 6   | **Widget UI stays zero-dependency**              | No antd, no framer-motion, no SCSS. 248 lines of inline-styled React. Critical for iframe bundle size.                                       |
| 7   | **Canonical-first always**                       | Widget never bypasses canonical retrieval. Context assists retrieval, never replaces it. Knowledge must always come from canonical articles. |

---

## v1 → v2 Evolution

| Capability             | v1 (Current)                              | v2 (Documented, Ready)                                                                                                                                        |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search pipeline        | Unified `coreSearch()`                    | Same                                                                                                                                                          |
| Context-aware support  | Feature-flagged, schema exists            | Full SDK integration, context boosts entity matching                                                                                                          |
| Launcher customization | Position + color + text                   | Shape, display mode, size, offset                                                                                                                             |
| Session memory         | None (stateless)                          | In-memory session (last 5 messages)                                                                                                                           |
| Query telemetry        | Via `aiSearchHistory` (from `coreSearch`) | Same, enriched with mountContext                                                                                                                              |
| Feedback signals       | None                                      | Thumbs up/down → signal mutation pipeline                                                                                                                     |
| Origin allowlist       | None (any domain)                         | Per-tenant allowed domains                                                                                                                                    |
| Conversation context   | None                                      | Assistant mode with conversation history                                                                                                                      |
| Reference deep linking | Title only                                | Article ID + section anchor                                                                                                                                   |
| Image upload           | None                                      | User-initiated screenshot/image upload. Reuses coreSearch Stage 2 (Gemini Pro query gen + Gemini Flash visual context). Base64 inline, no persistent storage. |

---

## What the Widget Does NOT Do (Permanent Non-Goals)

These align with Canonica's Non-Goals Charter (doctrine/02):

- No live chat / agent handoff — Canonica is not a helpdesk
- No ticket creation from widget — operational layer, not distribution surface
- No proactive messages / tooltips / onboarding tours — not a product tour tool
- No DOM scraping / automatic context extraction — SDK-first, SaaS developer provides context
- No automatic screenshot capture — user-initiated image upload only (no DOM/vision scraping)
- No full CSS customization — controlled customization only (accent color, shape, position)
- No widget analytics dashboard — Canonica is not a BI platform

---

## Version History

| Date       | Version | Change                                                                                                                                                                                                                                                    |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-08 | 2.0.0   | Complete documentation rewrite: v2 architecture with context-aware support, launcher customization, session memory, feedback signals, origin allowlist. Unified search architecture. ChatGPT conversation reviewed + validated against Canonica codebase. |
| 2026-03-07 | 1.0.0   | Initial implementation: embed script + iframe page + public API + feature flag                                                                                                                                                                            |
