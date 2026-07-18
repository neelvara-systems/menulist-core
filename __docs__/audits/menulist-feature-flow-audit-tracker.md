# MenuList Feature Flow Audit Tracker

**Status:** Active strict-order ledger
**Last updated:** July 18, 2026
**Authority:** Current code, runtime contracts, maintained feature docs, and focused verifiers outrank historical guides and assumptions.

This tracker preserves the agreed audit order. Do not start a later item until the current item has completed its local code/docs verification. Provider, deployment, browser, device, DNS, IAM, and other owner/release-operator evidence remains pending and must not be reported as source completion.

## Canonical inventory snapshot

- **41 numbered end-to-end audit entries are locally source complete.**
- **35 are MenuList-owned feature flows:** items **1-34 and 41**.
- **6 are adjacent-product separation audits:** items **35-40** cover Answerlattice, CampaignCue, SignalDesk, GrowthOS/Growth Kits, KitStamp, and MyCodex. They are not MenuList features and must not be added to MenuList product claims.
- **8 later MenuList system-wide audits** cover localization, accessibility, owner PWA lifecycle, configuration safety, failure handling, account/tenant lifecycle, ownership/dormancy, and Firebase scale/cost. They are tracked below as cross-cutting contracts rather than being inserted into the frozen 1-41 order.
- **12 dedicated subflow audits** cover the earlier AI, billing, media, extraction, AMM, recovery, delivery, export, API/POS, and MobileShell passes. They are tracked below under their owning feature families and are not counted again as independent products.
- **SurfaceOS remains a separate planning-only boundary** with no MenuList runtime feature, route, Firebase target, or owner/customer claim.

“Local source complete” means code, related maintained docs, logical/error paths, Firebase cost posture, relevant desktop/mobile/public surfaces, and focused local verification were reviewed. It does not mean the pending deployment, provider, authenticated browser, physical-device, DNS, IAM, or production-host evidence has been completed.

| # | Feature flow | Local status | External/owner status |
| --- | --- | --- | --- |
| 1 | Project mutation, publish, and public cache | Local source complete | Pending approved app/Functions release and authenticated owner/public/cache/device smoke |
| 2 | Multi-location and outlet lifecycle | Local source complete | Pending approved app release, Razorpay sandbox matrix, and authenticated desktop/MobileShell/public smoke |
| 3 | Authentication and onboarding | Local source complete | Pending approved app release, provider, Firebase claims, browser/device, claim-mode, and payment recovery evidence |
| 4 | Public customer delivery | Local source complete | Pending approved app release and hosted route/SEO/PWA/API/browser-payload/device smoke |
| 5 | Global media and Storage lifecycle | Local source complete | Pending approved app release, QA Storage rules and maintenance scheduler deploy, authenticated owner/public/device smoke, and bucket inventory/lifecycle evidence |
| 6 | Owner notifications and messaging onboarding | Local source complete | Pending approved app/Functions release, owned SMTP/Meta setup, provider smoke, authenticated platform/owner/browser/device/public-cache/account-claim smoke, and production-host evidence |
| 7 | Feedback, reviews and reputation | Local source complete | Pending approved app release and hosted public/desktop/MobileShell/Turnstile/rate-limit/retry/custom-domain smoke; Reviews/Reputation flags remain off |
| 8 | Staff, roles and permissions | Local source complete | Pending approved app release plus hosted Owner/Manager/Staff/custom-role, Firebase Auth/email, Upstash, desktop/MobileShell, session-lifecycle and device smoke |
| 9 | Special menus and scheduled switching | Local source complete | Pending approved app release, scoped scheduler/index deployment, and hosted activation/expiry/public/OBP/screen/device smoke |
| 10 | Digital screens | Local source complete | Pending ordered QA app/Functions/backfill/rules rollout, authenticated owner/browser smoke, real TV/tablet offline/reconnect QA, and production-host evidence |
| 11 | Analytics, Business Health and Owner Assistant | Local source complete | Pending approved app release, authenticated desktop/MobileShell/public analytics smoke, deployed nightly-settlement/read-model evidence, role/device QA, and production-host evidence; Google provider certification belongs to item 14 |
| 12 | Print, export and physical surfaces | Local source complete | Pending approved app release, authenticated desktop/MobileShell browser QA, iOS/Android native-share cancellation/fallback smoke, visual PDF/ZIP/PNG and physical print/QR-scan review, AI-advisor provider smoke, public-tool production-host smoke, and production-host evidence |
| 13 | Custom domains and compliance pages | Local source complete | Pending approved app release, Vercel credentials/project access, real DNS/certificate propagation, authenticated desktop/MobileShell save/reset, custom-domain `/privacy`/`/terms`/`/refund`, browser/device, owner/legal text review, and production-host evidence |
| 14 | External integrations | Local source complete | Pending coordinated app → Firestore rules → legacy-secret migration rollout; live POS receiver/application proof; and the provider/dashboard/credential/browser evidence already owned by items 2–3, 6, 9, 11, and 13 |

## Second-pass improvement audit

This pass reopens each flow only for evidence-backed logical, scale, or Firebase-cost fixes. It does not reopen completed owner/release evidence and does not add speculative features.

| # | Feature flow | Second-pass status | Concrete outcome |
| --- | --- | --- | --- |
| 1 | Project mutation, publish, and public cache | Complete | Replaced the arbitrary 50-row deleted-project slug scan with two exact, capped current/redirect queries. The 90-day public-URL reservation now stays correct after more than 50 unrelated deletions; unrelated tombstones are not read; failure/cap behavior remains fail-closed. No write, collection, rule, or index added. |
| 2 | Multi-location and outlet lifecycle | Complete | Direct item/category override reset now uses one field-level delete plus the existing outlet-local state stamp. This removes one read per reset and prevents concurrent sibling resets from restoring stale overrides; linked-save, billing, policy, mobile, and public-cache behavior is unchanged. |
| 3 | Authentication and onboarding | Complete | Google first-user creation now delegates to the canonical Firestore sanitizer instead of flattening arbitrary objects in an auth-local recursive copy. Operation counts and owner/provider behavior are unchanged; unsafe value shapes fail before the existing deterministic transaction. |
| 4 | Public customer delivery | Complete | Tenant sitemap store discovery now explicitly enforces the existing 30-outlet cap with one master allowance and one overflow sentinel. Valid output/reads are unchanged; malformed over-cap tenants stop at 32 rows and do not trigger unbounded outlet-summary fanout. |
| 5 | Global media and Storage lifecycle | Complete | Prepared profiles still produce named local variants, but the current single-URL DAL now uploads only the selected persisted variant. This removes 1-3 unused Storage writes per owner image with no Firestore/read-model/public-output change. The stale mobile doc now matches the Tailwind `MobileShell` contract. |
| 6 | Owner notifications and messaging onboarding | Complete | Messaging health keeps its hourly transaction lease but checks it only in the first four UTC minutes, reducing the enabled idle control path from about 720 to at most 48 reads/day. Preview/confirmation/fix retry sends now report activity and failures to scheduler health. No collection, index, task, owner surface, or provider call was added. |
| 7 | Feedback, reviews and reputation | Complete | Guest Feedback retention now treats any reported batch-delete error as an existing scheduler task failure instead of a false success, keeping private-data backlog recovery visible. Submission, inbox, pagination, status, reply handoff, rules, and dormant Reviews flags remain unchanged; no new read, write, index, collection, or owner control was added. |
| 8 | Staff, roles and permissions | Complete | Staff store-mapping admission derives the valid 31-store maximum from the shared 30-outlet cap instead of rejecting legitimate mappings above 25. Master discovery queries at most 32 active rows, so historical deactivated outlets cannot create a false overflow; a legacy authorized target missing `active` is merged back under the same bound. Normal staff/Auth/role behavior is unchanged; no write, collection, rule, or index was added. |
| 9 | Special menus and scheduled switching | Complete | A different store pointer now blocks browser/Admin activation only when its exact scoped project is still a live active menu. Missing, malformed, inactive, cancelled, expired, or ended targets recover atomically. Normal paths add no operation; only the existing conflict path adds one exact read. No scan, write, collection, rule, or index was added. |
| 10 | Digital screens | Complete | Browser invalidation now reads the compact project summary and selected project through the same transaction that advances screen content version and the safe listener mirror. Concurrent menu writes retry instead of publishing stale projected items under a current version. Existing reads/writes, fallback rendering, owner/public behavior, schema, rules, and rollout order are unchanged. |
| 11 | Analytics, Business Health and Owner Assistant | Complete | Five high-cardinality analytics map parents that no runtime query filters or orders by are now exempt from automatic single-field indexing. Stored owner-visible details, public event admission/coalescing, Firestore document writes, settlement queries, dashboard/Business Health read models, and Assistant behavior are unchanged; index fanout/storage drops after the pending scoped index deploy. Daily-document width remains a measured residual risk rather than triggering an extra read/transaction on every event. |
| 12 | Print, export and physical surfaces | Complete | Generation remains browser-local; history/freshness state is tenant/store/project scoped, best-effort, and capped; native file share distinguishes unsupported, owner-cancelled, and real failure; remote logo/PDF-library waits are bounded; preflight and output limits remain deterministic; and no Firebase artifact path exists. The final line audit restored the existing Menu Kit delivery analytics for successful download fallbacks while leaving cancellation/error untracked. Server persistence or queues remain unjustified. |
| 13 | Custom domains and compliance pages | Complete | Domain ownership uses deterministic exact claims plus a capped legacy collision check; provider work is deadline/size bounded and compensated; public duplicate ownership fails closed; compliance keeps server-only writes and one tagged 60-second cached override read. The final line audit made advisory/provider limiters fail closed before Firebase/Vercel work and made malformed legacy compliance timestamps use the stable template date. No queue, polling loop, or per-render validation read was added. |
| 14 | External integrations | Complete | POS secret, test, and delivery routes now share fail-closed store-scoped rate-limit admission. A limiter-provider outage returns bounded retry guidance before Firestore or external-provider work instead of permitting uncontrolled outbound calls. Test and delivery reuse their exact canonical store read for current lifecycle/role admission instead of paying for a redundant pre-limiter permission read. Delivery/version transactions, logs, integration inventory, provider payloads, and owner surfaces are unchanged; no Firebase write, collection, rule, or index was added. |
| 15 | Decision Intelligence and Continuous Menu Intelligence | Complete | Removed unused automatic single-field indexes from the six high-cardinality `menuIntelligence` maps/arrays. CMI is accessed only by exact document ID, so nightly document reads/writes, scoring, TTL, rules, private state, Decision Blocks projection, cache invalidation, and owner/customer behavior are unchanged while index-entry fanout and index storage scale down with menu size. Scoped Firestore index deployment remains release-operator pending. |
| 16 | Menu Correctness Engine, menu quality, and trust signals | Complete | Corrected publish-snapshot retention truth. Dynamic store-named snapshot subcollections cannot use a `menuSnapshots` collection-group TTL policy, so the ineffective setup entry was removed. The existing leased cleanup task now rotates a deterministic daily page across all summary-known stores, including inactive stores, and deletes at most 25 expired rows per selected store. Snapshot writes, MCE/quality/trust computation, rules, schema, and owner/public behavior are unchanged; scoped scheduler deployment remains pending. |
| 17 | Reseller-assisted onboarding, licenses, and billing | Complete | Reseller client lists now order by `createdOn desc` in Firestore before the existing 100/200-row cap, so the bounded result is deterministic and newest-first with no read-count increase. Two scoped composite indexes support reseller/platform filters. Shared pending entitlement repair now runs before the reseller feature flag, preventing ordinary Razorpay mirror failures from becoming permanent while retaining the existing bounded daily task and operation limits. |
| 18 | Store identity and Official Business Page owner configuration | Complete | Removed unused automatic single-field indexes from the nested `stores.publicPresence`, `businessCopyMeta`, `businessAttributes`, and `workingHours` maps. Current routing and tenant queries use separate scalar fields, while these owner-content maps are consumed only after exact store resolution. Owner saves, store/summary writes, public cache invalidation, desktop/mobile parity, visual completion, and OBP rendering are unchanged; index fanout and storage drop after the pending scoped index deploy. |
| 19 | Menu design and customer presentation | Complete | Reused the existing operational menu diff for both master-update signaling and multi-outlet observation. Theme, layout, color, background, and other presentation-only saves no longer append an unrelated `menuChangeLog` revision row; item, price, availability, variant, and category changes retain the signal and observation writes. Canonical project mutation, publish concurrency, POS handoff, public truth/cache invalidation, desktop/mobile controls, and customer fallback rendering are unchanged. |
| 20 | Pricing integrity runtime | Complete | The focused runtime and behavioral gates pass with no additional Firebase artifact justified. Price normalization remains in-memory on the canonical project mutation; public menu, screen, PDF, bulk/AI, outlet, and cache/version paths reuse loaded project truth. A separate price ledger/read model/index would add writes and consistency risk without an active bounded query benefit, so the dormant PDF queue remains off and the current zero-price-specific-read/write posture is retained. |
| 21 | Working hours, holidays, and time slots | Complete | Removed the unused automatic index from `stores.timeSlotPresets`, whose nested array/map is read only from the exact store document. Weekly/Today hours saves, preset validation, paged project cascades, timezone/overnight/closed evaluation, Decision Block filtering, public cache invalidation, and desktop/mobile/customer behavior are unchanged. A usage ledger remains unjustified because preset edits are rare and the existing cascade is bounded. |
| 22 | Temporary status | Complete | Removed the unused automatic index from the bounded `stores.tempStatus` map. Manual set/clear, special-menu lifecycle ownership, fail-closed admission/rate limits, optimistic rollback, expiry-at-read projection, menu/OBP/feedback/public-API output, screen/Assistant/cache invalidation, and zero-history retention remain unchanged. A TTL worker or event collection remains unjustified. |
| 23 | Public Menu Entry and create-menu claim flow | Complete | Removed the stale `publicMenuDrafts(claimed, expiresAt)` composite after cleanup moved to one `expiresAt` query, and disabled automatic indexes for the large extracted menu/profile/source/attribution maps that are never queried. Signed-in admission, source dedupe, Storage/job creation, bounded polling, claim transaction/idempotency, publish/cache effects, claimed-source retention, and capped cleanup remain unchanged. Scoped index and existing maintenance Function deployments remain pending. |
| 24 | Menu setup progress and activation concierge | Complete | Disabled the unused automatic index for the nested `stores.starterActivationSignals` evidence map. Setup progress still derives from the already-loaded selected project/store truth, acknowledged owner actions retain their one existing store update, presence confirmation retains its existing transaction, and desktop/mobile completion behavior is unchanged. Index fanout now stays independent of the number of recorded action keys after the scoped index deploy. |
| 25 | Menu presence and public-truth monitoring | Complete | Disabled the unused automatic index for the canonical `stores.menuPresence` map. Confirm/remove still uses one transaction read and the same atomic store plus `storesSummary` writes; setup proof, readiness, desktop/mobile state projection, publish evidence, stale-removal behavior, and the deliberate absence of public-cache invalidation are unchanged. Confirmation writes no longer pay nested-map index fanout after the scoped index deploy. |
| 26 | Owner referral | Complete | The feature already uses one deterministic referral document, exactly two bounded collection queries/indexes, stateless invite tokens, event-driven payment settlement, and two required deterministic zero-cash billing-ledger rows. No additional read model, scheduler, counter, cleanup scan, or broad field-index exemption is justified before pilot measurements. Rollout flags remain off and existing attribution, Razorpay/reseller settlement, privacy, desktop/mobile, and billing-history behavior is unchanged. |
| 27 | Public Truth Tools, shareable reports, and lead handoff | Complete | Public checks/assets and shareable report links remain browser-local with zero report storage. Report Lead Ops now uses one scoped `sourceKind + createdOn` composite so a manual refresh reads only matching report enquiries instead of up to 120 unrelated website contacts. The current-user authorization read, rate limit, bounded result/filtering, incomplete-history warning, consented contact write, monitor history cap, and public/owner behavior remain unchanged. Scoped index deployment is pending. |
| 28 | MenuList Help Center and support flow | Complete | Disabled automatic indexes for the growing `supportTickets.messages`, `statuses`, `documents`, and `logs` fields in both dedicated Answerlattice and shared MenuList configs. Owner/platform ticket queries, scoped listeners, append-only transaction/rule validation, attachment trust boundaries, search/accounting, desktop/MobileShell behavior, and product separation are unchanged. Reply/status writes avoid unused nested index fanout after both scoped index deployments. |
| 29 | Internal Ops Control Room and platform monitoring | Complete | Disabled automatic indexing for the central `platformSummary.stores` and `platformSummary.projects` maps. Exact summary reads, current-user authorization, manual monitor caps, SAFE_MODE/recovery controls, scalar special-menu transition queries, summary writers, public cache/version behavior, and the existing leased alert cleanup are unchanged. Store/project summary writes no longer create index entries proportional to nested map width after deployment. |
| 30 | Main website, resources, pricing, trust, legal, and website i18n/SEO | Complete | Most website routes remain static or browser-local with zero Firebase operations. For the one persistent public-contact path, disabled automatic indexing for the free-text `landingPageEnquiries.message` and nested `landingPageEnquiries.sourceContext` payloads. The top-level routing/query scalars and scoped Report Leads composite remain indexed; admission, one-write submissions, private Ops reads, website behavior, and public output are unchanged. Scoped index deployment is pending. |

## Completed successor feature ledger

This successor ledger was rebuilt from current MenuList routes, feature flags, maintained feature docs, focused verifier registrations, and the completed boundaries on July 16-17, 2026. Every admitted item has now received its code/docs/logic/scale/Firebase/mobile/public cross-check and reached the local status recorded below. The numbering remains frozen so historical references and focused verifiers do not drift.

| # | Feature flow | Size | Queue status | Primary audit boundary |
| --- | --- | --- | --- | --- |
| 15 | Decision Intelligence and Continuous Menu Intelligence | Large | Local source complete | Public Decision Blocks, low-data/staleness safety, owner pins, compact analytics inputs, scheduler scoring, `publicDecisionBlocks`, `menuIntelligence`, customer rendering, cost, and recovery |
| 16 | Menu Correctness Engine, menu quality, and trust signals | Large | Local source complete | Save-time MCE stamping, observation/snapshots, editor/dashboard quality signals, owner action handoff, public trust signals, false-positive safety, write amplification, and docs truth |
| 17 | Reseller-assisted onboarding, licenses, and billing | Large | Local source complete | Reseller authorization, client creation, online/offline subscription coordination, capacity, expiry, payment confirmation, compensation, immutable ledger, desktop/mobile parity, and provider handoff |
| 18 | Store identity and Official Business Page owner configuration | Large | Local source complete | Business profile/contact/attributes, OBP actions, business copy/SEO, visual completion, selected media references, store/summary writes, public cache, desktop/mobile parity, and public projection |
| 19 | Menu design and customer presentation | Large | Local source complete | Desktop/mobile design controls, normalized theme/layout choices, category presentation, customer rendering, publish/version concurrency, public cache, and safe fallback output |
| 20 | Pricing integrity runtime | Medium | Local source complete | Price mutation through active project paths, public menu/screen/PDF parity, stale artifacts, dormant scaffold isolation, cache/version propagation, and owner-safe failure behavior |
| 21 | Working hours, holidays, and time slots | Medium | Local source complete | Desktop/mobile hours edits, presets and project cascades, store timezone, overnight/closed cases, customer status, Decision Block filtering, public cache, and Firebase cost |
| 22 | Temporary status | Small | Local source complete | Set/clear/expiry, permissions and rate limits, optimistic rollback, menu/OBP/feedback/pull-API projection, screen/assistant invalidation, cache, and expired-state cleanup |
| 23 | Public Menu Entry and create-menu claim flow | Large | Local source complete | Signed-in acquisition, upload/link intake, extraction reuse, preview polling, draft scope, claim transaction, session refresh, subscription handoff, publish/cache, cleanup, and mobile camera/browser behavior |
| 24 | Menu setup progress and activation concierge | Medium | Local source complete | Progress derivation, owner action routing, desktop/mobile consistency, stale-project/store handling, activation evidence, completion suppression, zero-extra-read goal, and onboarding overlap |
| 25 | Menu presence and public-truth monitoring | Medium | Local source complete | Manual confirmations, automatic evidence, starter signals, store-summary projection, monitor refresh, public cache, stale/removal handling, owner copy, and bounded read/write behavior |
| 26 | Owner referral | Medium | Local source complete; rollout flags off | Token capture, privacy disclosure, pre-payment attribution, distinct-wallet checks, Razorpay/reseller claim paths, atomic credit settlement, ledger/rules/indexes, mobile sharing, and pilot gates |
| 27 | Public Truth Tools, shareable reports, and lead handoff | Large | Local source complete | Tools hub and individual checks, browser-local versus server work, report tokens, lead capture/ops review, abuse/privacy limits, no unsupported provider claims, SEO, and Firebase cost |
| 28 | MenuList Help Center and support flow | Medium | Local source complete | Search, scoped Answerlattice support session, help navigation, ticket reads/mutations/attachments, product separation, desktop/MobileShell parity, failure fallback, and provider/deploy boundary |
| 29 | Internal Ops Control Room and platform monitoring | Large | Local source complete | Current superadmin authorization, SAFE_MODE, alerts, scheduler recovery, extraction/messaging/notification monitors, entity blocks, founder/cost posture, bounded queries, retention, and auditability |
| 30 | Main website, resources, pricing, trust, legal, and website i18n/SEO | Large | Local source complete | Route/content truth, feature and pricing parity, locale completeness, metadata/canonical/sitemap/robots, forms and CTAs, accessibility/performance, public claims, and production-host evidence |
| 31 | Google Business Profile sync and posting scaffold | Medium | Local source complete; intentionally disabled | Disabled flag truth, token/OAuth/provider boundaries, manual Google handoff, owner copy, routes/workers, Firebase cost, mobile posture, and activation prerequisites |
| 32 | Reviews, reputation state, and AI reply suggestion scaffold | Medium | Local source complete; intentionally disabled | Disabled parent/child flags, state reads, classifier truth, suggestion accounting, no-auto-post boundary, rules/indexes, dashboard/mobile absence, and provider prerequisites |
| 33 | QR-to-WhatsApp experiments and campaign measurement scaffold | Medium | Local source complete; planning only | Separation from normal QR/Menu Kit output, tracked-token/consent proposal, aggregate-first measurement, provider-send prohibition, flags, docs/runtime parity, and zero-current-cost truth |
| 34 | Trust, loyalty, and risk health-signal skeletons | Medium | Local source complete; intentionally dormant | Disabled dependency chain, computation inputs, unique/returning visitor truth, scheduler/UI absence, no-current-cost proof, activation thresholds, and misleading public-claim prevention |
| 35 | Answerlattice product boundary | Large | Local source complete | Doctrine/freeze invariants, dedicated Firebase/runtime separation, canonical-first retrieval, governance, support fallback, billing, widget/public routes, mobile, cost, retention, and deploy evidence |
| 36 | CampaignCue product boundary | Large | Local source complete | Dedicated product/Firebase identity, source facts, cue/pack/creative lifecycle, approvals, export-first delivery, owner/public routes, rules/storage/indexes, mobile, and disabled provider/billing promises |
| 37 | SignalDesk internal operating system | Large | Local source complete | Internal-only access, separate Firebase, source provenance, evidence/drafts/approvals, provider/send and spend gates, outcomes, retention, cost, founder controls, and route/API boundaries |
| 38 | GrowthOS / Growth Kits MenuList add-on | Large | Local source complete | Pro/Premium entitlement, source-fact freshness, deterministic kits, manual handoffs, review guard, exports, desktop/mobile Today parity, Firestore cost, and no-post/no-ROI boundaries |
| 39 | KitStamp separate-product plan | Medium | Local source complete; planning only | Planning-only truth, naming/identity lock, absent routes/Firebase/functions, disabled foundation requirements, docs claims, and prevention of accidental GrowthOS/MenuList coupling |
| 40 | MyCodex static private reader | Medium | Local source complete | Static/no-DB invariant, Basic Auth/session boundary, Markdown/document packaging, PWA/offline/audio-reader behavior, host routing, cache, mobile, and three-env-key limit |
| 41 | Embedded owner-flow capabilities | Large | Local source complete | Category icons through extraction/repair/public rendering; behavior nudges through activation/Today; item-photo assistance through existing media intake; visual completion through OBP/media—without duplicate feature storage or routes |

The ledger avoids duplicating work already owned by items 1-30 or the earlier dedicated AI/billing audits. The previously excluded dormant scaffolds, sibling-product boundaries, and embedded capabilities are explicitly admitted as items 31-41. Admission to audit does not activate a dormant feature, merge products, authorize provider/spend behavior, or override a product doctrine/freeze.

## Cross-cutting MenuList system audits

These contracts affect several numbered features and therefore remain separate from the frozen feature-flow numbering.

| ID | System-wide flow | Local status | Coverage |
| --- | --- | --- | --- |
| X1 | Global locale, timezone, date, time, number, currency, and RTL handling | Local source complete | Preference admission, deterministic server fallback, shared formatters, invalid-date refusal, RTL direction, desktop/MobileShell/public parity, and zero-Firebase preference cost |
| X2 | Global accessibility and interaction | Local source complete | Zoom, skip navigation, keyboard activation, focus visibility, reduced motion, touch targets, control names, image alternatives, and owner/website/public surfaces |
| X3 | Owner PWA, connectivity, and update lifecycle | Local source complete | Worker scope, private-page caching refusal, preview cleanup, owner-controlled refresh, non-blocking connectivity state, bounded caches, and offline truth |
| X4 | Feature flags, environment, and deployment configuration safety | Local source complete | Boolean admission, rollout selection, product/env separation, QA/production targets, source-controlled flag truth, and release/deploy boundaries |
| X5 | Global failure handling and observability | Local source complete | Recovery actions, cache preservation, acknowledged diagnostics, non-recursive fallbacks, PII redaction, monitoring boundaries, and unavailable-versus-empty state |
| X6 | Account and tenant data lifecycle | Local source complete | Logout teardown, browser/in-memory owner truth cleanup, onboarding/membership preservation, deactivation, refresh-token revocation, and privacy-request truth |
| X7 | Ownership transfer and dormant lifecycle | Local source complete | Owner-role versus legal ownership, coordinated transfer, last-owner protection, dormant-account non-deactivation, billing/public-menu preservation, and support boundary |
| X8 | Whole-system Firebase scale and cost closeout | Local source complete | Global-task daily lease, store-local EOD behavior, scheduler retries, index de-duplication/exemptions, summary-document bounds, and pending scoped deploy evidence |

## Dedicated audited subflows

These are real end-to-end reviews completed before or during the numbered passes. They stay visible here but are not double-counted as separate product families.

| ID | Dedicated subflow | Owning inventory boundary | Local status |
| --- | --- | --- | --- |
| S1 | AI transaction accounting, capacity consumption, and owner transaction history | Projects, analytics/owner surfaces, billing, and AI operation boundaries | Local source complete |
| S2 | Razorpay checkout, subscriptions, renewals, AI top-ups, entitlements, webhooks, and compensation | Items 2, 3, 14, and 17 | Local source complete; live sandbox/provider proof pending |
| S3 | AI image generation, review, selection, persistence, prompt cache, and retention | Items 1 and 5 plus embedded media assistance in item 41 | Local source complete |
| S4 | AI description generation, review, acceptance, persistence, and accounting | Project mutation/editor boundaries in items 1 and 19 | Local source complete |
| S5 | AI multi-language translation, review, acceptance, persistence, and accounting | Project mutation/editor/localization boundaries in items 1, 19, and X1 | Local source complete |
| S6 | Image/menu extraction, upload/link intake, job lifecycle, review, retry, and persistence | Items 3, 5, 6, and 23 | Local source complete |
| S7 | AI Menu Manager proposal, compact session, integrity snapshot, recovery, and owner display | Project/owner-assistant boundaries in items 1 and 11 | Local source complete |
| S8 | Project recycle bin, deletion, restore, slug reservation, and public recovery | Item 1 | Local source complete |
| S9 | Customer App/PWA public delivery | Items 4 and X3 | Local source complete |
| S10 | Print, share, PDF/ZIP/PNG, Menu Kit, and physical-output delivery | Item 12 | Local source complete |
| S11 | Platform Pull API, POS webhook delivery, and temporary-status/public projection | Items 14 and 22 | Local source complete; live receiver/provider proof pending |
| S12 | Cross-surface MobileShell, desktop/mobile inheritance, and owner display parity | Every applicable MenuList owner flow plus X1-X3 | Local source complete |

## Status rules

- **In progress:** audit, fixes, documentation, or local verification is still running.
- **Local source complete:** code-truth review, necessary bounded fixes, maintained docs, and focused local gates are complete.
- **External/owner pending:** target deployment or live provider/browser/device evidence is still required. This does not reopen a completed source audit, but it blocks production certification.
- A later item can begin only after the current item reaches **Local source complete**.

## Completed item 3 source boundary

The auth/onboarding pass covers signup and returning login, Google/credentials/phone OTP, messaging account claim, user identity reuse, first tenant/store creation, Razorpay subscription coordination, custom-claim minting, session refresh, checkout dismissal/resume, concurrency, and failure compensation. Focused source, emulator, session, billing, lint, type, and diff gates passed. It does not certify live provider configuration or deployed behavior.

## Completed item 4 source boundary

The public-delivery pass covers canonical subdomain/custom-domain/store resolution, root/brand/outlet OBP, current and previous project paths, `/menu`, unknown/deleted recovery, linked/special render consumption, browser project/store projection, schema/metadata/robots/sitemap, Customer App manifest/start/shortcuts, and MenuList pull API selection. Unknown slugs no longer show another menu; project identity is scope-checked across every summary consumer; sitemap invalidation matches publish tags; browser payloads are explicit allowlists. Focused routing, PWA, OBP, pull-API, public-truth, summary, lint, type, and adversarial DTO gates passed. Hosted deploy, browser/device, crawler, PWA-install, and external API smoke remain pending.

## Completed item 5 source boundary

The global media and Storage pass covers prepared images, browser and Admin uploads, project intake, store logos, OBP cover/gallery media, PWA icons, digital-screen slides, AI-generated images and prompt-cache copies, public artifacts, generic upload helpers, Storage rules, replacement cleanup, and scheduled retention. Deterministic Admin uploads are create-only and reuse the existing object/token on safe retries; image-batch review no longer directly deletes shared public URLs; scheduled image-batch retention prunes bounded Firestore payloads without physically deleting media until global cross-project/outlet reference proof exists; and prepared public media admits only JPEG, PNG, or WebP at the Storage boundary. Focused unit, source, Storage-emulator, extraction, AI-accounting, type, Functions build/lint, scoped lint, documentation-link, and diff gates passed. QA rules/scheduler deployment, approved app release, authenticated owner/public/device smoke, and live bucket inventory/lifecycle evidence remain pending.

## Completed item 6 source boundary

The owner-notification and messaging-onboarding pass covers registered billing/credit/publish/staleness triggers, bounded event creation, tenant-bound recipient and consent resolution, owner-safe formatting, email/WhatsApp provider calls, deterministic delivery/retry/platform recovery, signed messaging webhook intake, durable dedupe, session/rate admission, media validation/download, extraction, preview/fix/approve, publish/claim, outbound leases, expiry/cleanup, and platform monitoring. Fake header order notifications were removed; event/provider payloads and waits are bounded; authenticated WhatsApp redirects are refused; consent revocation wins; and publish-verification failures dedupe per store/day. Focused owner tests, Firestore emulators, platform-monitor gates, the full extraction/messaging suite, exact TypeScript, Functions build/lint, scoped lint, and dependency freeze passed. Approved release, owned SMTP/Meta setup, live provider/browser/device/public-cache/account-claim smoke, and production-host evidence remain pending.

## Completed item 7 source boundary

The feedback/reviews pass covers the public feedback page and submit route, project/store/tenant eligibility, browser data projection, bounded validation and abuse controls, retry idempotency, store-configured fields and Google link safety, desktop and MobileShell inboxes, cursor pagination, status transitions, manual reply handoff, retention, Firestore rules, and compact events. Public payloads no longer receive canonical owner/internal store data; exact retries create one feedback/event pair; desktop/mobile state stays aligned; and misleading review-interception claims were removed. The separate Reviews/Reputation and AI Reply Assist runtime remains disabled because ingestion, a state writer, owner DAL/inbox, provider posting, scheduler, and mobile UI do not exist. Focused source/public/mobile gates, exact TypeScript, scoped lint, documentation links, JSON validation, diff checks, and both Guest Feedback and Reviews Firestore emulator suites passed. Approved app release and hosted public/desktop/mobile/provider/custom-domain smoke remain pending.

## Completed item 8 source boundary

The staff/roles pass covers staff list/create/update/remove, email and owner-passcode authentication handoff, password reset, self password change, force sign-out, platform placeholder verification, role CRUD, 29-permission taxonomy, desktop/MobileShell gates, multi-store mappings, last-owner/role-in-use concurrency, target lifecycle, and the separate read-only Today staff summary. Managers can manage ordinary staff but cannot mutate Owner accounts without role-assignment authority; rejected staff transactions no longer revoke tokens before commit; default-role repair preserves concurrent edits; Auth email collisions are never adopted; explicit same-user Auth binding is required before placeholder verification; and inactive/deleted tenant/store sessions fail closed. Focused source, scope/taxonomy, concurrency/emulator, Staff Prompt, type, lint, dependency, documentation-link, and diff gates passed. Approved app release plus hosted role/session/Firebase Auth/email/Upstash/desktop/MobileShell/device evidence remains pending.

## Completed item 9 source boundary

The Special Menu pass covers create/edit, overlay/replace projection, overlap refusal, manual activate/expire/cancel, active-pointer and temporary-status repair, generic edit/deactivate/delete bypass prevention, desktop/MobileShell parity, two-minute due switching in the consolidated maintenance scheduler, nightly recovery, compact-summary next-transition markers, public cache and Digital Screen refresh, and bounded diagnostics/cost. Exact TypeScript, root lint, focused source and overlay tests, Firestore rules and Admin lifecycle emulators, Functions build/lint/preflight, dependency, documentation-link, and diff gates passed. The scoped QA scheduler deploy completed predeploy checks but stopped at Cloud Resource Manager HTTP 403 before upload; approved app release plus deployed schedule/index/public/OBP/screen/expiry smoke remains pending.

The second pass additionally proves that a legacy/corrupt different pointer cannot make a valid schedule retry forever. The browser and Admin transactions validate only that exact target, preserve blocking for a genuine live competitor, and overwrite stale state with the due menu atomically. The ordinary activation path keeps the existing reads; the exceptional conflict path adds at most one exact project read.

## Completed item 10 source boundary

The Digital Screens pass covers first setup and token creation, Menu Board and Highlights rendering, public token resolution, canonical and public listener state, menu/store/special-menu invalidation, daily liveness, desktop/MobileShell settings and link surfaces, Menu Manager link handoff, custom slide upload/caption/delete/expiry, offline cache/reconnect, kill switch, role presentation, migration, Firebase rules, cost, and current owner/public documentation. The predictable listener mirror no longer exposes the bearer token or permits public collection listing; owner entry points gate before reads and invalidate stale permission loads; expired slides recover capacity; liveness failures stay retryable; and Highlights preserves a valid cache while clamping a shortened rotation. The dedicated source/lifecycle/rules suite, public truth/delivery/project/AMM/special-menu/roles/mobile/presence/PWA gates, exact TypeScript, root and Functions lint/build, dependency freeze, documentation-link, and diff gates pass. The ordered QA app writer → Functions writers → mirror backfill → stored-data verification → Firestore rule cutover, followed by authenticated browser/TV/tablet/offline/reconnect and production-host evidence, remains pending.

The second pass also moved the existing projection summary/project reads onto the invalidation transaction. This removes a consistency gap where a concurrent menu save could leave the new `contentVersion` attached to stale projected items. No operation count, document shape, rule, index, public fallback, owner flow, or ordered rollout step changed.

## Completed item 11 source boundary

The Analytics, Business Health and Owner Assistant pass covers public menu/OBP/Customer App event selection, browser queue/coalescing/retry, protected Admin daily writes, store-business-day bucketing, analytics preferences, Firestore rules, nightly idempotent settlement and late correction, compact owner/OBP read models, Today-first desktop/mobile dashboards, lazy settled views, owner action receipts, Business Health current/analytics/location/thread/feedback/answer APIs, deterministic grounded answers, packet caching, permissions, multi-store scope, mobile direct entry, failure handling, and active code-truth docs.

Impossible public calendar dates now fail before cached target reads; MobileShell cannot mount dashboard or Business Health through a direct hash/path without loaded `VIEW_ANALYTICS`; future AI-answer limiter-provider outages fail closed and SAFE_MODE work follows request/scope/permission admission; and mark-done receipts recheck the current action and update/prune inside one Firestore transaction. A dedicated emulator proves concurrent new receipts retain both acknowledgements under the 20-receipt cap and repeat-marking does not evict a sibling. The stale overview-era 37-read Owner Dashboard guide is archived and the active help/runtime/cost docs now match source.

Focused analytics source/browser/normalizer/Admin-write/receipt-transaction, rules, comparison, settlement, Functions persistence, catalog intelligence, Owner Dashboard, Business Health, Owner Assistant, mobile-route, TypeScript, full lint, dependency-freeze, documentation-link, JSON, and diff gates pass. The broad MenuList tenant-safety verifier now also passes after its extracted receipt-helper, normalized subscription-link, current auth-doc, and protected POS-secret assertions were aligned with source. The repository-wide readiness aggregate proceeds through the MenuList auth/onboarding block and stops only at the separate SignalDesk Firebase Admin local-ADC diagnostic gate; no item-11 assertion fails. Firestore analytics reads remain tenant/store isolated while fine-grained `VIEW_ANALYTICS` admission is enforced by the owner shell and protected APIs; changing custom-role permissions into Firebase-rule claims would be a project-wide authorization redesign and is not introduced here.

Answerlattice weekly narrative and Chat ROI code under the shared analytics route tree remain a separate product boundary. Live Google Analytics provider configuration and provider smoke are deferred to strict item 14 rather than mixed into this MenuList source pass. No Firestore rule, index, Storage rule, or Cloud Function source changed in item 11, so this pass requires no Firebase deployment. Approved app release, authenticated browser/device/role smoke, deployed nightly-read-model evidence, and production-host evidence remain pending owner/release work.

The second pass adds only the verified analytics index exemptions described above. It does not remove high-cardinality fields because search/item details are current owner-visible inputs, and it does not add a read or transaction to every public event merely to enforce a top-N map. The focused analytics emulators plus Business Health and Owner Assistant gates remain green. This second-pass `firestore.indexes.json` change now requires a scoped index deployment; it is pending with the other owner/release work.

## Completed item 12 source boundary

The print/export pass covers Menu Card Export, the PDF compatibility bridge, structured JSON/XLSX export, Menu Kit, Printable Asset Templates and Saved designs, Print Assets, Print Menu Surfaces, menu/OBP/feedback QR downloads, public browser-local Print & Share Tools, QR Link Health Check, and the legacy campaign Physical Surfaces read/download path. Item Truth Export remains correctly reserved with no invented runtime.

The second pass kept this architecture unchanged after rechecking controller loading/switching, print preflight, renderer waits, local history/freshness isolation and caps, file-share cancellation/fallback behavior, filenames, mobile shell entry, saved-template boundaries, and the absence of Firebase artifact persistence. The final line audit corrected one analytics regression so a successful unsupported-share download fallback retains the same Menu Kit delivery event as a successful native share; cancellation and real failure remain untracked. The focused source gates and browser-boundary regression remain the right scale/correctness controls; a server export queue or artifact collection would be overengineering for the current flow.

Native file sharing now distinguishes shared, unsupported, cancelled, and failed outcomes across Menu Card Export and Menu Kit. Cancellation no longer causes an unwanted download or false success; unsupported file sharing retains the download fallback, and both successful native shares and successful fallback downloads retain the existing delivery analytics. Device-local export history and quick-PDF freshness markers are tenant/store/project scoped and best-effort after delivery, so equal project IDs across outlets cannot share history and storage rejection cannot turn a delivered file into a failure. Store switches reload even with equal project IDs, quick-PDF freshness clears after a current-session download, remote logo/PDF.js work is bounded, and empty/non-Latin QR labels receive stable filenames.

PDF Surface is documented as a compatibility bridge into Menu Card Export and its removed standalone v2.2 contract is archived. Legacy campaign Physical Surfaces remains a read-only compatibility path for already-populated summary data; current source has no writer for that field, so supported physical identity work stays in Menu Kit and Print Menu Surfaces rather than reactivating a superseded campaign feature.

The browser-boundary test, Menu Card, structured export, printable-template, communication/Menu Kit, public Print & Share Tools, QR-health, PDF-cleanup, exact TypeScript, lint, dependency-freeze, documentation-link, JSON, and diff gates pass. The final focused rerun also passed Menu Card Export, structured menu export, Print & Share Tools, and Printable Asset Templates on the current worktree. The repository-wide readiness aggregate's remaining stop is the separate SignalDesk diagnostic gate recorded under item 14; no item-12 assertion fails. No Firestore rule, index, Storage rule, or Cloud Function source changed, so item 12 needs no Firebase deployment. Approved app release, authenticated browser/device sharing, visual PDF/ZIP/PNG and physical print/QR scan review, AI-advisor provider smoke, public-tool hosted smoke, and production-host evidence remain pending owner/release work.

## Completed item 13 source boundary

The custom-domain pass covers advisory availability, reserved product roots, tenant/store permission and lifecycle admission, deterministic claim reservation/current/releasing/released states, same-store and cross-store concurrency, Vercel add/project-membership/configuration/removal, response deadlines and bounded parsing, replacement/removal compensation, explicit verification downgrade, desktop/MobileShell state parity, derived cleanup/cache copy, public host resolution, public cache invalidation, and owner-facing DNS rows. Advisory availability now uses `GET /api/domain?candidate=` with `DATA_READ` and the same canonical claim/collision reads as authoritative POST instead of a browser cross-store query. Both domain limiters fail closed with retryable `503` responses on limiter-provider outage before Firestore or Vercel work; normal quota exhaustion remains `429`. DNS rows use Vercel's preferred apex IPv4/A or project-specific subdomain CNAME plus verification challenges; missing provider guidance no longer creates a generic fallback.

The compliance pass covers fixed `/privacy`, `/terms`, and `/refund` intercepts on subdomains/custom domains, canonical public store eligibility, deterministic baseline generation, stable effective dates, sanitized plain-text owner overrides, retained baseline/platform disclosure, tenant/store-scoped owner preview, desktop/MobileShell save/reset acknowledgement, server-only writes, Firestore rules, and public read cost. Public overrides now use a store-tagged 60-second cache invalidated after save/reset, with bounded `refreshPending` fallback. Missing, invalid, or malformed legacy modification timestamps use the versioned effective-date fallback instead of breaking public output. The refund baseline no longer invents subscription rules, eligibility windows, processing timelines, or non-refundable categories; final owner/legal review remains external.

Focused custom-domain, Vercel provider/DNS, compliance, URL-routing, MobileShell route, public-business-truth, Firestore emulator, exact TypeScript, full lint, dependency-freeze, documentation-link, and diff gates pass. The final current-worktree rerun passed both the custom-domain/Vercel provider suite and compliance boundary; the broad MenuList tenant-safety verifier is green. No Firestore rule, index, Storage rule, or Cloud Function source changed in item 13, so no Firebase deployment is required. Approved app release, configured Vercel provider environment, real DNS/TLS, authenticated desktop/mobile owner and public policy browser/device smoke, owner/legal review, and production-host evidence remain pending.

## Completed item 14 source boundary

The external-integrations pass classifies every MenuList provider boundary as active, configuration-dependent, manual handoff, disabled, previously audited, or separate-product scope. The maintained inventory now distinguishes Google OAuth, Gemini, Razorpay, WhatsApp onboarding/OTP, SMTP notifications, internal platform alerts, Sentry, Vercel domains, POS outbound webhooks, the Platform Pull API, owner-configured analytics scripts, manual Google/social handoffs, disabled GBP sync/direct posting/owner WhatsApp delivery, and Answerlattice/CampaignCue/SignalDesk/MyCodex exclusions. An enabled source flag is explicitly not provider-control-plane proof.

The active POS flow now stores signing secrets in client-denied `posSyncSecrets` documents and exposes them only through a protected, rate-limited, no-store integration-permission route. Existing store-document secrets migrate transactionally during settings read, test, or delivery; `secretVersion` prevents a concurrent rotation from changing in-flight status. Firestore rules deny direct secret documents and prevent clients from adding, changing, or deleting the legacy store field while preserving unrelated updates during the coordinated migration window.

Delivery now reads the exact current project and claims its menu version in the same transaction, preventing a newer version from carrying an older concurrent snapshot. The trigger moved from the editor component to both acknowledged shared project-DAL save branches, using the already-loaded non-secret store config and adding no Firestore read for stores without an enabled connection. The active contract remains one browser-debounced attempt: app-close loss, background Admin writes, no retry, one destination, and provider application responsibility are documented rather than hidden.

POS README/spec/implementation/Firebase/mobile/help/marketing/website/test docs were rebuilt from current source. Inactive queue schema/types were removed. Universal POS, named-vendor, gzip/5 MB, automatic retry, guaranteed application, every-outlet, permanent-free, and direct GBP claims were removed from active material.

Focused external-inventory, POS source, POS behavioral, POS secret Firestore emulator, exact TypeScript, lint, dependency, documentation-link, JSON, and diff gates are the local completion boundary. Cross-checks also pass public-business-truth, MenuList API tenant safety, environment-target discovery, agent readiness, and the focused 1–14 verifier matrix. The full repository readiness runner advances through 15 checks and then stops only on `signaldesk_admin_local_adc_initialize_failed`, a separate-product diagnostic requirement excluded by this MenuList integration inventory; the MenuList reseller operational ID finding discovered on that run was fixed through the shared runtime UUID helper. Because the Firestore rule rejects the previous deployed browser secret write, safe rollout order is compatible app first, rules second, legacy migration third, then staging/production receiver smoke. No Vercel deploy is authorized and rules must not be deployed ahead of that app release. Live provider dashboards, credentials, webhook registrations, consent, DNS, browser/device behavior, and receiver application remain owner/release pending.

## Completed item 15 source boundary

The Decision Intelligence and CMI pass covers compact settled analytics input, current-catalog/alias extraction, scoring configuration, low-data and stale behavior, owner-selected and automatic Featured choices, desktop/mobile controls, public runtime filtering, store-local scheduling, private CMI state, Firestore cost, manual recovery, cache invalidation, website/help/marketing truth, and historical-doc governance.

Analytics-only and deleted item IDs can no longer consume candidate/rank positions. App and Functions duration/block configuration is byte-mirrored; explicit duration `0` remains valid; Quick choice requires an explicit duration within the shared threshold; automatic popular candidates require per-item behavioral evidence and neutral wording; and Value candidates use priced-item averages without zero-price dilution. A valid empty project summary no longer triggers a nested project scan.

CMI full-replaces its scheduler-owned projection so deleted nested keys are pruned. Distinct settled dates, not manual reruns, advance confidence, stable/top-item days, and calibration. Fatigue uses the preceding stable streak, time-slot eligibility enforces its 10% threshold, nightly priority no longer depends on Function runtime hour, audit context is request-local, and expired/disabled DAL reads fail neutral. CMI remains private and never hides or reorders canonical menu truth.

Manual callables now validate document IDs, current platform authority, canonical active store/project scope, bounded one-store/project execution, and bounded responses. Backend Decision Block writes coalesce public cache invalidation to one attempt per affected store. Desktop, MobileShell, public renderer, Functions scoring, CMI writes, and CMI reads have explicit feature gates. Unsupported owner replacement guarantees and internal signal explanations were removed, and current website owner-control copy now states eligibility/availability limits.

The dedicated Decision Intelligence/CMI verifier and deterministic tests, analytics emulator suite, public truth/delivery, editor, working-hours, mobile route, dependency, docs-link, locale JSON, byte-mirror, exact TypeScript, focused root lint, Functions lint/build, and diff gates pass. The scoped `menulist-qa` deploy for `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler` completed predeploy lint/build and stopped before upload at Cloud Resource Manager HTTP 403 caller permission. Approved app release, authorized Functions deploy, authenticated desktop/MobileShell/customer-menu/browser/device/cache smoke, scheduler evidence, and production-host verification remain owner/release pending.

## Completed item 16 source boundary

The Menu Correctness/Quality/Trust pass covers standalone update and publish MCE stamps, the resolved editor gate, linked outlet persistence truth, canonical stored-price formats, legacy primary-language inference, dashboard/editor/MobileShell quality computation and action routing, public location/hours/offering/freshness output, MOL summary/detailed modes, publish observation, resolved linked snapshots, payload size admission, native TTL setup, Firestore cost, and active docs.

Currency, text, and range prices no longer become false critical MCE failures or fabricated outliers; negative and zero single prices remain blocked. Description coverage no longer duplicates secondary-language warnings. Standalone publish updates `_mce` in its existing transaction. Public freshness is visible and hides stale, malformed, or materially future values. Linked publish snapshots reuse the already-read master, require a genuinely resolved result, and skip payloads above the 900 KiB safety limit rather than paying for guaranteed Firestore failure.

MCE/quality/trust computation adds no Firebase operation; the dashboard reuses one setup/quality project read with a ten-minute SWR dedupe; normal MOL mode adds one compact write only when item truth changes; publish adds one event and at most one snapshot. Snapshot retention uses the existing leased maintenance task because the dynamic store-named subcollection path cannot use one native collection-group TTL policy. No Firestore rule, index, Storage rule, or new Cloud Function was added; the existing maintenance Function source changed and requires a scoped deploy.

The dedicated boundary tests/source verifier, public-business-truth, project/editor, Pricing Integrity, Working Hours, exact TypeScript, scoped lint, dependency freeze, docs links, and diff checks pass. Documentation health is 0 broken links with 27 pre-existing video artifact naming warnings. Approved app release, TTL policy application/live expiry proof, authenticated standalone/linked desktop and MobileShell saves, dashboard action handoff, public trust output, linked snapshot inspection, browser/device/large-menu/low-bandwidth smoke, and production-host evidence remain owner/release pending.

## Completed item 17 source boundary

The reseller-assisted onboarding and billing pass covers platform reseller provisioning, current reseller authority, owner identity preparation, atomic tenant/store/user creation, online Razorpay and offline prepaid subscriptions, provider/local compensation, current clients, payment confirmation, manual renewal, add-location capacity, daily expiry, immutable ledger inputs, desktop/MobileShell parity, public/assistant entitlement repair, Firebase cost, and active documentation.

Every new onboarding now carries a UUID operation identity and normalized intent fingerprint. Subscription truth, onboarding ledger, profile counters, and offline-cap reservation commit atomically; exact replay writes nothing. Online revenue remains deferred until activation and converges transactionally once. Provider setup/persistence failure cancels before local compensation, while ambiguous persistence re-reads exact truth. Legacy reseller profile IDs remain valid only through matching Auth UID/profile claim/email authority, and failed platform profile creation cleans up the request-created Auth/user identity.

Desktop and MobileShell now expose 3/6/12-month manual renewal, retain retry identity, validate bounded exact acknowledgements, preserve stored tier truth, and atomically reacquire a cap slot for an expired client. Current clients use one bounded subscription query with explicit partial UI rather than ledger reads plus N subscription reads; monthly ledger reporting keeps its independent partial flag. Safe Razorpay link normalization is shared, and the unused client Firestore reseller DAL is removed.

The dedicated reseller source verifier, onboarding/confirmation pure tests and Firestore emulators, MenuList API tenant safety, billing entitlement, multi-location, owner-referral, exact TypeScript, scoped lint, dependency freeze, docs links, and diff checks pass. Docs health remains 0 broken links with 27 pre-existing video-artifact naming warnings. No Firestore rule, index, Storage rule, or Cloud Function source changed in item 17, so no Firebase deployment is required. Razorpay test-mode, authenticated desktop/PWA/physical-device smoke, approved app release, and production-host evidence remain owner/provider pending.

## Completed item 18 source boundary

The store identity and Official Business Page pass covers desktop Business Profile, MobileShell Basic Settings and Official Page, embedded B2C Official Page editing, canonical store/summary writes, business copy and SEO linkage, public root/brand/outlet projection, Call/WhatsApp/Maps/external actions, visual completion, selected cover/gallery media, public cache invalidation, and Firebase read/write cost.

Desktop address/postal controls now write canonical `addressLine` and `postalCode` while hydrating legacy keys read-only. Desktop, mobile, and public Maps share paired/range coordinate admission, including valid zero and explicit clear behavior. Active owner surfaces validate Maps/review/reservation/order links before persistence; public rendering still defends legacy truth, and malformed phone values cannot produce empty action links.

Immediate OBP uploads enter retained-reference-aware cleanup candidates. Acknowledged committed references are protected synchronously from reset/navigation races, abandoned objects clean up, and failed deletes remain retryable while the active surface exists. Mobile optimistic failure restores business-copy metadata and the complete phone tuple. Visual completion counts unique trimmed gallery URLs. Root outlet-count and brand-selector queries are bounded to the 30-outlet product cap plus one overflow row.

The dedicated OBP gate, business-copy/media tests, public-business-truth suite, MenuList API tenant safety, MobileShell routing, dependency freeze, exact TypeScript, scoped lint, docs links, and diff checks pass. Documentation health is 0 broken links with 27 pre-existing founder-video naming warnings. No Firestore rule, index, Storage rule, or Cloud Function source changed, so no Firebase deployment applies. Approved app release, authenticated desktop/MobileShell/public browser/device and Storage cleanup observation, custom-domain/cache smoke, and production-host evidence remain owner/release pending.

## Completed item 19 source boundary

The menu design and customer-presentation pass covers desktop B2C controls, MobileShell/embedded design editing, visual preset preview, mood/layout/display/background/pricing-note state, public menu and PDP rendering, search/filter/category navigation, direct item links, availability, image fallback, standalone/linked publish acknowledgement, published truth, cache invalidation, prepared background media, Firebase cost, and maintained docs.

The constitutional matrix now limits Clean to List/Grid, Warm to List/Card/Grid, Premium to List/Card, Bold to Card/Grid, and Fast to List. Presets and preferred layouts match it. Config normalization rejects prototype-chain names, malformed booleans, arrays, and incompatible layouts while safely migrating legacy moods/tabs. Pricing-note inputs preserve spaces during editing under the same 140-character cap.

Baseline and badge contrast, price opacity, and unavailable-item keyboard/readability were corrected. Public cards and PDP use one active option-price projection, show all active priced options before interaction, exclude inactive/unpriced/non-finite values, and omit stale variant base price from analytics. Public backgrounds accept safe HTTPS/root-relative persisted URLs and preview-only data images; fixed attachment is removed from active and exported output.

The estimated-height 150-item placeholder was removed because it caused layout shifts and broke off-screen search results and direct item links. Rendering the current bounded project keeps item/category addressability deterministic without a virtualization subsystem or Firebase change. Current spec/implementation/Firebase docs were rebuilt; previous narratives are archived.

The dedicated design gate, project-editor suite, public-business-truth suite, public-customer-delivery suite, Pricing Integrity gate, MobileShell route map, dependency freeze, exact TypeScript, scoped lint, docs links, and focused diff checks pass. Documentation health is 0 broken links with 27 pre-existing founder-video naming warnings. No Firestore rule, index, Storage rule, Cloud Function, or scheduler changed, so no Firebase deployment applies. Approved app release, authenticated desktop/MobileShell/public browser/device, visual/accessibility/large-menu/low-bandwidth, Storage/cache, custom-domain, and production-host evidence remain owner/release pending.

## Completed item 20 source boundary

The Pricing Integrity pass covers canonical item/option/override values, desktop and MobileShell item editing, desktop/mobile bulk controls, AI Menu Manager exact and relative actions, extraction/review, project update/publish, linked-outlet persistence, owner quality/filter/category-reorder surfaces, public list/PDP, owner share cards, Decision Block analytics, Digital Screens, Menu Card Export/PDF, cache/screen propagation, pricing-plan public rules, dormant scaffold isolation, Firebase cost, and maintained docs.

Numeric, supported currency, range, multilingual, and text values now share one 40-character persisted boundary. Markup, control/invisible format characters, emoji, negative numeric endpoints, non-finite numbers, objects, and arrays fail before persistence. Relative arithmetic and numeric filters accept only one unambiguous numeric value; text, ranges, and missing values remain unchanged unless the owner explicitly chooses a fixed replacement. Valid text prices and active priced options count as current price truth across repair, filters, category reorder, customer output, screens, share cards, and PDF preflight/output. Inactive/unpriced options do not.

Project price normalization is in memory before existing project update/publish writes, and linked-outlet validation reuses the same contract. No Firestore read/write/delete, collection, index, Storage object, Cloud Function, scheduler, queue, or polling path was added. Existing public cache/OBP revalidation, configured-screen version touches, and on-demand PDF generation remain authoritative; the dormant engine/queue stays disabled and out of the active pricing barrel.

The dedicated pricing behavior/source gate, AI Menu Manager, project editor, public truth/delivery, Digital Screens lifecycle/rules emulator, Menu Correctness, Menu Card Export, multi-location, pricing-plan rules emulator, tenant safety, MobileShell routes, dependency freeze, agent readiness, exact TypeScript, scoped lint, docs links, and diff checks pass. Documentation health is 0 broken links with 27 pre-existing video-production naming warnings. No Firebase infrastructure changed, so no Firebase deployment applies. Approved app release, authenticated desktop/MobileShell/public/browser/device/screen checks, public menu and PDF artifact QA, External Certification Runbook evidence, and production-host smoke remain owner/release pending.

## Completed item 21 source boundary

The working-hours/time-slot pass covers the desktop seven-day editor, MobileShell Today and full-week editors, store DAL admission, store timezone, normal/overnight/multiple historical ranges, exact boundaries, OBP/menu status and display, structured data/FAQ output, output-control/trust consumers, store/public-screen invalidation, time-slot preset create/edit/delete, project category cascades, and Decision Block category admission.

Weekly status now uses one evaluator. The previous weekday owns an overnight after-midnight carry; the current weekday's overnight range cannot open early that morning; starts are inclusive and ends exclusive. Invalid configured truth produces no open claim. Desktop empty/partial maps remain editable, unrelated settings saves do not rewrite hours, and desktop/mobile editors preserve untouched legacy ranges. Mobile Today uses the store weekday and a minute tick. Mobile saved copy follows acknowledgement, preset overlap policy matches desktop, global owner context refreshes after preset success, and Decision Blocks reuse the normal category time-slot evaluator. Structured data and OBP displays omit malformed raw ranges.

The store DAL rejects unknown weekday keys and malformed/equal ranges before Firestore. Normal hours evaluation adds no operation. Existing store/cache/screen paths remain authoritative. Rare preset edit/delete retains the bounded 100-project-page cascade with bounded concurrency and no new reference index or operation ledger; its cross-project partial-cascade window is documented as a telemetry-triggered residual rather than overengineered now. No Firestore rule, index, Storage rule, Cloud Function, scheduler, collection, or provider changed, so no Firebase deploy applies.

The dedicated working-hours behavior/source gate, time-slot data-flow tests, hours check, public-business-truth, tenant-safety, MobileShell route map, dependency freeze, exact TypeScript, scoped lint, docs links, and diff checks are the local completion boundary. Approved app release, authenticated desktop/MobileShell mutation and rollback smoke, public menu/OBP multi-timezone boundary smoke, browser/device/PWA QA, cache observation, and production-host evidence remain owner/release pending.

## Completed item 22 source boundary

The Temporary Status pass covers desktop Business Settings, MobileShell More and Today/Hours controls, protected set/clear admission, exact expiry, canonical message/type projection, menu/OBP/feedback/browser/pull-API output, store-timezone structured data, Special Menu ownership, public cache, Digital Screens, Owner Business Assistant invalidation, failure acknowledgement, Firebase cost, and maintained docs.

Malformed or expired truth now fails hidden everywhere, and mounted public/owner components schedule the exact expiry without requiring reload. Only `closed_today` emits a complete-business closure for the current store-local day; kitchen-only and other notices remain banners. Special Menu lifecycle status retains project ownership and clears only its own notice.

The mutation route now uses cheap fail-closed limiter admission before request and permission-backed Firestore work. The existing store write is distinct from post-commit refresh effects; partial cache/screen/assistant failure returns `effectsPending` after committed success, so optimistic clients do not roll back persisted truth. Desktop and both mobile paths show success only after the bounded acknowledgement.

Manual set/clear remains one existing store-document write with no status-only read. Expiry adds no write: public/browser projections hide the bounded field, and explicit clear or a later set removes/replaces it. No history collection, cleanup scan, listener, queue, Firestore rule/index, Storage rule/object, Firebase Function source, scheduler, or provider changed, so no Firebase deploy applies.

The dedicated behavior/source gate, public-business-truth, public-customer-delivery, MenuList tenant safety, MobileShell route map, dependency freeze, exact TypeScript, scoped lint, docs links, and diff checks are the local completion boundary. Approved app release, authenticated desktop/MobileShell mutation/rollback/expiry smoke, hosted menu/OBP/feedback/pull-API/cache/screen observation, browser/device QA, and production-host evidence remain owner/release pending.

## Completed item 23 source boundary

The Public Menu Entry pass covers the public discovery route, signed-in photo/link acquisition, extraction admission and reuse, owner-bound draft/job lifecycle, preview polling, existing/new account claim, idempotent receipt, project/summary/store truth, session handoff, public refresh effects, source retention, cleanup, and responsive mobile browser behavior.

Cheap fail-closed burst admission now precedes parsing, Firestore, Storage, acquisition, and provider work. Existing accounts require current extraction permission before intake and current publish permission from the already-read claim transaction store. Partial account scope fails closed. Daily new-source quota still follows active/same-source reuse.

Preview reads occur every 5 seconds and stop after at most 36 status reads with explicit retry. Persisted prices fail closed at preview and claim. Claim validates phone/source/tenant/store truth, canonical business type, explicit project identity/deletion truth, unique non-reserved slug, and optional MCE metadata before the idempotent transaction commits. Existing accounts no longer need city, same-photo selection can retry, and both session refresh handoffs are bounded.

Expired claimed receipts are removed while their promoted source remains; unclaimed source deletion failure retains the receipt for scheduler retry. No new collection, queue, listener, rule, index, Storage rule, provider path, dependency, or owner setting was added. The scoped QA scheduler deploy passed predeploy lint/build and then failed with Cloud Resource Manager `403` for the current caller, so IAM/project access remains owner-pending. Approved app/Vercel release, signed-in browser/device/PWA, Gemini/Razorpay-when-relevant, cache, and production-host evidence remain pending.

## Completed item 24 source boundary

The Menu Setup Progress and Activation Concierge pass covers desktop dashboard, global starter banner, Use MenuList, Mobile Menu/Share/More, Search & Discovery Presence Monitor, selected-project/store state, quality/publish derivation, starter evidence, typed acknowledgements, completion suppression, and SignalDesk separation.

Only loaded project truth marks source connected. Malformed files/items and publish timestamps fail incomplete; Mobile More waits for provider loading. The five required steps remain source, active items, key details, valid publication, and placement. Once complete, the setup card hides even if optional content/profile improvements remain, keeping those tasks in their normal feature surfaces.

Only allowlisted valid timestamped activation evidence counts. Sharing/presence acknowledgements refresh loaded state without another read and cannot cross a store switch. Presence writes derive starter eligibility from the transaction store, and removal deletes the matching activation action atomically with current presence. No public concierge/SignalDesk route or SignalDesk MenuList mutation exists.

No route, API, collection, listener, queue, rule, index, Storage path, Function, scheduler, provider, dependency, or deployment target was added. Desktop retains at most one selected-project read shared with Menu Check; mobile reuses provider data; current action/presence writes keep existing counts. Approved app release, authenticated desktop/MobileShell/store-switch/rollback, physical-device share/offline, and production-host evidence remain owner/release pending.

## Completed item 25 source boundary

The Menu Presence and Public-Truth Monitoring pass covers standard/linked/public-claim publish evidence, desktop Use MenuList, Business Settings Search & Discovery, Mobile Share, the MobileShell standalone monitor, manual confirmations/removals, starter evidence, store switches, compact summaries, cost, and stale historical truth.

Automatic Table QR/Feedback status requires a valid explicit publish acknowledgement instead of any active project; screen status means setup only. Publish writes now keep the full project, compact project summary, and store timestamp aligned in the same existing publish boundary. Manual confirmation rejects unavailable stores, updates canonical store and `storesSummary` atomically, retracts its starter action on removal, ignores malformed timestamps, follows loaded store changes, and cannot cross a store switch after acknowledgement.

Presence-only public cache invalidation was removed because the evidence is owner-private. Stable dependencies avoid repeated project/screen reads after acknowledgement. The existing dry-run-first routing-summary backfill can copy historical canonical publish timestamps into summary/store per target in one batch; owner credentials, dry-run review, and apply remain pending before release.

The focused/runtime verifier, Firestore summary-rules emulator, project/public-entry/multi-location/public-truth/tenant/setup/activation/MobileShell/summary/type/lint/docs/diff gates form the local boundary. No Firestore rule/index, Storage rule/object, Cloud Function, scheduler, provider, collection, listener, queue, or Firebase deploy changed. App/Vercel release, authenticated desktop/MobileShell mutation/rollback/store-switch smoke, device/browser QA, hosted cache observation, and production-host evidence remain pending.

## Completed item 26 source boundary

The Owner Referral pass covers desktop/MobileShell invite entry, the private noindex handoff, explicit capture and decline, canonical-host cookie continuity, new and existing-unpaid attribution, Razorpay callback/webhook and authorized reseller/manual activation hooks, pending repair, two direct subscription wallets, two canonical stores, atomic Pack-credit settlement, deterministic zero-cash Billing ledger rows, private recent status, rollout configuration, Firebase cost, and maintained docs.

Acquisition now requires both flags plus a valid non-empty pilot allowlist; empty/invalid configuration fails closed. Normal setup explicitly clears any older referral cookie before navigation. Existing-unpaid attribution fails closed when its 25-row history window is saturated. Owner/capture admission is rate-limited before expensive work with production fail-closed behavior and retry metadata. Settlement rejects malformed referral scopes, inactive/deleted/blocked stores, and unsafe Pack balances without partial mutation.

Pending repair no longer loops through a payment request: one invocation fetches at most 26 rows, processes at most 25, and records bounded backlog evidence for later replay. The normal immediate-issue path is about 11 reads and 5 writes, including the 5-read/5-write atomic transaction; no collection, listener, scheduler, queue, cap query, public-cache write, rule/index, Storage rule, or Cloud Function was added in this pass.

The dedicated source verifier, Firestore emulator, billing/price/reseller/public-entry/onboarding/payment/tenant/MobileShell/env/discovery/locale/dependency/docs gates, exact TypeScript, focused lint, and diff checks form the local boundary. The pre-existing rules/index QA deploy remains blocked by Firebase IAM. Finance/legal/team approval, five pilot stores, sandbox payment evidence, authenticated desktop/MobileShell/browser/device QA, approved app/Vercel release, and production-host evidence remain owner/provider/release pending.

## Completed item 27 source boundary

The Public Truth Tools pass covers all sixteen browser-local truth checks, five asset makers, Tools Hub, unsigned shareable reports, consented contact handoff, Report Lead Ops, owner Business Health modules, and the manually refreshed paid Public Truth Monitor.

Public URL, phone, WhatsApp and internal-route evidence now uses shared strict boundaries. Reports reject inconsistent summary counts, injected setup jobs and unsafe internal links. Lead scans disclose bounded saturation. Production rate limits fail closed. Monitor history updates transactionally under concurrent refresh. The complete family runs through one aggregate verifier plus executable runtime cases; active docs distinguish implemented manual monitor history from still-disabled scheduling, external adapters, multi-location execution and email.

No Firebase rule/index, Storage rule or Cloud Function changed in item 27. Authenticated browser/device/contact/monitor fixtures, approved app/Vercel release and production-host evidence remain owner/release pending.

## Completed item 28 source boundary

The MenuList Help Center pass covers owner navigation, authenticated Answerlattice-scoped search, canonical/FAQ/RAG response projection, KB/FAQ/changelog/feedback/contact fallbacks, desktop and MobileShell deep links, ticket create/history/reply/status/satisfaction, attachments, notification handoff, platform-client separation, Firestore cost and maintained docs.

Browser responses now require a bounded related-content structure, strip stored article URLs from the public projection, and open related articles only through encoded internal Help Center routes. Ticket uploads share a four-file, 10 MB, supported-type and exact data-size/MIME boundary. Saved attachments open only from the configured Answerlattice bucket and matching ticket tenant/store path; signed URLs are never logged. The owner footer no longer claims live system status without a provider, uses current branding/year/legal routes, and ticket submission emits one success message.

Dedicated and shared Firestore rules preserve prior message/status lists, validate exactly one appended entry, bind appended actors to Firebase Auth, require one valid initial status, and make satisfaction write-once after resolution/closure. Emulator coverage proves valid small and 450-message append paths plus denial of history rewrites, forged actors, invalid initial state and satisfaction overwrite. The scoped `answerlattice-qa` and `menulist-qa` Firestore-rule deploys were both attempted and both stopped at the Firebaserules test endpoint with HTTP 403 caller permission before upload; no QA rule revision changed and the exact reruns are owner/IAM-pending. Vercel/app release, valid Answerlattice product-account/Auth claims, provider/SMTP smoke, authenticated desktop/MobileShell/browser/device QA and production-host evidence remain owner/release pending.

## Completed item 29 source boundary

The Internal Ops pass covers the Control Room; SAFE_MODE, mute and force-republish controls; scheduler run/settlement/recovery; extraction health/detail/retry; messaging onboarding; platform and owner notifications; Founder and Cost Posture; Business Health; Answerlattice intake; Entity Blocks; desktop/MobileShell access; Firebase cost; retention; auditability and maintained docs.

Platform layouts now re-read current persisted authority. Direct browser monitors and the shared store selector use one bounded `/api/platform/current-access` check before cross-tenant Firestore reads, including MobileShell sub-screens under `/dashboard`. Cost, Founder, Business Health, Answerlattice intake, messaging onboarding and entity-block APIs now fail closed on limiter provider outage and re-prove the exact current platform user before private reads, provider work or mutations.

Control Room, Scheduler and Extraction read failures no longer become healthy-looking zero/empty state. Alert, scheduler run and settlement rows are bounded/normalized; scheduler recovery responses and error-detail run IDs are validated before operator acknowledgement. SAFE_MODE copy states the actual guarded AI generation/upload boundary instead of claiming a global lock.

The existing consolidated maintenance scheduler now owns one leased daily `systemAlerts` cleanup capped at 100 rows older than 90 days. No new scheduler, collection, index, listener, Firestore rule or Storage rule was added. Focused ops/authorization/scheduler/extraction/messaging/notification/founder/cost/entity gates, runtime tests, exact TypeScript, focused lint, Functions build/lint/preflight, dependency freeze, docs links and diff integrity are the local boundary. The broader auth-security matrix now clears the platform-route change and reports only its unrelated pre-existing SignalDesk local-ADC diagnostic. The scoped `menulist-qa` `menulistMaintenanceScheduler` deploy passed predeploy lint/build and stopped before upload at Cloud Resource Manager HTTP 403 caller permission; exact retry, approved app/Vercel release, authenticated current/revoked desktop/MobileShell smoke, live Upstash/provider/Telegram/Email/WhatsApp evidence, retention observation and production-host evidence remain owner/release pending.

## Completed item 30 source boundary

The Main Website pass covers every concrete/generated website route, reviewed resource locale, discovery registry, canonical/sitemap/robots/LLM surface, pricing handoff, public contact and browser-local tool family, header/footer navigation, product alias, legal/trust copy, accessibility state and maintained website/Razorpay docs.

The shared path provider now covers FAQ, Tools, WhatsApp, private Invite and reviewed locale-prefixed Resources on the `menulist.digital/ml` alias. Header active state and the language switcher inspect the public pathname after removing the alias; language changes reapply it. The language menu has explicit button/menu state and Escape focus recovery. Terms and Refund pages no longer promise universal publishing, all-plan access, fixed 30-day deletion, absolute generated-output ownership or an unverified Razorpay certification.

The legal cross-check exposed a real billing mismatch: owner UI and cancellation terms promised paid access through `cycleEndDate`, but the store/platform plan mirror dropped cancelled/paused rows immediately. Current-cycle cancelled/paused rows now retain that mirror; a bounded hourly task in the existing leased maintenance scheduler processes at most 500 due rows, changes them to `expired`, repairs entitlement, and leaves a durable retry marker on partial failure. One exact `subscriptions(status ASC, cycleEndDate ASC)` index was added. Root type/lint, Functions lint/build/preflight, website copy/locale/discovery/contact/tools, billing unit/source, pricing, tenant-safety, MobileShell, dependency and Firestore emulator gates pass. Both smallest-scope QA deploys were attempted: the index stopped at the Firebase Rules test endpoint HTTP 403, and the Function passed predeploy lint/build then stopped at Cloud Resource Manager HTTP 403; neither uploaded. Approved app/Vercel release, canonical/alias browser/device/accessibility smoke, mutable Razorpay sandbox evidence, analytics/contact provider evidence, Search Console/discovery observation, legal approval and production-host smoke remain owner/release pending.

## Completed item 31 source boundary

The Google Business Profile pass confirms the feature is a deliberately disabled scaffold, not an incomplete live integration. The flag remains false, token DAL operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and there is no OAuth/callback route, provider worker, scheduler task, Firestore rule/index, owner/mobile surface, or automatic public claim. Stale comments and implementation links now match this reserved boundary, and a type-only Firebase timestamp import avoids loading a runtime client for the disabled contract. The external-integration and public-business-truth gates pass; activation still requires an approved OAuth/provider/security/storage design.

## Completed item 32 source boundary

The Reviews/Reputation pass confirms the parent and child flags remain off and disabled routes stop before rate limiting, Firestore, SAFE_MODE, capacity reservation, AI accounting, or provider work. The two maintained `reviewsState` composites are the only relevant indexes; no owner/mobile surface or automatic review posting exists. The boundary verifier now proves the fail-closed ordering and exact index contract, and the dedicated Firestore rules emulator passes. Activation remains provider/consent/product-policy work rather than a hidden runtime toggle.

## Completed item 33 source boundary

The QR-to-WhatsApp pass confirms there is no executable experiment runtime. The false flag is unconsumed; normal QR/Menu Kit/Print flows continue to create direct destination assets without tracked tokens, consent capture, campaign events, provider sends, Firestore state, rules, indexes, or Storage objects. Maintained docs now label the feature planning-only and keep marketing/help claims on hold. A dedicated verifier protects this separation while the normal printable and Menu Card gates remain green.

## Completed item 34 source boundary

The trust/loyalty/risk pass found that summing daily unique-visitor counts cannot prove weekly distinct or returning people, and raw views/unique counts cannot justify loyalty or trust labels. The dormant health-signal batch now throws `HEALTH_SIGNALS_DORMANT_UNVALIDATED_COUNTERS` before any store scan, preventing accidental scheduler cost or misleading persisted signals until cohort-safe inputs and thresholds exist. The guard is covered by the analytics persistence emulator and a dedicated static boundary verifier. The unqueried `stores.healthSignals` map is exempt from automatic indexing; no owner/public surface, collection, scheduler task, or provider path was added.

## Completed item 35 source boundary

The Answerlattice pass rechecked doctrine/freeze, dedicated Firebase/runtime separation, tenant/store scope, canonical-first retrieval, KB/FAQ/RAG fallback, governance, integrations, tickets/chat, billing, public/widget routes, mobile, retention, cost, and release gates. The current pre-launch embedding transition exposed a real partial-contract risk: some runtime sources had moved to Embedding 2 while maintained docs and temporary migration machinery still described two model/vector spaces.

Query and article embedding now use one byte-mirrored contract: `gemini-embedding-2`, 768 dimensions, Firestore field `embedding`, and cache version `gemini-embedding-2:768:v1`. The retired model, second field/index, dual write, migration state, and scheduler backfill are removed because no launched corpus requires them. This avoids duplicate provider calls, document/index storage, scheduled scans, and migration writes while keeping create, publish, regenerate, cache, and retrieval behavior on one vector space. Maintained KB, Help Center, AI Q&A, and generation docs now match source.

Both Functions builds, focused embedding/retrieval tests, the full Answerlattice runtime suite including dedicated/shared Firestore and Storage emulators, dependency freeze, final-readiness source gate, and diff integrity pass. The scoped `answerlattice-qa` index/Functions deploy passed predeploy TypeScript and stopped before upload at the Firebase Rules test endpoint with HTTP 403 caller permission, so no QA revision changed. Vercel/app release, authorized Firebase deploy, provider credentials, authenticated browser/device/widget smoke, and production-host evidence remain owner/release pending.

## Completed item 36 source boundary

The CampaignCue pass covers its separate `CC` identity and Firebase target, workspace/source/Business Brain truth, Daily Desk and deterministic decision loop, campaign/pack/proof/approval/result lifecycle, Asset Library, CueLayers, templates, export-first delivery, public/product routes, mobile posture, provider/billing restrictions, Firestore/Storage rules, and cost controls. Direct posting, social connections, paid generation, rendered video, billing checkout, and ad-spend mutation remain disabled; the public site remains static and the owner runtime has no Cloud Function or scheduler cost.

The cost audit found twelve composites with no matching query. Active reads always resolve one exact workspace subcollection and then use a direct document, one equality filter, or one bounded single-field timestamp order; there is no CampaignCue collection-group query. The manifest now contains no composite index, so active source, campaign, asset, schedule, event, location, and CueLayers writes avoid unnecessary composite-index fanout/storage. The runtime verifier rejects both accidental composites and cross-workspace collection-group reads until an implemented query justifies them.

The complete CampaignCue aggregate passes, including 1,700+ source assertions, Asset Library and CueLayers contracts, template registry, PWA assets, operating loop, Pattern Cue, and Firestore/Storage emulators. The scoped `campaigncue-qa` index deploy stopped before upload at the Firebase Rules test endpoint with HTTP 403 caller permission, so no remote index changed. Authorized Firebase deploy, project/env/App Check setup, authenticated browser/device/export smoke, and production-host evidence remain owner/release pending.

## Completed item 37 source boundary

The SignalDesk pass keeps the internal operating system separate from MenuList
and rechecks private access, project targeting, source provenance, target and
workspace projection, evidence/draft/approval flows, AI/provider accounting,
proof permissions, outcomes, and source-data lifecycle. The static verifier,
dedicated Functions build, focused contract suites, semantic rules, access,
fresh-lineage, authenticated aggregate E2E, proof-permission, and source-data
emulator rails pass. A strict workspace fixture now includes the current
accounting-month and population-truncation fields; runtime behavior did not
change. QA IAM, permissioned sources, sender/legal/provider setup, owner
activation evidence, real outreach, and release remain pending.

## Completed item 38 source boundary

The GrowthOS pass rechecks the Pro/Premium entitlement gate, current source-fact
hashing, deterministic Sales Pack outputs, review guard, successful-handoff-only
execution rows, desktop/mobile behavior, and no-post/no-ROI boundary. Concurrent
generation now uses UUID-backed kit IDs and atomically commits the kit plus its
one-read summary projection. This closes same-millisecond collision and partial
write risks without adding reads, writes, indexes, schedulers, or provider work.
The dedicated verifier passes 150 assertions; app release and owner rollout
evidence remain pending.

## Completed item 39 source boundary

The KitStamp pass confirms it remains a separate-product plan, not hidden
runtime. A 31-check source gate proves the reserved `KS` identity and disabled
placeholder while rejecting unapproved routes, APIs, Firebase targets,
Functions, environment variables, provider/billing paths, or publishing
behavior. No product foundation was activated and current cost remains zero.

## Completed item 40 source boundary

The MyCodex pass rechecks the static/no-DB invariant, Basic Auth/session
admission, local Markdown packaging, PWA/offline/audio/browser-local state,
mobile safe areas, host rewrite, cache/privacy, and three-environment-key limit.
The internal `/sites/mycodex` rewrite namespace now returns a no-store, noindex
404 before host rewriting, preventing direct access on non-Vercel/self-hosted
deployments. The MyCodex PWA source gate passes; no Firebase or billing surface
was added.

## Completed item 41 source boundary

The embedded-capabilities pass follows each small capability through its owning
flow instead of treating it as a separate product. Category icons remain a
byte-mirrored deterministic extraction/editor/public-rendering helper and now
match words/phrases rather than unsafe substrings. Behavior guidance stays in
existing Dashboard and desktop/mobile Share surfaces; the unmounted standalone
card and its fictional dismissal persistence were removed from active code and
docs. Item-photo capture continues through the shared upload preparation and
readiness pipeline with no second storage path. Visual completion now
distinguishes full evidence from business-only evidence, preventing desktop
from claiming complete menu/service coverage without project summaries. The
31-check embedded source gate plus public-business-truth and OBP gates pass; no
new route, collection, listener, provider, or owner setting was added.

The smallest combined MenuList QA deployment for
`firestore:indexes,functions:processMenuImagesJob` passed the Functions
lint/build predeploy and then stopped at the Firebase Rules test endpoint with
HTTP 403 caller permission before any index or Function upload. This leaves the
health-signal index exemption and category-icon worker update pending authorized
Firebase deployment; no remote QA revision changed.

## Third-pass cross-system queue

This queue follows the same strict one-feature-at-a-time rule. A pending row is
not started until the preceding row has completed its source gate.

| # | Feature flow | Local status | External/owner status |
| --- | --- | --- | --- |
| 42 | Global language, locale, timezone, date/time, number, currency-formatting and RTL | Local source complete | Pending approved app release plus authenticated LTR/RTL desktop, MobileShell, iOS/Android PWA and public-output smoke |
| 43 | System-wide accessibility and interaction | Local source complete | Pending approved app release plus authenticated keyboard, screen-reader, zoom/reflow, contrast and iOS/Android PWA smoke |
| 44 | Owner PWA, connectivity and update lifecycle | Local source complete | Pending approved production app build/release plus authenticated install, upgrade, cache, offline/reconnect and iOS/Android standalone smoke |
| 45 | Feature flags, configuration and environment safety | Local source complete | Pending isolated Functions release for the shared override parser plus approved app release and deployed environment smoke |
| 46 | Global failure handling and observability | Local source complete | Pending approved app release, production monitoring/replay evidence, browser/device recovery smoke and production-host proof |
| 47 | Account and tenant data lifecycle | Local source complete | Pending approved app release, authenticated multi-user browser/device evidence, legal review and real privacy-request execution |
| 48 | Ownership transfer and dormant lifecycle | Local source complete | Pending approved app release, verified support-transfer/legal evidence, authenticated role QA and provider notification proof |
| 49 | SurfaceOS planning-only boundary | Local source complete | No current deployment; future activation requires an explicit owner/product decision |
| 50 | Whole-system Firebase scale and cost closeout | Local source complete | Pending isolated authorized MenuList QA Functions/index deploy, Answerlattice QA index deploy, scheduler-log observation and billing comparison |

## Completed item 50 source boundary

The whole-system Firebase closeout found and fixed two real scale defects
without changing owner or customer behavior. Genuine all-store work in the
hourly store-EOD scheduler now uses one transactional UTC-day lease instead of
repeating across populated timezone hours. Due-store work—including analytics,
Decision Blocks, Menu Intelligence, Business Health, and Special Menu marker
recovery—keeps its existing local-business-day behavior. The four maintained
index manifests now contain no exact duplicate composite or override
definitions; six MenuList and one Answerlattice duplicates were removed while
one identical query-supporting definition remains for every shape.

The source gate, lease emulator, Functions build/lint, related feature gates,
security/tenant gates, exact TypeScript, docs, dependency freeze, and diff
checks pass. No remote target was changed from the mixed source worktree.
Isolated authorized MenuList QA
`firestore:indexes,functions:computeDecisionBlocksScores`, Answerlattice QA
`firestore:indexes`, one UTC-day scheduler-log observation, and an equivalent
Cloud Billing comparison remain owner/release pending.

## Completed item 49 source boundary

The SurfaceOS pass confirms that `SF`, `surfaceos.app`, and `/__surfaceos` are
collision reservations only. The product-site entry remains disabled, no
deployment target or executable product surface exists, and there is no
SurfaceOS Firebase, provider, billing, or public-content runtime. The old
strategy remains archived as research rather than authority; maintained docs
and a source verifier now guard the zero-runtime, zero-cost boundary. Nothing
needs deployment for this item.

## Completed item 42 source boundary

The global localization pass separates owner UI cookies, store/business locale
truth, and translated menu content. Locale, timezone, date-format and
time-format inputs now normalize through one allowlisted boundary before request
rendering or persistence. The server fallback is deterministic UTC, missing
messages retain the established `en-US` merge, and invalid calendar/clock input
cannot roll into a valid-looking instant.

The selected locale updates the root document language/direction and makes Ant
Design RTL for Arabic, Persian, Hebrew, Kashmiri, Sindhi, and Urdu while
preserving the existing manual override. Hook-free display no longer leaks ISO
timestamps, localized relative time replaces English-only abbreviations, and
audited desktop/MobileShell dashboard, analytics, AI transaction, location,
special-menu, public-truth, and export-history paths use the shared date/number
boundary.

The dedicated source/runtime gate, reviewed website-locale gate, focused lint,
exact TypeScript, docs and diff checks pass. UI preferences add no Firestore
read/write/listener, rule, index, Function, scheduler, provider call or deploy
target. Approved app release and authenticated LTR/RTL desktop/MobileShell/PWA
browser/device smoke remain owner/release pending.

## Completed item 43 source boundary

The accessibility pass now keeps browser and device zoom available across the
maintained app layouts. Owner and website shells expose skip navigation and a
stable primary-content focus target, global focus-visible treatment no longer
depends on individual components, and reduced-motion preferences suppress
non-essential motion without changing content or actions.

The shared mobile primitives preserve the existing Ant Design layer while
making transparent icon actions touch-safe, clickable list rows and tags
keyboard-operable, and back/floating actions nameable. Audited dashboard,
transaction, time-slot, menu-command and OBP icon actions expose names or state.
The raw TSX image inventory has no missing `alt` attribute, and the website
sign-in plus desktop-return controls use native buttons instead of pointer-only
containers.

The dedicated source gate, MobileShell route-map gate, focused lint, exact
TypeScript, docs and diff checks pass. The broader website-copy gate remains red
on a pre-existing AssetOS watched-source fingerprint for
`MobileShareScreen.tsx`; this pass did not alter that file or asset manifest.
No Firestore operation, rule, index, Function, scheduler, provider call, public
truth, mutation, billing, AI or cache contract changed. Authenticated keyboard,
screen-reader, zoom/reflow, contrast and physical-device PWA evidence remains
owner/release pending.

## Completed item 44 source boundary

The owner installed-app pass separates production worker generation from
development and preview registration, expands maintained owner/auth entry-path
coverage, and asks an existing correct registration to check for a new worker on
each full app load. The owner manifest now uses the plain MenuList identity,
opens `/today`, and does not lock device rotation.

The generated owner-worker source no longer runtime-caches authenticated
dashboard, sign-in or screen HTML, the platform root, APIs, Firestore responses,
or customer routes. Its activation hook deletes the six retired document/media
cache names left by earlier releases. Source maps, unrelated products, website media
and locale packs are excluded from owner precache. Firebase Storage and broad
file-extension runtime caching are removed; the generic offline fallback,
build/icon precache and public-font runtime cache remain.

Connectivity is now one shared non-blocking notice instead of a slow/offline
modal plus a duplicate MobileShell listener. Reconnection never forces a page
reload, and no offline queue, write-success claim or automatic replay was added.
The version prompt uses localized date/time, can be deferred for the current
session, and reloads only after the owner chooses it.

The dedicated lifecycle, full Customer App PWA, PWA icon Storage/commit,
MobileShell route-map, agent-readiness, dependency, focused lint, exact
TypeScript, docs and diff gates pass. No Firestore operation, rule, index,
Storage mutation, Function, scheduler, provider call or Firebase deployment is
involved. The checked-in `public/sw.js` remains generated output; the approved
production app build must regenerate it from the maintained config/worker
source. Vercel release plus authenticated fresh-install, upgrade, logout/account
switch, cache inspection, offline/reconnect, slow-network and physical-device
standalone evidence remains owner/release pending.
