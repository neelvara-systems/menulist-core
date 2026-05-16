# Canonica Help Widget — Implementation Blueprint

> **Version:** 2.2.1
> **Last Updated:** 2026-05-12
> **Audience:** Developers
> **Feature Flags:** `ENABLE_CANONICA_WIDGET` (core), `ENABLE_CANONICA_CONTEXT_AWARE` (context)
> **Source:** Codebase audit + ChatGPT review + industry research

---

## 1. Architecture Overview

The widget is a **distribution surface** (Layer 4). It contains no intelligence. All retrieval flows through the unified `coreSearch()` pipeline shared with the Help Center.

```
Embed Script (host app)
  ↓ creates iframe
Widget UI (canonica.app/widget/{apiKey})
  ↓ POST /api/widget/search
Widget Route (auth + rate limit + response format)
  ↓
coreSearch(mountContext: 'widget')  ← Shared pipeline
  ↓
CoreSearchResult → formatted for widget
```

---

## 2. File Structure

### v1 (Implemented)

```
src/lib/search/searchCore.ts              # Canonical search pipeline (shared)
src/lib/search/types.ts                   # Shared types (CoreSearchInput, CoreSearchResult)
src/app/api/widget/search/route.ts        # Thin auth wrapper (API key → coreSearch)
src/app/widget/[apiKey]/page.tsx           # Widget iframe page (server component)
src/app/widget/[apiKey]/WidgetClient.tsx   # Widget chat UI (client, zero deps)
src/lib/publicApi/auth.ts                 # validatePublicApiKey() (reused)
src/lib/validation/contextSchema.ts       # CanonicaContextSchema (Zod, reused)
src/config/features.ts                     # ENABLE_CANONICA_WIDGET flag
public/widget/canonica-widget.js           # Embed script (vanilla JS, ~4KB)
```

### v2 (New/Modified Files)

```
public/widget/canonica-widget.js           # Shape/display/size/offset config + context and predictive SDK API
src/app/widget/[apiKey]/WidgetClient.tsx   # Session memory, feedback, image upload, context receiver, procedure/predictive rendering
src/app/api/widget/search/route.ts        # Origin allowlist, conversation history, server-side image validation
src/app/api/widget/feedback/route.ts      # Feedback endpoint with tenant-scoped searchHistory ownership check
src/app/api/canonica/widget-key/route.ts  # Hash-only widget key generate/revoke endpoint
src/app/(canonica)/canonica/settings/page.tsx  # Thin page wrapper (dynamic import of template)
src/components/templates/canonica/CanonicaSettings.tsx  # Widget config UI (9 attributes + origin allowlist + embed code generator + live preview + setup progress)
src/types/platform/store.ts               # MODIFY: added widgetConfig + widgetAllowedOrigins fields
```

---

## 3. Component Details

### 3.1 Core Search Pipeline (`src/lib/search/searchCore.ts`)

Already implemented. 7-stage pipeline:

1. SAFE_MODE check
2. Image processing (help center only)
3. Cache lookup
4. Canonical-first retrieval (entity-enriched)
5. RAG fallback (vector search + Gemini)
6. Entity-enriched RAG context
7. Search history logging + perf metrics

Widget calls with `mountContext: 'widget'`. The `mountContext` parameter is logged for analytics and controls surface-specific behavior (e.g., widget skips session-based cache).

### 3.2 Widget API Route (`src/app/api/widget/search/route.ts`)

Thin auth wrapper. Responsibilities:

- Feature flag gate (`ENABLE_CANONICA_WIDGET`)
- API key rate limiting by hash before Firestore auth lookup
- API key authentication (`validatePublicApiKey()`), with `ml_`/`cn_` key-shape rejection before Firestore lookup
- Positive `tId/sId` workspace validation before body parsing, image handling, or retrieval
- Origin allowlist check (v2): configured origins are normalized; missing or unlisted `Origin` is rejected
- Context validation via `CanonicaContextSchema`
- Call `coreSearch()` with widget-specific params
- Format response: `craftedAnswer` → `answer`, compact references (id + title only)

### 3.3 Embed Script (`public/widget/canonica-widget.js`)

Vanilla JS loader (~4-5KB). Zero dependencies.

v1 config attributes: `data-api-key`, `data-position`, `data-accent-color`, `data-launcher-text`

v2 additions:

- `data-shape`: `rounded` (circle) or `pill` (rectangle with rounded corners)
- `data-display`: `icon`, `text`, or `icon-text`
- `data-label`: Custom text for launcher
- `data-size`: `small`, `medium`, `large`
- `data-offset-x`, `data-offset-y`: Edge offset in pixels

v2 JavaScript API (exposed on `window.CanonicaWidget`):

- `setContext(payload)` — sets/updates product context, sent with every query
- `page(payload)` — alias for `setContext(payload)` and also requests predictive help for the current page
- `open()` — programmatically open widget
- `close()` — programmatically close widget

Context is normalized and size-limited before it leaves the host page, then passed from host page → embed script → iframe via `postMessage` → WidgetClient state → API request body.

When `ENABLE_CANONICA_PREDICTIVE_SUPPORT` is enabled, `page()/setContext()` also calls `POST /api/canonica/predictive-help`. A returned suggestion is held in memory, indicated on the launcher, and delivered into the iframe as a proactive assistant message. No raw page events are stored.

Global security headers keep `frame-ancestors 'none'` for the app by default. `/widget/*` is the explicit exception: middleware omits `X-Frame-Options` and allows HTTPS/localhost frame ancestors so the embeddable iframe can render. API calls still enforce API-key auth, rate limits, and the per-store origin allowlist.

### 3.4 Widget Client (`src/app/widget/[apiKey]/WidgetClient.tsx`)

Zero-dependency React client. Inline styles only.

v1 features: welcome screen, chat bubbles, canonical badge, references, suggested questions, loading dots, error/retry, auto-scroll.

v2 additions:

- **Session memory**: In-memory array of last 5 messages. Sent as `conversationHistory` in assistant-mode queries. Cleared on widget close (no persistence).
- **Feedback UI**: Thumbs up/down on AI answers. Calls `POST /api/widget/feedback`.
- **Conversation context**: After first Q&A, subsequent questions include history for contextual follow-ups.
- **postMessage listener**: Receives context updates from host page embed script.
- **Guided workflow rendering**: Displays `procedure.steps`, prerequisites, warnings, expected results, and troubleshooting hints returned by canonical procedure answers.
- **Predictive suggestion rendering**: Displays proactive help returned by `POST /api/canonica/predictive-help`.

### 3.5 Widget Feedback Route (`src/app/api/widget/feedback/route.ts`) — NEW

Public endpoint for widget feedback submission.

```
POST /api/widget/feedback
Headers: X-API-Key: {apiKey}
Body: {
  "searchHistoryId": "...",
  "messageId": "...",
  "isGood": true/false
}
```

Implementation:

- API key auth (same as search route)
- Feature flag: `ENABLE_CANONICA_WIDGET`
- Rate limits by key hash before Firestore auth lookup
- Rejects invalid API-key workspace context before reading request body
- Verifies the `aiSearchHistory` document belongs to the same `tId/sId` resolved from the API key
- Writes feedback to the tenant-scoped `aiSearchHistory` document
- If `isGood === false`, emits Canonica signal via `emitCanonicaSignal({ type: 'chat_negative' })` (feeds mutation pipeline)
- Rate limited: prevent feedback spam

---

## 4. API Contracts

### 4.1 Search (Existing, Enhanced)

```
POST /api/widget/search
Headers: X-API-Key: {apiKey}, Origin: {hostDomain}

Request Body:
{
  "query": "Why can't I publish?",
  "context": {                          // Optional (ENABLE_CANONICA_CONTEXT_AWARE)
    "feature": "menu_editor",
    "page": "publish_page",
    "entityHints": ["menu_publish"],
    "userRole": "admin",
    "plan": "pro"
  },
  "conversationHistory": [              // Optional (v2 session memory)
    { "role": "user", "content": "How do I create a menu?" },
    { "role": "assistant", "content": "To create a menu..." }
  ]
}

Response (success):
{
  "answer": "Publishing requires valid numeric prices...",
  "canonical": true,
  "confidence": "high",
  "answerType": "explanation",
  "procedure": { "steps": [...] },
  "references": [{ "id": "art_123", "title": "Publishing Guide" }],
  "suggestedQuestions": ["How do I fix price validation?", "..."],
  "searchHistoryId": "sh_abc"          // For feedback linking
}

Errors: 401, 400, 403 (origin blocked), 404 (flag OFF), 429, 500
```

### 4.2 Feedback (New)

```
POST /api/widget/feedback
Headers: X-API-Key: {apiKey}

Request Body:
{
  "searchHistoryId": "sh_abc",
  "isGood": false
}

Response: { "success": true }
Errors: 401, 400, 404 (flag OFF or search history not owned by this workspace), 429, 500
```

---

## 5. Origin Allowlist (v2)

New optional field on store document: `widgetAllowedOrigins: string[]`

Check in widget search, widget feedback, and predictive-help routes:

1. Read `Origin` header from request
2. Normalize stored origins and request `Origin` to scheme + host + port
3. If store has `widgetAllowedOrigins` configured AND the request has no valid `Origin` or the origin is not in the list → return 403
4. If `widgetAllowedOrigins` is empty/undefined → allow all origins (backward compatible)

This prevents API key scraping abuse without breaking existing deployments.

---

## 6. Session Memory Architecture

Widget maintains conversation state in WidgetClient component memory (React state). Not persisted to Firestore.

Rules:

- Maximum 5 messages retained (last 5)
- Cleared when widget is closed (no cross-session persistence)
- Sent as `conversationHistory` in search request body
- `coreSearch()` already supports `conversationHistory` parameter (used by Help Center assistant mode)
- First query is always stateless (QnA mode)
- Subsequent queries in same session include conversation context

This is lightweight and privacy-safe. No anonymous user data stored server-side.

---

## 6.1 Image Upload Architecture (Widget-Specific)

The Help Center chat already supports image upload with a mature pipeline (ChatInput.tsx → uploadChatImage → Firebase Storage → coreSearch Stage 2). The widget reuses the same backend pipeline but with a different client-side approach.

### Why Different from Help Center

The Help Center uploads images to Firebase Storage via `uploadChatImage()` which requires an authenticated NextAuth session for tenant-scoped storage paths. The widget has no auth session — it uses API key only. Uploading to Firebase Storage would require a new authenticated upload endpoint.

### Widget Image Flow (Base64 Inline)

```
WidgetClient (user selects/pastes image)
  ↓ convert to base64 client-side (max 5MB)
  ↓
POST /api/widget/search
  Body: { query, imageBase64, imageMimeType, context }
  ↓
Widget Route
  ↓ validates base64 image payload server-side
  ↓ passes inline image buffer to coreSearch
  ↓
coreSearch({ imageBuffer })
  ↓ Stage 2: Gemini generates search query from the inline image
  ↓ Stage 7: Gemini Flash uses image as visual context for answer
  ↓
Answer returned with imageProcessed: true
```

### Key Design Decisions

- **User-initiated only** — no automatic capture, no DOM scraping. User explicitly clicks upload button or pastes from clipboard.
- **Text query required** — image is context, not the query. Same rule as Help Center (ChatInput.tsx line 59-60).
- **5MB max** — same limit as Help Center. Validated client-side before sending.
- **image/\* only** — same restriction as Help Center.
- **No temporary storage write** — widget route receives base64, validates MIME/size, and passes the inline image buffer directly to `coreSearch()`. The image is not written to Firebase Storage and requires no cleanup job.
- **Graceful degradation** — if image processing fails at any stage, coreSearch falls back to text-only search silently. User still gets an answer.
- **No image persistence in chat** — widget is stateless, images are not stored in chat sessions. They exist only for the duration of the query processing.

### Existing Infrastructure Reused

| Component                        | Source                      | Widget Usage                                                                     |
| -------------------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| `coreSearch()` Stage 2           | `searchCore.ts`             | Image security validation, inline image handling, Gemini query generation        |
| `generateSearchQueryFromImage()` | `vectorEmbeddings/index.ts` | Converts image + text prompt → keyword-rich search query                         |
| `callGeminiChat()` with image    | `vectorEmbeddings/index.ts` | Passes image as `inlineData` to Gemini Flash for visual context                  |
| Image size/type validation       | `ChatInput.tsx` pattern     | Same 5MB limit, image/\* only                                                    |

### Cost Impact

Per image query: 1 additional Gemini image-to-query call for query generation. Same AI cost class as Help Center image queries, but without the former widget temp Storage write. See firebase doc for projections.

---

## 7. Phased Build Plan

### Phase 1 — Launcher Customization (Embed Script Only)

- Update `canonica-widget.js` to support new config attributes
- Shape: `rounded` vs `pill`
- Display: `icon`, `text`, `icon-text`
- Size: `small`, `medium`, `large`
- Offset: `data-offset-x`, `data-offset-y`
- Mobile: auto-override to bottom-right, larger touch targets
- Zero backend changes. Zero React changes.

### Phase 2 — Context SDK + Origin Allowlist

- Add `window.CanonicaWidget.setContext()` to embed script
- Pass context from host page → iframe via `postMessage`
- WidgetClient receives context updates, stores in state
- Widget search route adds origin allowlist check
- Widget search route passes context to `coreSearch()` (already wired, just needs `conversationHistory` pass-through)
- Add `widgetAllowedOrigins` field to store document

### Phase 3 — Session Memory + Conversation Context + Image Upload

- WidgetClient maintains in-memory message history (max 5)
- After first Q&A, subsequent queries include `conversationHistory`
- Widget search route passes conversation history to `coreSearch()`
- `coreSearch()` already handles conversation context (assistant mode)
- Add image upload button to WidgetClient input area (file picker + paste support)
- Image converted to base64 client-side, sent inline in request body as `imageBase64` + `imageMimeType`
- Widget search route validates base64 and passes the inline image buffer directly to coreSearch (see §6.1)
- `coreSearch()` already handles image processing in Stage 2 (Gemini Pro query generation + Gemini Flash answer context)

### Phase 4 — Feedback Signals

- Add thumbs up/down UI to WidgetClient (after each AI answer)
- Create `POST /api/widget/feedback` route
- Feedback writes to `aiSearchHistory` + emits Canonica signal
- Signal feeds mutation pipeline (ENABLE_CANONICA_SIGNAL_MUTATION)

---

## 8. What Widget Gets For Free (via coreSearch)

| Capability                    | Status                                      |
| ----------------------------- | ------------------------------------------- |
| SAFE_MODE protection          | Automatic                                   |
| Entity-enriched RAG (E6)      | Automatic                                   |
| Search history logging        | Automatic                                   |
| Performance metrics           | Automatic                                   |
| Canonical-first retrieval     | Automatic                                   |
| Canonical miss logging        | Automatic                                   |
| Context-aware entity boosting | Automatic (when context provided + flag ON) |

---

## 9. Performance Targets

| Metric                   | Target                                    |
| ------------------------ | ----------------------------------------- |
| Embed script load        | < 500ms (~4-5KB, CDN)                     |
| Iframe lazy load         | Only on launcher click                    |
| Context extraction       | < 10ms (SDK provides structured data)     |
| Canonical answer latency | < 1s                                      |
| RAG answer latency       | < 3s                                      |
| Widget UI render         | Zero external dependencies, inline styles |

---

## 10. Feature Flag Dependencies

| Flag                                | Required For                                              |
| ----------------------------------- | --------------------------------------------------------- |
| `ENABLE_CANONICA_WIDGET`            | Widget route, embed script functionality                  |
| `ENABLE_CANONICA_CONTEXT_AWARE`     | Context payload processing in coreSearch                  |
| `ENABLE_CANONICA_CANONICAL_ANSWERS` | Canonical-first retrieval (widget benefits automatically) |
| `ENABLE_CANONICA_SIGNAL_MUTATION`   | Feedback signal → mutation pipeline (Phase 4)             |
| `ENABLE_CANONICA_GUIDED_WORKFLOWS`  | Procedure-type answers in widget responses                |

---

## Version History

| Date       | Version | Change                                                                                                                                                                                                                                                            |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-12 | 2.2.1   | Public endpoint cost/security hardening: malformed key short-circuit before Firestore lookup, hash-based rate-limit keys before auth lookup, positive workspace validation, and tenant-filtered vector-search/index documentation. |
| 2026-05-12 | 2.2.0   | Runtime contract hardening: hash-only widget keys, Canonica-specific key endpoint, tenant-scoped search history feedback, server-side widget image validation, guided workflow rendering, predictive suggestion delivery, and tenant-scoped KB category docs. |
| 2026-03-09 | 2.1.0   | Settings page refactored: 520-line inline page → thin wrapper + CanonicaSettings template. Feature Status card removed (exposed internal flags). Sidebar now filters nav by feature flags. Governance useMemo deps fixed. Setup progress guide added to settings. |
| 2026-03-08 | 2.0.0   | Complete rewrite: phased build plan, launcher customization, SDK context API, session memory, feedback signals, origin allowlist, conversation context. ChatGPT conversation reviewed + validated.                                                                |
| 2026-03-07 | 1.0.0   | Initial implementation                                                                                                                                                                                                                                            |
