# MenuList Marketing Distribution - Execution Plan

**Status:** Active plan  
**Created:** June 22, 2026  
**Scope:** Sequenced marketing execution. No code, deploy, or Firebase change implied.

## Execution Principle

Do not launch broad attention before the proof system is ready.

Every execution step must move MenuList closer to:

> current list uploaded -> preview prepared -> owner approval -> public link published -> two customer surfaces activated.

## Proof-Led Distribution Sequence

Current workflow research is maintained in `menulist-marketing-distribution_distribution-workflow-research-2026-07-11.md`.

Every distribution run should use this order:

```txt
bounded market pod
-> permissioned owner result
-> two-surface activation
-> approved canonical proof packet
-> channel-native derivatives
-> one tracked next action
-> qualified response or activation
-> outcome and founder-attention review
-> continue, narrow, change, or pause
```

Channel assignments:

| Channel | Job in the current plan |
| --- | --- |
| Google/Profile | Current-link activation and high-intent discovery |
| Instagram | Visual transformation, owner story, and local creator/partner trust |
| YouTube | Durable case walkthrough; Shorts are derivatives, not the source |
| X | Founder learning, ecosystem conversation, and partner discovery |
| Reddit | Listening, objection learning, and selective disclosed help |
| WhatsApp/founder email | Permissioned owner response and intake, not public menu gating |
| Physical trust partner | Owner introduction and second-surface completion |
| Product Hunt | Later public proof and feedback event |
| Paid media | Evidence-gated amplification of a proven asset |

Do not begin a generic posting calendar before the first permissioned proof packet exists. The current external dependency remains one permissioned business or partner introduction plus the exact founder/manual sender identity.

Execution contracts:

- run the first eligible proof through `menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md`;
- use `menulist-marketing-distribution_weekly-distribution-watch.md` for the read-only weekly platform and workflow change review;
- keep the active recurring watch observe-only through the supported Codex automation; update the existing automation instead of creating a duplicate, and do not introduce raw cron, launchd, GitHub Actions, or another automation surface for this research task.

## Phase 0 - Foundation and Operating Setup

**Goal:** Make marketing execution trackable inside the repo.

| Task | Output | Status |
| --- | --- | --- |
| Create dedicated docs folder | `__docs__/menulist-marketing-distribution/` | Done |
| Archive ChatGPT source | Captured transcript in `__docs__/strategy/_archive/` | Done |
| Review ChatGPT points | Source review doc | Done |
| Create research base | Research doc | Done |
| Create strategy | Strategy doc | Done |
| Create action register | Action register doc | Done |
| Create consultant log | Consultant log doc | Done |

## Phase 1 - Broad SMB Scope and Proof Mix

**Goal:** Keep MenuList broad across customer-facing SMBs while making the proof concrete enough to execute.

Founder decision recorded:

> MenuList should not target only one market. It should serve as many relevant SMB categories as possible where a digital menu, service list, package list, rate card, catalog, or public offering list matters.

Crowded-market note:

- The category is cluttered with QR menu tools, restaurant website builders, generic menu makers, link-in-bio pages, WhatsApp/PDF habits, social profiles, and local agencies.
- MenuList should avoid sounding like another narrow digital-menu product.
- The repeatable positioning is one official customer link for the current list customers need to see.

Initial proof mix:

| Category | Why it matters | Proof output | Status |
| --- | --- | --- | --- |
| Restaurant/cafe/bakery | strongest menu pain and visible QR/WhatsApp use | current menu -> official customer link -> QR/WhatsApp/Google placement | Required |
| Salon/spa/barber | proves MenuList is not restaurant-only | service list -> official customer link -> WhatsApp/Instagram/QR placement | Required |
| Caterer/package business | shows package and rate-list fit | package/rate list -> shareable public link -> print/social proof | Required |
| Clinic/studio/local service | shows broader service-list use | service/rate card -> Official Business Page -> contact actions | Optional first pass |
| Multi-location SMB | shows higher-value consistency need | HQ/outlet public-list consistency story | Optional first pass |
| Setup partner | shows repeatable distribution | partner one-page brief and fulfillment checklist | Parallel |

Default execution mix:

1. Build restaurant/cafe, salon/spa, and caterer/package examples together.
2. Use one shared promise: current list -> official customer link -> two customer surfaces.
3. Write category-specific outreach only after the demo proof exists.
4. Keep partner/setup channel parallel because agencies can repeat the same setup across categories.

## Phase 2 - Demo Universe and Asset Brief

**Goal:** Create safe, founder-approved demo proof before public launch.

| Asset group | Required outputs | Owner input needed | Status |
| --- | --- | --- | --- |
| Demo business data | 6 core fictional demos plus 4 expanded demos | founder can rename/approve before public use | Done - see `menulist-marketing-distribution_demo-universe.md` |
| Before sources | messy PDF/photo/list examples | founder can rename or adjust before public use | Done - see `menulist-marketing-distribution_demo-source-lists.md` |
| Public menu screenshots | customer menu views | demo tenant or synthetic approved data | Not started |
| Official Business Page screenshots | OBP proof views | demo tenant or synthetic approved data | Not started |
| QR/Menu Kit visuals | print/share proof | approved design direction | Not started |
| Video scripts | 10-15s, 30-45s, 60-90s | founder voice/video preference | Done as scripts; no video files created |

Done criteria:

- no real customer data without permission
- screenshots do not show debug/test artifacts
- proof supports menus, service lists, price lists, packages, and rate cards
- copy follows language governance

## Phase 3 - Funnel Readiness

**Goal:** Do not send traffic into unclear copy or untracked flow.

| Check | Why | Status |
| --- | --- | --- |
| Homepage CTA fit | needs to route toward current-list upload or safe get-started path | Done - homepage already routes to `/create-menu` with upload-first CTA |
| `/create-menu` copy audit | current route can look like generic digital menu creator | Done - route copy now uses official-customer-link framing |
| Upload to preview path | must be stable before launch | Code contract verified; real demo smoke blocked until approved demo tenant/runtime run |
| Preview to approval path | must be clear for owner | Code contract verified; owner-facing live smoke still blocked |
| Public link publish path | must lead to surface placement | Code contract verified; surface placement plan documented |
| Two-surface placement checklist | activation requires distribution proof | Done docs-first in `menulist-marketing-distribution_activation-follow-up.md` |
| Tracking events | needed before paid spend | Manual tracking defined; runtime instrumentation deferred until workflow is proven |

Done criteria:

- founder can explain path in one sentence
- a new owner can complete first upload without confusion
- internal tracking can count upload, preview, approval, publish, and two-surface activation

## Phase 4 - Manual Pilot

**Goal:** Prove the offer with real or founder-approved pilot businesses before broad launch.

Pilot targets:

- 20-50 businesses if founder-led
- at least 10 businesses must publish public links
- at least 5 businesses should activate two customer surfaces
- record every objection and drop-off

Pilot workflow:

1. choose business list
2. collect current list/source
3. prepare MenuList preview
4. ask owner to review
5. publish official link
6. place on two surfaces
7. capture permissioned proof
8. record outcome in action register

Stop rule:

If businesses upload but do not approve/publish, fix preview quality and owner explanation before adding more leads.

## Phase 4A - WhatsApp-First Moat Sprint

**Goal:** Turn the implemented WhatsApp-first messaging-onboarding flow into an execution-ready campaign without making unsupported public claims.

Priority wedge:

> Send your current list on WhatsApp. MenuList turns it into one official customer link.

Execution rule:

Use "Send list on WhatsApp" as the primary `/whatsapp` CTA only in the controlled test-number state. Do not send broad traffic, paid ads, or the public challenge until the production destination number/account, intake ownership, consent language, and tracking board are ready.

| Task | Output | Status |
| --- | --- | --- |
| Confirm official WhatsApp destination | Phone/account, owner, SLA, consent note | In progress - test number configured; production account details pending |
| Decide PDF/file support path | Use implemented messaging-onboarding file intake for WhatsApp; keep `/create-menu` as image/link fallback | Done |
| Create WhatsApp intake playbook | Manual states, scripts, owner-detail questions, unclear-source recovery, publish handoff | Done - `menulist-marketing-distribution_whatsapp-intake-playbook.md` |
| Create `/whatsapp` page spec | Page sections, hero copy, FAQ, comparison, demo conversation, structured proof | Done - public route implemented with docs/discovery |
| Prepare click-to-WhatsApp tracking plan | Source params, prefilled message, consent note, success metrics | In progress - test CTA live; tracking and consent details pending |
| Prepare "100 WhatsApp Lists in 100 Hours" ops plan | Capacity, permission, counter, publishing rules, content plan | Not started |
| Prepare WhatsApp SEO briefs | `/whatsapp`, menu link, service list, rate card, price list, catalog comparison | Not started |

Done criteria:

- no claim of automatic WhatsApp catalog sync
- no claim of official WhatsApp partnership
- no bulk WhatsApp outreach
- no reply-command approval claim until implemented
- each page/video maps to the actual messaging-onboarding or `/create-menu` fallback path
- pilot can track received -> preview ready -> owner approval -> public link live -> two surfaces activated

## Phase 5 - Product Hunt Preparation

**Goal:** Prepare Product Hunt as a proof event.

Required materials:

| Item | Status |
| --- | --- |
| Product name and tagline | Drafted |
| Product Hunt description | Drafted |
| Maker comment | Drafted |
| Thumbnail | Copy direction drafted; image not created |
| Two or more gallery images | Frame copy drafted; images not created |
| 60-90 second walkthrough | Script drafted; video not created |
| First comment reply bank | Drafted |
| FAQ/objection answers | Drafted |
| Launch-day response rota | Drafted |
| Follow-up routing | Drafted |
| Deep launch research and six-gate command plan | Done - `launch-research-2026-09-03/report-source.md` |

Scheduling rule:

Do not schedule until the asset pack, launch page, and follow-up workflow are ready. Product Hunt allows scheduling up to one month ahead, but early scheduling does not replace readiness.

Date rule:

- The former Tuesday, August 11, 2026 target is expired and retired.
- Do not select a replacement date until the product/route, proof,
  intake/capacity, message/assets, channel/compliance, and
  measurement/continuation gates in
  `launch-research-2026-09-03/report-source.md` all pass.
- Current Product Hunt guidance says the best day is when the maker is ready;
  there is no authoritative golden weekday.
- Product Hunt normally gives a full daily cycle to a launch scheduled at the
  start of its Pacific-time day. Use that default only if the founder can cover
  the relevant response windows; timing must serve response quality, not rank
  folklore.

## Phase 6 - Launch Week

**Goal:** Convert attention into activation paths.

The launch-week calendar is drafted in `menulist-marketing-distribution_launch-week-content-calendar.md`.

Launch day operations:

- founder post on Product Hunt
- LinkedIn founder post
- X support thread
- Instagram/Reels proof clip
- direct partner messages
- manual response to every useful comment
- tag every lead by path: upload, partner, multi-location, press, feedback, irrelevant

The X layer runs as the bounded qualified-attention wave in
`menulist-marketing-distribution_launch-week-content-calendar.md`. Participants
receive the central claim, verified proof, facts, and optional angles, but use
their own wording and opinion. No required engagement, duplicate copy,
undisclosed material relationship, fake independent account, or paid-upvote
behavior is allowed.

Launch-day metrics:

- Product Hunt visits
- landing page visits
- uploads
- previews prepared
- approvals
- public links published
- partner calls booked
- multi-location reviews requested
- high-quality feedback comments

## Phase 7 - Post-Launch Conversion

**Goal:** Do not waste launch attention.

The manual post-launch board is drafted in `menulist-marketing-distribution_post-launch-follow-up-board.md`. Do not build CRM/runtime automation until the manual board proves which states matter.

Follow-up paths:

| Lead state | Next action |
| --- | --- |
| Uploaded current list | prepare/recover preview |
| Preview opened, not approved | send plain approval nudge |
| Approved, not published | help publish and place link |
| Published, one surface | push second surface |
| Published, two surfaces | paid plan or case-study request |
| Partner inquiry | setup-partner call |
| Multi-location inquiry | consistency review |
| Product Hunt commenter | reply and route if relevant |

## Phase 8 - Paid Tests

**Goal:** Use paid only after proof.

Entry criteria:

- upload tracking ready
- preview cost controlled
- approval/publish path working
- two-surface activation measurable
- follow-up templates ready
- budget ceiling approved
- stop-loss rules documented

First tests:

1. retarget website/Product Hunt visitors
2. Google Search high-intent terms
3. Meta/Instagram vertical proof creative
4. LinkedIn partner/multi-location tests

Stop-loss:

Pause any paid test that generates traffic without activated public businesses.

## Phase 9 - International Market Pods

**Goal:** Reach real SMB owners internationally without pretending every market uses the same front door.

Launch doctrine:

> WhatsApp-first, not WhatsApp-only.

Global promise:

> Send the list your business already uses. MenuList turns it into one official customer link.

Market pods:

| Pod | Markets | Primary front door | Status |
| --- | --- | --- | --- |
| 1 | India + GCC | WhatsApp | First controlled pilot and challenge candidate |
| 2 | LATAM | WhatsApp + Instagram | After India/GCC proof and Spanish/Portuguese review |
| 3 | US, Canada, Australia, UK | Google/Instagram/upload-first | Use current-list audit and partner motion |
| 4 | Japan, Taiwan, Thailand | LINE + upload | Research/docs first |
| 5 | Korea | Kakao + upload | Research/docs first |
| 6 | China/WeChat | Deferred | Requires local ecosystem, compliance, and partner decision |

Weekly market-pod workflow:

1. Pick one city, one vertical, and one acquisition channel.
2. Build a 50-100 lead list with visible public-list drift signals.
3. Score only businesses where the list actually matters to customers.
4. Send a specific manual audit, not generic SaaS outreach.
5. Ask for the current list as the first conversion event.
6. Prepare preview, ask for owner approval, publish link, and activate two customer surfaces.

Do not create `/global`, `/in`, `/ae`, `/us`, `/br`, `/mx`, `/line`, or `/kakao` routes until the relevant pod has proof assets, localized copy, intake path, and owner/compliance decisions.

## Phase 10 - AI Revenue Workflow Proof

**Goal:** Prove AI leverage inside the existing SignalDesk controls before adding another agent, connector, collection, or autonomy level.

Use the current research and rollout gates in `../menulist-signaldesk/menulist-signaldesk_ai-sales-marketing-distribution-research-2026-07-11.md`.

Current mode:

```txt
approved evidence
-> AI research and recommendation
-> founder accept, edit, reject, or hold
-> permissioned manual action
-> opportunity and activation outcome
-> AI quality, cost, and founder-attention review
```

Evidence gate before batch or exception-only automation:

- 12 evidence packets;
- five private previews;
- three two-surface activations;
- one permissioned proof asset;
- measured recommendation acceptance, edits, rejected facts, exceptions, cost, and founder attention;
- no material source-rights, suppression, claim, complaint, sender-health, or budget incident.

Do not add calendar, transcript, proposal, payment, creator-scoring, paid-optimization, auto-publishing, or autonomous-send scope until a repeated real-run gap proves the existing SignalDesk records cannot represent the workflow.

## Current Next Step

Founder decision recorded:

> Do not restrict MenuList to one target market. Start broad across relevant SMBs where the current customer-facing list matters.

Recommended next action:

The docs-first launch and AI-revenue operating packs are complete. The immediate constraint is one permissioned owner or partner path, not more market research or runtime scope:

- market clutter scan;
- demo universe and fictional source lists;
- screenshot capture plan;
- Product Hunt asset copy;
- launch video scripts;
- activation/follow-up plan;
- founder post pack;
- partner brief;
- direct outreach scripts;
- launch-day response plan;
- launch-week content calendar;
- post-launch follow-up board;
- WhatsApp-first hype strategy;
- WhatsApp intake playbook;
- public `/whatsapp` route with test-number click-to-WhatsApp CTA and safe `/create-menu` import fallback.

Next:

1. founder supplies one real permissioned Bengaluru business or approved menu-photographer/restaurant-consultant introduction;
2. founder confirms the exact sender/manual identity and response owner;
3. SignalDesk prepares one evidence-backed recommendation in shadow mode;
4. MenuList prepares one private preview and completes Google/Profile plus one additional customer surface;
5. record AI usefulness, edits, rejected facts, founder attention, objections, and activation outcome;
6. obtain item-level owner permission before creating or distributing proof;
7. keep WhatsApp production destination, tracking/consent, public demo assets, and Product Hunt scheduling as separate readiness gates.

Now completed from the prior pending list:

- WhatsApp compliance checklist;
- WhatsApp SEO/content briefs;
- "100 SMB Lists in 100 Hours" ops playbook;
- market-pod lead board template;
- Product Hunt launch-page spec.
