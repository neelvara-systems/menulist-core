# Answerlattice Help Widget — Product Specification

> **Version:** 2.0.0
> **Last Updated:** 2026-03-08
> **Audience:** CEO / PM / Clients
> **Feature Flags:** `ENABLE_ANSWERLATTICE_WIDGET`, `ENABLE_ANSWERLATTICE_CONTEXT_AWARE`
> **Source:** ChatGPT conversation review + Answerlattice codebase audit + industry research

---

## 1. Purpose

Allow SaaS founders (Answerlattice's ICP) to embed a context-aware help widget inside their product with a single script tag. End-users get instant, page-aware answers from the SaaS product's knowledge base without leaving the app.

Industry context: 91% of users prefer in-app self-service. Every competitor (Intercom, Zendesk, Freshdesk, Document360, Help Scout) ships an embeddable widget. This is an adoption requirement. Answerlattice's differentiator is context-aware canonical retrieval — the widget knows where the user is and returns verified answers, not generic LLM guesses.

---

## 2. Strategic Role

The widget is Answerlattice's primary distribution channel. It is not just a feature — it is how end-users interact with the knowledge system.

Every SaaS product embedding the widget becomes an Answerlattice node. More widgets means more queries, more signals, better canonicals, stronger engine. This is the knowledge flywheel.

The widget also enables future distribution surfaces (Slack bot, CLI, browser extension, API agents) because they all call the same `coreSearch()` pipeline. The canonical engine stays centralized.

---

## 3. User Stories

### SaaS Founder (Answerlattice Customer)

- US-F1: Add Answerlattice help to my product with a single script tag (under 5 minutes)
- US-F2: Customize the widget launcher position, shape, color, and label
- US-F3: My end-users get answers from MY knowledge base only (tenant isolation)
- US-F4: Pass product context (page, feature, entity) so answers are page-aware
- US-F5: Restrict which domains can embed my widget (origin allowlist)
- US-F6: See which questions my users ask most (via existing Answerlattice analytics)

### End-User (SaaS Founder's Customer)

- US-E1: Click a help button and ask questions without leaving the app
- US-E2: See verified answers (canonical badge) vs AI-generated answers
- US-E3: Get suggested follow-up questions after an answer
- US-E4: Ask follow-up questions with conversation context maintained
- US-E5: Rate answers as helpful or not helpful
- US-E6: Click a reference to see the source article
- US-E7: Attach a screenshot of an error or confusing UI to get a more precise answer

---

## 4. Embed Flow

```
Step 1: SaaS founder generates API key in Answerlattice dashboard
Step 2: Founder adds <script> tag to their app's HTML
Step 3: Script loads → launcher button appears (configurable position/shape)
Step 4: End-user clicks launcher → iframe popup opens (lazy loaded)
Step 5: End-user types question → widget sends query + context to Answerlattice API
Step 6: Answer displayed with canonical badge + references + follow-up suggestions
Step 7: User explicitly selects Solved or Still need help -> stores outcome; unresolved feedback feeds the signal pipeline
Step 8: User can ask follow-up → conversation context maintained in session
```

---

## 5. Widget Configuration Options

### Script Attributes

| Attribute           | Required | Default        | Description                                            |
| ------------------- | -------- | -------------- | ------------------------------------------------------ |
| `data-api-key`      | Yes      | —              | Store's public API key                                 |
| `data-position`     | No       | `bottom-right` | `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `data-accent-color` | No       | `#6366f1`      | Hex color for launcher and header                      |
| `data-shape`        | No       | `rounded`      | `rounded` (circle) or `pill` (rectangle)               |
| `data-display`      | No       | `icon`         | `icon`, `text`, or `icon-text`                         |
| `data-label`        | No       | `?`            | Text for launcher (when display includes text)         |
| `data-size`         | No       | `medium`       | `small`, `medium`, `large`                             |
| `data-offset-x`     | No       | `20`           | Horizontal offset from edge (px)                       |
| `data-offset-y`     | No       | `20`           | Vertical offset from edge (px)                         |
| `data-history`      | No       | `session`      | `session` keeps in-memory page history until reload/clear. `forget` clears on close. |
| `data-blocked-routes` | No     | —              | Comma-separated route patterns where the widget must not appear, for example `/help-center,/help-center/*` |
| `data-feature`      | No       | —              | Optional mount-time product feature context            |
| `data-page`         | No       | —              | Optional mount-time page context                       |
| `data-workflow`     | No       | —              | Optional mount-time workflow context                   |
| `data-entity-hints` | No       | —              | Optional comma-separated entity hints                  |
| `data-user-role`    | No       | —              | Optional sanitized role label, not a permission check  |
| `data-plan`         | No       | —              | Optional sanitized plan label                          |

### Browser Context (Optional, via JavaScript API)

```javascript
// Set initial context
window.AnswerlatticeWidget.setContext({
  path: "/settings/integrations/stripe",
  title: "Stripe integration",
  feature: "integrations",
  workflow: "connect_stripe",
  role: "admin",
  locale: "en",
});

// Update context on navigation
window.AnswerlatticeWidget.setContext({
  path: "/settings/webhooks",
  title: "Webhook settings",
  workflow: "configure_webhook",
});

// Clear stale context/history when the host app changes scope
window.AnswerlatticeWidget.setContext(null);
window.AnswerlatticeWidget.clearHistory();
```

Context is sent with every query. System degrades gracefully without it.

Supported runtime methods: `setContext()`, `page()`, `open()`, `close()`, `clearHistory()`, `reset()`, `getContext()`, `on(event, callback)`, and `off(event, callback)`.

---

## 6. Widget UI Components

### Launcher Button

- Configurable shape: circle (56x56px) or pill (auto-width, 40px height)
- Configurable display: icon only, text only, or icon + text
- Fixed position with configurable offset (default: 20px from edge)
- Shows configured label by default, changes to close icon when open
- Hover animation (scale + shadow)
- z-index: 2147483646

### Widget Popup

- Fixed position popup (380x560px, max-height: calc(100vh - 120px))
- Opens above launcher button
- Smooth open/close animation (opacity + translateY + scale)
- z-index: 2147483647

### Widget Content (inside iframe)

- Header: Accent-colored bar with "Help" title, close button, and icon-only "start new chat" button only after a session has messages
- Welcome screen: "How can we help?" + description, optional page-context chip, and starter questions
- Chat interface: User messages (right, accent) + AI answers (left, gray)
- Canonical badge: "Verified answer" (green) when answer is canonical
- References: Article title tags below answers (clickable for deep link)
- Suggested questions: Clickable follow-up buttons
- Feedback: Thumbs up/down on AI answers
- Input: Rounded text input with send button
- Footer: "Powered by Answerlattice" with link

### History Behavior

- Default `data-history="session"` keeps the current page conversation in iframe memory so follow-up questions can use the last 5 messages.
- The history is not persisted to Firestore, localStorage, cookies, or Answerlattice account records.
- Closing the widget preserves the in-memory page session by default. Reloading the host page, changing iframe lifetime, or calling `AnswerlatticeWidget.clearHistory()` resets it.
- `data-history="forget"` clears the conversation on close for hosts that want privacy-first behavior over follow-up continuity.
- The empty/new chat screen does not show a start-new-chat action because there is no active history to clear.

### Mobile Behavior

- Launcher always bottom-right (position config ignored on mobile)
- Panel becomes near-full-screen (95vw x 90vh)
- Touch-optimized input and buttons (44px min touch targets)
- Route blocklist still applies on mobile; blocked routes hide the launcher and prevent programmatic open.

---

## 7. Security Model

| Concern            | Solution                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Authentication     | API key in `X-API-Key` header (per-store, same as Platform Pull API)                                   |
| Tenant isolation   | API key resolves to specific store → only that store's KB is searched                                  |
| Origin allowlist   | Per-tenant `widgetAllowedOrigins` array. If configured, widget rejects requests from unlisted domains. |
| Cross-origin       | iframe isolation — widget runs in Answerlattice's origin, not the host app                                  |
| Rate limiting      | Per-API-key rate limiting (AI_OPERATION config)                                                        |
| Data exposure      | Only published KB articles returned, no internal data                                                  |
| XSS prevention     | iframe sandboxing, no direct DOM access to host app                                                    |
| Context validation | All context fields validated via Zod schema, sanitized, size-limited                                   |
| No PII in context  | Context schema rejects email/phone patterns, caps field lengths                                        |

---

## 8. Success Metrics

| Metric                           | Target                                 |
| -------------------------------- | -------------------------------------- |
| Widget script load time          | < 500ms (~4KB script, lazy iframe)     |
| First answer latency (canonical) | < 1s                                   |
| First answer latency (RAG)       | < 3s                                   |
| Canonical hit rate with context  | 15-25% higher than without context     |
| Widget adoption                  | 1+ SaaS founder embedding within beta  |
| Explicit outcome coverage        | Percentage of answers with a Solved or Still need help response |

---

## 9. Permanent Non-Goals

Aligned with Answerlattice Non-Goals Charter (doctrine/02):

- No live chat / agent handoff — Answerlattice is not a helpdesk
- No ticket creation from widget — distribution surface, not operational layer
- No generic marketing popups, tooltips, or onboarding tours — predictive help is allowed only when deterministic, feature-flagged, page-context gated, cooldown-protected, and backed by approved Answerlattice support knowledge
- No DOM scraping / automatic context extraction — host products pass context through the v1 browser contract
- No automatic screenshot capture / DOM scraping — user-initiated image upload only
- No full CSS customization / themes — controlled customization only
- No widget analytics dashboard — Answerlattice is not a BI platform
- No arbitrary coordinate placement — constrained to 4 safe zones

---

## 10. ChatGPT Conversation Review

| ChatGPT Suggestion                     | Verdict                    | Answerlattice Decision                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Widget as Layer 4 distribution surface | ACCEPTED                   | Correct framing. Widget has no intelligence.                                                                                                                                                                                                                                                                                                         |
| iframe isolation                       | ACCEPTED                   | Already implemented. Industry standard.                                                                                                                                                                                                                                                                                                              |
| API key for tenant identity            | ACCEPTED                   | Already implemented. Correct for anonymous end-users.                                                                                                                                                                                                                                                                                                |
| Origin allowlist                       | ACCEPTED                   | Added to v2. Per-tenant `widgetAllowedOrigins` field.                                                                                                                                                                                                                                                                                                |
| Query telemetry collection             | ALREADY EXISTS             | `coreSearch()` already writes to `aiSearchHistory`. Widget queries automatically logged via unified pipeline.                                                                                                                                                                                                                                        |
| Conversation context / session memory  | ACCEPTED                   | v2 adds in-memory session (last 5 messages), assistant mode.                                                                                                                                                                                                                                                                                         |
| Reference deep linking                 | ACCEPTED                   | v2 returns article ID. Deep linking to section is future scope.                                                                                                                                                                                                                                                                                      |
| Explicit resolution feedback           | ACCEPTED                   | Widget stores Solved/Still need help on the existing search record; unresolved outcomes feed the signal mutation pipeline.                                                                                                                                                                                                                                |
| Automatic DOM context extraction       | REJECTED                   | Too fragile, privacy risk, breaks across SPA frameworks. Explicit browser-contract context is more reliable and matches ICP (developers).                                                                                                                                                                                                             |
| Screenshot processing via vision model | PARTIALLY ACCEPTED         | ChatGPT proposed automatic DOM capture + vision interpretation (REJECTED — too complex, privacy risk). BUT user-initiated image upload ACCEPTED — `coreSearch()` supports bounded visual context extraction and text-only answer context. Zero new backend work. Widget sends base64 inline (no Firebase Storage needed). |
| Product Entity Registry                | ALREADY EXISTS             | Answerlattice ontology layer (entities.ts, entityCandidates.ts, entity search index). ChatGPT unaware of existing implementation.                                                                                                                                                                                                                         |
| Product Knowledge Graph                | ALREADY EXISTS (partially) | Entity relations, canonical answer binding, entity-enriched RAG. ChatGPT described generic version of what Answerlattice already has.                                                                                                                                                                                                                     |
| Signal → Canonical Mutation Engine     | ALREADY EXISTS             | signalEvents.ts, signalMutation.ts, mutationProposals.ts. Feature-flagged (ENABLE_ANSWERLATTICE_SIGNAL_MUTATION).                                                                                                                                                                                                                                         |
| Query Interpretation Engine            | PARTIALLY EXISTS           | Intent classification + entity extraction exist in canonicalRetrieval.ts. Context-aware boosting is the v2 addition.                                                                                                                                                                                                                                 |
| Performance & cost control             | ALREADY EXISTS             | SAFE_MODE, rate limiting, embedding cache, canonical-first retrieval, per-tenant isolation.                                                                                                                                                                                                                                                          |
| Launcher shape/display customization   | ACCEPTED                   | Added to v2. Bounded customization: shape, display, size, offset.                                                                                                                                                                                                                                                                                    |
| Multi-environment API keys             | DEFERRED                   | Good idea but not v2. SaaS founders can use separate stores for staging.                                                                                                                                                                                                                                                                             |

---

## Version History

| Date       | Version | Change                                                                                                                                                     |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-20 | 2.4.2   | Added route blocklist support for pages where client products must hide the widget. |
| 2026-05-18 | 2.3.0   | Added current runtime contract for mount-time context attributes, explicit transient history behavior, clear-history API, and widget empty-state behavior. |
| 2026-03-08 | 2.0.0   | Complete rewrite: context-aware support, launcher customization, session memory, feedback signals, origin allowlist, browser context API, ChatGPT review table |
| 2026-03-07 | 1.0.0   | Initial spec                                                                                                                                               |
