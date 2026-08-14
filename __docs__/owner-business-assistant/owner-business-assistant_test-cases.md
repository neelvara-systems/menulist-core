# Owner Business Assistant Test Cases

**Owner-Facing Name:** Business Health
**Status:** Current read-only test contract
**Last Updated:** August 14, 2026

## Verification Script

`npm run verify:owner-business-assistant` must check:

- feature flags exist for current Business Health behavior
- no Business Health operation flags exist
- no Business Health operation execution route exists
- no operation hook, sheet, registry, or executor exists
- no operation/draft collections exist in constants, rules, scheduler cleanup, or monitor queries
- context packets do not include operation catalogs
- answer artifacts do not include operation options
- mobile screen does not import or render an operation sheet

## Unit Tests

Cover:

- context packet cache keys for `health_card`, `analytics_periods`, `owner_question_basic`, and `multi_location_summary`
- analytics period resolver
- domain capability matrix
- deterministic refusal copy
- Business Health signal labels and owner messages
- answer resolver behavior for supported and unsupported questions
- type/schema rejection of unsupported packet profiles and oversized payloads
- persisted current/analytics projection strips Firestore-only and unknown nested fields
- wrong tenant/store identity and malformed required arrays/maps fail before context-packet composition
- cached packet identity must match the cache-key tenant, store, and project dimensions
- persisted guest-feedback projection rejects foreign scope, malformed IDs, invalid rating/status/attention/source/creator combinations, non-persisted or invalid timestamps, impossible business dates, and oversized messages before summary counts or source references
- valid guest-feedback projection preserves canonical current rows, supports strict persisted timestamp structures from the Functions runtime boundary, and redacts contact details only after admission

## API Tests

Cover:

- unauthenticated current/analytics/answer requests
- tenant/store/project isolation
- contradictory compact/nested tenant, store, and actor session aliases
- same-store staff member attempts to read or append another actor's thread
- legacy thread without `userId` fails closed
- unknown/private persisted thread and message fields are absent from the response
- selected project context
- oversized answer prompt rejection
- provider disabled fallback
- provider rate limit before model call
- unsupported domain response
- platform monitor auth and role checks
- absence of action route

## UI Tests

Desktop:

- dashboard Business Health card renders current state
- full Business Health route keeps project selector context
- analytics strip uses selected project
- priority checks render read-only
- question composer returns grounded answer
- no action sheet appears

Mobile:

- Business Health opens inside `MobileShell`
- project selector works
- keyboard does not cover composer
- priority checks render without action controls
- mutation-style prompt does not mutate truth or open an action sheet

## Firebase Cost Tests

Cover:

- no Firestore write per token/provider chunk
- bounded thread messages
- bounded answer events
- bounded monitor queries
- context-packet cache reuse
- malformed or scope-mismatched cached packets become cache misses
- no action/draft document writes
- no base64 image storage
- no unbounded historical session scan on open
- the guest-feedback summary query remains capped at 81 document reads and admits at most 80 rows after runtime projection

## Regression Tests

Business Health removal must not break:

- owner dashboard
- mobile dashboard
- menu editor
- Command Center
- image generation
- extraction/import
- publish/cache behavior
- Menu Manager action adapters

Business Health does not own those mutation paths; it must remain read-only while those features continue through their existing systems.

## Manual QA

1. Open desktop dashboard and confirm Business Health card loads.
2. Open `/business-health` and switch selected project.
3. Ask "Which item was on top last month?"
4. Ask an unsupported mutation-style prompt such as "Change masala tea to 20".
5. Confirm no project/menu write occurs.
6. Confirm no action sheet or action button appears.
7. Open mobile Business Health through `MobileShell`.
8. Confirm mobile checks are read-only and the composer works with keyboard open.
## Weekly Menu Review

- `thisWeek` available: show existing localized MenuList metrics and current check state.
- `lastWeek` available: show a clearly labelled last-week menu-view comparison.
- `lastWeek` absent: omit comparison without inventing a delta.
- `thisWeek` absent or not available: omit Weekly Menu Review and preserve the existing Business Health fallback.
- Current action count zero: show the existing no-action-needed presentation.
- Current action count positive: show the existing customer-facing details need review presentation.
- Selected menu changes: use the same selected-scope analytics cache key on desktop and mobile.
- Verify there is no action hook, proposal record, provider call, external lookup, revenue/margin claim, or menu write.
