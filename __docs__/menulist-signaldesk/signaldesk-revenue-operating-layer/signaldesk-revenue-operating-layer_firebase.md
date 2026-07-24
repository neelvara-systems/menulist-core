# SignalDesk Revenue Operating Layer - Firebase

**Status:** Runtime implemented and locally verified
**Created:** July 10, 2026
**Last verified:** July 21, 2026

## Cost Contract

Default reads use one revenue summary and bounded lists of product-local summary-shaped records. No raw messages, webhook payloads, provider payloads, or MenuList store/project trees are scanned.

| Operation | Reads | Writes |
| --- | ---: | ---: |
| Qualify revenue account | target/source-policy precheck + bounded terminal two-surface lookup + transactional target/account/opportunity/summary reads | changed account, optional opportunity/watch reconciliation, summary delta, audit, timeline, daily cost |
| Update opportunity | transactional opportunity + account + current target/source policy/contact/suppression authority + optional offer + revenue summary | changed opportunity, account, summary, audit, timeline, daily cost |
| Save commercial offer | deterministic existing offer-version lookup + optional CTA | changed offer, audit, timeline, daily cost |
| Save operating envelope | initial validation plus transactional reread of referenced source-policy/offer/founder-approved active pod/compatible budget/sender/template records and existing version | envelope, audit, timeline, daily cost |
| Refresh activation watch | transactional account + target + watch + opportunity + summary, latest 30 valid outcome summaries, and bounded terminal-activation lookup | changed watch/account, optional opportunity close, summary delta, audit, timeline, daily cost |
| Review market pod | transactional pod read | founder decision fields, pod status, audit, timeline, daily cost |
| Capture interested reply | existing reply writes + deterministic target/source-policy and transactional account/opportunity reads | existing reply writes + optional account, opportunity, summary, audit, timeline, daily cost |
| Record target outcome | existing target/outcome writes + deterministic account lookup + bounded transactional activation reads when account exists | existing outcome writes + optional watch, account, opportunity close, summary, audit, timeline, daily cost |
| Create Daily Growth Mission | bounded existing operating lists + bounded commercial opportunities/watches/summary + one daily-cost summary | mission, audit, timeline, daily cost |
| Load revenue workspace | common bounded workspace data plus 12 revenue/control lists in parallel; budget policies are omitted unless the role can configure SignalDesk | 0 |

Exact successful retries perform the validation reads needed to prove identity and current authority, then write nothing. They do not repeat audit, timeline, daily-cost, summary, approval timestamp, or entity writes.

## Rules

- authenticated SignalDesk members and platform admins may read;
- all client writes are denied;
- server/admin actions own mutations;
- default deny remains in force;
- no new public collection access.

## Indexes

Add only indexes required for private filtered/detail views:

- revenue accounts: `lifecycleStage + updatedAt`;
- commercial opportunities: `status + updatedAt` and `revenueAccountId + updatedAt`;
- operating envelopes: `status + updatedAt`;
- activation watches: `status + updatedAt` and `targetId + updatedAt`.
- outcome summaries: `targetId + updatedAt DESC` plus `targetId + outcomeType` for bounded current-state and terminal-activation derivation.

## Retention

Commercial records follow the linked source policy and internal accounting/legal retention. Source evidence is referenced, not copied. Activation watches store compact state only.

Seven-day stall state is annotated from the compact watch deadline during revenue and mission reads. No polling listener, raw MenuList query, or new scheduled function is added.

The target's canonical owner-qualified timestamp anchors the seven-day deadline. A bounded equality lookup for `targetId + outcomeType: two_surface_activation` preserves terminal activation even when it falls outside the latest 30 summaries. Recommendation/research pod writes remain held and preserve founder review fields; envelope reads require those approval fields.

Account/opportunity qualification and revenue summary deltas use transactions so concurrent retries cannot double-count accounts, opportunities, activation, or forecast values.

Operating-envelope transactions read the existing immutable version and every referenced control before writing. This prevents a source policy expiry/block, pod hold/rejection, offer hold, budget exhaustion, sender pause, or template deactivation from racing the envelope write.

## MenuList Boundary

SignalDesk bridge visibility is event-shaped. MenuList keeps activation data on existing MenuList-owned fields and routes. No new MenuList collection, listener, API route, or scheduled function is authorized by this module.
