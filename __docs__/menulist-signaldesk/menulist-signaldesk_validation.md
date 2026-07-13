# MenuList SignalDesk - Implementation Validation

**Status:** Governed source/research/content/partner rails, solo-founder Operating Layer, bounded Revenue Operating Layer, founder-controlled AI Volume Mode, hard mobile read-only enforcement, deterministic local E2E, and Firestore/Storage semantic rules tests implemented and locally validated.
**Created:** June 23, 2026
**Last Updated:** July 11, 2026
**Scope:** Product identity, protected app shell, guarded APIs, internal acquisition and revenue workflow, gated provider/channel runtime, dedicated Firebase config/rules/indexes/storage rules, and functions skeleton.

## Current Verdict

**PASS WITH EXTERNAL BLOCKERS.** The SignalDesk internal workflow, gated runtime expansion, bounded commercial lifecycle, product-local auth gateway, and deterministic safety paths are implemented and locally validated. It is safe for a local desktop trial and a mobile observe/emergency-pause trial after signing in with a seeded active member. It is not cleared for real outreach or cloud production use.

The implemented flow covers the existing access, source, target, evidence, draft, approval, inbox, outcome, demand, content, partner, provider/budget/model, mission, and control-room rails plus revenue accounts, deterministic commercial qualification, commercial opportunities, immutable standard offer versions, bounded operating envelopes, interested-reply revenue projection, automatic outcome-to-activation projection, read-time seven-day stall detection, compact revenue/founder-attention/spend summaries, and cost-capped multi-pass AI batches for internal review work.

## Manual Contact Completion And Rejection Reasons - July 11, 2026

| Area | Verified result |
| --- | --- |
| Prepared versus completed | Export-only email and assisted handoff no longer mark a target contacted. They retain the target lifecycle and set `nextAction = contact`; provider success still marks actual contact automatically. |
| Manual confirmation | `record-manual-contact` permits only a fresh unconsumed `email-export` or a `permissioned-referral` partner introduction. It validates bounded time/result, current source-policy rights, suppression, target eligibility, relevant kill switches, route eligibility, current exported conversation state, and export age. Limited phone/social/generic-website contactability remains unverified and non-actionable, while a permissioned referral does not require direct contact data. |
| Idempotency | One deterministic existing run-timeline ID is reserved with atomic `batch.create` and bound to a normalized request fingerprint. Exact replay returns `duplicate` even after contact consumes the export; changed facts under the same key fail as a conflict and create no second write set. |
| Wrong contact | `wrong-contact` atomically updates target/contactability state and writes the existing hashed suppression ledger. Other results omit suppression/contactability fields instead of copying stale values, so they cannot clear a concurrently-added suppression state. |
| Approval learning | Rejection requires one of eight bounded reasons; `other` requires a note. Server projects the target to evidence, enrichment, hold, or rejection. One Firestore transaction arbitrates concurrent approve/reject requests and atomically applies projections, one queue decrement, audit, and cost. |
| Mobile | Manual contact maps to blocked `configure`; approval rejection remains blocked as `approve`. UI controls are disabled and forced API requests remain denied. |
| Firebase boundary | Existing target, conversation, run-timeline, audit, cost, and suppression collections are reused. No collection, index, rule, Storage path, provider integration, public route, or MenuList truth write was added. |
| Local proof | `npm run verify:signaldesk` passes 2,410 checks; full TypeScript and focused SignalDesk lint pass; `npm run test:signaldesk:e2e:local` passes prepared/contacted separation, exact retry dedupe, changed-payload conflict, consumed/stale export denial, unverified-route revocation, permissioned partner introduction without direct contact data, wrong-contact suppression, expired-policy denial, structured rejection, concurrent approval arbitration, and mobile assertions; semantic Firestore/Storage rules pass; the warm local route/API smoke passes 71 checks; Firebase config parse, documentation links, and scoped diff checks pass. |

## AI Volume Mode Runtime - July 11, 2026

| Area | Verified result |
| --- | --- |
| Founder envelope | Only a founder-admin with `signaldesk.configure` can start a desktop batch. Each request is limited to five targets, three approved tasks, a maximum estimated cost of USD 5, and a founder-scoped idempotency key. API and server validate the limits independently. |
| Model cascade | Score, evidence, draft, and reply-classification use `gemini-2.5-flash-lite`; an independent critic checks every child; only exceptions may escalate through the same executable Gemini adapter to `gemini-2.5-flash`. OpenAI and Anthropic remain non-executable policy records. |
| Output integrity | Generation and critic responses are strict Zod-validated JSON. Any low confidence, non-pass critic result, or rejected fact remains review-required; a final rejected fact always forces low confidence. |
| Cost and retry | The complete worst-case call estimate is checked against founder authority and remaining provider daily/monthly budget before the parent is written. The protected route uses batch rate limiting, has a finite 300-second window, runs no more than three children concurrently, holds one six-minute global batch lock, records all model-call estimates through the existing provider budget and AI ledgers, and returns the original parent on the same paid-request key. |
| Failure recovery | Successful children remain reviewable when a sibling fails. Normal parent state becomes `completed`, `partial`, or `blocked`. A retry of an expired running parent reconstructs at most fifteen children from a bounded twenty-row read, restores calls/cost, writes one recovery audit/timeline, and finalizes without provider calls. Incomplete work stores only `ai_volume_run_interrupted`; lock release is conditional on ownership. |
| Reachable retry | Desktop persists only the bounded batch request in browser-local storage, reuses the same idempotency key after request failure/page reload, locks scope edits while retrying, clears on terminal state, and exposes an explicit clear action for pre-parent failures. |
| Evidence and UI | Parent and child summaries, critic verdict, escalation state, model-call count, cost, audit events, and run timeline are visible in the private desktop AI workspace. Mobile classifies the action as blocked provider work. |
| Authority boundary | The mode produces internal recommendations only. It cannot infer source rights or consent, override suppression, send/export/publish, create commercial truth, approve external spend, change autonomy, or write MenuList truth. |
| Local proof | `npm run verify:signaldesk` passes 2,302 checks; `npx tsc --noEmit --pretty false`, `npm run test:signaldesk:e2e:local`, `npm run test:signaldesk:rules`, `npm run docs:check-links`, scoped diff/whitespace/action-ID checks, and the 45-check local route/API smoke pass after stale recovery implementation. Static/UI contracts cover persisted payload validation, same-key retry, terminal clearing, and explicit clearing. The E2E covers partial reconstruction, blocked recovery with no children, recovery replay without duplicate audit writes, calls/cost restoration, stable interruption evidence, recovery timeline, and owned-lock release in addition to founder/non-founder, cost, critic, escalation, idempotency, partial-failure, workspace, and zero-export paths. |

## AI Shadow Review Runtime - July 11, 2026

| Area | Verified result |
| --- | --- |
| Reuse | Existing `signaldeskAiWorkerRuns` provider-assist rows and `signaldeskModelEvals` summaries are reused; rules scores are separated at read time and cannot enter founder shadow review. |
| Review | Founder admins with `signaldesk.configure` can accept, mark edited, reject, or hold a provider-backed run with bounded attention minutes and a required reason for every exception decision. |
| Integrity | Provider quality and founder-review counts/rates update transactionally. Because pre-July-11 rates represented only the latest run and cannot be reconstructed, the first new provider result preserves that legacy snapshot separately and starts an exact `cumulative-v1` measurement window. Re-review replaces the prior decision and attention minutes instead of double-counting either summary. |
| Evidence | Every review writes the run decision, reviewer, reason, timestamp, audit event, and latest run timeline. The compact revenue summary receives only the attention-minute delta. |
| UI and mobile | Private desktop AI workspace shows provider runs, rules scores, cumulative pass/rejected-fact/review rates, attention, and review controls. Mobile remains read-only and the API classifies review as blocked approval. |
| Side effects | Review cannot send, export, publish, create a proposal, approve spend, promote autonomy, or write MenuList store/menu/project/billing truth. |
| Local proof | `npm run verify:signaldesk` passes 2,241 checks; `npx tsc --noEmit --pretty false` and `npm run test:signaldesk:e2e:local` pass. The emulator test covers non-founder denial, rules-run denial, required reasons, review replacement, attention replacement, audit/timeline evidence, workspace separation, and no outbound export. |

## Bengaluru Trial Preparation - July 10, 2026

| Area | Verified result |
| --- | --- |
| Market scope | Market Search presets, placeholder, manual experiment defaults, and pod review reason use Indiranagar/Koramangala, Bengaluru. Presets request 25 rows while the general hard cap remains 30. |
| Source authority | Defaults seed a 30-day `Public business research` policy with contact and personalization false, plus a separate `Permissioned manual introduction` policy. Manual import prefers the evidence-only policy and strips contact fields. |
| Founder authority | Source-policy activation, budget mutation, commercial offer/envelope mutation, and trust-partner deal approval map to `signaldesk.configure`; standard growth-manager and compliance-reviewer roles cannot perform those founder decisions. Existing envelope and market-pod server checks remain in force. |
| Spend | Google Places discovery is disabled, unapproved, and zero-budget by default. The first trust-partner learning budget and deal fee are zero. |
| Experiment | Manual channel, 25 candidates, five owner-conversation stop rule, three two-surface activations within seven days, and one permissioned proof asset are the first-run values. |
| Operating artifact | `menulist-signaldesk_bengaluru-activation-trial-operating-pack-2026-07-10.md` records the approved envelope, 25-row board, evidence packet, draft-only scripts, preview checklist, tracking routes, stop rules, and external blockers. |
| Boundaries | No business contact, provider enablement, message send, content publish, spend, Firebase deploy, or MenuList truth write occurred. |
| Local proof | `npm run verify:signaldesk` passes 2,183 checks; `npx tsc --noEmit --incremental false --pretty false`, local Firestore E2E, Firestore/Storage rules tests, documentation links, and scoped diff checks pass. |

## Revenue Operating Layer Runtime - July 10, 2026

| Area | Implementation Evidence |
| --- | --- |
| Route and UI | Private `/signaldesk/revenue` is in the typed route/section/API allowlists and shows summary, account qualification, opportunity, offer, envelope, and activation-watch panels; mobile controls use the existing read-only mutation gate. |
| Actions | `qualify-revenue-account`, `upsert-commercial-opportunity`, `upsert-commercial-offer`, `review-market-pod`, `upsert-operating-envelope`, and `refresh-activation-watch` are Zod-validated, permissioned, rate-limited, mobile-blocked actions. Market-pod review additionally requires founder role. |
| Qualification | Account and opportunity IDs are deterministic per target; suppression/contactability/source policy and reply/segment/score state decide opportunity eligibility; an interested reply invokes the same guarded qualification automatically; only two-surface activation creates won/customer state. |
| Commercial consistency | Opportunity stage/status combinations are validated, won/lost state requires a reason, value requires an offer-derived currency, mixed-currency aggregation is rejected, and changed commercial terms require a new immutable offer version. |
| Autonomy boundary | Research/recommendation keeps unreviewed pods held and zero-budget. Only the founder role can approve an envelope. Its write transaction rereads active status plus founder `approvedBy`/`reviewDecision` evidence, source policy, active offer, compatible global/pod budget, explicit email sender, active template, time/cost/volume caps, and stop rules. Draft/held/expired/exception-only states remain held; approved modes remain shadow or approval-only. |
| Activation boundary | Target outcomes automatically refresh watches through indexed latest-30, exact-earliest, and terminal-activation `signaldeskOutcomeSummaries` reads; later qualification reconciles outcomes that arrived before the account; two-surface activation transactionally closes the opportunity and removes forecast value exactly once; elapsed deadlines read as stalled without a scheduler; E2E asserts no `stores`, `menus`, `projects`, or `billing` writes. |
| Founder brief | Daily Growth Mission prioritizes stalled activations and overdue revenue actions, then reports open opportunities, founder-attention minutes, and estimated daily AI/provider spend. |
| First trial default | Create-only seed and first-run UI use the maintained Bengaluru/Indiranagar/Koramangala hypothesis, remain held, carry no pre-approved pod budget, migrate only the exact unapproved legacy Mumbai seed, and cannot overwrite later founder pod approval. |
| Firebase | Six product-local revenue collections are internally readable and client-write denied. Summary-shaped composite indexes support lifecycle/status/account/target views plus deterministic earliest/latest target outcome derivation. |
| Local proof | TypeScript, focused lint, 2,100+ static SignalDesk checks, concurrent/idempotent Firestore E2E, and authenticated/public/member Firestore/Storage rules semantics pass locally. |

### Findings Closed By Cross-Check

1. Removed automatic selection of the first active provider budget; revenue envelopes now accept only compatible global or active-pod budget authority.
2. Made active market pod scope mandatory before an envelope can be approved.
3. Made account/opportunity/summary and activation/forecast deltas transactional so concurrent retries cannot double-count.
4. Made two-surface activation close the linked opportunity and remove its value from open/weighted forecast.
5. Added one-currency pipeline enforcement, deterministic immutable offer/envelope IDs, coherent held execution states, expiry annotation, approval-history preservation, and explicit active-offer selection.
6. Disabled the entire revenue form fieldset on mobile in addition to the existing server mutation block.
7. Removed the manual dependency between interested reply and revenue qualification, and between recorded outcome and activation-watch refresh; bounded recovery remains available.
8. Added read-time seven-day stall derivation and made stalled/overdue commercial work part of the deterministic founder brief.
9. Replaced conflicting Mumbai/Pune first-run defaults with the held, zero-budget Bengaluru trial recommendation without silently activating it.
10. Made the first-pod seed create-only except for the exact unapproved legacy Mumbai migration, so rerunning defaults cannot revoke or rewrite founder approval.
11. Reconciled outcomes recorded before revenue-account creation so event ordering cannot strand activation state.
12. Added explicit founder-only market-pod approve/hold/reject and blocked recommendation/research paths from self-activation or implied spend.
13. Required stored founder pod approval evidence before an operating envelope can use even a pod marked active.
14. Removed legacy `converted` as commercial win authority; published-only accounts remain open until two-surface activation.
15. Replaced unordered 30-summary activation reads with indexed latest, exact-earliest, and terminal-activation queries so long history cannot lose lifecycle truth.
16. Tightened the legacy Mumbai migration to the complete unapproved default shape.
17. Made approved operating envelopes founder-only and closed the validation/write race by rereading every referenced control inside the write transaction.

## Diagnostic Boundaries - June 28, 2026

SignalDesk webhook rejection logs, overview/workspace/action/kill-switch route failures, overview-loader failures, enrichment waterfall blocked summaries, and research-agent blocked audit events now use stable local reason codes instead of raw provider, user, action, or exception messages. Provider webhook rate-limit keys hash the normalized client IP before storage, and authenticated API guards hash user/email key material before constructing limiter keys. `node scripts/verification/verify-signaldesk-runtime.js` guards the bounded API diagnostics helper, route failure codes, hashed API/webhook rate-limit keys, bounded webhook body reader, stable webhook rejection code, provider-budget block code, research-agent blocked audit code, and the old raw-message patterns.

## Client Response Boundary - June 30, 2026

SignalDesk client DAL responses now use `readJsonResponseWithLimit()` with a 1 MB cap before overview, workspace, action, or kill-switch success can advance. Overview and workspace responses must include the `{ data }` envelope and expected summary objects/arrays before local state changes; action and kill-switch responses preserve the previous truthy-data acknowledgement behavior while gaining bounded parse, rejected-response, and invalid-response diagnostics. `npm run verify:signaldesk` guards the response cap, bounded reader, envelope and overview/workspace guards, fixed diagnostic codes, and absence of direct `await response.json()` parsing.

## API Guard Security-Log Boundary - June 30, 2026

SignalDesk shared API guard security logs now use `getSignalDeskSecurityLogContext()` with `getBoundedSecurityRouteContext()` and SignalDesk-local endpoint/method/action/permission/feature presence-length metadata. Validation failures, permission failures, rate-limit rejections, and malformed JSON keep the same event names, severities, response statuses, rate limits, and access behavior, but no longer spread raw `buildSecurityContext()` output into security events. `npm run verify:signaldesk` now guards the bounded security route context, bounded endpoint/method fields, and raw-context bans.

## Internal Team Access Runtime - June 25, 2026

SignalDesk now has a private Settings flow for adding a partner or growth teammate without creating a public signup surface.

| Area | Implementation Evidence |
| --- | --- |
| Access resolver | `src/lib/signaldesk/access.ts` resolves non-platform access through `signaldeskTeamMembers` by document ID, stored `userId`, or normalized `emailLower`. |
| Types | `src/types/signaldesk/index.ts` defines `SignalDeskTeamMemberSummary` and includes `teamMembers` in the Settings workspace payload. |
| Server action | `src/lib/signaldesk/workflowServer.ts` adds `upsertSignalDeskTeamMemberServer`, writes only `signaldeskTeamMembers`, blocks self-deactivation, preserves existing extra permissions without granting new ones from the UI, and audits membership changes. |
| API | `src/app/api/signaldesk/actions/route.ts` validates `upsert-team-member`, maps it to `signaldesk.configure`, applies rate limiting, and classifies it as mobile-blocked configuration. |
| Client DAL | `src/database/signaldesk/index.ts` adds `upsert-team-member` to the SignalDesk action union. |
| UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` adds a Team Access panel under private Settings with add/update/deactivate/reactivate controls and role assignment; the workspace API only includes team-member rows for users with `signaldesk.configure`. |
| Boundary | No public SignalDesk signup, no owner/customer navigation, no MenuList truth write, no raw secret storage, and no provider-send change was added. |

Provider send is wired but disabled by `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND: false`. It must remain disabled until sender identity, physical address, unsubscribe, bounce/complaint/suppression handling, approved source lists, provider credentials, and project access are ready. Paid campaign automation, real external paid-provider adapters except the gated Apify source broker, real external sequencer API calls, content auto-publish, and Firebase deploy were explicitly skipped for this slice.

## Dashboard UI Alignment - June 24, 2026

SignalDesk now follows the same private dashboard chrome pattern used by the MenuList/Answerlattice-style internal apps:

| Area | Current result |
| --- | --- |
| Theme | The protected SignalDesk layout is wrapped with `AntdThemeProvider`, so dashboard controls inherit the same Ant Design theme/dark-mode state. |
| Shell | `SignalDeskWorkspace` uses `DashboardSidebarShell` for the left navigation and `DashboardHeaderShell` for the fixed top header. |
| Navigation | SignalDesk sections remain private/internal and are routed through the left sidebar. `/sd` and `/sd/app` aliases preserve the `/sd` base path without adding public MenuList navigation. |
| Controls | Workspace buttons, inputs, number inputs, selects, checkboxes, and textareas are rendered through SignalDesk-local wrappers backed by Ant Design components. The runtime verifier now fails if raw form controls return to the workspace. |
| Local proof | `npm run verify:signaldesk`, `npx tsc --noEmit --incremental false --pretty false`, `node scripts/verification/smoke-signaldesk-routes.js`, and `git diff --check` passed after the UI alignment. |

## Audit Blocker Follow-Up - June 24, 2026

The 2026-06-24 Codex audit blockers were closed for local validation only. SignalDesk remains private/internal, provider send remains disabled, no Firebase deploy was run, and no real paid provider API was called.

| Blocker | Resolution | Local Proof |
| --- | --- | --- |
| Full authenticated local E2E workflow was not executed. | Added `scripts/verification/e2e-signaldesk-local.js`, a deterministic Firestore-emulator E2E with a seeded SignalDesk founder-admin access context. It runs import, dedupe/provenance, score, evidence, draft, approval, export-only handoff, reply classification, outcome, summaries, no MenuList truth writes, duplicate webhook dedupe, DNC suppression, unsupported-claim rejection, suppressed export rejection, provider-send disabled rejection, and mobile blocked-action audit fixtures. | `npm run test:signaldesk:e2e:local` passes with local emulator data only. |
| Source-policy expiry was not modeled or enforced. | `SignalDeskSourcePolicy` now carries `approvedAt`, explicit/computed expiry, provider identity, expanded allowed-use fields, and UI policy state. `assertSourcePolicyUsable()` enforces status, source type, provider, allowed use, retention, expiry/review-required state, and active block state across import, provider run, evidence, draft, approval, export/handoff, sequence/send, AI assist, enrichment, and retention refresh paths. | E2E negatives cover missing policy, expired policy, legacy no-expiry-basis review, missing retention, provider-run expired, evidence expired, draft expired, and export expired. |
| Mobile read-only policy was not a hard runtime gate. | `/api/signaldesk/actions` now detects mobile contexts from `x-signaldesk-client-mode`, `sec-ch-ua-mobile`, and mobile user-agent, classifies actions, blocks all mutation/action classes on mobile, returns `MOBILE_READ_ONLY_ACTION_BLOCKED`, and writes audit events. `/api/signaldesk/kill-switches` allows mobile emergency pause only with `MOBILE_EMERGENCY_PAUSE` confirmation. UI disables high-risk controls on mobile. | E2E verifies mobile detection, route contract, blocked-action audit events, and server-side block code is covered by `npm run verify:signaldesk`. |
| Firestore/Storage semantic rules-unit tests were missing. | Added Firebase-11-compatible `@firebase/rules-unit-testing@4.0.1` and expanded `scripts/verification/verify-signaldesk-security-rules.js` with unauthenticated, MenuList-owner, inactive-member, active-member, and platform-admin Firestore/Storage contexts. | `npm run test:signaldesk:rules` passes. |

Additional fix found by E2E: the SignalDesk-local Firestore sanitizer now preserves Firestore transform sentinels such as `FieldValue.increment(...)`, so dashboard and cost counters update as numeric summary fields instead of empty objects.

## Solo-Founder Operating Layer Runtime - June 24, 2026

The ChatGPT feedback review was adopted as an internal operating-layer slice: SignalDesk should choose and compress the next best founder decisions, not become another dashboard to babysit.

| Area | Implementation Evidence |
| --- | --- |
| Route | `/signaldesk/mission` renders the Daily Growth Mission workspace and is included in the protected workspace API section allowlist. |
| Actions | `create-daily-growth-mission`, `review-growth-mission`, `create-experiment-card`, `review-experiment-card`, `upsert-offer-cta`, `upsert-reply-playbook`, and `create-source-quality-snapshot` are protected, validated, permissioned actions. |
| Runtime | `ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER` is true. Server actions write growth missions, experiment cards, offer CTAs, reply playbooks, source quality snapshots, audit events, run timelines, and daily cost summaries. |
| UI | Mission screen includes a daily action queue, owner approve/hold/redirect/complete decisions, experiment cards, offer CTA library, reply playbooks, source quality snapshots, and a 7-day operating trial checklist. |
| Firebase | Operating-layer collections are product-local, internally readable, client-write denied, and indexed for owner-decision/status/recommendation review flows. |
| Boundary | No provider send, no paid campaign automation, no public SignalDesk page, no social auto-publish, no external paid adapter, and no MenuList store/menu/project/billing write was added. |

## Content Distribution Rail Runtime - June 24, 2026

The Distribution.ai review was adopted as a content repurposing pattern, not as a public social manager or auto-publish system. SignalDesk now has an internal rail for owned proof and channel-ready drafts.

| Area | Implementation Evidence |
| --- | --- |
| Route | `/signaldesk/content` renders the Content Distribution workspace. |
| Actions | `upsert-content-source`, `create-content-asset`, `generate-content-distribution-drafts`, `review-content-distribution-draft`, `schedule-content-distribution-draft`, and `record-content-performance` are protected, validated, permissioned actions. |
| Runtime | `ENABLE_MENULIST_SIGNALDESK_CONTENT_DISTRIBUTION_RAIL` is true. Server actions write sources, assets, drafts, calendar items, performance summaries, audit events, run timelines, queue summaries, and cost summaries. |
| Firebase | Content collections are product-local, internally readable, client-write denied, and indexed for future filtered views. |
| Boundary | No auto-publish, no social scheduler adapter, no paid campaign automation, no provider send, no public page, and no deploy was added. |

## Market Pod Planner And Weekly Memo - June 24, 2026

This implementation slice completed the internal decision layer for a solo founder using SignalDesk as the MenuList distribution operating system.

| Area | Implementation Evidence |
| --- | --- |
| Market pod planner | `recommend-market-pod-plan` writes `signaldeskMarketPods` confidence, recommendation, recommendation reason, recommended owner actions, audit, daily cost estimate, and run timeline from existing targets, demand signals, outcomes, source runs, and CTAs. |
| Weekly strategist memo | `create-weekly-strategist-memo` writes `signaldeskStrategistMemos` with summary, cost posture, provider quality, risk notes, recommended market pod, and next owner decisions. It is rules-based and does not call a strong model. |
| Channel windows | `upsert-channel-window-state` records WhatsApp/Instagram/Messenger window state and channel health with audit and timeline writes. |
| Source retention | `refresh-provider-source-retention` updates refresh/expiry state for provider-source records without storing raw payloads. |
| Provider evaluation shell | `create-provider-evaluation` compares existing vendor/enrichment records and writes a provider recommendation without calling Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, or another paid adapter. |
| Partners route | `/signaldesk/partners` is accepted by the workspace API and renders Trust Partner Rail controls plus read-only trust-partner summaries. Runtime actions are enabled by `ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL: true`, while real spend still requires active budget policy and founder approval. |
| Firestore rules | New SignalDesk collections are readable only to authenticated SignalDesk readers and remain client-write denied. |
| Verifier | `npm run verify:signaldesk` now checks the new section, actions, workflow exports, workspace arrays, UI controls, collection constants, and read rules. |

## Trust Partner Rail Runtime - June 24, 2026

The X article on Cal AI's influencer operating system was adopted only as a SignalDesk input. The useful parts were translated into a B2B/local-business trust-channel rail for MenuList: restaurant consultants, menu photographers, local business operators, agencies, and partner audiences with restaurant-owner reach.

| Area | Decision |
| --- | --- |
| Adopted | 20-second trust test, 3-5 niche test rule, flat-fee economics, lean briefs, deliverable tracking, result capture, and renew/hold/cut recommendations. |
| Rejected | Broad consumer influencer scale, follower-count buying, per-view default pricing, celebrity creator deals, public partner portal, automated contracts, automated payments, and paid campaign automation. |
| Docs | `__docs__/menulist-signaldesk/signaldesk-trust-partner-rail/` now contains the internal feature doc set and runtime status. |
| Runtime | `ENABLE_MENULIST_SIGNALDESK_TRUST_PARTNER_RAIL` is true. The route, workspace reads, action schemas, server actions, Firestore rules, indexes, verifier checks, and UI controls exist for internal testing. No automated outreach, contract, payment, deploy, provider send, or paid campaign automation was added. |
| Compliance | Paid or incentivized partner content must include disclosure checks, approved claims, banned-claim review, and owner approval before any deal moves forward. |

## From-Scratch Docs/Code Parity Cross-Check - June 23, 2026

The fresh cross-check rebuilt the SignalDesk docs inventory, code inventory, section/action contracts, protected route map, public-surface isolation check, Firebase rule parse, Functions skeleton build, and local route/API smoke from repo truth.

| Finding | Classification | Fix |
| --- | --- | --- |
| `/signaldesk/settings` existed in routes, UI nav, and the `SignalDeskSection` union, but `src/app/api/signaldesk/workspace/route.ts` did not accept `settings` in its section allowlist. | Code mismatch | Added `settings` to the protected workspace API section allowlist so authenticated Settings requests load the Settings workspace instead of falling back to dashboard. |
| `menulist-signaldesk_feature-map.md` still described source-provider runs and assisted channel routing as excluded/deferred even though the gated Google Places/FHRS-FHIS/Apify source providers and assisted channel plumbing are implemented. | Stale docs | Updated the feature map to mark implemented runtime slices, keep cold sends/provider sends/paid campaigns skipped, and reflect monorepo product-isolated runtime status. |
| `menulist-signaldesk_action-register.md` reused `SD-I034` for two different implementation rows. | Documentation integrity | Renumbered the prior-contact/prior-outcome spend guard row to `SD-I041` and added this parity pass plus the Settings API alignment as tracked actions. |

Final verdict after fixes: PASS for the implemented and intentionally skipped scope. The remaining blockers are still owner/access/policy blockers, not code/docs parity failures.

## Apify Source Broker - June 23, 2026

SignalDesk now includes Apify as a gated source/evidence broker. It does not run arbitrary browser-supplied Actors, does not store raw dataset payloads, and does not bypass source policy or approval gates.

| Area | Implementation Evidence |
| --- | --- |
| Feature gate | `src/config/features.ts` adds `ENABLE_MENULIST_SIGNALDESK_APIFY_SOURCE_BROKER` beside the broader source-provider flag. |
| Env constants | `src/constants/signaldesk/integrations.ts` adds `MENULIST_SIGNALDESK_APIFY_API_TOKEN`, `MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID`, `MENULIST_SIGNALDESK_APIFY_WEBHOOK_SECRET`, and the Apify API base URL. |
| Types | `src/types/signaldesk/index.ts` adds `apify` to source provider, provider, and connector kind unions, with connector channel `source`. |
| Source adapter | `src/lib/signaldesk/sourceProviders.ts` runs the env-controlled Actor through Apify's synchronous dataset-items endpoint, normalizes `owner/actor` slugs to Apify's `owner~actor` API form, applies both returned-row and charge caps, and normalizes rows into target import fields. |
| Workflow guard | `src/lib/signaldesk/workflowServer.ts` blocks Apify when the broker flag is off, requires source-provider policy/evidence use, checks provider account and budget, writes provider spend, and imports through the existing target import path. |
| Defaults | `src/lib/signaldesk/workflowServer.ts` seeds Apify as disabled/owner-held until the source Actor, policy, and budget are approved. |
| Connector settings | `src/lib/signaldesk/workflowServer.ts` derives Apify readiness from env without storing token/secret values; `src/components/signaldesk/SignalDeskWorkspace.tsx` exposes Apify in Settings. |
| Sources UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` adds Apify as a source provider, a max-results cap input, and an owner approval control for the Apify discovery provider account. |
| API validation | `src/app/api/signaldesk/actions/route.ts` validates Apify source runs, provider accounts, and connector settings through the existing protected action API. |
| Webhook status events | `src/app/api/signaldesk/webhooks/[provider]/route.ts` and `src/lib/signaldesk/webhookServer.ts` accept `/api/signaldesk/webhooks/apify`, verify a shared secret header, store only normalized event metadata and payload hash, and update source health. |
| Documentation | `__docs__/menulist-signaldesk/menulist-signaldesk_apify-source-broker.md` records the source-policy, provider approval, env Actor, no-raw-payload, and no-direct-send rules. |

Final cross-check fix: the adapter now accepts copied `owner/actor-name` values by normalizing them to Apify's `owner~actor-name` API form, sends both `limit` and `maxItems`, and uses the same 5-25 cent estimated cap that the provider budget guard checks before the external call.

## FHRS/FHIS UK Source Provider - June 25, 2026

SignalDesk now includes FHRS/FHIS as a free official UK food-business establishment seed. It is not a contact-permission source, not a public hygiene-rating feature, and not a send path.

| Area | Implementation Evidence |
| --- | --- |
| Feature gate | `src/config/features.ts` adds `ENABLE_MENULIST_SIGNALDESK_FHRS_FHIS_SOURCE_PROVIDER` beside the broader source-provider flag. |
| API base | `src/constants/signaldesk/integrations.ts` adds `SIGNALDESK_FHRS_API_BASE = "https://api.ratings.food.gov.uk"`. |
| Types | `src/types/signaldesk/index.ts` adds `fhrs-fhis` to source provider/provider unions and provider-source retention eligibility. |
| Source adapter | `src/lib/signaldesk/sourceProviders.ts` calls `GET /Establishments` with `x-api-version: 2`, maps restaurant/takeaway/pub/caterer query tokens to FSA business type IDs, and normalizes establishment rows into target import rows. |
| Contact boundary | The adapter intentionally does not map FHRS/FHIS `Phone` or local authority email into SignalDesk contact fields; notes state that no contact permission is inferred. |
| Workflow guard | `src/lib/signaldesk/workflowServer.ts` blocks the provider when the feature flag is off, requires provider source policy/evidence use, checks provider account/budget through the normal governor, writes zero-cost vendor/source ledgers, and stores provider-source retention without raw payload. |
| Defaults | `src/lib/signaldesk/workflowServer.ts` seeds `fhrs-fhis` as a zero-cost `not_required` discovery provider account in evaluation state. |
| Sources UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` exposes `FHRS/FHIS UK` in private live source runs and includes a provider-approval shortcut. |
| Verification | `scripts/verification/verify-signaldesk-runtime.js` checks flag/type/adapter/UI/docs contracts; `scripts/verification/e2e-signaldesk-local.js` mocks the FSA API and verifies normalization, no contact identities, and retention without raw payload. |
| Documentation | `__docs__/menulist-signaldesk/menulist-signaldesk_fhrs-fhis-source-provider.md` records the official-source basis, query behavior, source-policy rules, contact boundary, and public-rating restriction. |

The long-term use is UK market-pod discovery: official establishment seed -> source policy -> target import -> website/menu/social enrichment -> current-menu gap score -> evidence packet -> owner-approved outreach/export. It does not change MenuList product truth and does not publish hygiene claims.

## Research Agent Table - June 26, 2026

SignalDesk now includes an Origami-style prompt-to-table workflow inside the private Mission screen. It turns a plain-English research prompt into a governed source-provider run, normalized target import, enrichment rows, pass/fail/unsure scoring, source transparency, and market-pod update.

| Area | Implementation Evidence |
| --- | --- |
| Feature gate | `src/config/features.ts` adds `ENABLE_MENULIST_SIGNALDESK_RESEARCH_AGENT_TABLE`. |
| Types | `src/types/signaldesk/index.ts` adds `SignalDeskResearchRunSummary`, `SignalDeskResearchTableRowSummary`, and `SignalDeskResearchProviderId`. |
| Collections | `src/constants/signaldesk/database.ts` adds `signaldeskResearchRuns` and `signaldeskResearchTableRows`; Firestore rules keep them internal-read/server-write only. |
| API | `src/app/api/signaldesk/actions/route.ts` adds protected `create-research-agent-run` validation, permission mapping, mobile read-only classification, and safe errors. |
| Workflow | `src/lib/signaldesk/workflowServer.ts` adds `createSignalDeskResearchAgentRunServer`, deterministic prompt parsing, provider policy resolution, optional idempotency, source-provider execution, row scoring, source transparency, and market-pod update. |
| UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` adds Dashboard `Market Search`, Bengaluru prompt presets with a 25-row first-trial default and 30-row hard cap, Dashboard/Mission `Today's Lead Batch`, and the Mission `Research Agent Table`, with prompt, provider, research type, latest run summary, structured evidence/contact/share/next cards, failed-row exclusion from the daily batch, contact path, share message, and next action. |
| Verification | `scripts/verification/verify-signaldesk-runtime.js` checks flag/action/type/collection/UI/rules/index contracts; `scripts/verification/e2e-signaldesk-local.js` mocks FHRS/FHIS, creates a research table, verifies idempotency, row source refs, market-pod update, and no source-only contact identities. |
| Documentation | `__docs__/menulist-signaldesk/signaldesk-operating-layer/signaldesk-operating-layer_research-agent-table.md` records the workflow, row contract, boundaries, and verification. |

This is not an Origami integration, not a sequencer, and not auto-outreach. It copies the useful product behavior: prompt-to-table, provider-backed discovery, enrichment columns, pass/fail/unsure scoring, source transparency, async-compatible run records, idempotency, market mapping, and a founder-first 30-row lead batch.

## Owned Email Sequencer Self-Build - June 23, 2026

The third-party sequencer review changed the implementation order. SignalDesk now attempts the self-owned path first and keeps Smartlead/Instantly/lemlist as optional fallback rails.

| Area | Implementation Evidence |
| --- | --- |
| Self-build decision | `__docs__/menulist-signaldesk/signaldesk-email-rail/signaldesk-email-rail_owned-sequencer.md` records why low-volume owned sequencing is feasible before Smartlead. |
| Feature gate | `src/config/features.ts` adds `ENABLE_MENULIST_SIGNALDESK_OWNED_EMAIL_SEQUENCER` while keeping `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND` disabled. |
| Types | `src/types/signaldesk/index.ts` adds `owned-email`, sequencer provider typing, queued approval state, handoff fields, and `SignalDeskSequencerStepSummary`. |
| Collections | `src/constants/signaldesk/database.ts` adds `signaldeskSequencerSteps`; `firestore-signaldesk.rules` allows internal read-only access; `firestore-signaldesk.indexes.json` adds handoff and step indexes. |
| Defaults | `src/lib/signaldesk/workflowServer.ts` seeds `owned-email` as an approved internal sequencer provider with no external credential requirement. |
| Queue creation | `src/lib/signaldesk/workflowServer.ts` creates an `owned-email` handoff plus ready step only after approved-message, sender-domain, email-env, source-policy, suppression, prior-contact, global/email/campaign pause, and audit gates. |
| Send execution | `src/lib/signaldesk/workflowServer.ts` adds `sendSignalDeskOwnedSequenceStepServer`, which remains blocked while provider send is disabled and rechecks pauses, suppression, recipient, and email readiness before SMTP send. |
| API | `src/app/api/signaldesk/actions/route.ts` adds `send-owned-sequence-step` validation, permission mapping, and safe block errors. |
| Client DAL | `src/database/signaldesk/index.ts` adds the new action to the SignalDesk action union. |
| UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` defaults the Channels screen to `owned-email`, supports owned rail approval, sender ready/hold controls, queue creation, handoff listing, step listing, and gated send-step action. |

## Connector Settings - June 23, 2026

SignalDesk now has a dedicated internal Settings surface for email SMTP, Meta WhatsApp, Meta Instagram, Meta Messenger, and Smartlead fallback connector records.

| Area | Implementation Evidence |
| --- | --- |
| Route | `src/app/(signaldesk)/signaldesk/settings/page.tsx` renders the Settings workspace section. |
| Nav and screen | `src/components/signaldesk/SignalDeskWorkspace.tsx` adds Settings navigation, connector form state, connector save action, connector list, sender-domain controls, channel health, and provider account summaries. |
| Types | `src/types/signaldesk/index.ts` adds `settings`, connector kind/readiness/secret-state types, and `SignalDeskConnectorSettingSummary`. |
| Collection | `src/constants/signaldesk/database.ts` adds `signaldeskConnectorSettings`. |
| Env constants | `src/constants/signaldesk/integrations.ts` adds full-name Smartlead env keys and reuses the existing full-name email/Meta env keys. |
| Server action | `src/lib/signaldesk/workflowServer.ts` adds env-derived connector readiness and `upsertSignalDeskConnectorSettingServer`. |
| API | `src/app/api/signaldesk/actions/route.ts` validates `upsert-connector-setting`, maps it to `channel.configure`, and routes through the existing protected action API. |
| Client DAL | `src/database/signaldesk/index.ts` adds the new action to the client action union. |
| Rules/indexes | `firestore-signaldesk.rules` exposes connector settings as read-only to SignalDesk users; `firestore-signaldesk.indexes.json` adds the connector kind/status index. |
| Security boundary | `__docs__/menulist-signaldesk/menulist-signaldesk_connector-settings.md` records the no-raw-secret storage rule. |

## Owner Control Reframe - June 23, 2026

The founder POV is now part of the implementation record: SignalDesk should market and distribute MenuList with Danny mainly observing, monitoring, approving, pausing, or redirecting.

| Area | Evidence |
| --- | --- |
| Owner-control doctrine | `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:8` through `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:24` defines the founder/system responsibility split. |
| Automation ladder | `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:35` through `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:46` keeps record/recommend/prepare/assist separate from disabled send and skipped spend. |
| Approval boundaries | `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:88` through `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:100` lists the human-approved gates. |
| Dashboard copy | `src/components/signaldesk/SignalDeskWorkspace.tsx:34` through `src/components/signaldesk/SignalDeskWorkspace.tsx:52` frames dashboard/target/approval pages around observe, monitor, and approve. |
| Dashboard operating strip | `src/components/signaldesk/SignalDeskWorkspace.tsx:203` through `src/components/signaldesk/SignalDeskWorkspace.tsx:219` renders Observe, Monitor, Approve as the first dashboard model. |
| Control-room audit reasons | `src/components/signaldesk/SignalDeskWorkspace.tsx:360` through `src/components/signaldesk/SignalDeskWorkspace.tsx:410` removes operator-centric approval/pause reason strings. |
| Responsive UI style | `src/components/signaldesk/SignalDeskWorkspace.module.scss:117` through `src/components/signaldesk/SignalDeskWorkspace.module.scss:144` styles the dashboard operating strip. |

## Web Research Gate Additions - June 23, 2026

The web research pass added only gates that fit the owner-control model. It did not enable provider send, paid campaigns, Firebase deploy, public pages, or extra source providers.

| Area | Evidence |
| --- | --- |
| Research addendum | `__docs__/menulist-signaldesk/menulist-signaldesk_web-research-addendum-2026-06-23.md:1` through `__docs__/menulist-signaldesk/menulist-signaldesk_web-research-addendum-2026-06-23.md:124` records sources, adopted gates, rejected additions, and follow-up work. |
| Compliance additions | `__docs__/menulist-signaldesk/menulist-signaldesk_compliance.md:33` through `__docs__/menulist-signaldesk/menulist-signaldesk_compliance.md:48` adds sender, Meta channel, Places, TCPA, and AI risk rules. |
| Owner-control gates | `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:48` through `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:58` defines sender health, channel window, source retention, AI risk, and consent gates. |
| Investment posture | `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:60` through `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:74` allows paid AI/provider use only behind policy, budget, provenance, suppression, and approval controls. |
| Approval-packet shape | `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:115` through `__docs__/menulist-signaldesk/menulist-signaldesk_owner-control-model.md:127` defines the owner approval packet. |
| Backlog items | `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md:61` through `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md:65` adds implementation follow-ups for sender health, channel windows, source retention, approval packets, and AI quality monitoring. |

## Solo-Founder Investment Plan - June 23, 2026

The solo-founder investment plan adds paid AI/provider strategy without enabling provider send, buying accounts, running external providers, implementing paid campaigns, or deploying Firebase.

| Area | Evidence |
| --- | --- |
| Core investment posture | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:8` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:40` defines SignalDesk as the internal MenuList distribution operating system and keeps founder posture observe/monitor/approve/pause-or-redirect. |
| Research sources | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:42` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:58` records Apollo, Hunter, ZeroBounce, Places, Firecrawl, Tavily, Exa, OpenAI, Gemini, Anthropic, Resend/Postmark, FTC, Gmail, and market-practice source inputs. |
| Recommended stack | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:60` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:75` defines provider candidates, sequencer/execution-rail candidates, and hard gates. |
| Market-practice updates | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:77` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:90` records the added waterfall, duplicate guard, audience/signal, sequencer, sender-domain, run timeline, and self-service CTA updates. |
| Apollo boundary | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:92` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:115` allows Apollo for high-value B2B/company/person enrichment while rejecting blind mass imports and contact reveal before source policy approval. |
| AI router | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:117` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:140` defines cheap-model versus strong-model routing and hard AI limits. |
| Operating agents and data model | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:142` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:182` defines the internal agent graph and data additions. |
| Budget and build order | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:184` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:221` defines budget tiers, provider purchase cautions, and build slices A-J. |
| First 30 days and non-negotiables | `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:223` through `__docs__/menulist-signaldesk/menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md:273` defines the first operating plan, success metrics, boundaries, and next recommendation. |
| Action register | `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md:36` through `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md:81` tracks the new documentation and implementation actions. |
| Founder decisions | `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md:111` through `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md:116` adds paid-provider budget, eval-set, strong-model budget, sequencer rail, sender-domain risk, and self-service CTA decisions. |

## Market Practice Cross-Check - June 23, 2026

The market-practice cross-check reviewed current Clay/Apollo/no-code/sequencer/deliverability patterns and updated the SignalDesk plan without enabling providers, sequencers, sender automation, scraping, paid campaigns, or deploys.

| Area | Evidence |
| --- | --- |
| Research verdict | `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:8` through `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:41` defines the market stack and rejected scrape/enrich/auto-send shortcut. |
| Sources reviewed | `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:43` through `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:61` records Clay, Smartlead, lemlist, n8n, Zapier, Make, Instantly, Gmail, Gartner, and over-automation source inputs. |
| Adopted updates | `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:63` through `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:167` defines data layer, waterfall, duplicate guard, signal plays, personalization, sequencer, no-code, deliverability, and self-service proof updates. |
| Rejected practices and final shape | `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:169` through `__docs__/menulist-signaldesk/menulist-signaldesk_market-practice-cross-check-2026-06-23.md:199` rejects unsafe market practices and defines the updated SignalDesk operating shape. |

## Investment-Control Runtime - June 23, 2026

The non-paid, non-deploy investment-control slice is implemented. It adds internal controls and summary records before any paid-provider scale, without connecting Apollo/Hunter/ZeroBounce/Firecrawl/Tavily/Exa/Postmark/Resend/Smartlead/Instantly/lemlist accounts.

| Area | Implementation Evidence |
| --- | --- |
| Shared types | `src/types/signaldesk/index.ts:55` through `src/types/signaldesk/index.ts:76` defines provider, budget, status, and AI task unions; `src/types/signaldesk/index.ts:340` through `src/types/signaldesk/index.ts:524` defines provider accounts, budgets, vendor runs, enrichment results, waterfalls, model routes/evals, approval packets, market pods, audience segments, sequencer handoffs, sender domains, run timelines, and CTAs. |
| Workspace payload | `src/types/signaldesk/index.ts:561` through `src/types/signaldesk/index.ts:591` adds the new summary arrays to `SignalDeskWorkspaceData`. |
| Collections | `src/constants/signaldesk/database.ts:50` through `src/constants/signaldesk/database.ts:63` defines the new product-local collections. |
| Firestore rules | `firestore-signaldesk.rules:145` through `firestore-signaldesk.rules:213` allows only authenticated SignalDesk readers to read the new summary collections and denies client writes. |
| Workspace defaults | `src/lib/signaldesk/workflowServer.ts:233` through `src/lib/signaldesk/workflowServer.ts:264` initializes the new workspace arrays. |
| Budget guard | `src/lib/signaldesk/workflowServer.ts:379` through `src/lib/signaldesk/workflowServer.ts:435` checks provider account approval, per-run/daily/monthly caps, provider budget policy, and writes spend increments. |
| Prior-contact guard | `src/lib/signaldesk/workflowServer.ts:437` through `src/lib/signaldesk/workflowServer.ts:461` blocks suppressed, contacted, replied, converted, outcome-bearing, or non-new-conversation targets. |
| Approval packet helper | `src/lib/signaldesk/workflowServer.ts:511` through `src/lib/signaldesk/workflowServer.ts:554` creates packet risk/action summaries from evidence, draft, sender readiness, suppression, and prior-contact state. |
| Model route guard | `src/lib/signaldesk/workflowServer.ts:556` through `src/lib/signaldesk/workflowServer.ts:572` resolves active model routes, blocks non-Gemini runtime providers, and checks AI provider budget. |
| Evidence-bound draft fields | `src/lib/signaldesk/workflowServer.ts:649` through `src/lib/signaldesk/workflowServer.ts:680` injects proof CTA copy and evidence IDs into rendered drafts. |
| Default investment controls | `src/lib/signaldesk/workflowServer.ts:841` through `src/lib/signaldesk/workflowServer.ts:1019` seeds provider accounts, budget policies, model routes, market pod, audience segment, CTA, waterfall, sender domain, and defaults timeline. |
| Control upserts | `src/lib/signaldesk/workflowServer.ts:1056` through `src/lib/signaldesk/workflowServer.ts:1244` implements provider account, budget policy, model route, waterfall, audience segment, sender domain, and self-service CTA upserts. |
| Enrichment waterfall runtime | `src/lib/signaldesk/workflowServer.ts:1246` through `src/lib/signaldesk/workflowServer.ts:1410` checks source policy, prior-contact state, existing approved data, provider budget readiness, writes vendor runs, enrichment results, timeline, audit, and cost summary without external provider spend. |
| Approval packet action | `src/lib/signaldesk/workflowServer.ts:1413` through `src/lib/signaldesk/workflowServer.ts:1480` builds or refreshes approval packets and links them to approvals. |
| Sequencer handoff action | `src/lib/signaldesk/workflowServer.ts:1483` through `src/lib/signaldesk/workflowServer.ts:1531` writes ready/blocked sequencer handoffs after approved-message, provider account, sender-domain, recipient, and prior-contact checks. |
| Source provider ledger | `src/lib/signaldesk/workflowServer.ts:1748` through `src/lib/signaldesk/workflowServer.ts:1778` adds vendor run, provider spend, and run timeline writes to source-provider runs. |
| AI route/eval runtime | `src/lib/signaldesk/workflowServer.ts:1844` through `src/lib/signaldesk/workflowServer.ts:1938` routes AI assist through model routes/budget checks, writes model evals, provider spend, run timeline, and cost summary. |
| Draft approval packet | `src/lib/signaldesk/workflowServer.ts:1989` through `src/lib/signaldesk/workflowServer.ts:2098` blocks non-evidence/non-personalization/prior-contact targets, writes evidence-bound draft fields, creates approval packet, and writes approval timeline. |
| Approval review packet sync | `src/lib/signaldesk/workflowServer.ts:2101` through `src/lib/signaldesk/workflowServer.ts:2145` syncs approval decisions into approval packets. |
| API schemas and actions | `src/app/api/signaldesk/actions/route.ts:45` through `src/app/api/signaldesk/actions/route.ts:271` validates the new action envelope and payloads; `src/app/api/signaldesk/actions/route.ts:273` through `src/app/api/signaldesk/actions/route.ts:347` maps permissions and safe block errors; `src/app/api/signaldesk/actions/route.ts:524` through `src/app/api/signaldesk/actions/route.ts:612` executes the new actions. |
| Workspace UI controls | `src/components/signaldesk/SignalDeskWorkspace.tsx:474` through `src/components/signaldesk/SignalDeskWorkspace.tsx:520` wires waterfall, packet, sequencer, provider approval, and sender-domain actions; `src/components/signaldesk/SignalDeskWorkspace.tsx:614` through `src/components/signaldesk/SignalDeskWorkspace.tsx:642` renders provider/budget policy controls; `src/components/signaldesk/SignalDeskWorkspace.tsx:681` through `src/components/signaldesk/SignalDeskWorkspace.tsx:720` renders approval packets; `src/components/signaldesk/SignalDeskWorkspace.tsx:795` through `src/components/signaldesk/SignalDeskWorkspace.tsx:909` renders audience/market pod/waterfall/vendor/result controls; `src/components/signaldesk/SignalDeskWorkspace.tsx:913` through `src/components/signaldesk/SignalDeskWorkspace.tsx:1062` renders AI route/eval and sender/sequencer controls; `src/components/signaldesk/SignalDeskWorkspace.tsx:1065` through `src/components/signaldesk/SignalDeskWorkspace.tsx:1107` renders run timelines, CTAs, and investment holds. |

## Runtime Expansion - June 23, 2026

### SignalDesk AI Credential Isolation - July 11, 2026

SignalDesk AI assist now creates a product-scoped key manager from `MENULIST_SIGNALDESK_GEMINI_AI_KEY`, `_2`, `_3`, and `_4` while reusing the shared app Gemini retry gateway. It no longer reads MenuList `GEMINI_AI_KEY*` or the legacy `GEMINI_API_KEY`, and it does not use Answerlattice credentials. Staging/production env templates now include the separate SignalDesk Firebase and AI variables. This is source-side credential isolation only; real key setup, provider smoke, SignalDesk Firebase deployment, Vercel deployment, and production-host evidence remain pending.

The second implementation pass completed the remaining non-paid, non-deploy runtime work:

| Area | Implementation Evidence |
| --- | --- |
| Runtime flags | `src/config/features.ts:31` through `src/config/features.ts:45` keep SignalDesk private, enable source providers, AI provider calls, provider webhooks, and assisted channels, and keep provider send disabled. |
| Integration constants | `src/constants/signaldesk/integrations.ts:1` through `src/constants/signaldesk/integrations.ts:32` define full `MENULIST_SIGNALDESK_*` env names, Google Places Text Search endpoint/field mask, Gemini model default, and Meta Graph version. |
| Source providers | `src/lib/signaldesk/sourceProviders.ts:44` through `src/lib/signaldesk/sourceProviders.ts:68` call Google Places Text Search with a narrow field mask and capped results; `src/lib/signaldesk/sourceProviders.ts:71` through `src/lib/signaldesk/sourceProviders.ts:74` blocks Foursquare until source approval. |
| Source-provider action | `src/lib/signaldesk/workflowServer.ts:1715` through `src/lib/signaldesk/workflowServer.ts:1781` gates provider runs by feature flag, active provider source policy, evidence approval, provider budget, import reuse, vendor ledger, timeline, audit, and cost tracking. |
| AI assist | `src/lib/signaldesk/aiProvider.ts:31` through `src/lib/signaldesk/aiProvider.ts:36` limits the assistant to supplied facts; `src/lib/signaldesk/aiProvider.ts:58` through `src/lib/signaldesk/aiProvider.ts:92` calls the Gemini gateway and returns JSON-only output. |
| AI action | `src/lib/signaldesk/workflowServer.ts:1844` through `src/lib/signaldesk/workflowServer.ts:1938` gates AI provider calls through model route and provider budget, stores worker run/snapshot/ledger/eval/timeline data, and records cost. |
| Channel readiness/send adapter | `src/lib/signaldesk/providerAdapters.ts:22` through `src/lib/signaldesk/providerAdapters.ts:66` requires channel credentials and email compliance fields; `src/lib/signaldesk/providerAdapters.ts:74` through `src/lib/signaldesk/providerAdapters.ts:151` implements SMTP and Meta send adapters without enabling send. |
| Assisted channel handoff | `src/lib/signaldesk/workflowServer.ts:2256` through `src/lib/signaldesk/workflowServer.ts:2283` creates approved-message handoffs for assisted channels without provider send and blocks email handoff when sender domain is not ready. |
| Provider send hard stop | `src/lib/signaldesk/workflowServer.ts:2285` through `src/lib/signaldesk/workflowServer.ts:2322` keeps real send behind the disabled provider-send flag plus channel and sender-domain readiness checks. |
| Signed webhooks | `src/app/api/signaldesk/webhooks/[provider]/route.ts:26` through `src/app/api/signaldesk/webhooks/[provider]/route.ts:62` exposes only signed provider POST handling with hashed-IP rate limiting and generic rejection. |
| Signature-before-DB order | `src/app/api/signaldesk/webhooks/[provider]/route.ts` caps raw webhook bodies at 256KB before signature processing; `src/lib/signaldesk/webhookServer.ts:97` through `src/lib/signaldesk/webhookServer.ts:115` verifies email or Meta signatures before acquiring Firebase; unsigned local webhook smoke returned HTTP 400 with `Invalid SignalDesk webhook signature`. |
| Webhook normalization | `src/lib/signaldesk/webhookServer.ts:117` through `src/lib/signaldesk/webhookServer.ts:203` stores normalized events, inbound messages, suppression records, and channel health summaries. |
| Workspace reads | `src/lib/signaldesk/workflowServer.ts:720` through `src/lib/signaldesk/workflowServer.ts:817` adds bounded workspace reads for approvals, templates, attribution, policies, sources, AI, channels, control room, and audit. |
| Action API | `src/app/api/signaldesk/actions/route.ts:45` through `src/app/api/signaldesk/actions/route.ts:72` adds source-provider, AI, handoff, send, and investment-control action names; `src/app/api/signaldesk/actions/route.ts:142` through `src/app/api/signaldesk/actions/route.ts:271` validates their payloads; `src/app/api/signaldesk/actions/route.ts:273` through `src/app/api/signaldesk/actions/route.ts:299` gates them by permission. |
| UI | `src/components/signaldesk/SignalDeskWorkspace.tsx:83` through `src/components/signaldesk/SignalDeskWorkspace.tsx:100` adds Source, AI, Channels, and Control Room navigation; `src/components/signaldesk/SignalDeskWorkspace.tsx:453` through `src/components/signaldesk/SignalDeskWorkspace.tsx:535` wires provider, AI, waterfall, packet, sequencer, sender-domain, handoff, and send actions; `src/components/signaldesk/SignalDeskWorkspace.tsx:913` through `src/components/signaldesk/SignalDeskWorkspace.tsx:1062` renders the AI/channel runtime panels. |

## Cross-Check Hardening - June 23, 2026

The post-implementation cross-check found and fixed five internal workflow gaps before handoff:

| Area | Finding | Fix Evidence |
| --- | --- | --- |
| Firebase config fallback | Server code could try the expected SignalDesk project ID without explicit SignalDesk Firebase config. | `src/lib/firebase/signaldeskConfig.ts:69` through `src/lib/firebase/signaldeskConfig.ts:76` require explicit client/admin config for separate mode; `src/lib/signaldesk/server.ts:19` through `src/lib/signaldesk/server.ts:23`, `src/lib/signaldesk/access.ts:53` through `src/lib/signaldesk/access.ts:57`, and `src/lib/signaldesk/workflowServer.ts:187` through `src/lib/signaldesk/workflowServer.ts:190` return no DB unless SignalDesk Firebase is configured or the emulator is active. |
| Validation logging | Action and kill-switch validation failures returned 400 without the SignalDesk security log path. | `src/lib/signaldesk/apiGuards.ts:19` through `src/lib/signaldesk/apiGuards.ts:31` adds `logSignalDeskValidationFailure`; `src/app/api/signaldesk/actions/route.ts:354` through `src/app/api/signaldesk/actions/route.ts:376` uses it for action payload validation; `src/app/api/signaldesk/kill-switches/route.ts:42` through `src/app/api/signaldesk/kill-switches/route.ts:50` uses it for pause input validation. |
| Route failure diagnostics | Overview, workspace, action, kill-switch, and overview-loader catches logged raw user/action/error context. | `src/lib/signaldesk/apiGuards.ts` now provides bounded SignalDesk diagnostic helpers; `src/app/api/signaldesk/overview/route.ts`, `workspace/route.ts`, `actions/route.ts`, `kill-switches/route.ts`, and `src/lib/signaldesk/server.ts` use stable `signaldesk_*_failed` codes guarded by `npm run verify:signaldesk`. |
| Source-policy allowed use | Import previously stored contact values and contact identity hashes even when a source policy disallowed contact use. | `src/lib/signaldesk/workflowServer.ts:334` through `src/lib/signaldesk/workflowServer.ts:345` centralizes policy use; `src/lib/signaldesk/workflowServer.ts:612` through `src/lib/signaldesk/workflowServer.ts:624` makes contact-free identity hashing possible; `src/lib/signaldesk/workflowServer.ts:1534` through `src/lib/signaldesk/workflowServer.ts:1699` only reads, stores, suppresses, and indexes contact data when contact use is approved. |
| Evidence and draft gates | Drafts could be queued without an evidence packet, and evidence always allowed draft personalization. | `src/lib/signaldesk/workflowServer.ts:1941` through `src/lib/signaldesk/workflowServer.ts:1987` requires source-policy evidence approval and only adds draft personalization when approved; `src/lib/signaldesk/workflowServer.ts:1989` through `src/lib/signaldesk/workflowServer.ts:2015` blocks drafts without evidence, personalization approval, draft-ready target state, or prior-contact clearance. |
| Export readiness | Export trusted approval state without proving draft existence, draft approval, evidence, contact policy, and contact readiness. | `src/lib/signaldesk/workflowServer.ts:2324` through `src/lib/signaldesk/workflowServer.ts:2352` blocks export unless the approval, target, draft, evidence, contact policy, contactability, suppression, prior-contact state, and kill-switch gates all pass. |

Additional API hardening: `src/app/api/signaldesk/actions/route.ts:301` through `src/app/api/signaldesk/actions/route.ts:352` now returns only allowlisted workflow-state errors to callers and masks unknown action failures.

## Deep Flow Cross-Check - June 23, 2026

The latest end-to-end flow audit checked action schemas, permissions, workflow guards, UI action wiring, Firestore rules/indexes, cost counters, source/evidence/draft/channel paths, and documentation parity. It found and fixed seven concrete runtime gaps:

| Area | Finding | Fix Evidence |
| --- | --- | --- |
| Provider credential gate | Approved/evaluation provider accounts with missing credentials could pass the budget gate before failing in the provider adapter. | `src/lib/signaldesk/workflowServer.ts:379` through `src/lib/signaldesk/workflowServer.ts:413` now blocks missing credentials inside the provider budget guard; `src/app/api/signaldesk/actions/route.ts:301` through `src/app/api/signaldesk/actions/route.ts:340` returns that workflow hold as a safe action error. |
| Spend counter preservation | Default seed and provider/budget config upserts reset daily/monthly spend counters to zero. | `src/lib/signaldesk/workflowServer.ts:850` through `src/lib/signaldesk/workflowServer.ts:940` preserves existing provider and budget spend during default seeding; `src/lib/signaldesk/workflowServer.ts:1087` through `src/lib/signaldesk/workflowServer.ts:1145` preserves spend during provider account and budget policy upserts. |
| Latest evidence reads | Draft, packet, and AI paths read an arbitrary evidence packet for a target when multiple packets existed. | `src/lib/signaldesk/workflowServer.ts:271` through `src/lib/signaldesk/workflowServer.ts:273` orders target evidence by `updatedAt` descending; `firestore-signaldesk.indexes.json:36` through `firestore-signaldesk.indexes.json:42` adds the matching composite index. |
| Waterfall vendor ledger | Waterfall runs pre-wrote synthetic skipped rows for every provider before budget checks. | `src/lib/signaldesk/workflowServer.ts:1358` through `src/lib/signaldesk/workflowServer.ts:1429` now writes one accurate vendor run summary for reused source data, ready-held provider state, or blocked provider reasons, and lowers the write estimate accordingly. |
| AI route cost cap | AI route estimates could inflate low model-route caps to the minimum estimate before budget checking. | `src/lib/signaldesk/workflowServer.ts:562` through `src/lib/signaldesk/workflowServer.ts:574` now honors the configured route cap and blocks zero-cost executable routes. |
| Assisted email parity | Assisted/provider email handoff checked sender readiness but did not enforce the same contact-ready guard as manual email export. | `src/lib/signaldesk/workflowServer.ts:2278` through `src/lib/signaldesk/workflowServer.ts:2322` now blocks email handoff/send unless target contactability is ready. |
| Suppression reimport safety | DNC/wrong-contact replies wrote target-scoped suppression records, while imports checked contact-scoped email/phone suppression records. | `src/lib/signaldesk/workflowServer.ts:1589` through `src/lib/signaldesk/workflowServer.ts:1597` checks email, phone, and Instagram suppression during import; `src/lib/signaldesk/workflowServer.ts:2211` through `src/lib/signaldesk/workflowServer.ts:2227` maps replies to the same contact-scoped suppression IDs; `src/lib/signaldesk/workflowServer.ts:2499` through `src/lib/signaldesk/workflowServer.ts:2510` writes those suppression records from DNC/wrong-contact replies. |

## Owner-Operator Page and Workflow Audit - June 23, 2026

This audit treated MenuList as the operator's own product and SignalDesk as the system that must let the founder observe, monitor, approve, pause, and redirect distribution.

| Page / flow | Owner-use verdict |
| --- | --- |
| Dashboard | Usable as the owner operating view: observe/monitor/approve strip, metrics, operating state, safety, queues, cost, and incidents are loaded from bounded summaries. |
| Targets | Usable for first source-list work: import, score, evidence, and draft actions are wired to guarded server workflows. Remaining runtime validation intentionally blocks bad order, suppressed targets, or missing evidence. |
| Imports | Usable as source-run history; suppression and duplicate counts are visible from compact summaries. |
| Policies | Hardened for owner control: source policy creation now exposes contact/evidence/personalization permissions, provider policies default to evidence-only, and provider registry quick approvals cover Google Places and Gemini. See `src/components/signaldesk/SignalDeskWorkspace.tsx:341` through `src/components/signaldesk/SignalDeskWorkspace.tsx:379` and `src/components/signaldesk/SignalDeskWorkspace.tsx:637` through `src/components/signaldesk/SignalDeskWorkspace.tsx:700`. |
| Templates | Usable for draft creation and draft review; draft runtime still blocks missing evidence, missing personalization permission, prior contact, and non-draft-ready targets. |
| Approvals | Usable for packet review, approve/reject, and manual export; export still rechecks suppression, source contact permission, draft approval, evidence, contact readiness, prior contact, and pause state. |
| Inbox | Hardened for real owner operation: manual reply capture now lets the owner choose email, manual, WhatsApp, Instagram, or Messenger instead of silently recording every reply as email. See `src/app/api/signaldesk/actions/route.ts:122` through `src/app/api/signaldesk/actions/route.ts:126` and `src/components/signaldesk/SignalDeskWorkspace.tsx:800` through `src/components/signaldesk/SignalDeskWorkspace.tsx:811`. |
| Attribution | Usable for manual outcome and demand-signal capture; remains SignalDesk-only and does not mutate MenuList store/project truth. |
| Sources | Hardened for live source-provider work: source-provider runs now require provider source policies in the UI instead of accidentally using a manual policy; provider/source pause is enforced server-side. See `src/components/signaldesk/SignalDeskWorkspace.tsx:901` through `src/components/signaldesk/SignalDeskWorkspace.tsx:935` and `src/lib/signaldesk/workflowServer.ts:1286` through `src/lib/signaldesk/workflowServer.ts:1289`. |
| AI | Hardened for owner cost control: AI route runs honor configured caps, require provider credentials/budget, and now stop when `ai-worker` is paused. See `src/lib/signaldesk/workflowServer.ts:1814` through `src/lib/signaldesk/workflowServer.ts:1817` and `src/lib/signaldesk/workflowServer.ts:1875` through `src/lib/signaldesk/workflowServer.ts:1880`. |
| Channels | Usable for approved handoff, sequencer-ready/blocked records, sender-domain visibility, channel health, and webhook visibility. Real provider send remains disabled. |
| Control Room | Hardened for real operations: global pause remains in the header and scoped pause now supports email, WhatsApp, Instagram, Messenger, source provider, AI worker, campaign, and MenuList bridge scopes. See `src/components/signaldesk/SignalDeskWorkspace.tsx:1144` through `src/components/signaldesk/SignalDeskWorkspace.tsx:1167` and `src/lib/signaldesk/workflowServer.ts:334` through `src/lib/signaldesk/workflowServer.ts:337`. |
| Audit | Usable as admin-only action history behind `audit.view`. |
| Webhooks | Hardened for channel safety: provider webhook suppression now maps email, WhatsApp, Instagram, and Messenger to the same contact-scoped suppression IDs used by import/manual reply checks. See `src/lib/signaldesk/webhookServer.ts:21` through `src/lib/signaldesk/webhookServer.ts:27`, `src/lib/signaldesk/webhookServer.ts:104` through `src/lib/signaldesk/webhookServer.ts:115`, and `src/lib/signaldesk/webhookServer.ts:190` through `src/lib/signaldesk/webhookServer.ts:200`. |
| UI resilience | Hardened for long operator data: row/list text now wraps instead of overflowing compact tables, and policy checkboxes collapse to one column on narrow screens. See `src/components/signaldesk/SignalDeskWorkspace.module.scss:41` through `src/components/signaldesk/SignalDeskWorkspace.module.scss:45`, `src/components/signaldesk/SignalDeskWorkspace.module.scss:413` through `src/components/signaldesk/SignalDeskWorkspace.module.scss:437`, and `src/components/signaldesk/SignalDeskWorkspace.module.scss:468` through `src/components/signaldesk/SignalDeskWorkspace.module.scss:471`. |

## Runtime Evidence

| Area | Evidence |
| --- | --- |
| Product code | `src/constants/product.ts:13` defines the product ID map and `src/constants/product.ts:18` adds `SIGNALDESK: 'SD'`. |
| Deployment target | `src/constants/deploymentTargets.ts:12` includes `signaldesk`; local/preview/production Firebase targets are set at `src/constants/deploymentTargets.ts:59`, `src/constants/deploymentTargets.ts:103`, and `src/constants/deploymentTargets.ts:147`. |
| Feature flags | `src/config/features.ts:24` records the private/internal boundary and `src/config/features.ts:31` through `src/config/features.ts:45` add the SignalDesk runtime flags with provider send disabled. |
| Full env names | `src/constants/signaldesk/firebase.ts:10` through `src/constants/signaldesk/firebase.ts:26` use only `MENULIST_SIGNALDESK_*` and `NEXT_PUBLIC_MENULIST_SIGNALDESK_*` names. |
| Env validation | `src/lib/env/validateEnv.ts:25` imports SignalDesk env keys, `src/lib/env/validateEnv.ts:82` through `src/lib/env/validateEnv.ts:95` add SignalDesk to the product env matrix, and `src/lib/env/validateEnv.ts:104` through `src/lib/env/validateEnv.ts:110` adds the display name. |
| Routes | `src/constants/signaldesk/routes.ts:1` through `src/constants/signaldesk/routes.ts:20` define internal app and API paths under `/signaldesk` and `/api/signaldesk`. |
| Collections | `src/constants/signaldesk/database.ts:1` through `src/constants/signaldesk/database.ts:56` define product-local SignalDesk collections and summary doc IDs. |
| Protected shell | `src/app/(signaldesk)/layout.tsx:40` through `src/app/(signaldesk)/layout.tsx:62` enforce the feature flag, auth session, active/verified user state, platform block check, and SignalDesk access context before rendering. |
| Internal UI | `src/components/signaldesk/SignalDeskWorkspace.tsx:37` through `src/components/signaldesk/SignalDeskWorkspace.tsx:100` define the first route modules, and `src/components/signaldesk/SignalDeskWorkspace.tsx:139` through `src/components/signaldesk/SignalDeskWorkspace.tsx:205` wire summary refresh and global pause actions. |
| Roles and access | `src/lib/signaldesk/access.ts:6` through `src/lib/signaldesk/access.ts:49` define roles/permissions, and `src/lib/signaldesk/access.ts:76` through `src/lib/signaldesk/access.ts:119` resolves platform admin or active team-member access. |
| API guards | `src/lib/signaldesk/apiGuards.ts:12` through `src/lib/signaldesk/apiGuards.ts:50` enforce runtime and permission checks; `src/lib/signaldesk/apiGuards.ts:51` through `src/lib/signaldesk/apiGuards.ts:78` apply rate limits with hashed user/email key material. |
| Overview API | `src/app/api/signaldesk/overview/route.ts:14` through `src/app/api/signaldesk/overview/route.ts:35` protect the route, rate-limit it, and return no-store overview data. |
| Kill switch API | `src/app/api/signaldesk/kill-switches/route.ts:18` through `src/app/api/signaldesk/kill-switches/route.ts:31` validate input, and `src/app/api/signaldesk/kill-switches/route.ts:33` through `src/app/api/signaldesk/kill-switches/route.ts:73` protect, permission-check, rate-limit, and execute the update. |
| Summary-first server read | `src/lib/signaldesk/server.ts:193` through `src/lib/signaldesk/server.ts:247` read control-room, queue, cost, kill-switch, and incident summaries only. |
| Kill-switch write path | `src/lib/signaldesk/server.ts:254` through `src/lib/signaldesk/server.ts:315` writes the kill switch, audit event, and control-room summary in bounded operations. |
| Workspace API | `src/app/api/signaldesk/workspace/route.ts` protects section-specific bounded reads behind `withAuth()`, permission checks, and `DATA_READ` rate limits. |
| Action API | `src/app/api/signaldesk/actions/route.ts` validates every workflow action with Zod, gates each action by permission, and applies write/AI rate limits. |
| Workflow service | `src/lib/signaldesk/workflowServer.ts` implements source policies, target import, dedupe, scoring, evidence, drafts, approvals, exports, replies, outcomes, demand signals, summaries, and audit writes. |
| Workspace UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` renders module-specific controls for targets, imports, policies, templates, approvals, inbox, attribution, control room, and audit. |
| Client DAL/hook | `src/database/signaldesk/index.ts` and `src/hooks/signaldesk/useSignalDeskOverview.ts` use the protected workspace/action APIs without direct client Firestore reads. |
| Firebase config | `src/lib/firebase/signaldeskConfig.ts:23` through `src/lib/firebase/signaldeskConfig.ts:68` resolve expected project, mode, config presence, and shared/separate behavior. |
| Firebase client | `src/lib/firebase/signaldeskFirebaseClient.ts:27` through `src/lib/firebase/signaldeskFirebaseClient.ts:42` use shared or dedicated client resources without defaulting separate projects to MenuList data. |
| Firebase admin | `src/lib/firebase/signaldeskFirebaseAdmin.ts:144` through `src/lib/firebase/signaldeskFirebaseAdmin.ts:181` resolve and export the SignalDesk admin app, Firestore, Storage, and Auth handles. |
| Firebase CLI config | `firebase-signaldesk.json:1` through `firebase-signaldesk.json:25` points the SignalDesk codebase to dedicated functions, Firestore rules/indexes, and Storage rules. |
| Firestore rules | `firestore-signaldesk.rules:5` through `firestore-signaldesk.rules:7` default deny all documents; `firestore-signaldesk.rules:21` through `firestore-signaldesk.rules:99` allow read-only access to approved internal collections; `firestore-signaldesk.rules:110` through `firestore-signaldesk.rules:127` define auth/member checks. |
| Storage rules | `storage-signaldesk.rules:5` through `storage-signaldesk.rules:27` default deny and restrict internal paths; `storage-signaldesk.rules:29` through `storage-signaldesk.rules:46` define auth/member checks. |
| Functions skeleton | `functions-signaldesk/package.json:4` through `functions-signaldesk/package.json:14` define build/deploy/log scripts; `functions-signaldesk/src/index.ts:5` through `functions-signaldesk/src/index.ts:27` defines the health check; `functions-signaldesk/src/constants/features.ts:1` through `functions-signaldesk/src/constants/features.ts:6` keeps provider, AI, and scheduled work disabled. |
| Build separation | `tsconfig.json:68` through `tsconfig.json:73` exclude `functions-signaldesk` from the main Next.js typecheck, and `.gitignore:18` through `.gitignore:21` ignore generated functions output. |

## Verification Commands

| Command | Result |
| --- | --- |
| `npx tsc --noEmit --pretty false` after Revenue Operating Layer cross-check | Passed. |
| `npm run lint` after Revenue Operating Layer cross-check | Passed with no ESLint warnings or errors. |
| `npm run verify:dependency-freeze` after Revenue Operating Layer cross-check | Passed; no dependency version changed. |
| `npm run verify:signaldesk` after revenue authority cross-check | Passed with 2,176 checks covering route/action/type/DAL/workflow/UI/rules/index/docs/E2E-fixture boundaries, founder-only pod/envelope approval, transactional envelope-control revalidation, no self-activation, two-surface-only wins, deterministic long-history activation, automatic reply/outcome projections, seven-day stalls, founder brief, and seed-governance guards. |
| `npm run test:signaldesk:e2e:local` after revenue authority cross-check | Passed under Node 20; concurrent idempotency, founder/non-founder pod review, founder-only envelope approval, research/recommendation hold, unreviewed-active envelope rejection, published-only open lifecycle, terminal activation beyond 30 newer summaries, interested-reply qualification, automatic activation projection, exact legacy-seed migration, currencies, immutable IDs/versions, source/pod/budget/sender gates, expiry/approval history, exact summary deltas, bounded provider mocks, and no MenuList truth writes are covered. |
| `npm run test:signaldesk:rules` after Revenue Operating Layer implementation | Passed under Node 20; all revenue collections are internal-read/server-write only and public/MenuList-owner/client writes remain denied. |
| `npm run verify:menulist-activation-concierge` after Revenue Operating Layer cross-check | Passed all 11 checks; SignalDesk still does not mutate MenuList activation truth. |
| Local `next dev` revenue route/API/alias smoke on the active port 3020 | Passed; `/signaldesk/revenue` returned 200/noindex, unauthenticated `workspace?section=revenue` returned 401, and `Host: menulist.digital` `/sd/revenue` rewrote to `/signaldesk/revenue` with SignalDesk product headers. A separate port-3013 smoke process was stopped after concurrent repo-local Next dev processes briefly raced on the shared `.next` directory; no user-owned dev process was stopped. |
| `git diff --check` after Revenue Operating Layer cross-check | Passed for the current worktree. |
| `firebase deploy --only firestore:rules,firestore:indexes --project menulist-signaldesk-qa --config firebase-signaldesk.json --non-interactive` | Blocked; Firebase Rules API returned HTTP 403 `The caller does not have permission`. No QA resources were deployed. |
| `npx tsc --noEmit --incremental false --pretty false` | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after investment-control implementation | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after deep flow cross-check | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after owner-operator page/workflow audit | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after owned email sequencer implementation | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after connector settings implementation | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after Apify Source Broker implementation | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after final Apify Source Broker cross-check | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after from-scratch docs/code parity cross-check | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after solo-owner from-start audit | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after Trust Partner Rail planning flag/docs | Passed. |
| `npx tsc --noEmit --incremental false --pretty false` after Operating Layer runtime implementation | Passed. |
| `npm install` in `functions-signaldesk/` | Passed; local shell is Node 18 while the functions package declares Node 22, so npm printed an engine warning. |
| `npm run build` in `functions-signaldesk/` | Passed. |
| `npm run build` in `functions-signaldesk/` after from-scratch docs/code parity cross-check | Passed. |
| `firebase emulators:exec --only firestore,storage --project demo-signaldesk --config firebase-signaldesk.json "true"` | Passed; Firestore and Storage emulators parsed the SignalDesk config/rules and exited cleanly. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after investment-control rules update | Passed; Firestore emulator parsed the new SignalDesk rules and exited cleanly. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after deep flow cross-check | Passed; Firestore emulator parsed rules and the new evidence-packet index. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after owner-operator page/workflow audit | Passed. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after owned email sequencer rules/index update | Passed; Firestore emulator parsed the owned sequencer step rules and indexes. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after connector settings rules/index update | Passed; Firestore emulator parsed connector settings rules and indexes. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after Apify Source Broker implementation | Passed; Firestore emulator parsed SignalDesk rules and indexes. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after final Apify Source Broker cross-check | Passed; Firestore emulator parsed SignalDesk rules and indexes. |
| `firebase emulators:exec --only firestore,storage --project demo-signaldesk --config firebase-signaldesk.json "true"` after from-scratch docs/code parity cross-check | Passed; Firestore and Storage rules parsed. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` after Operating Layer rules/index update | Passed; Firestore emulator parsed SignalDesk rules and indexes. |
| Local route smoke on `npx next dev -p 3003` for all 13 SignalDesk pages | Passed; `/signaldesk`, `/targets`, `/imports`, `/approvals`, `/templates`, `/inbox`, `/attribution`, `/policies`, `/sources`, `/ai`, `/channels`, `/control-room`, and `/audit` compiled and returned HTTP 200 locally. |
| Local route smoke on `npx next dev -p 3004` after owned email sequencer implementation | Passed; all 13 SignalDesk pages compiled and returned HTTP 200 locally. |
| Local route smoke on `npx next dev -p 3005` after connector settings implementation | Passed; all 14 SignalDesk pages including `/signaldesk/settings` compiled and returned HTTP 200 locally. |
| Local route smoke on `npx next dev -p 3006` after Apify Source Broker implementation | Passed; all 14 SignalDesk pages compiled and returned HTTP 200 locally. |
| Local route smoke on `npx next dev -p 3007` after final Apify Source Broker cross-check | Passed; all 14 SignalDesk pages compiled and returned HTTP 200 locally. |
| Local route smoke on `npx next dev -p 3008` after from-scratch docs/code parity cross-check | Passed; all 14 SignalDesk pages compiled and returned HTTP 200 locally. |
| Local route/routing smoke on `npx next dev -p 3000` after URL routing alignment | Passed; `/signaldesk/settings` returned HTTP 200 with `X-Robots-Tag: noindex, nofollow`; `Host: signaldesk.menulist.ai` plus `/targets` returned HTTP 200 with `x-middleware-rewrite: /signaldesk/targets` and SignalDesk product headers. |
| Local MyCodex-host alias smoke on `npx next dev -p 3000` after `/sd` routing | Passed; `Host: menulist.digital` plus `/sd`, `/sd/targets`, and `/sd/settings` returned HTTP 200 with `x-product-base-path: /sd`, SignalDesk product headers, noindex, and rewrites to `/signaldesk*`; `/sd/signin?callbackUrl=/sd` rewrote to `/signin`; `Host: menulist.ai` plus `/sd` returned HTTP 404. |
| `curl -I -sS http://localhost:3000/signaldesk/mission` on existing local dev server | Passed; `/signaldesk/mission` returned HTTP 200 with `X-Robots-Tag: noindex, nofollow`. |
| `curl -I -sS -H 'Host: menulist.digital' http://localhost:3000/sd/mission` on existing local dev server | Passed; `/sd/mission` returned HTTP 200 with `x-product-base-path: /sd`, SignalDesk product headers, noindex, and `x-middleware-rewrite: /signaldesk/mission`. |
| Browser alias sign-in smoke with Chrome host resolver for `menulist.digital -> 127.0.0.1` | Passed; unauthenticated `http://menulist.digital:3000/sd` landed at `/sd/signin?callbackUrl=%2Fsd`, preserving the SignalDesk testing alias. |
| Local unauthenticated API smoke on `npx next dev -p 3003` | Passed; overview, workspace, actions, and kill-switch APIs returned HTTP 401 with security logging. |
| Local unauthenticated API smoke on `npx next dev -p 3004` after owned email sequencer implementation | Passed; overview, channels workspace, `send-owned-sequence-step`, and kill-switch APIs returned HTTP 401 with security logging. |
| Local unauthenticated API smoke on `npx next dev -p 3005` after connector settings implementation | Passed; overview, settings workspace, `upsert-connector-setting`, and kill-switch APIs returned HTTP 401 with security logging. |
| Local unauthenticated API smoke on `npx next dev -p 3006` after Apify Source Broker implementation | Passed; overview/workspace/action/kill-switch APIs returned HTTP 401, and unsigned `/api/signaldesk/webhooks/apify` returned HTTP 400. |
| Local unauthenticated API smoke on `npx next dev -p 3007` after final Apify Source Broker cross-check | Passed; overview, sources workspace, Apify source-run action, Apify connector action, and kill-switch APIs returned HTTP 401; unsigned `/api/signaldesk/webhooks/apify` returned HTTP 400. |
| Local unauthenticated API smoke on `npx next dev -p 3008` after from-scratch docs/code parity cross-check | Passed; overview, dashboard/settings/audit workspace APIs, seed/defaults, Apify run, connector action, and kill-switch returned HTTP 401; unsigned Apify webhook returned HTTP 400; unknown webhook provider returned HTTP 404. |
| Local unauthenticated API smoke on `npx next dev -p 3000` after URL routing alignment | Passed; `/api/signaldesk/workspace?section=settings` returned HTTP 401 with `X-Robots-Tag: noindex, nofollow`. |
| SignalDesk enum/contract parity script after from-scratch docs/code parity cross-check | Passed; section, nav, action, connector, and kill-switch contracts match across types, routes, DAL, and UI. |
| SignalDesk docs integrity script after from-scratch docs/code parity cross-check | Passed; 104 active SignalDesk docs follow naming rules and have no duplicate action-register IDs. |
| Public-surface isolation scan after from-scratch docs/code parity cross-check | Passed; no SignalDesk exposure found in public website, sitemap, robots, middleware public/client shells, or website components. |
| `npx next dev -p 3002` then `curl -I -sS http://localhost:3002/signaldesk` | Passed; `/signaldesk` compiled and responded `200 OK` in the local dev server. |
| `curl -I -sS http://localhost:3002/signaldesk/sources` | Passed; `/signaldesk/sources` responded `200 OK`. |
| `curl -I -sS http://localhost:3002/signaldesk/ai` | Passed; `/signaldesk/ai` responded `200 OK`. |
| `curl -I -sS http://localhost:3002/signaldesk/channels` | Passed; `/signaldesk/channels` responded `200 OK`. |
| `curl -I -sS http://localhost:3002/signaldesk` after owner-control UI update | Passed; `/signaldesk` responded `200 OK`. |
| `curl -i -sS http://localhost:3002/api/signaldesk/overview` without a session | Passed; returned `401 Unauthorized`. |
| `curl -i -sS http://localhost:3002/api/signaldesk/workspace?section=targets` without a session | Passed; returned `401 Unauthorized`. |
| `curl -i -sS http://localhost:3002/api/signaldesk/actions ...` without a session | Passed; returned `401 Unauthorized`. |
| `curl -i -sS http://localhost:3002/api/signaldesk/kill-switches ...` without a session | Passed; returned `401 Unauthorized`. |
| `curl -i -sS http://localhost:3002/api/signaldesk/webhooks/whatsapp ...` without a Meta signature | Passed; returned `400 Webhook rejected` and logged `Invalid SignalDesk webhook signature` before Firebase access. |
| `rg -n "signaldesk|SignalDesk" public 'src/app/(website)' src/components/website public/sitemap.xml public/robots.txt src/middleware.ts src/app/client src/components/templates/main-app` | Passed; no public website, sitemap, robots, middleware, client-shell, or app-template exposure found. |
| `git diff --check` | Passed. |
| `git diff --check` after investment-control implementation | Passed. |
| `git diff --check` after owned email sequencer implementation | Passed. |
| `git diff --check` after connector settings implementation | Passed. |
| `git diff --check` after Apify Source Broker implementation | Passed. |
| `git diff --check` after final Apify Source Broker cross-check | Passed. |
| `git diff --check` after from-scratch docs/code parity cross-check | Passed. |
| `git diff --check` after solo-owner from-start audit | Passed. |
| `git diff --check` after Trust Partner Rail planning flag/docs | Passed. |
| `git diff --check` after Operating Layer runtime implementation | Passed. |
| `rg -n "[ \t]+$" src/lib/signaldesk/workflowServer.ts src/app/api/signaldesk/actions/route.ts firestore-signaldesk.indexes.json firestore-signaldesk.rules __docs__/menulist-signaldesk/menulist-signaldesk_validation.md __docs__/menulist-signaldesk/menulist-signaldesk_firebase.md` | Passed; no trailing whitespace found in touched SignalDesk files. |
| `rg -n "[ \t]+$" ...owned sequencer touched files` | Passed; no trailing whitespace found in touched code, rules, indexes, or docs. |
| `rg -n "[ \t]+$" ...connector settings touched files` | Passed; no trailing whitespace found in touched code, rules, indexes, or docs. |
| `rg -n "[[:blank:]]$" ...Apify Source Broker touched files` | Passed; no trailing whitespace found in touched code or docs. |
| `rg -n "[[:blank:]]$" ...final Apify Source Broker cross-check files` | Passed; no trailing whitespace found in touched code or docs. |
| `rg -n "[[:blank:]]$" ...from-scratch docs/code parity touched files` | Passed; no trailing whitespace found in touched code or docs. |
| `rg -n "[[:blank:]]$" ...touched SignalDesk docs` | Passed for action register, implementation plan, Firebase plan, validation, solo-founder investment plan, and market-practice cross-check; no trailing whitespace found. |
| `npm run verify:signaldesk` after solo-owner from-start audit | Passed; verifier checks product code, private routes, `/sd` alias support, fourteen sections, all action contracts, API guards, provider-send disabled state, connector/settings coverage, provider/budget/waterfall/packet/sequencer controls, Firebase isolation, no public website exposure, and docs truth. |
| `npm run verify:signaldesk` after Trust Partner Rail planning flag/docs | Passed; current runtime contract remains unchanged and provider-send stays disabled. |
| `npm run verify:signaldesk` after Operating Layer runtime implementation | Passed; verifier checks the Mission section, operating-layer actions, server exports, workspace arrays, UI controls, collection constants, rules/indexes, internal-only boundaries, and docs truth. |

## Confirmed Boundaries

- No public SignalDesk website page was created.
- No SignalDesk route was added to MenuList owner/customer navigation.
- No SignalDesk route was added to the public sitemap or robots surfaces.
- Dedicated SignalDesk hostnames rewrite to the private `/signaldesk` app and are reserved away from MenuList tenant/custom-domain routing.
- MyCodex-host `/sd` is an internal testing/operation alias for SignalDesk only; it does not change canonical product domains or expose a public SignalDesk website.
- No MenuList `stores`, `projects`, menu publish, billing, or customer output path was changed for SignalDesk.
- Operating Layer records compress founder decisions only; they do not mutate MenuList activation truth.
- No external provider account was configured; internal provider registry records and held defaults were implemented.
- No raw connector secrets are stored in Firestore; connector settings store metadata and env-derived secret states only.
- No raw Apify dataset payload is stored in Firestore; Apify source rows normalize into target imports and webhook events store payload hashes only.
- No arbitrary browser-supplied Apify Actor ID is accepted; Apify source execution uses `MENULIST_SIGNALDESK_APIFY_SOURCE_ACTOR_ID`.
- No real source import ran during local verification.
- No real Apify run was executed during local verification.
- No persistent or real target/contact/message/suppression data was created; deterministic E2E fixtures existed only inside the local Firestore emulator and were discarded at shutdown.
- No provider send was enabled or executed.
- Owned email sequencer queue was implemented, but no owned email was sent because provider send remains disabled.
- No paid provider account was purchased, connected, or configured.
- No new AI model provider beyond the existing gated Gemini assist path was implemented; OpenAI/Anthropic routes are held as policy records only.
- No external sequencer API was connected or called; Smartlead/Instantly/lemlist remain optional blocked/ready handoff records behind the owned email rail.
- No paid campaign automation was implemented.
- No Firebase deployment completed. The scoped QA rules/index command was retried after validation and again stopped at Firebase Rules API HTTP 403 before changing cloud resources.

## Remaining Blockers

| Blocker | Why it matters |
| --- | --- |
| Firebase project creation/access | Required before deploying `firebase-signaldesk.json`, rules, indexes, storage rules, or functions to `menulist-signaldesk-qa` / `menulist-signaldesk`. |
| Local SignalDesk Firebase mode/env | Legacy local `.env` values can still point the default MenuList Firebase project at `ecomsai`; do not use those files as setup truth. Current tracked templates and deployment constants keep MenuList local/preview on `menulist-qa`, while SignalDesk still needs its own `MENULIST_SIGNALDESK_FIREBASE_MODE` / project override before cloud smoke. Local emulator data-flow smoke now runs through `scripts/verification/smoke-signaldesk-workflow.js` with `FIRESTORE_EMULATOR_HOST`; browser-auth and role-negative coverage still require a seeded SignalDesk session/Auth emulator. |
| First market pod | Required before using the import/scoring workflow with real prospects. Recommended default pending founder approval: Bengaluru, Indiranagar + Koramangala, cafes/dessert shops/QSR/cloud-kitchen-facing storefronts, founder email/manual export first. |
| First approved source list | Required before using import, evidence, scoring, and draft workflow with real prospects. |
| Sender identity and physical address policy | Required before email/export readiness. |
| Suppression/unsubscribe/bounce/complaint policy | Required before any provider send or export path can leave draft mode. |
| Provider credentials and webhook secrets | Required before Google Places, Gemini, SMTP, WhatsApp, Instagram, Messenger, or signed inbound webhooks can run against real systems. |
| Apify source Actor and token | Required before Apify can run against a real Actor; Actor selection and terms review remain owner/compliance-controlled. |
| First paid-provider budget and eval set | Required before buying or connecting paid provider plans beyond small test usage; the registry/governor now exists to hold the decision. |
| External provider adapters | Required before Apollo, Hunter, ZeroBounce, Firecrawl, Tavily, Exa, Postmark, Resend, Smartlead, Instantly, or lemlist can run against real systems. |
| First sender domain policy | Required before any provider send, real sequencer handoff, domain warmup, or domain rotation decision; sender-domain risk records now exist. |
| Cross-provider strong-model approval | Required before OpenAI/Anthropic routes move from held policy records into executable model routes. The approved same-provider Gemini escalation is implemented. |
| Authenticated browser workspace session | Product-local sign-in hydration is verified, and deterministic emulator E2E covers authenticated workflow/role/safety behavior. A seeded real active-member session is still required for final visual interaction checks across the five private workspace destinations. |
| Operating-layer smoke data | Required to verify seed -> mission -> offer CTA -> experiment card -> reply playbook -> source snapshot -> mission review with a real authenticated SignalDesk session. |
| Partner auth account | The internal team access flow can grant SignalDesk access by login email, but the partner still needs a valid auth account/session using that email. |
| MenuList-side Activation Concierge runtime foundation | Existing MenuList upload/parse/preview/claim/publish/share/presence paths now have a shared activation-proof summary over `starterActivationSignals` and `menuPresence`; SignalDesk still observes outcomes only and does not write MenuList truth. |
| Paid campaign automation | Explicitly skipped for this slice and still out of scope. |
| Firebase deploy | Scoped QA rules/index deployment was attempted and is blocked by Firebase Rules API HTTP 403 until operator access is granted; production deployment remains out of scope. |

## Next Implementation Slice

The next safe slice is granting QA access, approving the held operating inputs, and running one narrow seven-day pod. It is not paid campaigns, provider send, public SignalDesk pages, or production deployment. The first-trial loop now handles interested-reply revenue projection, outcome-to-activation updates, stall detection, and founder-brief prioritization without further horizontal feature expansion.

## AI Distribution Workbench Row Output - July 11, 2026

The Research Agent Table now stores the practical founder-review output directly on each row:

- evidence summary;
- policy-allowed route and reason;
- route-permission state and hard-gate failures;
- recommended CTA;
- recommended message angle;
- fit decision;
- next action.

Opportunities retains the 20-30 row candidate inventory. Today exposes at most five decisions and prioritizes critical replies, engaged owners, and stalled activations before new approvals. Evidence-only or expired source policies now show no contact route.

## Activation-Control Hardening - July 11, 2026

Local emulator coverage now proves:

- source-rights completeness and field-level contact stripping;
- persisted-row route revalidation after source-policy expiry;
- owner-review, evidence, two-distinct-surface, and idempotency requirements for activation;
- no activation authority from legacy unverified outcome summaries;
- signed HMAC outcome intake, expiring hashed route-token attribution, replay-window rejection, and duplicate no-op behavior;
- customer-proof creation blocked without permission and draft generation blocked after revocation;
- complaint classification creates suppression, an incident, an email pause, and top mission priority;
- no SignalDesk write to MenuList `stores`, `menus`, `projects`, or `billing`.

The receiver is safe for local testing only until `MENULIST_SIGNALDESK_OUTCOME_BRIDGE_SECRET` is provisioned and a separately reviewed MenuList-owned emitter exists. No Firebase or Vercel deploy and no real send occurred.

## Full Activation-Control Cross-Check Corrections - July 11, 2026

The prior static verifier passed while several cross-object lifecycle defects remained possible. A manual code-path review plus expanded emulator fixtures closed the following gaps:

| Area | Correction and regression proof |
| --- | --- |
| Operator shell | Primary navigation is now exactly Today, Opportunities, Conversations, Activations, and Controls. Advanced private routes remain reachable from Controls and are explicitly absent from the primary navigation contract. |
| Allowed routes | Workspace derivation rechecks both the current source policy and current target suppression state, so a persisted contact route cannot survive suppression or rights expiry. |
| Source-use authority | Draft/approval require current evidence and personalization rights; export/handoff/send/follow-up also require contact rights; retention refresh requires storage and evidence rights. E2E revokes each right independently. |
| Import identity | A request-local identity map deduplicates repeated businesses before a Firestore batch commits. |
| Customer proof | Every customer-proof asset binds exact public proof scopes. Creation rejects scopes outside the grant, and draft generation fails after scope narrowing, revocation, or expiry. |
| Outcomes | Idempotency keys bind normalized request fingerprints; conflicting reuse and future timestamps fail. Owner-qualified intent and verified two-surface activation are durably projected to the target, converted state cannot be downgraded, and the activation deadline starts at owner-qualified intent. |
| Webhooks | Provider-scoped hashed IDs plus `batch.create` reserve the event atomically with its side effects. Concurrent duplicates produce one winner, same external IDs from different providers do not collide, supplied target IDs must be path-safe and resolve to an existing target, and interested replies project the conversation/intent state. |
| Mobile | Emergency pause remains available with confirmation/audit, but mobile cannot clear a pause. All approval, export, send, PII, provider, configuration, schedule, spend, and policy mutations remain server-blocked. |
| Serialization | API projection preserves JavaScript `Date` values as ISO timestamps instead of converting them to empty objects, which keeps activation deadlines usable. |
| Membership privacy | Normal Firestore clients can read only their own team-membership document; cross-member reads/lists are denied, while platform-admin reads/lists remain available. Client writes remain denied. |
| Client isolation | SignalDesk now uses the lightweight NextAuth provider already used by a separate protected product shell. The MenuList store/tenant/subscription Firebase bootstrap no longer enters an authenticated SignalDesk client bundle. |
| Internal auth gateway | `/signaldesk/signin` and the `/sd/signin` alias render a noindex, Ant Design credentials screen under lightweight product-local providers. Callback paths are limited to `/signaldesk` or `/sd`, and the protected layout still rechecks active SignalDesk access after authentication. |

No provider-send flag was enabled, no external provider was called, no public SignalDesk route was added, and no MenuList runtime or truth collection was changed.

### Final local verification evidence

| Check | Result |
| --- | --- |
| `npm run verify:signaldesk` | PASS - 2,373 runtime and boundary assertions |
| `node scripts/verification/smoke-signaldesk-routes.js` | PASS - 71 canonical localhost route/API/auth-alias checks with exact redirect destinations |
| Fresh-browser desktop/mobile check | PASS - product-local sign-in hydrates with zero new console errors; dark theme is readable; 390px viewport has no horizontal overflow and the submit target is 44px |
| `npm run test:signaldesk:e2e:local` | PASS - mocked authenticated workflow, source-right revocation, same-import dedupe, proof-scope narrowing/revocation, outcome conflicts/projection, concurrent provider webhooks, safety negatives, signed outcome bridge, complaint circuit breaker, and no MenuList-truth writes |
| `npm run test:signaldesk:rules` | PASS - Firestore and Storage semantic access tests, including self-only normal-member membership reads and platform-admin visibility |
| `npx tsc --noEmit --incremental false --pretty false` | PASS - an intermediate run overlapped an unrelated in-progress knowledge-base edit, but the final settled-worktree run completed with no diagnostics; that unrelated file was not changed by this pass. |
| `npm run lint` | PASS with no warnings |
| `npm run docs:check-links -- --root __docs__/menulist-signaldesk` | PASS - 2,363 files scanned, 4,229 links checked, 0 broken links or naming violations |
| `git diff --check` | PASS |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json \"true\"` | PASS - local Firestore configuration/emulator startup only; no deployment |

The canonical private local route is `http://localhost:3000/signaldesk`; fresh sessions enter through `http://localhost:3000/signaldesk/signin`. The route smoke ran against that host because product-aware middleware intentionally treats the canonical localhost host differently from arbitrary development ports.

This remains an internal SignalDesk workflow. No provider send, public SignalDesk page, social auto-reply, WhatsApp automation, paid campaign, external account mutation, or MenuList store/menu/project/billing/public-output write was added.

Recommended default pending founder approval:

| Decision | Default |
| --- | --- |
| Market pod | Bengaluru, Indiranagar + Koramangala, cafes/dessert shops/QSR/cloud-kitchen-facing storefronts |
| CTA | One current official menu link for QR, WhatsApp, Google/Profile, Instagram, and repeat customers, reviewed before publishing |
| Channel | Founder email/manual export first |
| Proof asset | Before/after current-menu-link proof with activated surfaces |
| Trust partner niche | Menu photographers and restaurant consultants |

Build order:

1. run an authenticated seed/import/score/evidence/draft/packet/approval/export smoke in emulator or QA after owner/session access is available;
2. run an authenticated Operating Layer smoke: prepare mission, save offer CTA, create experiment card, save reply playbook, create source quality snapshot, and review the mission;
3. choose one market pod, one approved source list, one offer CTA, one proof asset, one sender identity, and one manual/export path;
4. run 25-50 targets through the full owner-approved loop and record upload, preview, publish, and two-surface activation outcomes;
5. create the MenuList-side Activation Concierge doc set before runtime work: upload, parse, preview, owner approval, publish, QR, WhatsApp copy, Google/Profile checklist, Instagram/staff-share checklist, and two-surface tracking;
6. build the MenuList-side Activation Concierge only after the SignalDesk route-to-outcome bridge has a clean smoke and the owner approves the feature boundary;
7. choose a narrow provider eval set only after one pod exposes a real source/contact-quality bottleneck;
8. keep provider send, paid campaign automation, auto-publish, public SignalDesk pages, cold WhatsApp, cold Meta DMs, Reddit/X auto-replies, LinkedIn automation, and Firebase deploy deferred until the owner explicitly asks for them and the related policy gates are satisfied.
