# Conversation Monitoring Test Cases

- Same-workspace viewer without support permission cannot read sessions or analytics.
- Authorized support role and `PLATFORM_SUPPORT` can read support conversations.
- Other workspace and public access fail.
- Invalid product, actor, scope, mode, time, unknown fields, and empty/oversized messages fail.
- Valid append succeeds; immutable actor/creation/scope fields cannot change.
- Feedback updates session and search history atomically and cannot be rewritten.
- Internal note preserves original creator metadata.
- Image upload rejects remote URLs, MIME mismatch, malformed base64, oversize, and cross-workspace URLs.
- Session deletion reports deferred persisted-image cleanup truthfully.
- Help Chat history cache keys partition exact Answerlattice tenant/workspace/actor identity. A workspace switch cannot make an initiating read, failed-upload cleanup, deletion, or development bulk clear operate in the later workspace.
- Hard-deleting a valid session rebuilds its exact UTC daily aggregate to current surviving truth; duplicate delete-event delivery is idempotent and cross-product/malformed snapshots are ignored.
- Recent delete recovery refreshes deterministic feedback/weekly insights even after aggregate-only partial completion. Incomplete recent source atomically invalidates both insight documents; current-day and older-than-window deletions skip unnecessary intelligence work.
- User/admin/statistics/volume queries retain their caps.
- MenuList and Answerlattice stores with the same numeric IDs cannot supply each other's backfill scope.
- Workspace-list admission rejects missing, inactive, unverified, blocked, wrong-product, wrong-role, email-mismatched, and inconsistent Answerlattice operator records.
- Callable admission rejects a stale durable access revision and a `PLATFORM_SUPPORT` caller for analytics backfill.
- Persisted store admission rejects conflicting product, tenant, or workspace aliases and disabled/blocked stores.
- Response admission rejects wrong tenant/workspace/day acknowledgement, duplicate or impossible dates, malformed counters/status, and unknown fields.
- A confirmation captures the selected workspace and day count; duplicate same-tick actions, session replacement, role loss, unmount, and obsolete completions cannot mutate the visible result.
- Conversation cache keys use `productAccounts.AL`, not root MenuList IDs; a workspace transition immediately masks rows, detail, cursor, selection, and notes.
- Help Chat history keys include Answerlattice tenant, workspace, and actor. Invalid/missing scope or actor yields no key; same tenant/actor with another workspace yields a distinct key.
- Help Chat history reads retain their initiating session, while failed-upload cleanup, delete, and development bulk clear require their initiating Answerlattice scope to still match the fresh active scope.
- Help Chat create, append, retry branch replacement, feedback, rename, delete, and development clear reject when the initiating tenant, workspace, or actor differs from fresh active authority; user-owned existing-session writes also reject a persisted owner mismatch.
- A tenant/workspace/actor transition remounts the Help Chat subtree and obsolete provider/DAL completions cannot settle rows, selection, drafts, feedback, loading, typing, messages, or toasts into the new identity.
- Negative-feedback signals use the initiating Answerlattice product-account tenant/workspace, never MenuList root IDs.
- Paginated conversation responses must acknowledge the requested tenant/workspace. Obsolete initial/load-more responses and duplicate IDs cannot append.
- Metadata, internal-note, Help Chat rename, and batch-status mutations reject when the initiating workspace differs from the freshly active workspace before the first target read/write.
- Weekly Digest clears the former workspace before loading and only the latest mounted exact-scope request may settle.
- Chat Insights never uses MenuList `storeDetails.chatAnalytics` as Answerlattice status truth.
- Dashboard, live-today, conversation-page, freshness, and comparison reads retain the initiating Answerlattice session scope; no later active-session lookup or raw tenant/store prop can replace read authority.
- Positive/total feedback is labelled Positive Feedback Share. Feedback events are never divided by chat sessions as response coverage, and negative-feedback gap counts are never presented as knowledge-base coverage or system health.
- Conversation detail, drawer transcript and CSV exports use Positive Feedback Share or literal helpful/not-helpful counts; they contain no satisfaction label and do not coerce tied feedback to negative.
- Period comparison shows Positive Feedback Share movement in percentage points and `Not available` when either period lacks recorded feedback; volume/message comparisons remain relative percentages.
- Deterministic insight writes remove obsolete merged fields, never call negative-gap events total feedback, express feedback-share movement in percentage points, and return unavailable rather than zero when a weekly comparison denominator is absent. Legacy weekly field names remain readable until rewritten.
- ROI rate limiting, current `canManageSupport` permission, statistics, response acknowledgement, browser state, and loader ownership remain on one exact Answerlattice workspace. Direct calls without permission and wrong-scope, extra-field, raw-analytics, malformed-date, nonfinite, negative, or unreconciled responses fail closed.
- A trailing `N`-day ROI read combines exactly `N - 1` completed UTC aggregate buckets with today's bounded live bucket. Month boundaries remain UTC-stable, and `N = 1` performs no historical aggregate query.
- ROI calculations use the real `qnaChats` and `assistantChats` fields, expose the minutes-saved assumption, return JSON-safe `null` for no payback, and reject invented resolution, automation, retention, churn, or revenue-attribution fields.

```bash
npm run test:answerlattice-chat-session-contracts
npm run test:answerlattice-chat-sessions:rules
npm run test:answerlattice-chat-sessions:shared-rules
npm run test:answerlattice-chat-analytics-contracts
npm run test:answerlattice-chat-analytics:rules
npm run test:answerlattice-chat-analytics:shared-rules
npm run test:answerlattice-chat-analytics-backfill-boundary
npm run test:answerlattice-storage:rules
npm run test:answerlattice-storage:shared-rules
```
