# MenuList SignalDesk - Test Cases

## Enrichment Waterfall Settlement

| Case | Expected |
| --- | --- |
| Concurrent exact run | One actor/key claim owns one enrichment result, vendor row, timeline, audit, and cost effect set; both callers receive the same result ID. |
| Changed-input key reuse | Fails with `ENRICHMENT_WATERFALL_IDEMPOTENCY_CONFLICT`. |
| Existing approved field | Reuses a masked preview through the manual provider state with no external spend. |
| Source-provider pause active | Transaction-current admission fails before any result or vendor write. |
| Prior contact/outcome or stale policy/waterfall/budget | Current transaction state fails closed before writes. |

## Default Seed Convergence

| Case | Expected |
| --- | --- |
| Empty registry | Creates exactly 18 provider account/use rows and 17 provider-scoped budgets; owned-email sender remains disabled, unapproved, credential-missing, and zero-budget. |
| Two concurrent calls with one missing default | One transaction creates the row and one seed audit/timeline/cost effect set; the retry re-reads current truth and returns clean. |
| Concurrent clean replay | No business row, audit, timeline timestamp, or daily write estimate changes. |
| Valid existing provider or budget with current spend/caps/status/reason | Strictly validates and preserves the complete row and ownership timestamp. |
| Wrong-product or malformed existing seed identity | Fails closed with a bounded product/shape error and does not replace the row. |
| Exact historical score/evidence route | Migrates to fast Gemini plus same-provider escalation while preserving `createdAt`. |
| Near-match route or market pod with a founder marker | Preserved byte-for-byte; it is not treated as a legacy seed. |
| Exact historical Mumbai pod or active current-list Offer CTA | Migrates to the held, zero-budget current authority while preserving `createdAt`. |
| Distribution paused with missing default source | Source remains missing. |
| Malformed active pod or malformed/foreign existing default source | Fails closed; no source is created or activated. |
| Ambiguous preview CTA identity | Canonical authority remains held with `operator-review-required`; only an explicit current CTA resolution marks it `migrated` and records resolver/time. |

**Status:** Initial test matrix
**Created:** June 23, 2026
**Scope:** Product boundary, source policy, compliance, AI, cost, operator workflow, mobile, and MenuList bridge.

## Product Boundary Tests

| Test | Expected |
| --- | --- |
| User tries to access SignalDesk as a MenuList owner | Blocked. Internal users only. |
| SignalDesk creates a public page | Fails. No public SignalDesk routes. |
| SignalDesk writes MenuList menu/business truth directly | Fails. Only outcome bridge allowed. |
| SignalDesk is marketed as public SaaS | Fails. Internal-only. |
| SignalDesk sends without human approval in first build | Fails. |

## Source Policy Tests

| Test | Expected |
| --- | --- |
| Target import has no source policy | Import blocked or target held. |
| Source field has no allowed-use record | Field cannot be used in draft or decision. |
| Google Maps scraped payload is stored as prospect truth | Fails. |
| GBP API is used for lead generation | Fails. |
| Foursquare PAYG data is used to contact prospective customer | Fails. |
| Source retention period is missing | Import blocked. |
| Source run exceeds budget cap | Run pauses or requires admin approval. |
| Evidence permission is revoked after target import | Draft and approval are blocked even if contact permission remains. |
| Personalization permission is revoked after approval | Export/handoff is blocked even if contact permission remains. |
| Persisted research row points to a newly suppressed target | Allowed route is removed and the row becomes blocked/research-only. |

## Dedupe And Provenance Tests

| Test | Expected |
| --- | --- |
| Same business appears in two imports | Existing target merged or held, not duplicated. |
| Same business appears twice in one import request | One target and one returned candidate are created before batch commit. |
| Same email appears across targets | Contact identity linked and reviewed. |
| Existing suppressed identity appears in import | Target is suppressed/held. |
| Evidence lacks source reference | Decision snapshot cannot approve action. |

## AI Tests

| Test | Expected |
| --- | --- |
| AI output does not match schema | Blocked and review item created. |
| AI invents menu item, price, traffic, or customer claim | Blocked. |
| AI recommends WhatsApp cold outreach from public phone | Blocked. |
| AI suggests source data can be used for outreach | Blocked unless source policy says so. |
| AI draft uses unapproved variable | Blocked. |
| AI classifier marks DNC reply as interested | Eval failure and human review. |
| Two AI runs have different confidence/rejected-fact states | Model-eval pass and rejected-fact rates derive from cumulative counters, not the latest sample. |
| Founder accepts an AI run unchanged | Run stores `accepted`; reviewed/accepted counts and acceptance rate update once. |
| Founder records an edited AI run | A bounded reason is required; edited count, edit rate, and attention minutes update. |
| Founder changes edited review to rejected | Prior edited/minute contribution is reversed before rejected decision and replacement minutes are applied. |
| Non-founder reviews an AI run | Blocked by the server founder-role check. |
| Review targets a rules-only score run | Blocked; only provider-backed `ai_assist_*` runs are reviewable. |
| Shadow review tries to send, publish, change opportunity, or write MenuList truth | No such write path exists. |

## Approval And Send Tests

| Test | Expected |
| --- | --- |
| Draft approved without suppression recheck | Fails. |
| Email send requested without unsubscribe path | Blocked. |
| Email send requested without sender-domain readiness | Blocked. |
| Export includes suppressed contact | Fails. |
| WhatsApp API send requested in first build | Blocked. |
| Instagram cold DM send requested | Blocked. |
| Message claims platform partnership | Blocked. |
| Customer-proof asset requests scopes outside its permission grant | Blocked. |
| Existing customer-proof permission is narrowed or revoked | Derived content draft is blocked. |

## Inbox Tests

| Test | Expected |
| --- | --- |
| Reply says stop/unsubscribe | Suppression event created immediately. |
| Reply says wrong person | Wrong-contact suppression created. |
| Reply asks pricing | Classified and routed to operator. |
| Reply is interested | MenuList route can be created after review. |
| Reply classifier confidence is low | Human review. |

## Attribution Tests

| Test | Expected |
| --- | --- |
| Target receives MenuList route | Route token links target/source/channel/template. |
| Upload starts | Outcome event records upload started. |
| Preview prepared | Outcome event records preview prepared. |
| Public link published | Outcome event records publish. |
| QR/WhatsApp/Google placement marked done | Two-surface activation summary updates. |
| Dashboard loads attribution | Reads summaries only, not raw events. |
| Outcome idempotency key is reused with different facts | Conflict is returned and no second outcome side effect occurs. |
| Verified activation falls outside a bounded outcome query | Durable target projection preserves converted/activated state. |
| A later non-activation outcome is recorded | Converted target state is not downgraded. |
| Activation watch is refreshed | Seven-day deadline derives from owner-qualified intent. |

## Provider Webhook Tests

| Test | Expected |
| --- | --- |
| Same signed provider event arrives concurrently twice | One atomic event and one set of side effects are committed; the other request is duplicate. |
| Email and Apify use the same external event ID | Provider-scoped event records remain independent. |
| Signed event supplies an unknown or path-like target ID | Event is retained as unbound normalized metadata and does not mutate an arbitrary target. |
| Interested provider reply is normalized | Target receives the conversation link and earliest owner-qualified timestamp. |

## Cost Tests

| Test | Expected |
| --- | --- |
| Dashboard scans raw messages | Fails. |
| Target list reads full target detail docs | Fails. Uses summaries. |
| AI scoring reruns on unchanged evidence | Cached output reused or duplicate spend blocked. |
| Source run has no max result count | Blocked. |
| Provider cost exceeds cap | Paused or requires approval. |

## Research Agent Table Tests

| Test | Expected |
| --- | --- |
| Prompt-to-table run | Creates a research run, provider-backed source run, target imports, table rows, and market-pod update. |
| Dashboard lead batch | `/signaldesk` shows Market Search, prompt presets, latest run status, and up to 30 pass/unsure cards with evidence, contact path, share message, and next safe action. |
| Failed rows excluded | Failed research rows remain visible in Research Output but are not shown as daily leads. |
| Research row scoring | Every row has `pass`, `fail`, or `unsure` plus a recommended next action. |
| Source transparency | Run and rows include provider, source policy, source run, and provider-run/source references. |
| Duplicate idempotency key | Returns the existing run/rows and creates no duplicate table rows. |
| Source-only provider data | Does not create contact identities unless the source policy allows contact use. |
| Mobile research run | Blocked by mobile read-only runtime policy. |
| Mobile lead-batch actions | Dashboard/Mission lead-batch actions are disabled by UI and still blocked by server-side mobile policy. |

## Daily Activation Operator Loop Tests

| Test | Expected |
| --- | --- |
| Mission and activation opportunity reference the same target | Today queue contains one target task, not duplicate work. |
| Reply or approval is already resolved in the loaded summaries | Stale mission item is omitted. |
| Mission action references a terminal current opportunity | Stale mission work is omitted. |
| More than five eligible actions exist | Queue remains capped at five. |
| Executable action fails or is rejected by the server | Focus does not advance and the existing error remains visible. |
| Operator presses **Next** | Only local focus changes; no action, audit event, or Firebase write is claimed. |
| Operator lacks authority for a direct action | Existing review destination opens; client does not bypass the server guard. |
| Operator copies MenuList setup link | Anonymous founder-pilot URL is copied with no target ID, route token, contact detail, provider send, or database write. |
| Operator opens Target Journey | Existing opportunity/outcome/permission summaries render read-only stages without extra reads. |
| Durable verified two-surface activation has current proof authority | Content Rail opens with a bounded proof prefill; source/asset creation still requires explicit action. |
| Activation lacks timestamp, evidence reference, approved integrity, or two distinct surfaces | Proof preparation remains unavailable before permission/source review. |
| Proof permission or source is missing | Preparation remains held and explains the missing prerequisite. |
| Weekly snapshot renders | Seven-day route, upload, preview, publish, and verified activation counts derive from existing loaded summaries; unverified activation rows are excluded, the routed cohort links unique target IDs, and stalls require an elapsed durable deadline. |
| Mobile opens SignalDesk dashboard | Queue, weekly snapshot, and journey remain observable; setup-copy and proof-preparation mutations are unavailable. |

Run the focused pure/runtime contract with `npm run test:signaldesk:daily-activation-desk`. The aggregate `npm run verify:signaldesk` includes this test.

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile pauses all outbound | Allowed with confirmation and audit. |
| Mobile attempts to clear an existing pause | Blocked; unpausing requires desktop authority. |
| Mobile sends/export messages | Not available. |
| Mobile reveals raw contact | Not available. |
| Mobile approves draft | Not available. |
| Mobile records AI shadow decision | Blocked by UI and server-side mobile action classification. |
| Mobile starts AI Volume Mode | Blocked by UI and server-side provider-run classification. |
| Founder runs AI Volume Mode | Parent plus reviewable children record generation, critic, optional escalation, calls, cost, audit, and timeline. |
| AI volume request retries with the same idempotency key | Existing parent returns and no additional model call occurs. |
| AI volume projected cost exceeds founder maximum | Blocked before parent or provider write. |
| One AI volume child fails | Parent is partial; successful child remains; stable code contains no raw provider error. |
| Critic requests non-executable provider escalation | Child stays low-confidence/review-required and no unsupported provider call occurs. |
| Non-founder starts AI Volume Mode | Blocked before provider work. |
| Mobile configures provider | Not available. |

## Manual Contact And Rejection Tests

| Test | Expected |
| --- | --- |
| Export approved email | Creates a prepared export and sets `nextAction = contact`; target is not yet contacted. |
| Record prepared email contact | Rechecks source policy, suppression, pauses, route, and prepared export; marks target contacted and appends conversation, audit, timeline, and cost projections. |
| Retry the same manual contact key | Returns duplicate with no duplicate audit, timeline, suppression, conversation, or target side effect. |
| Reuse a manual contact key with changed route/result/time/note/policy/target facts | Blocked as an idempotency conflict. |
| Record email contact without prepared export | Blocked. |
| Reuse a consumed or older-than-30-day email export | Blocked; each completion needs a fresh current `exported` state. |
| Treat limited phone, Instagram, or generic website contactability as `manual-form` | Blocked and displayed as `contact-route-unverified`; no actionable route is exposed. |
| Record contact with expired/changed source policy | Blocked and source-policy audit is retained. |
| Record contact for suppressed or ineligible target | Blocked. |
| Record `wrong-contact` | Target becomes rejected/wrong-contact and a hashed suppression record is written immediately. |
| Record `introduced` outside `partner-intro` | Blocked. |
| Record or display a partner introduction under `permissioned-referral`, with no direct email/phone/social route | Allowed and audited through `partner-intro` without provider send; stale direct-contact failures are removed at read time. |
| Reject approval without bounded reason | Blocked. |
| Reject approval as `other` without note | Blocked. |
| Reject for weak/stale evidence | Stores reason and projects target back to evidence review. |
| Concurrent approve and reject for one pending item | Exactly one terminal decision commits; the loser is blocked, queue counters decrement once, and one terminal audit exists. |
| Mobile records manual contact | UI disabled and API returns `MOBILE_READ_ONLY_ACTION_BLOCKED`. |

## Navigation And Rules Tests

| Test | Expected |
| --- | --- |
| Desktop primary navigation renders | Exactly Today, Opportunities, Conversations, Activations, and Controls are primary. |
| Founder opens an advanced SignalDesk tool | Protected deep route remains reachable from Controls. |
| SignalDesk layout is compiled for the browser | Uses lightweight NextAuth context and contains no MenuList store/tenant session-provider import. |
| Fresh user opens `/signaldesk` or `/sd` | Redirects to the matching noindex SignalDesk-local sign-in gateway with a bounded callback URL. |
| Valid credentials belong to a user without active SignalDesk access | Sign-in may establish the account session, but the protected layout redirects to unauthorized. |
| SignalDesk sign-in receives an external callback URL | Callback falls back to `/signaldesk`; no open redirect occurs. |
| Active member reads own membership document | Allowed. |
| Active member reads or lists other membership documents | Denied. |
| Platform admin reads/lists team membership | Allowed. |
| Any client writes a SignalDesk membership or operational collection | Denied. |

## Operator Runbook Tests

| Test | Expected |
| --- | --- |
| Operator works target without evidence packet | Held. |
| Operator approves message with unsupported claim | Blocked. |
| Operator closes complaint without admin review | Blocked. |
| Operator changes source policy | Blocked unless role allows. |
| Operator exports contact after DNC | Fails. |

## Source-Policy And Transactional Import Tests

| Test | Expected |
| --- | --- |
| Create a complete source policy | Stores all six explicit use flags, bounded contact-channel authority, strict review/expiry truth, and one deterministic idempotency claim. |
| Retry exact policy creation | Returns the same policy ID and creates no second policy or side effect. |
| Reuse policy idempotency key with changed facts | Fails as an idempotency conflict. |
| Create a policy with past/over-retention expiry, credential-bearing URL, provider mismatch, or channel/field mismatch | Rejected at the shared runtime schema before Firestore work. |
| Read policy with missing use flag, wrong `pId`, wrong document ID, malformed Firestore timestamp, future review authority, or provider/refresh mismatch | Excluded from workspace lists and rejected by operational reads. A malformed leading page cannot starve later valid rows. |
| Parse manual CSV containing quoted commas, escaped quotes, quoted newlines, CRLF, or an exact optional header | Produces the canonical ten-column row without shifting fields. Unclosed quotes, missing/extra columns, delimiter-only rows, overlong values, and more than 50 rows fail before the request. |
| Import a row retaining contact data without `permissionEvidenceRef` | Rejected before any write. |
| Import two exact duplicate rows | Collapsed to one target lineage and counted as duplicate. |
| Import two divergent rows with one computed identity | Entire import is rejected. |
| Retry an exact manual import, including two concurrent calls | Returns the same source run and target IDs with one durable write set. Reusing the key with changed facts fails as an idempotency conflict. |
| Import through a foreign/missing/orphan identity, target, contact, candidate, policy, or provider-retention record | Entire import is rejected before any write. |
| Re-import target under a different source policy | Rejected as a source-policy rebind. |
| Import two same-name provider rows with different stable provider record IDs | Produces two targets. A later exact record reuses its target, and a different policy cannot rebind it. |
| Direct import selects a provider-only policy or supplies provider record fields | Rejected before source-run, target, identity, candidate, idempotency-claim, or daily-cost writes. Only the trusted provider-run path can bind provider lineage. |
| Encounter a pre-contract provider identity | Reuses it only when strict detail or provider-retention lineage proves the same external record; otherwise creates the new stable identity without overwriting the legacy target. |
| Re-import a scored/contacted/converted target | Mature lifecycle, scores, derived state, and existing contact permission state are preserved. A current suppression may still force held/blocked state. |
| Import a retained phone with modern or legacy digits-only suppression | Target is suppressed in either case. |
| Read target/source-run/research-run/research-row workspace DTOs containing extra internal/contact fields | Explicit projectors omit private fields and validate `pId` plus document identity. |
| Compare a new target import with its exact provider/manual replay | Both responses have the same strict target-summary keyset and omit persistence/private fields. |
| Parse identity-index, contact-identity, or source-candidate truth containing an unknown private field or whitespace-wrapped document identity | The private field is absent from the projected contract, and non-exact raw document identity is rejected. |
| Run Google Places, Apify, or FHRS with malformed/oversized/slow input | Unknown payload fields are bounded or dropped, responses stay capped, timeout is aborted, and the public failure is stable. |
| Provider returns an overlong record ID, display name, email, or record URL | The field or row is dropped; no truncated identity, contact, or provenance truth is created. |
| Provider returns only a Maps/listing URL | The URL remains `providerRecordUrl`, `currentListUrl` stays absent, and the target remains `missing-current-list`. An explicit `menuUrl` becomes current-list truth. |
| Provider returns one malformed optional email, phone, website, or Instagram URL | The invalid optional field is dropped independently; a valid business row remains, and an Instagram profile URL normalizes to its canonical handle. |
| Read target detail with noncanonical contact, credential URL, unknown provider, or incompatible identity version/record fields | The strict projector rejects the document. A harmless legacy HTTP(S) URL is canonicalized at the read boundary. |
| Read a persisted target/research row with a score outside 0-100 or a malformed-present timestamp | The strict projector rejects the document and it cannot reach workspace DTOs. |
| Score a malformed/foreign target or replay a malformed/foreign/out-of-range score | Rejected before target, score, snapshot, ledger, audit, or cost mutation. |
| Read a source run whose status contradicts its counts or whose duplicate/suppressed/blocked count exceeds imported count | The strict projector rejects the document. |
| Read a research run whose verdict totals do not equal row count, or a queued/running run with terminal rows/counts/provider-run IDs | The strict projector rejects the document. |
| Run research without one explicit source policy, or read a pass/unsure/fail row whose score/safe-route state disagrees | Rejected. Research never auto-selects authority from a provider policy scan, and a failed row cannot expose outreach. |
| Place more than one old list page of malformed/foreign rows before a valid recent target by document ID | Descending-`updatedAt` pagination still finds the recent valid target; a bounded ceiling emits a diagnostic rather than silently claiming completeness. |
| Record an activation outcome, then capture another reply | `ownerQualifiedAt` and `latestVerifiedActivationAt` remain Firestore `Timestamp` values and the strict target remains visible. |
| Select a provider in the workspace | Only an active, unexpired, matching-provider policy with evidence/import/provider-run authority is usable. Retry keeps one stable request identity. |

## First Build Acceptance Test

The first build is acceptable only if this path works end to end:

```txt
manual target import
-> dedupe/provenance
-> AI score
-> evidence packet
-> safe draft
-> human approval
-> email/export prepared
-> policy-gated manual contact confirmation
-> reply capture
-> MenuList outcome recorded
-> summary dashboard updated
```
