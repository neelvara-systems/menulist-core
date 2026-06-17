# Owner Business Assistant Test Cases

**Owner-Facing Name:** Business Health
**Status:** Current read-only test contract
**Last Updated:** June 17, 2026

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

## API Tests

Cover:

- unauthenticated current/analytics/answer requests
- tenant/store/project isolation
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
- no action/draft document writes
- no base64 image storage
- no unbounded historical session scan on open

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
