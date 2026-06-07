# Owner Business Assistant Spec

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Planning complete, implementation not started
**Last Updated:** June 7, 2026

---

## 1. Product Decision

Business Health is approved for MenuList as a cost-controlled owner operating surface.

It is not approved as a generic chatbot. The feature exists to answer owner questions from MenuList facts that were already computed or compacted by existing infrastructure. The owner should first see the state of the business, then ask for clarification when needed.

This is a complete long-term architecture decision, not a phase plan. Runtime flags control availability, cost exposure, and emergency shutdown; they do not represent open-ended product stages.

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
- Keeps Firebase reads predictable by using summary documents.
- Keeps public business truth protected behind explicit owner confirmation.

It must not:

- Create a novelty chat experience.
- Encourage long conversations.
- Use "AI", "Smart", "Dynamic", "growth assistant", or similar language in owner-facing UI.
- Claim sales, revenue, profit, ranking, or growth outcomes without exact source data.
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
5. As an owner, I can open the correct screen from a check without hunting through the app.
6. As an owner/admin, I can prepare a draft change and confirm it before anything changes.
7. As a manager, I can see only assigned stores/actions.
8. As a mobile owner, I can use the same feature inside the PWA shell.

## 6. Supported Question Types

The permanent contract supports approved question intents. Free text can map to these intents; unsupported questions are refused calmly.

| Intent | Required facts | Allowed response |
| --- | --- | --- |
| `business_status` | Current health, public status, scheduler freshness | Stable/watch/needs review plus reason |
| `item_attention` | Settled analytics summary and menu item labels | Top or rising item by attention |
| `item_needs_checking` | Low attention, issue flags, feedback, recent changes | One item/check with safe reason |
| `weekly_changes` | Menu change log summary, public update summary | Brief list of changed items/settings |
| `public_menu_status` | Public menu health, publish state, cache status where available | No action needed or open relevant screen |
| `customer_interest` | Top category/item/click/view summaries | What customers checked most |
| `feedback_pattern` | Guest feedback/reviewsState summaries | Repeated feedback pattern only |
| `next_action` | Prioritized checks | 1-3 actions, highest priority first |
| `outlet_attention` | Store-level compact health states | Outlet needing attention and why |
| `account_status` | Subscription/access summary | Plain account state, no billing speculation |

Unsupported:

- Sales/profit/revenue unless POS or verified payment data is available and explicitly sourced.
- Competitor claims.
- Predictions.
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
platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}
```

Why `platformSummary`:

- Existing repo pattern for compact read models.
- Avoids new client-readable collections.
- Avoids new indexes for the hot path.
- Keeps scheduler/API reads predictable.
- Matches docs in `__docs__/patterns/SUMMARY-DOCUMENT-PATTERN.md`.

Protected APIs read these docs with Admin SDK and return tenant/role-filtered owner-safe payloads. Direct client reads are not part of the contract because `firestore.rules:137-170` restricts `platformSummary`.

## 9. Snapshot Sources

Allowed sources are settled or compacted summaries:

- `platformSummary/storesSummary`
- `platformSummary/projects_{sId}`
- Existing dashboard summaries in `analytics`
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
- Scanning all menu items per message.
- Loading raw review/feedback collections per message.
- Loading scheduler logs per message except platform/admin diagnostics.
- Reading public client routes for answer generation.

Detailed ownership and reuse decisions are in [owner-business-assistant_architecture.md](./owner-business-assistant_architecture.md).

## 10. Action Model

Business Health can perform five classes of action.

| Level | Action | Mutation | Confirmation |
| --- | --- | --- | --- |
| 1 | Navigate | None | No |
| 2 | Prepare draft | Assistant/action draft only | No public mutation |
| 3 | Confirm write | Existing domain service write | Yes |
| 4 | Public-truth publish/update | Existing publish/cache path | Yes, high-friction |
| 5 | Review/dismiss/assign check | Check workflow state | Yes if stateful |

Default implementation posture:

- Navigate, prepare, confirm, cancel, review, dismiss, assign, and publish-guard behavior are all defined in the contract.
- Confirmed writes are controlled by feature flags and permission gates.
- Public-truth publish actions are controlled by a stricter feature flag and may route to the existing publish screen instead of executing inside Business Health.
- Flags are runtime controls, not future-phase promises.

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

## 13. Firebase Cost Requirements

Non-negotiables:

- Dashboard card: 1 current summary read through protected API.
- Business Health page: 1 current summary read, conditional cached thread read only when thread mode is enabled.
- Suggested question answer: reuse loaded current summary where possible; otherwise 1 current summary read.
- Free-text answer: no raw source collection aggregation.
- Scheduler: reuse existing store-local nightly path and compact sources.
- Cleanup: use `menulistMaintenanceScheduler`, not a new standalone scheduled function.

Cost target:

Business Health must remain lower cost than adding a normal analytics dashboard tab. Its hot path is one compact read, not a bundle of raw reads.

## 14. Mobile Requirements

Business Health is owner-facing and must have mobile support.

Mobile contract:

- Opens inside `MobileShell`.
- Uses existing mobile providers.
- Uses a full mobile screen and bottom sheets.
- Does not use desktop route reloads from mobile tabs.
- Keeps touch targets at least 44px.
- Shows source/freshness text visibly.
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
4. Public truth writes cannot bypass domain services or cache invalidation.
5. Mobile is part of the implementation contract.
6. Owner-facing language follows constitution and language governance.
