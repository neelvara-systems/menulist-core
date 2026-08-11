# Approval and Comment Inbox - Specification

## Owner Problem

An agency or team can request approval today, but a rejected pack without a visible current review thread sends the owner back to chat, email, or another tool. Feedback also needs to remain scoped to the correct campaign, output, and branch.

## Product Promise

Keep one short review thread with the Campaign Pack. Show who raised each item, whether it is open, and whether the pack can be approved. Approval is review evidence, not a replacement for trust, rights, freshness, or protected-fact checks.

## Lifecycle

`not_requested -> requested -> approved | rejected`

- A new request increments `requestRevision` and starts an empty current thread.
- Any workspace member except a billing-only user may request approval for an active pack they can access.
- Members except billing-only users may add a comment while approval is waiting.
- Owner, admin, reviewer, or local manager may resolve a comment.
- Approval is blocked until all comments are resolved.
- Rejection requires a decision note and may close a request with open requested changes.
- A rejected pack may start a new review revision after changes.

## Invariants

1. Maximum 20 comments per request.
2. Comment text is trimmed, bounded to 400 characters, and never rewritten by a model.
3. Resolving a comment preserves its text and adds resolution evidence.
4. Supplied output id must belong to the campaign.
5. Supplied location id must match the campaign location.
6. All mutations are role checked, idempotent, tenant scoped, and transactional.
7. Audit events store comment id, revision, note hash, and note length, not duplicate raw comment text.
8. Comments do not bypass trust, freshness, approval, or public-use gates.

## Non-goals

- public token approval links
- email, WhatsApp, or push delivery
- mentions, attachments, rich text, or unbounded chat
- cross-workspace client portal
- legal approval claims
