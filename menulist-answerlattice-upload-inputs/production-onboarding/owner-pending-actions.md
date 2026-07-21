# Owner-Controlled Pending Actions

**Source package status:** Codebase-wise complete and review-ready as of 2026-07-20  
**Purpose:** Separate work the repository can complete from actions that require founder, legal, production access, provider access, or live evidence.

## Pending Before Production Intake

- [ ] Founder approves MenuList as a real Answerlattice production client.
- [ ] Owner confirms that private repository-derived material may be processed in the selected Answerlattice workspace.
- [ ] Owner/legal reviews pricing, refund, content-rights, privacy, retention, security, and contact statements before they become approved canonical answers.
- [ ] Owner approves the exact demo business, menu, screenshots, and public-use permissions.
- [ ] Operator creates or selects the production Answerlattice workspace, tenant, store, and license through authenticated product flows.

## Pending During Knowledge Intake

- [ ] Operator creates the intake job with the canonical `https://menulist.ai` identity.
- [ ] Operator uploads all 26 source files or injects reviewed `contentText` into the review-only JSONL payloads.
- [ ] Operator reviews extraction, source evidence, entity candidates, FAQ/KB drafts, conflicts, and citation eligibility.
- [ ] Owner/admin approves stable canonical answers; unapproved output remains draft or support-only.
- [ ] Operator records gaps or conflicts as governance/support-board work instead of filling them with assumptions.

## Pending Before Widget Activation

- [ ] Production Answerlattice widget key and allowed origins are issued.
- [ ] Required MenuList production environment values are configured without exposing them in this package.
- [ ] Production release is performed through the normal MenuList release path.
- [ ] Runtime telemetry confirms the widget and safe page context on approved desktop routes.
- [ ] Mobile behavior is confirmed as intentionally hidden until a separately approved mobile support pattern exists.
- [ ] Blocked, unknown, Growth Kits, internal operations, platform administration, and reseller routes are confirmed to emit no owner-widget context.
- [ ] Approved nested routes are confirmed to emit generic `_detail` context without raw tenant, store, project, transaction, customer, or URL-segment identifiers.
- [ ] Unauthorized states, logout, and missing-key behavior are tested.

## Pending Before Live Owner Support

- [ ] All 75 questions in `live-owner-support-test-questions.csv` are asked against the production workspace.
- [ ] Every answer is reviewed for accuracy, source support, availability conditions, and escalation behavior.
- [ ] Weak or unanswered items become support-board cards and are resolved or explicitly accepted as escalation-only.
- [ ] Account-specific billing, ownership, deletion/export, provider, legal, custom-domain, incident, and security questions route to verified human support.
- [ ] Live provider/account/browser behavior is checked where repository truth cannot prove the external state.

## Pending Before Public Screenshots Or Marketing Use

- [ ] Each capture has environment, route, date, source, scrub status, and approval recorded.
- [ ] Private identifiers, billing details, customer content, logs, tokens, and internal paths are removed.
- [ ] Generated visuals remain labelled as generated demo visuals.
- [ ] Private reference captures remain internal unless separately approved.
- [ ] Website/demo copy describes MenuList as the example client and Answerlattice as the governed support product without blending identities.

## Stop Rule

Do not mark production onboarding, live support, widget activation, or public screenshot proof complete from repository changes alone. These checkboxes remain pending until the authorized owner/operator supplies real production evidence.
