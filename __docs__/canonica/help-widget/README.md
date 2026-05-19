# Canonica Embeddable Help Widget

> **Feature:** Embeddable context-aware help widget for SaaS products
> **Status:** v2 IMPLEMENTED
> **Date:** 2026-05-12
> **Feature Flags:** `ENABLE_CANONICA_WIDGET` (core), `ENABLE_CANONICA_CONTEXT_AWARE` (context layer), `ENABLE_CANONICA_GUIDED_WORKFLOWS` (procedure rendering), `ENABLE_CANONICA_PREDICTIVE_SUPPORT` (proactive suggestions)
> **Auth:** API key via `X-API-Key` header. Raw keys are returned once and stored as `publicApi.apiKeyHash` with a display-only `keyPrefix`.

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

## MenuList Test Host

MenuList can temporarily act as an external Canonica client for widget testing through `ENABLE_MENULIST_CANONICA_WIDGET_TEST_HOST`.

This adapter does **not** replace MenuList's native Help Center. It loads the same public widget script and iframe an outside SaaS product would use, derives a scoped `cn_*` test key for the current MenuList store, stores only its hash under `canonicaWidgetTestApi`, and passes only sanitized page/workflow context. On MenuList page changes, it clears the widget page session before sending the next context so stale route history is not reused. Same-tab remounts reuse the resolved test key from session storage after the server route has verified the hashed key and origin allowlist. Widget runtime routes must explicitly opt in to this temporary credential source; normal public APIs still require `publicApi` credentials. It exists so the real widget runtime can be tested before a separate external product is available.

## Widget Management Console

Canonica operators manage the embeddable widget from `/canonica/widget`. This is the single dashboard surface for widget keys, install snippets, appearance, behavior, origin allowlists, context snippets, and desktop/mobile preview.

Saved widget settings are stored on the workspace store document under `widgetConfig`, `widgetAllowedOrigins`, and `widgetConfigVersion`. The installed script reads those settings through `GET /api/widget/config` with the widget key, so already-installed snippets can pick up dashboard changes without requiring customers to edit script attributes. Script attributes remain supported and intentionally override remote config for per-environment exceptions.

Widget keys are stored separately from broader Canonica public API credentials:

- `canonicaWidgetApi` — embeddable widget credential with `widget:*` scopes.
- `publicApi` — Canonica public API credential with public API scope.
- `canonicaWidgetTestApi` — temporary MenuList-as-client test credential.

Legacy widget keys still stored under `publicApi.purpose = "canonica_widget"` remain accepted by widget runtime routes, but they no longer authorize Canonica public API routes.

---

## Key Architectural Decisions

| #   | Decision                                         | Rationale                                                                                                                                    |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **iframe isolation**                             | XSS protection, CSS isolation, JS isolation. Industry standard (Intercom, Zendesk, Crisp).                                                   |
| 2   | **Two-layer model** (loader script + iframe app) | Loader is ~4KB vanilla JS. App loads lazily on click. Prevents React/CSS conflicts with host.                                                |
| 3   | **API key auth, not session auth**               | Widget serves end-users of SaaS products (anonymous). API key resolves tenant identity only.                                                 |
| 4   | **Unified coreSearch() pipeline**                | Both Help Center and Widget call the same function. No logic duplication. Widget gains all improvements for free.                            |
| 5   | **SDK-first context collection**                 | SaaS developer passes structured context using `CanonicaWidget.setContext()` or `CanonicaWidget.page()`. More reliable than DOM scraping.     |
| 6   | **Widget UI stays zero-dependency**              | No antd, no framer-motion, no SCSS. 248 lines of inline-styled React. Critical for iframe bundle size.                                       |
| 7   | **Canonical-first always**                       | Widget never bypasses canonical retrieval. Context assists retrieval, never replaces it. Knowledge must always come from canonical articles. |
| 8   | **One-time-visible keys**                        | Settings and onboarding never persist raw widget keys. Existing keys can only be identified by prefix; regenerate to copy again.              |
| 9   | **Transient widget history only**                | The widget can keep an in-memory page session for follow-up context, but never writes anonymous widget chat history to Firestore/localStorage. |
| 10  | **Dashboard-backed runtime config**              | Installed snippets read saved public config through `/api/widget/config`; no realtime listeners or page-load writes.                          |

---

## v1 → v2 Evolution

| Capability             | v1 (Current)                              | v2 (Documented, Ready)                                                                                                                                        |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search pipeline        | Unified `coreSearch()`                    | Same                                                                                                                                                          |
| Context-aware support  | Feature-flagged, schema exists            | Full SDK integration, context boosts entity matching                                                                                                          |
| Launcher customization | Position + color + text                   | Shape, display mode, size, offset                                                                                                                             |
| Session memory         | None (stateless)                          | In-memory page session (last 5 messages), explicit clear, optional `data-history="forget"` clear-on-close mode. No persistence.                              |
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

## External Widget Patterns Checked

Reviewed on 2026-05-18 while hardening the runtime contract:

- [Intercom JavaScript API](https://developers.intercom.com/installing-intercom/web/methods/) exposes `show`/`hide`/`update`/`shutdown`, expects SPA hosts to update context after route changes, and clears user/session data on shutdown.
- [Zendesk Messaging Web Widget API](https://developer.zendesk.com/api-reference/widget-messaging/web/core/) separates launcher visibility from open/close state, supports runtime conversation metadata, exposes open/close events, and provides a reset API that clears local widget state.
- [Help Scout Beacon API](https://developer.helpscout.com/beacon-2/web/javascript-api/) supports programmatic article suggestions, screen navigation, open/close events, SPA page-view events, and session-specific data that is not synced to the customer profile.

Canonica follows the durable parts of those patterns while preserving doctrine boundaries: SDK-first context, explicit open/close events, explicit clear-history/reset, transient in-memory conversation context, no DOM scraping, and no persistent anonymous widget chat history.

---

## Version History

| Date       | Version | Change                                                                                                                                                                                                                                                    |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-19 | 2.4.0   | Added dedicated `/canonica/widget` management console, scoped `canonicaWidgetApi` credentials, public runtime config endpoint, and dashboard-backed script config loading. |
| 2026-05-19 | 2.3.1   | Firebase cost hardening added: hash-only Canonica auth path, short widget auth cache, predictive trigger index cache, same-tab test-key cache, and context-scoped search cache keys. |
| 2026-05-18 | 2.3.0   | Runtime widget contract updated: mount-time script context attributes, `data-history`, explicit clear-history API, open/close events, and MenuList external-client test host context wiring.                                                            |
| 2026-03-08 | 2.0.0   | Complete documentation rewrite: v2 architecture with context-aware support, launcher customization, session memory, feedback signals, origin allowlist. Unified search architecture. ChatGPT conversation reviewed + validated against Canonica codebase. |
| 2026-03-07 | 1.0.0   | Initial implementation: embed script + iframe page + public API + feature flag                                                                                                                                                                            |
