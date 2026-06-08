# Owner Business Assistant Spec

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Implemented behind feature flags
**Last Updated:** June 8, 2026

---

## 1. Product Decision

Business Health is approved for MenuList as a cost-controlled owner operating surface.

It is not approved as a generic chatbot. The feature exists to answer owner questions from MenuList facts that were already computed or compacted by existing infrastructure. The owner should first see the state of the business, then ask for clarification when needed.

This is a complete long-term architecture decision, not a roadmap split. Runtime flags control availability, cost exposure, and emergency shutdown; they do not represent open-ended delivery buckets.

Approved owner-facing promise:

> MenuList checks the latest business state and shows what needs attention.

Rejected owner-facing promise:

> Ask an assistant anything and it will grow the business.

## 2. Product Fit

Business Health fits MenuList because it:

- Reduces owner effort instead of adding another dashboard.
- Reuses existing menu, analytics, public presence, feedback, health, and scheduler signals.
- Presents stable states as "No action needed".
- Surfaces only decision-worthy checks.
- Keeps Firebase reads predictable by using summary documents and cache-first context packets.
- Keeps public business truth protected behind explicit owner confirmation.

It must not:

- Create a novelty chat experience.
- Encourage long conversations.
- Use "AI", "Smart", "Dynamic", "growth assistant", or similar language in owner-facing UI.
- Claim sales, revenue, profit, ranking, or growth outcomes without exact source data.
- Pass raw Firebase collection data directly to the AI model.
- Mutate public menu/store truth from a chat response.

## 3. Audiences

| Audience | Need | Contract |
| --- | --- | --- |
| Single-store owner | Know if anything needs attention today | Business Health card, 1-3 checks, suggested questions |
| Multi-location owner | Know which outlet needs attention | Store/outlet selector and compact location comparison |
| Manager | View and prepare allowed store-level work | Role-filtered actions; no publish by default |
| Staff | Limited assigned checks | No public writes unless existing permissions allow it |
| Reseller/internal | Support/setup visibility | Support path only; no owner write unless delegated |

## 4. Owner-Facing Surface

Primary label: `Business Health`

Acceptable internal labels:

- Owner Business Assistant
- owner-business-assistant
- ownerBusinessAssistant

Do not show these labels to owners:

- AI Chat
- AI Assistant
- Chatbot
- Smart Insights
- Growth Assistant
- Ask me anything

## 5. Core User Stories

1. As an owner, I can open the dashboard and see whether MenuList found anything important.
2. As an owner, I can ask which item received more customer attention.
3. As an owner, I can ask what changed this week.
4. As an owner, I can ask if the public menu has an issue.
5. As an owner, I can see today's, this week's, last week's, this month's, and last month's analytics without opening a raw analytics table.
6. As an owner, I can open the correct screen from a check without hunting through the app.
7. As an owner/admin, I can prepare a draft change and confirm it before anything changes.
8. As a manager, I can see only assigned stores/actions.
9. As a mobile owner, I can use the same feature inside the PWA shell.
10. As an owner, I can ask about public links, hours, QR/share, screens, feedback, domain, locations, billing status, or POS status and get either a grounded answer or a clear unsupported response.

## 6. Supported Question Types

The permanent contract supports approved question intents. Free text can map to these intents; unsupported questions are refused calmly.

| Intent | Required facts | Allowed response |
| --- | --- | --- |
| `business_status` | Current health, public status, scheduler freshness | Stable/watch/needs review plus reason |
| `item_attention` | Settled analytics summary and menu item labels | Top or rising item by attention |
| `analytics_period_summary` | Analytics period index | Stats for today, yesterday, this week, last week, this month, last month, last 7 days, last 30 days, or overall |
| `analytics_period_compare` | Analytics period index with comparable periods | Plain comparison when both periods are available |
| `item_needs_checking` | Low attention, issue flags, feedback, recent changes | One item/check with safe reason |
| `weekly_changes` | Menu change log summary, public update summary | Brief list of changed items/settings |
| `public_menu_status` | Public menu health, publish state, cache status where available | No action needed or open relevant screen |
| `customer_interest` | Top category/item/click/view summaries | What customers checked most |
| `feedback_pattern` | Guest feedback/reviewsState summaries | Repeated feedback pattern only |
| `next_action` | Prioritized checks | 1-3 actions, highest priority first |
| `outlet_attention` | Store-level compact health states | Outlet needing attention and why |
| `account_status` | Subscription/access summary | Plain account state, no billing speculation |
| `store_profile_status` | Cached store profile/public projection | Current owner-visible name, address, phone, hours, public links |
| `share_asset_status` | QR/share/customer app/screen projection | Link/status/open related screen |
| `integration_status` | POS/domain/integration compact status | Plain health/status and open setup screen |
| `permission_status` | Session and compact role summary | Explain allowed action or open users/roles |
| `review_reply_prepare` | Owner-provided review text or compact review fact | Draft reply only; no public posting |

Unsupported:

- Sales/profit/revenue unless POS or verified payment data is available and explicitly sourced.
- Competitor claims.
- Predictions.
- Arbitrary custom date ranges unless those periods already exist in the analytics index.
- External web, weather, events, competitor, or neighborhood intelligence unless a MenuList-owned cached connector summary exists.
- Medical/legal/financial advice.
- Raw internal logs, collection names, secrets, tokens, prompts, or system internals.

## 7. Status Model

| Status | Owner Label | Meaning |
| --- | --- | --- |
| `stable` | Stable | Latest check found no important issue. |
| `watch` | May need checking | One or more low-risk signals need owner attention. |
| `needs_review` | Needs review | A real owner-visible issue or confirmation is needed. |
| `insufficient_data` | Not enough data | MenuList cannot answer yet without guessing. |
| `stale` | Latest check delayed | The last generated check is too old. |
| `not_ready` | Not ready yet | No current check exists for this store. |

Preferred stable copy:

> Everything is running normally.
> No action needed.

## 8. Data Contract

Business Health must read from compact facts, not raw source collections.

Primary read model:

```text
platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}
platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}
platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}
```

Why `platformSummary`:

- Existing repo pattern for compact read models.
- Avoids new client-readable collections.
- Avoids new indexes for the hot path.
- Keeps scheduler/API reads predictable.
- Matches docs in `__docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md`.

Protected APIs read these docs with Admin SDK and return tenant/role-filtered owner-safe payloads. Direct client reads are not part of the contract because `firestore.rules:137-170` restricts `platformSummary`.

`ownerBusinessHealthCurrent` powers the dashboard card, health status, priority checks, and small analytics teasers.

`ownerBusinessAnalyticsIndex` powers owner analytics questions and compact dashboard analytics modules. It stores store-aggregate standard period packets plus bounded selected-project period packets:

- Today, marked partial.
- Yesterday.
- This week / week-to-date.
- Last week.
- This month / month-to-date.
- Last month.
- Last 7 days.
- Last 30 days.
- Overall.

For stores with multiple active projects, store-level analytics answers aggregate indexed projects and selected-project answers use `projectSummaries[projectId]`. The scheduler caps indexed projects at 10 active projects, default project first, and records overflow. If an owner selects a project that is not in the index, the answer is not-enough-data for that selected menu rather than a misleading store aggregate.

The answer API must use a cache-first context packet. On cache hit, a question should require zero Firestore reads. In the current implementation, a cache miss may read compact docs only: one current health doc and one analytics index doc. Already-indexed today overlay facts are read from the analytics index. It must not aggregate N daily docs during a message.

Context packet:

```text
OwnerBusinessAssistantContextPacket
  = health current facts
  + analytics period facts
  + public project/store projection facts when already present
  + compact non-analytics business facts when already present
  + client/page target context
  + already-indexed today overlay facts
  + allowed action catalog
  + source/freshness metadata
  + answer rules
```

The AI model receives the context packet, not raw Firestore data.

Read-only questions outside analytics follow the same rule. Public project/menu/store facts should come from cached projections that reuse existing public cache invalidation contracts. Feedback, reviews, POS, screens, recent changes, operations, billing, and permissions are answerable only when the packet contains a compact owner-safe summary. If the packet does not contain a source fact, the assistant must say the data is not available instead of reading a live collection.

First-run/not-ready owner experience:

- Do not show "No action needed".
- Do not show an active Ask input or suggested questions.
- Show calm navigation shortcuts to existing Dashboard, Menu, Share, and Settings surfaces.
- Show freshness copy that explains Business Health is not realtime and the first source-backed check will provide the data date.

Multi-location owner experience:

- Show compact location status only for multi-store tenants.
- Use `platformSummary/ownerBusinessHealthMultiLocation_{tId}` and mapped store access filtering.
- Do not load every store's detailed Business Health packet on first render.

Answer rendering supports text, metric rows, compact tables, trend series, and action options. These artifacts must come from packet facts only. Business Health does not export raw rows or create custom reports unless the report data already exists in a compact cached source and the export is registered.

Client/page context can help resolve words such as "this item" or "this menu", but it is advisory. The server must verify every target again from the owner session and packet facts. Ambiguous targets require a disambiguation response instead of a broad Firestore search.

Shared server cache must store the reusable business-facts packet only. Store-level packets use `p:_`; selected-project packets use `p:{projectId}` because analytics periods and teasers differ. Page item/screen context is attached per request after cache lookup and must not be part of the shared packet cache value or cache key.

## 9. Snapshot Sources

Allowed sources are settled or compacted summaries:

- `platformSummary/storesSummary`
- `platformSummary/projects_{sId}`
- Existing dashboard summaries in `analytics`
- Current-day analytics docs for indexed active projects only, folded into the scheduler-built index
- Existing weekly/monthly/overall analytics docs
- `menuIntelligence`
- Existing `store.health`
- `systemAlerts` summaries or capped current issue state
- `guestFeedback` summaries, not raw scans
- `reviewsState` summaries, not raw review scans
- `menuChangeLog` summaries or capped recent changes
- `ownerControlUsage` aggregate if extended safely
- POS summaries only when POS sync data exists

Disallowed in chat-time answer generation:

- Querying raw analytics ranges per message.
- Aggregating daily docs per message.
- Scanning all menu items per message.
- Reading full project or store documents just because the owner asked a read-only question.
- Loading raw review/feedback collections per message.
- Loading scheduler logs per message except platform/admin diagnostics.
- Reading public client routes for answer generation.

Detailed ownership and reuse decisions are in [owner-business-assistant_architecture.md](./owner-business-assistant_architecture.md).

## 10. Action Model

Business Health can perform five classes of action through a registry. Natural language may map to these actions, but only registered actions can prepare or mutate anything.

| Level | Action | Mutation | Confirmation |
| --- | --- | --- | --- |
| 1 | Navigate | None | No |
| 2 | Prepare draft | Assistant/action draft only | No public mutation |
| 3 | Confirm write | Existing domain service write | Yes |
| 4 | Public-truth publish/update | Existing publish/cache path | Yes, high-friction |
| 5 | Review/dismiss/assign check | Check workflow state | Yes if stateful |

Default implementation posture:

- Navigate, compact draft preparation, cancel/review/dismiss, and publish-guard behavior are defined in the contract.
- Confirmed public-truth writes are not exposed directly unless a registered adapter uses the existing MenuList save, validation, audit, and cache-invalidation path.
- Public-truth publish requests route to the existing publish/editor screen unless a verified adapter exists.
- Flags are runtime controls, not out-of-contract promises.

Implemented action examples:

| Owner request | Required behavior |
| --- | --- |
| "Open this item" | Open the existing project editor path |
| "Rewrite this item description" | Refuse/route to the existing editor until provider-text draft generation and billing accounting are enabled |
| "Make this live" | Navigate to the existing publish/editor screen |
| "Change my logo/cover" | Use existing business settings/media path or server-safe equivalent |
| "Mark us closed today" | Store a compact temporary-status draft and keep the existing temp-status path as the public save path |
| "Show my QR code / screen link / app link" | Open existing share, digital screen, or Customer App surface |
| "Check my domain / POS / credits / users" | Open the existing settings/billing/users/integrations surface; no direct risky mutation |
| "Reply to this review" | Refuse/route to feedback until provider-text draft generation and billing accounting are enabled; no public posting |

The action system must store drafts/audits separately from analytics. Analytics stays in `platformSummary`; action workflow docs are only for prepare/confirm/cancel/review behavior.

## 11. Public Truth Rules

If an action touches public menu, store, OBP, PWA, screen, outlet, or publish state:

1. Revalidate session, tenant, role, and target on the server.
2. Use the existing DAL/domain service.
3. Do not write target documents directly from assistant code.
4. Invalidate existing public cache tags.
5. Return a clear action result to the owner.
6. Log enough metadata for support debugging without sensitive payloads.

Relevant cache paths:

- `src/lib/cache/publicClientCache.ts:19-80`
- `src/lib/actions/revalidateMenuCache.ts:20-24`
- `src/app/api/revalidate/menu/route.ts:31-78`

## 12. Security Requirements

All APIs must:

- Use `withAuth()`.
- Verify tenant and store access.
- Validate inputs with Zod.
- Apply rate limits before expensive operations.
- Use generic errors for permission and unsupported cases.
- Avoid sensitive logs.
- Use server-side target resolution.
- Never trust client-supplied `tId`, `sId`, `projectId`, `itemId`, `outletId`, `actionId`, or `draftId`.

If a provider call is used:

- Check SAFE_MODE.
- Use `AI_OPERATION` rate limiting or a stricter feature-specific limit.
- Complete AI operation accounting after successful provider output.
- Return `remainingBalance` so the frontend can sync without an extra read.
- Require structured JSON output and validate source fact IDs, action IDs, permission scope, and public-truth guard before rendering.

## 13. Firebase Cost Requirements

Non-negotiables:

- Dashboard card: browser/server cache hit is 0 Firestore reads; cache miss is 1 current summary read through protected API.
- Dashboard analytics strip: cache hit is 0 Firestore reads; cache miss is 1 analytics-index read.
- Business Health page: cache hit is 0 Firestore reads; cache miss is 1 current summary read, 1 analytics-index read when analytics is visible, flag-gated cached thread read only under the thread flag.
- Suggested/typed question answer: context-packet cache hit is 0 Firestore reads; cache miss reads current summary and analytics index only in the current implementation. Other domains require compact facts in the packet and must refuse when missing.
- Analytics question answer: context-packet cache hit is 0 Firestore reads; cache miss is 1 analytics-index read; no period range aggregation.
- Free-text answer: no raw source collection aggregation.
- AI answer input: context packet only, never raw Firebase collections.
- Owner chat history: optional bounded thread/message writes only under `ENABLE_OWNER_BUSINESS_HEALTH_THREADS`.
- Internal answer-event logging: optional compact platform observation write only under `ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING`; deterministic answers must record zero units and zero owner charge.
- Scheduler: reuse existing store-local nightly path and compact sources.
- Cleanup: use `menulistMaintenanceScheduler`, not a new standalone scheduled function.

Cost target:

Business Health must remain lower cost than adding a normal analytics dashboard tab. Its hot path is cache-first packet lookup; Firestore reads happen only on cache miss, stale packet, or verified action target reload.

## 14. Mobile Requirements

Business Health is owner-facing and must have mobile support.

Mobile contract:

- Opens inside `MobileShell`.
- Uses existing mobile providers.
- Uses a full mobile screen and bottom sheets.
- Does not use desktop route reloads from mobile tabs.
- Keeps touch targets at least 44px.
- Shows source/freshness text visibly.
- Shows the owner-facing data coverage note so owners do not mistake settled Business Health data for realtime analytics.
- Uses short owner-safe copy.

## 15. Website and Help Decision

Public website:

- No immediate public website update is required for planning.
- After implementation and QA, website copy may mention Business Health as an owner dashboard capability.
- Public website must not present this as "AI chat" or a growth/revenue tool.

Help doc:

- Publish only after the route, card, mobile surface, and screenshots exist.
- Use "Business Health" and "latest MenuList check".
- Do not expose collection names, model/provider names, or internal scoring logic.

## 16. Acceptance Criteria

The feature is implementation-ready when:

1. Docs, flags, API contract, scheduler contract, mobile contract, cost model, and test cases agree.
2. Every ChatGPT suggestion has an accept/reject/modify decision in `_archive/chatgpt-review.md`.
3. Cost hot path is summary-first.
4. Answer API is context-packet cache-first, with zero Firestore reads on cache hit.
5. AI answers typed owner questions only from the context packet and returns server-validated structured output.
6. Standard analytics periods are served from `ownerBusinessAnalyticsIndex`, not message-time range scans.
7. Public truth writes cannot bypass domain services or cache invalidation.
8. Action Support is registry-driven with drafts, confirmation, permissions, and audit.
9. Mobile is part of the implementation contract.
10. Owner-facing language follows constitution and language governance.
