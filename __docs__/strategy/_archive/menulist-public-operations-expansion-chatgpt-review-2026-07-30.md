# MenuList Public-Operations Expansion Proposal - Critical Review

**Date:** July 30, 2026
**Review stage:** External strategy validation before feature admission
**Status:** Archived review; not roadmap authority, implementation approval, pricing approval, or release certification
**Input reviewed:** `/Users/danny/.codex/attachments/cad4488e-077d-4a05-88c1-3cb32b28294e/pasted-text.txt`

## Executive Verdict

The proposal has a sound central principle:

> Make approved MenuList truth remove more recurring customer-facing work.

It should not be adopted as the proposed roadmap.

The proposal understates the current implementation, duplicates active surfaces, conflicts with locked product boundaries in several places, and assigns P0 priority without owner-behavior evidence. Its strongest contribution is not "public operations" as a new category. It is the narrower idea that current canonical facts can support deterministic customer answers and carefully bounded future public-state changes.

### Decision Summary

| Proposal area | Verdict | Reason |
| --- | --- | --- |
| "One approved business state" positioning | Accept with wording change | Fits the customer-facing truth layer when limited to supported outputs. |
| "Public-operations layer" category | Do not adopt publicly | "Operations" implies inboxes, staff workflows, assignments, customer databases, and transaction handling. |
| Owner Today | Reject as a new/renamed surface | MenuList already has Today, Business Health, priority checks, an owner action layer, mobile parity, and multi-location health. |
| Business Calendar | Validate a much smaller version | Scheduled special menus, temporary status, weekly hours, and time slots already exist. Only date-specific public exceptions are a credible gap. |
| Approved Answers | Accept as a bounded candidate; partly built | FAQ/reply tooling and owner readiness already exist. Any next layer must remain a deterministic projection of canonical facts, not a second truth store or chatbot. |
| Presence Relay | Keep current manual-proof model; defer connectors | Presence Monitor and Platform Pull already exist. External writes require official APIs, permissions, idempotency, and real demand. |
| Customer Resolution | Extend existing feedback only if evidence supports it | Submission, inbox, pagination, status, reply handoff, retention, and mobile parity already exist. |
| Staff Answer Mode | Reject as a standalone staff product | A staff app is pre-rejected; current runtime intentionally limits this to a read-only Today line and role-scoped owner surfaces. |
| Action Adapters | Keep external action links/readiness; reject native inbox | MenuList can validate and route to external providers. A request inbox becomes CRM/helpdesk and creates customer-data obligations. |
| Regulars | Reject | Subscriber profiles, return notifications, campaigns, and opt-in databases are CRM/loyalty/marketing infrastructure. |
| Vertical packs | Use the existing business-type source of truth | The runtime already supports broad business categories. Do not create a second vertical schema framework without observed field gaps. |
| Relief Events metric | Use as a research taxonomy only | Do not create a new event collection or owner dashboard. Derive any experiment from existing receipts and settled summaries. |

## Governing Product Boundary

The locked doctrine allows MenuList to expand across customer-facing truth while permanently excluding CRM/customer databases, loyalty, WhatsApp marketing, booking engines, and staff management (`__docs__/constitution/11-product-evolution-doctrine.md:58-96`).

The feature gate also pre-rejects scheduled campaigns, staff apps/notifications, loyalty systems, and CRM integrations (`__docs__/constitution/08-feature-rejection-gate.md:109-130`).

The same doctrine requires compact settled health views rather than dashboard addiction (`__docs__/constitution/11-product-evolution-doctrine.md:166-182`). Product separation keeps immediate promotional output in GrowthOS rather than turning MenuList truth health into a campaign surface (`__docs__/constitution/12-product-separation-doctrine.md:15-27`, `61-65`, `95-103`).

The admissible expansion sentence is therefore:

> One approved business state for every supported customer-facing MenuList output.

The proposal's broader "what customers see, ask, and act on" phrasing is useful only when:

- "ask" means deterministic answers projected from approved facts;
- "act on" means safe links to an existing provider or contact method;
- MenuList does not own the conversation, lead, booking, order, payment, or customer record;
- unsupported external surfaces remain explicit handoffs, not claimed sync.

## Current System Map

The proposal treats several existing capabilities as missing.

| Current capability | Code/docs truth | Consequence for the proposal |
| --- | --- | --- |
| Business Health | Compact read-only health, public-truth readiness, priority checks, analytics, feedback, locations, grounded answers, desktop, and mobile are active (`__docs__/owner-business-assistant/owner-business-assistant_business-health.md:7-29`; `src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx:67-111`). | Do not rename it or create a second exception dashboard. Add a source only when a real missing signal is proven. |
| Today | The existing Today surface is tied to social-content/GrowthOS execution (`src/components/templates/main-app/today/index.tsx:79-125`, `431-531`; `__docs__/strategy/product-universe-ssot.md:212-246`). | "Owner Today" would collide with an existing product surface and blur the MenuList/GrowthOS boundary. |
| Owner Action Layer | Already turns loaded truth into one next action and routes to existing flows without a new database or write path (`__docs__/owner-action-layer/README.md:11-39`). | Do not add assign, snooze, dismiss-reason, or manual-task state merely to make another control surface. |
| Special Menu Switching | Active scheduled replace/overlay menus use transactional lifecycle truth, a two-minute due dispatcher, nightly recovery, public-cache invalidation, and screen refresh (`__docs__/special-menu-switching/README.md:25-66`, `98-116`). | A broad calendar would duplicate a mature bounded scheduler. |
| Temporary Status | Active one-off public notices support explicit expiry, public projections, local expiry, cache revalidation, screen refresh, and assistant invalidation (`__docs__/temp-status-layer/README.md:19-48`). | "Never leave a status active" is already enforced at visibility time. |
| Working Hours | Weekly hours, time zones, overnight rules, mobile/desktop edits, public output, and time slots are implemented; holiday/date-exception management is explicitly not shipped (`__docs__/hours-holiday-accuracy/README.md:5-31`). | Date-specific holiday/public exceptions are the only clear calendar-shaped gap. |
| FAQ/reply readiness | The public Customer FAQ Reply Pack and owner readiness module inside Business Health are implemented (`__docs__/menulist-tools/customer-faq-reply-pack/README.md:3-40`). | Do not create a duplicate "Approved Answers" authority model. |
| Presence | Presence Monitor covers external placements using explicit owner confirmation and never presents them as provider-verified (`__docs__/menu-presence-monitor/README.md:1-17`, `33-70`). | Preserve proof labels. Avoid screenshot/evidence storage unless demand and retention rules justify it. |
| External read access | Platform Pull exposes two authenticated read-only APIs for business and menu truth (`__docs__/platform-pull-api/README.md:35-67`). | External answer/export consumers can use a projection; this does not authorize outbound connector writes. |
| Guest feedback | Public submission, owner inboxes, cursor pagination, status transitions, manual reply handoff, retention, rules, and mobile parity are implemented (`__docs__/audits/menulist-feature-flow-audit-tracker.md:169`). | A "resolution loop" must be an incremental correction handoff, not a new inbox. |
| Staff support | Current runtime intentionally has one read-only Today line and no staff-facing route or phone reference product (`__docs__/staff-prompt/README.md:8-21`). | A searchable staff assistant would be a new staff product and needs a founder override plus real demand. |
| Business categories | One shared source already defines service, retail, food, professional, creative, health, and specialty categories plus concrete types (`src/data/shared/businessTypes.ts:48-146`). | Do not add a parallel vertical-pack registry. |
| Pricing | Current Starter/Pro/Premium source and live website already use reach, presentation/owner control, and multi-location governance as the progression (`src/data/PlatformPlansList.ts:10-72`). | Do not turn plans into long feature bundles before willingness-to-pay evidence. |

## Proposal-by-Proposal Review

### 1. Owner Today

**Verdict:** Reject the rename and new aggregate surface.

Business Health already says what needs attention and shows "No action needed" when stable. Its page already composes public-truth readiness, monitor status, location summaries, analytics, priority checks, and grounded answers. The Owner Action Layer already routes one next action to the correct existing workflow.

The proposed card actions would add durable workflow state:

- assignment creates staff/task ownership;
- snooze creates scheduling and recurrence rules;
- dismiss-with-reason creates an audit/event model;
- WhatsApp digests create notification preferences, consent, delivery, retry, and escalation behavior.

Those are not presentation changes. They create an operations/task system.

**Allowed improvement:** add a new Business Health check only when it can be derived from an existing canonical summary, points to an existing repair flow, remains read-only, and adds no owner-managed lifecycle.

### 2. Business Calendar

**Verdict:** Do not build the proposed "complete" calendar. Validate one bounded date-exception need.

The list mixes several different authorities:

- holiday/date-specific hours;
- temporary public notices;
- scheduled special menus;
- future menu prices;
- item availability resets;
- promotions;
- booking/delivery-provider availability;
- location overrides.

Combining these creates conflict ordering, rollback, partial-propagation, and authority problems across independent models. It would also duplicate current Special Menu and Temporary Status behavior.

**Credible bounded candidate:** date-specific public hours or closure exceptions.

Admission requirements:

1. Existing owners repeatedly perform the same holiday/date correction outside MenuList.
2. The source remains the current store-hours authority plus a bounded exception record.
3. Store time zone controls every boundary.
4. Overlap resolution is deterministic.
5. Public menu, OBP, structured data, screens, pull API, and caches use one evaluator.
6. No promotional notes, price schedules, booking calendar, or campaign scheduling enter the first scope.
7. The UI is an exception editor inside Hours, not a new calendar dashboard.

### 3. Approved Answers

**Verdict:** Strongest adaptable idea, but partly implemented and incorrectly modeled in the proposal.

MenuList already has:

- deterministic business-fact readiness;
- a public FAQ/reply pack;
- owner FAQ readiness inside Business Health;
- grounded Business Health answers;
- public menu/OBP facts;
- read-only external projections.

The next candidate should be a **public answer projection**, not an `approvedAnswers` source of truth.

Canonical ownership must remain:

| Answer subject | Canonical source |
| --- | --- |
| Hours | Store working-hours and valid temporary-status truth |
| Price | Published project/menu truth |
| Availability | Published item/category truth and current time-slot evaluator |
| Location/contact/action | Store public-presence truth |
| Dietary tags | Owner-approved item attributes only |
| Policies, parking, accessibility, deposits | Explicit owner-confirmed public fields only |

Generated wording is derived presentation. It must never outrank those fields.

**Required behavior:**

- deterministic projection first;
- no LLM call per customer question;
- cache by canonical content version;
- invalidate with the same public truth writes;
- return "not confirmed" rather than infer;
- no allergen claim unless explicitly owner-confirmed;
- no conversation history or customer profile;
- no separate answer value that can drift from its canonical field;
- public and machine-readable output expose only intended public fields.

Before implementation, confirm that real owners repeatedly answer questions that current OBP/menu/search cannot resolve.

### 4. Presence Relay

**Verdict:** The label taxonomy is useful; the proposed product is mostly already present or external-blocked.

Keep these proof states:

- MenuList recorded;
- owner confirmed;
- prepared for manual update;
- connected provider confirmed;
- unable to verify.

Never collapse them into "synced."

Do not add:

- periodic screenshots by default;
- evidence uploads without retention/privacy rules;
- arbitrary "last verified" claims;
- external crawling that cannot prove authenticated platform truth;
- outbound connectors before official API capability and owner demand are evidenced.

The current Platform Pull API is a read boundary. It does not make MenuList an outbound integration hub.

### 5. Customer Resolution

**Verdict:** Preserve the existing feedback inbox; consider one direct correction handoff.

The proposal is wrong that feedback currently "arrives but never closes." The runtime already supports `new` and `resolved` status, owner inboxes, reply handoff, and retention.

The useful gap to validate is:

> Can an eligible fact-specific report open the exact existing Menu Manager correction flow with the affected store, project, item, and field already scoped?

That can reduce owner work without creating a second mutation engine. The correction must still use Menu Manager approval and the canonical write/cache path.

Do not add customer notification, staff assignment, SLA timers, escalation queues, or service-issue case management without a separate privacy, consent, abuse, and product-boundary decision.

### 6. Staff Answer Mode

**Verdict:** Reject as a standalone product.

A searchable staff-facing answer surface introduces:

- another authenticated application surface;
- role and location answer filtering;
- staff usage logs;
- uncertainty escalation;
- potentially sensitive owner policies;
- ongoing support and device/session behavior.

This is materially larger than the existing read-only staff prompt. It also conflicts with the pre-rejected staff-app boundary.

If owner evidence shows a repeated need, first test a zero-state alternative: staff use the same current public customer link or a bounded printable reference generated from already-public facts. Do not build private staff Q&A first.

### 7. Action Adapters and Request Inbox

**Verdict:** Keep reliable external actions; reject the native inbox.

MenuList already has public call, WhatsApp, directions, reservation, and order links plus booking/inquiry readiness. Appropriate improvements include:

- stricter URL/phone/provider validation;
- clear current/fallback action selection from canonical truth;
- bounded broken-link checks where technically reliable;
- location-safe routing;
- honest analytics for MenuList-recorded clicks.

A quote/appointment/callback/large-order inbox creates contacts, message content, spam handling, response state, retention, deletion, export, breach exposure, and owner follow-up expectations. Four statuses do not make it less of a CRM/helpdesk.

MenuList should route to the owner's existing provider or contact method.

### 8. Regulars

**Verdict:** Reject.

Item-return alerts, new-menu notifications, WhatsApp/email updates, and customer subscriptions require customer identity, consent evidence, channel delivery, unsubscribe state, frequency policy, suppression, retries, and promotional/operational classification. This is a customer database plus messaging/loyalty system even without points.

The current saved customer page/PWA shortcut can remain a customer-controlled access mechanism. Promotional creation remains outside MenuList. No "lightweight" subscriber database should be introduced under a softer name.

### 9. Vertical Packs

**Verdict:** Do not build a new pack framework.

The shared business-type source already supports broad categories and Schema.org/output defaults. Add a bounded canonical field only when multiple real businesses in a category need the same public fact and the field can be rendered safely across owner, public, export, and structured-data surfaces.

The proposal says regulated verticals should be deferred, while the current website and source already include clinics at the public service-list level. The safe boundary is:

- public services, prices, hours, locations, contact, and actions are allowed;
- diagnoses, treatment advice, patient data, medical records, eligibility decisions, and unreviewed medical claims are not.

That boundary should be enforced without pretending the existing public-list support does not exist.

### 10. Packaging

**Verdict:** Keep the current plan logic; do not assign the proposed bundles.

The live pricing page says owners should choose by reach rather than feature count. Starter is one official link, Pro adds stronger presentation/message-based controls, and Premium adds location governance. The proposal's large Pro/Premium lists would reverse that clarity.

Core correctness and customer truth should not become artificial upgrade gates. Variable generation and verified variable-cost integrations may remain capacity- or cost-based after unit economics are proven.

### 11. Weekly Owner Relief Events

**Verdict:** Useful interview language, not a new runtime north-star yet.

"Relief event" can help classify research observations. It should not create:

- a new Firestore event collection;
- owner-facing relief analytics;
- invented hours-saved claims;
- duplicate receipts for actions already recorded elsewhere.

For an initial cohort, derive candidate relief events from existing acknowledged operations, scheduled transitions, resolved feedback, presence confirmations, and settled summaries. Validate that owners recognize those events as meaningful before formalizing a metric.

## External Evidence Review

### Supported

- CFIB reports that 84% of surveyed Canadian small businesses use digital channels for promotion, 59% for customer communication, and 66% identify lack of time as the greatest digital-tool obstacle. This supports the owner-time problem, not any specific MenuList feature. Source: [CFIB, Small Business Digital Presence](https://www.cfib-fcei.ca/en/research-economic-analysis/sme-digital-presence).
- Meta states that its Business AI on WhatsApp can answer questions using business information, and cites a 2025 Kantar result that 91% of online adults in India chat with a business weekly. This supports keeping MenuList upstream as clean facts rather than cloning a chatbot. Source: [Meta, Business AI on WhatsApp for Small Businesses in India](https://about.fb.com/news/2026/05/introducing-business-ai-on-whatsapp-for-small-businesses-in-india/).
- Owner.com's current product inventory includes ordering, delivery, marketing, loyalty, reporting, kitchen-tablet, and POS-integration capabilities. This supports differentiation from an all-in-one restaurant operations bundle. Source: [Owner.com](https://www.owner.com/).

### Unsupported or Overstated in the Proposal

- The "54% struggle to keep online content fresh" Verizon statistic has no Verizon citation in the attached response.
- The statement that restaurant operators are prioritizing efficiency and guest connections has no supporting reference in the attachment.
- The cited Meta page establishes the WhatsApp feature and messaging statistic; it does not independently validate a MenuList subscriber/Regulars layer.
- Vendor case studies and product-launch claims are not independent proof of MenuList owner demand.
- CFIB's sample is Canadian. It is useful directional evidence, not proof of Indian restaurant willingness to pay or workflow frequency.

## Recommended Expansion Process

Do not start by implementing the proposal's P0 set.

### Evidence Sprint

Use 10-20 stable, actively publishing owners and inspect the latest four weeks of existing evidence:

1. AI Menu Manager requests that could not be completed by current actions.
2. Repeated no-result searches and FAQ gaps.
3. Guest feedback categories and time-to-resolved.
4. Repeated Temporary Status and same-day Hours edits.
5. Presence targets left incomplete after onboarding.
6. Special-menu creation/cancellation frequency.
7. External actions that are configured incorrectly or repeatedly changed.
8. Multi-location overrides that caused customer-visible inconsistency.

Ask one primary interview question:

> What customer-facing information did you have to correct or repeat outside MenuList last week?

Record the task, trigger, frequency, current workaround, customer consequence, and source that should own the truth. Do not ask owners to select features from this proposal.

### Candidate Order After Evidence

Admit at most one:

1. **Deterministic public answer projection** if repeated questions are frequent and current public truth already contains the answer.
2. **Date-specific public hours/closure exception** if owners repeatedly perform holiday corrections outside the current flows.
3. **Fact-scoped feedback-to-Menu-Manager handoff** if resolution time is materially caused by owners finding the affected field.

If none has repeated observed demand, build none. Improve reliability, onboarding, placement adoption, and current-flow clarity instead.

## Five-Gate Check

| Candidate | Removes a decision | Noticeable absence | Strengthens customer decision | One sentence | Three-year value | Current result |
| --- | --- | --- | --- | --- | --- | --- |
| Public answer projection | Potentially | Unproven | Yes | Yes | Yes | Validate owner/customer frequency |
| Date-specific hours exception | Yes | Unproven | Yes | Yes | Yes | Validate recurring holiday pain |
| Feedback correction handoff | Yes | Unproven | Yes | Yes | Yes | Validate resolution friction |
| Owner Today product | No; adds workflow choices | No, current surfaces exist | Indirect | No | Unclear | Reject |
| Full Business Calendar | No; adds management | Unproven | Mixed | No | Mixed | Reject as proposed |
| Staff Answer Mode | Adds another surface | Unproven | Indirect | Mixed | Mixed | Reject/defer |
| Request Inbox | Adds case management | Unproven | Indirect | No | Wrong category | Reject |
| Regulars | Adds customer/message management | Unproven | No | No | Wrong category | Reject |

## Final Decision

Adopt the proposal's upstream principle, not its roadmap.

**Keep:**

- one owner-approved business truth;
- deterministic answer reuse;
- explicit proof labels for external handoffs;
- existing-provider action links;
- compact read models;
- phone-safe correction flows;
- strict cache, tenant, and approval boundaries.

**Do not build:**

- a renamed Owner Today control center;
- a broad business calendar;
- a second answer source of truth;
- a staff assistant;
- a MenuList request inbox;
- subscriber/Regulars infrastructure;
- connector breadth without official provider proof;
- a new Relief Event data model.

**Next product decision:** run the evidence sprint and select at most one bounded extension. No implementation is approved by this review.
