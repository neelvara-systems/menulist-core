# Answerlattice Embeddable Help Widget

> **Feature:** Embeddable context-aware help widget for SaaS products
> **Status:** v2 IMPLEMENTED
> **Date:** 2026-05-12
> **Feature Flags:** `ENABLE_ANSWERLATTICE_WIDGET` (core), `ENABLE_ANSWERLATTICE_CONTEXT_AWARE` (context layer), `ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS` (procedure rendering)
> **Auth:** API key via `X-API-Key` header. Widget keys live on `stores/{sId}.answerlatticeWidgetApi` as bounded named keys (`keyHashes` + `keysByHash`), validate by SHA-256 hash, and are shown only once at creation time.

---

## Document Index

| #   | Document                  | Audience       | Purpose                                                               |
| --- | ------------------------- | -------------- | --------------------------------------------------------------------- |
| 1   | **README.md** (this file) | Everyone       | Master index, architectural position, key decisions                   |
| 2   | `help-widget_spec.md`     | CEO/PM         | Business requirements, user stories, embed flow, customization        |
| 3   | `help-widget_impl.md`     | Developers     | Technical blueprint, file structure, API contracts, phased build plan |
| 4   | `help-widget_firebase.md` | Developers/Ops | Firestore reads/writes, cost projections                              |
| 5   | `help-widget_mobile-support.md` | Developers/Ops | Mobile route decision, mobile widget-management support, test cases |

---

## What This Is

An embeddable JavaScript widget that SaaS founders add to their product with a single script tag. End-users click a launcher button, a popup opens, they ask questions, and Answerlattice searches the KB and returns answers using canonical-first retrieval with RAG fallback.

The widget is a **distribution surface** (Layer 4 in Answerlattice's architecture), not a product feature. It contains no intelligence of its own. All knowledge retrieval flows through the same `coreSearch()` pipeline used by the Help Center.

---

## Architectural Position in Answerlattice

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

## External Client Embeds

Answerlattice does not mount management UI inside MenuList core. Client products embed the public script from their own runtime using a real `answerlatticeWidgetApi` key issued from the Answerlattice dashboard.

MenuList is wired as a normal external client through `src/components/answerlattice/MenuListAnswerlatticeWidgetEmbed.tsx`. The owner app layout loads the widget only when `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY` is configured. No widget key is hardcoded in source, and the embed does not read MenuList Firebase to resolve Answerlattice scope. Local development uses `http://localhost:3000/widget/answerlattice-widget.js`; QA/Preview MenuList uses `https://ecomsai.com/widget/answerlattice-widget.js`; production MenuList uses `https://answerlattice.com/widget/v1/answerlattice-widget.js`. `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC` can override the script host for a temporary preview.

MenuList suppresses the external widget on owner-mobile viewports because the mobile owner app already has native help and internal admin screens. When the current route is blocked or the viewport is mobile, the embed closes and hides any already-mounted widget before rendering nothing, so the iframe cannot remain over the app after sidebar navigation.

Any client-specific context must be passed through the v1 widget browser contract or script attributes. Answerlattice accepts only sanitized path, title, feature, workflow, role, and locale context. Legacy plan and entity-hint fields are compatibility-only public labels. Client tenant IDs, store IDs, user IDs, and raw business records are not required and must not be hardcoded into the Answerlattice runtime.

## Widget Management Console

Answerlattice operators manage the embeddable widget from `/answerlattice/widget`. This is the single dashboard surface for widget keys, install snippets, appearance, behavior, origin allowlists, route blocklists, context snippets, and desktop/mobile preview. The clean sidebar subroutes are `/answerlattice/widget/ui`, `/answerlattice/widget/install`, `/answerlattice/widget/hosted-help`, and `/answerlattice/widget/access` so customer-facing settings, install handoff, hosted help, and security stay separate.

The UI Configuration tab now covers the low-cost branding controls SaaS owners expect at launch: launcher label, header title, greeting, accent color, launcher shape/display, mobile visibility, and whether the "Powered by Answerlattice" badge is shown. These settings ride the existing remote widget config response and do not introduce a new branding collection or realtime listener.

Saved widget settings are stored on the workspace store document under `widgetConfig`, `widgetAllowedOrigins`, and `widgetConfigVersion`. The installed script reads those settings through `GET /api/widget/config` with the widget key, so already-installed snippets can pick up dashboard changes without requiring customers to edit script attributes. Script attributes remain supported and intentionally override remote config for per-environment exceptions. The Install & Embed tab recommends env-backed client installs for the public widget key and optional script host while keeping private credentials out of browser env.

Runtime config is intentionally short-cached. The server and browser avoid repeated config reads for the same widget key/origin, and unchanged dashboard saves do not write. This keeps the embed centrally configurable without adding realtime listeners or page-load writes. Cache policy is not exposed as a customer setting; the management UI only tells operators that installed widgets can take up to 60 seconds to pick up saved changes.

Route blocklists are stored in the same dashboard config and evaluated inside the loader script against the host page pathname. They are for pages where the client product already has its own help surface, such as `/help-center` or `/help-center/*`.

Widget keys are stored separately from broader Answerlattice public API credentials:

- `answerlatticeWidgetApi` — bounded embeddable widget key manager with `widget:*` scopes, name/rename/delete actions, hash lookup, and one-time raw key display at creation.
- `publicApi` — Answerlattice public API credential with public API scope.

Widget runtime routes opt into `answerlatticeWidgetApi` only. Answerlattice public API routes continue to use `publicApi` and reject widget-only keys.
Raw widget keys are never stored for dashboard recovery. If an operator loses a raw widget key after creation, they create a replacement key and update the client install.

---

## Key Architectural Decisions

| #   | Decision                                         | Rationale                                                                                                                                    |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **iframe isolation**                             | XSS protection, CSS isolation, JS isolation. Industry standard (Intercom, Zendesk, Crisp).                                                   |
| 2   | **Two-layer model** (loader script + iframe app) | Loader is ~4KB vanilla JS. App loads lazily on click. Prevents React/CSS conflicts with host.                                                |
| 3   | **API key auth, not session auth**               | Widget serves end-users of SaaS products (anonymous). API key resolves tenant identity only.                                                 |
| 4   | **Unified coreSearch() pipeline**                | Both Help Center and Widget call the same function. No logic duplication. Widget gains all improvements for free.                            |
| 5   | **Explicit browser context collection**          | SaaS developer passes structured context using `AnswerlatticeWidget.setContext()` or `AnswerlatticeWidget.page()`. More reliable than DOM scraping.     |
| 6   | **Widget UI stays zero-dependency**              | No antd, no framer-motion, no SCSS. 248 lines of inline-styled React. Critical for iframe bundle size.                                       |
| 7   | **Canonical-first always**                       | Widget never bypasses canonical retrieval. Context assists retrieval, never replaces it. Knowledge must always come from canonical articles. |
| 8   | **Bounded named keys on store doc**              | Up to 10 active widget keys per workspace live on the existing store document. Validation remains one indexed store lookup; no key collection is added. |
| 9   | **MenuList is an env-configured client**         | MenuList loads the same public script as any other client only when an Answerlattice-issued widget key is configured. No test-host flag or hardcoded key is used. |
| 10  | **Transient widget history only**                | The widget can keep an in-memory page session for follow-up context, but never writes anonymous widget chat history to Firestore/localStorage. |
| 11  | **Dashboard-backed runtime config**              | Installed snippets read saved public config through `/api/widget/config`; no realtime listeners or page-load writes.                          |

---

## v1 → v2 Evolution

| Capability             | v1 (Current)                              | v2 (Documented, Ready)                                                                                                                                        |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search pipeline        | Unified `coreSearch()`                    | Canonical answers first, owner FAQ/custom answers second, RAG fallback last                                                                                   |
| Context-aware support  | Feature-flagged, schema exists            | Browser contract integration, context boosts entity matching                                                                                                  |
| Launcher customization | Position + color + text                   | Shape, display mode, size, offset                                                                                                                             |
| Session memory         | None (stateless)                          | In-memory page session (last 5 messages), explicit clear, optional `data-history="forget"` clear-on-close mode. No persistence.                              |
| Query telemetry        | Via `aiSearchHistory` (from `coreSearch`) | Same, enriched with `mountContext`; `/answerlattice/widget` shows recent widget questions for dashboard verification.                                              |
| Feedback signals       | None                                      | Thumbs up/down → signal mutation pipeline                                                                                                                     |
| Origin allowlist       | None (any domain)                         | Per-tenant allowed domains                                                                                                                                    |
| Conversation context   | None                                      | Assistant mode with conversation history                                                                                                                      |
| Reference deep linking | Title only                                | Article ID + section anchor                                                                                                                                   |
| Image upload           | None                                      | User-initiated screenshot/image upload. Reuses `coreSearch()` visual context extraction with the shared 5MB JPEG/PNG/WebP/GIF policy. Base64 inline, no persistent storage. |

---

## What the Widget Does NOT Do (Permanent Non-Goals)

These align with Answerlattice's Non-Goals Charter (doctrine/02):

- No live chat / agent handoff — Answerlattice is not a helpdesk
- No ticket creation from widget — operational layer, not distribution surface
- No generic marketing popups, tooltips, or onboarding tours — predictive help is allowed only when it is deterministic, feature-flagged, page-context gated, cooldown-protected, and backed by approved Answerlattice support knowledge
- No DOM scraping / automatic context extraction — SaaS developer provides context through the v1 browser contract
- No automatic screenshot capture — user-initiated image upload only (no DOM/vision scraping)
- No full CSS customization — controlled customization only (accent color, shape, position)
- No widget analytics dashboard — Answerlattice is not a BI platform

---

## External Widget Patterns Checked

Reviewed on 2026-05-18 while hardening the runtime contract:

- [Intercom JavaScript API](https://developers.intercom.com/installing-intercom/web/methods/) exposes `show`/`hide`/`update`/`shutdown`, expects SPA hosts to update context after route changes, and clears user/session data on shutdown.
- [Zendesk Messaging Web Widget API](https://developer.zendesk.com/api-reference/widget-messaging/web/core/) separates launcher visibility from open/close state, supports runtime conversation metadata, exposes open/close events, and provides a reset API that clears local widget state.
- [Help Scout Beacon API](https://developer.helpscout.com/beacon-2/web/javascript-api/) supports programmatic article suggestions, screen navigation, open/close events, SPA page-view events, and session-specific data that is not synced to the customer profile.

Answerlattice follows the durable parts of those patterns while preserving doctrine boundaries: explicit browser context, explicit open/close events, explicit clear-history/reset, transient in-memory conversation context, no DOM scraping, and no persistent anonymous widget chat history.

---

## Version History

| Date       | Version | Change                                                                                                                                                                                                                                                    |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-25 | 2.4.9   | Replaced the single widget key surface with a bounded Google-style key manager on the store doc: named keys, rename, delete, copy for encrypted widget keys, legacy hash-only compatibility, and no new collections. |
| 2026-05-22 | 2.4.4   | Added launch-grade widget branding controls for header title, accent color propagation, greeting, and powered-by visibility without adding runtime Firestore reads. |
| 2026-05-24 | 2.4.6   | Restored predictive support as a guarded runtime capability. The widget calls predictive help only when config confirms active triggers, allowed origin, safe context, rate limits, and cooldown storage are in place. |
| 2026-05-24 | 2.4.5   | Temporary rollback note superseded by 2.4.6 after predictive support was restored and hardened. |
| 2026-05-20 | 2.4.2   | Added route blocklist settings for hiding the widget on selected client routes without adding Firebase reads. |
| 2026-05-20 | 2.4.1   | Split widget management into customer-understandable tabs and removed the standalone Cost & Cache customer-facing section. |
| 2026-05-19 | 2.4.0   | Added dedicated `/answerlattice/widget` management console, scoped `answerlatticeWidgetApi` credentials, public runtime config endpoint, and dashboard-backed script config loading. |
| 2026-05-25 | 2.4.9   | Added env-configured MenuList external-client widget embed for owner routes, with no hardcoded key and no MenuList Firebase fallback. |
| 2026-05-21 | 2.4.3   | Removed the temporary MenuList widget host from runtime/docs; client products now integrate only through the generic public widget script and Answerlattice-issued widget keys. |
| 2026-05-19 | 2.3.1   | Firebase cost hardening added: hash-only Answerlattice auth path, short widget auth cache, and context-scoped search cache keys. |
| 2026-05-18 | 2.3.0   | Runtime widget contract updated: mount-time script context attributes, `data-history`, explicit clear-history API, and open/close events.                                                            |
| 2026-03-08 | 2.0.0   | Complete documentation rewrite: v2 architecture with context-aware support, launcher customization, session memory, feedback signals, origin allowlist. Unified search architecture. ChatGPT conversation reviewed + validated against Answerlattice codebase. |
| 2026-03-07 | 1.0.0   | Initial implementation: embed script + iframe page + public API + feature flag                                                                                                                                                                            |
