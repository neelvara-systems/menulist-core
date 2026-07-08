# MenuList Marketing Distribution - Action Register

**Status:** Active tracker
**Created:** June 22, 2026
**Purpose:** Live task log for MenuList marketing/distribution work.

## Status Legend

| Status | Meaning |
| --- | --- |
| Not started | No work done yet |
| In progress | Work has started |
| Blocked | Needs founder input, external access, legal review, or product readiness |
| Done | Complete and verified |
| Deferred | Intentionally later |
| Rejected | Decided not to do |

## Foundation Actions

| ID | Action | Owner | Status | Evidence / Notes |
| --- | --- | --- | --- | --- |
| MLD-001 | Capture ChatGPT conversation | Codex | Done | `__docs__/strategy/_archive/marketing-and-distribution-plan-chatgpt-conversation-2026-06-22.md` |
| MLD-002 | Create marketing distribution folder | Codex | Done | `__docs__/menulist-marketing-distribution/` |
| MLD-003 | Create source review | Codex | Done | `menulist-marketing-distribution_source-review.md` |
| MLD-004 | Create market/channel research base | Codex | Done | `menulist-marketing-distribution_research.md` |
| MLD-005 | Create consultant strategy | Codex | Done | `menulist-marketing-distribution_strategy.md` |
| MLD-006 | Create execution plan | Codex | Done | `menulist-marketing-distribution_execution-plan.md` |
| MLD-007 | Create consultant log | Codex | Done | `menulist-marketing-distribution_consultant-log.md` |
| MLD-008 | Review launch-platform and international-acquisition ChatGPT response | Codex | Done | `menulist-marketing-distribution_launch-distribution-review.md` |

## WhatsApp-First Moat Actions

| ID | Action | Owner | Status | Evidence / Notes |
| --- | --- | --- | --- | --- |
| MLD-W001 | Confirm WhatsApp destination and ownership | Founder | In progress | Test number `+1 555 657 1424` is configured for `/whatsapp`; production still needs final phone/account, response owner, hours, and whether this is MenuList support, founder account, or dedicated campaign number |
| MLD-W002 | Decide public PDF/file intake path for WhatsApp campaign | Founder + Codex | Done | Messaging onboarding supports PDF/image/file intake through WhatsApp; `/create-menu` remains image/link fallback and does not need direct PDF upload before WhatsApp campaign messaging |
| MLD-W003 | Create WhatsApp intake playbook | Codex | Done | Created `menulist-marketing-distribution_whatsapp-intake-playbook.md`; runtime runbook remains under `__docs__/messaging-onboarding/messaging-onboarding_runbook.md` |
| MLD-W004 | Create `/whatsapp` campaign page spec | Codex | Done | Implemented public `/whatsapp` campaign page plus main-website docs; copy avoids unsupported WhatsApp sync/partner/bulk claims |
| MLD-W005 | Implement click-to-WhatsApp CTA and tracking | Codex | In progress | Click-to-WhatsApp CTA is wired to the test number with a prefilled owner-started message; consent guardrails are documented in `menulist-marketing-distribution_whatsapp-compliance-checklist.md`; runtime tracking and production destination remain pending |
| MLD-W006 | Prepare WhatsApp conversation demo asset | Codex | In progress | On-page fictional chat mockup exists in `/whatsapp`; external screenshot/video assets still need production |
| MLD-W007 | Prepare "100 WhatsApp Lists in 100 Hours" ops playbook | Codex | Done | Created `menulist-marketing-distribution_100-smb-lists-ops-playbook.md`; campaign remains blocked until run gates pass |
| MLD-W008 | Create WhatsApp SEO content briefs | Codex | Done | Created `menulist-marketing-distribution_whatsapp-seo-content-briefs.md`; no new SEO routes created |
| MLD-W009 | Create WhatsApp compliance checklist | Codex | Done | Created `menulist-marketing-distribution_whatsapp-compliance-checklist.md` with consent, opt-out, identity, permission, and no-bulk-outreach rules |
| MLD-W010 | Run WhatsApp-first pilot | Founder + Codex | Blocked | Needs founder-approved pilot businesses or partner leads |

## Founder Decisions Needed

| ID | Decision | Impact | Status | Recommended default |
| --- | --- | --- | --- | --- |
| MLD-D001 | Broad SMB category stance | Sets pilot, assets, outreach, and copy | Done | Founder confirmed MenuList should not target one market only; start broad across restaurants, cafes, salons, spas, and similar list-driven SMBs |
| MLD-D002 | Demo data: fictional or permissioned real businesses | Determines screenshot/video safety | Done | Use fictional demo universe until permissioned customers exist; see `menulist-marketing-distribution_demo-universe.md` |
| MLD-D003 | Founder video presence | Determines launch video format | Blocked | Founder voiceover plus product footage first |
| MLD-D004 | Outreach sender identity | Needed before email/partner outreach | Blocked | Use founder identity, not generic sales inbox, after domain readiness |
| MLD-D005 | Budget ceiling for assisted setup | Controls launch subsidy | Blocked | Small cohort only; no unlimited free processing |

## Product/Funnel Readiness

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-F001 | Audit homepage CTA against broad-SMB current-list path | Codex | Done | Updated primary website CTAs from `Upload your menu ->` to `Create customer link ->` where they represent the broad `/create-menu` funnel |
| MLD-F002 | Audit `/create-menu` public copy | Codex | Done | Reframed `/create-menu` metadata and English/Hindi copy around official customer link creation from menu, catalogue, price-list, and service-list sources |
| MLD-F003 | Verify upload -> preview -> claim path | Codex | Done | Code contract verified with `npm run verify:menu-extraction-pipeline` and `npm run verify:menu-extraction-pipeline:dry-run`; real cloud upload/publish smoke still requires a safe demo tenant/runtime run |
| MLD-F004 | Define two-surface activation tracking | Codex | Done | Docs-first plan created in `menulist-marketing-distribution_activation-follow-up.md`; runtime instrumentation not added |
| MLD-F005 | Define follow-up states | Codex | Done | Funnel states and next actions documented in `menulist-marketing-distribution_activation-follow-up.md` |
| MLD-F006 | Broad-SMB CTA and metadata sync | Codex | Done | Synced locale CTAs, `/create-menu` metadata, `public/llms.txt`, main website docs, SEO/AEO docs, and changelog |
| MLD-F007 | Run real demo upload -> preview -> claim -> publish smoke | Founder + Codex | Blocked | Needs approved demo tenant/source and safe Firebase/runtime access; do not use real customer data without permission |
| MLD-F008 | Ship `/whatsapp` campaign page | Codex | Done | Added website route, localized copy, CSS, discovery policy, sitemap, LLM files, and main website docs; primary/final CTA now use the supplied test WhatsApp number |
| MLD-F009 | Wire supplied test WhatsApp CTA | Codex | Done | `/whatsapp` primary/final CTA opens `https://wa.me/15556571424` with a localized prefilled current-list onboarding message |
| MLD-F010 | Create MenuList Activation Concierge doc set | Codex | Done | Created `../menulist-activation-concierge/` docs for upload, preview, claim/publish, two-surface activation, proof eligibility, mobile support, Firebase cost, and SignalDesk observer boundary |
| MLD-F011 | Implement MenuList Activation Concierge runtime foundation | Codex | Done | Founder decision resolved: extend existing `/create-menu/success`, starter workspace, Use MenuList, mobile Share, and Search & Discovery / Presence Monitor first. Added shared action-done summary, desktop/mobile activation proof UI, docs parity, and verifier; no new route, collection, SignalDesk truth write, provider send, or external platform verification |

## Asset Actions

| ID | Asset | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-A001 | Multi-category demo universe brief | Codex | Done | Created `menulist-marketing-distribution_demo-universe.md` with six core demos, four expanded demos, proof matrix, asset matrix, screenshot requirements, SEO page gate, and founder approval checklist |
| MLD-A002 | Product Hunt asset checklist | Codex | Done | Created `menulist-marketing-distribution_product-hunt-asset-pack.md` with thumbnail direction, gallery frame order, tagline options, short description, maker comment draft, reply bank, and checklist |
| MLD-A003 | 10-15 second vertical video scripts | Codex | Done | Created `menulist-marketing-distribution_launch-video-scripts.md` with cafe, salon/service-list, and package/rate-card scripts |
| MLD-A004 | 60-90 second launch walkthrough script | Codex | Done | Created `menulist-marketing-distribution_launch-video-scripts.md` with broad-SMB walkthrough script |
| MLD-A005 | LinkedIn founder post pack | Codex | Done | Created `menulist-marketing-distribution_founder-post-pack.md` with founder context, broad-SMB, Product Hunt, partner, and pilot post drafts |
| MLD-A006 | Partner one-page brief | Codex | Done | Created `menulist-marketing-distribution_partner-brief.md` with partner pitch, fit rules, workflow, placement surfaces, and qualification questions |
| MLD-A007 | Direct outreach script set | Codex | Done | Created `menulist-marketing-distribution_outreach-scripts.md` with manual owner, partner, warm-intro, follow-up, and stop-message drafts |
| MLD-A008 | Follow-up templates | Codex | Done | Upload/source, preview, approval, publish, one-surface, activation, stalled, partner, and multi-location templates documented in `menulist-marketing-distribution_activation-follow-up.md` |
| MLD-A009 | Demo source-list pack | Codex + Founder | Done | Created `menulist-marketing-distribution_demo-source-lists.md` with safe fictional source material for Local Table Cafe, Glow & Blade Studio, Spark Auto Detailing, PawKind Grooming, Lens & Vows Studio, and BloomBox Florals |
| MLD-A010 | Screenshot capture plan | Codex | Done | Created `menulist-marketing-distribution_screenshot-capture-plan.md` with route/state/viewport/redaction plan and approval gates |
| MLD-A011 | Product Hunt gallery copy from demo universe | Codex | Done | Included in `menulist-marketing-distribution_product-hunt-asset-pack.md`; final image files still not created |
| MLD-A012 | Placeholder demo asset pack | Codex | Done | Created labelled placeholder SVGs under `public/images/website/demo-placeholders/` and documented them in `menulist-marketing-distribution_demo-placeholder-assets.md`; founder must replace them with approved screenshots/videos before broad campaign use |
| MLD-A013 | QR print trust-cue hardening review | Codex | Done | Accepted factual trust cues inside existing Assets/Menu Kit; enforced four-module QR quiet zones; rejected standalone QR-product framing, unsupported verified/secure/no-spam claims, WhatsApp consent copy on normal menu QR, and ordinary menu-scan interstitials |
| MLD-A014 | QR-to-WhatsApp experiment feature boundary | Codex | Done | Created `__docs__/qr-whatsapp-experiments/` and added a disabled feature flag so physical QR campaign tests stay separate from ordinary Assets/Menu Kit QR behavior |
| MLD-A015 | Branded QR action-template doctrine | Codex | Done | Created `__docs__/branded-qr-action-templates/` and aligned Assets, Printable Asset Templates, Menu Kit, and QR WhatsApp docs around scan-safe branded action files |
| MLD-A016 | Full launch video system v2 | Codex | Done | Expanded `menulist-marketing-distribution_launch-video-scripts.md` into a complete video system after checking live `menulist.online` positioning; no video files created |
| MLD-A017 | Dedicated type-wise video docs folder | Codex | Done | Created `__docs__/videos/` with separate docs for launch/hero video, product demo, feature videos, reels, paid ad cutdowns, campaign calendar, and production plan; old launch-video doc now points there |
| MLD-A018 | 12-video production handoff blueprint | Codex | Done | Created `__docs__/videos/videos_launch-product-marketing-production-blueprint.md` with executive summary, brand rules, visual language, assumptions, A-P production sections for all 12 videos, asset list, shot list, video design system, thumbnails, launch sequencing, review checklist, deliverables table, and editor notes |
| MLD-A019 | Individual 12-video handoff files | Codex | Done | Added standalone `__docs__/videos/videos_01-*` through `videos_12-*` files so each required video type has its own A-P design-team handoff |
| MLD-A020 | AI-era video strategy addendum | Codex | Done | Added `__docs__/videos/videos_ai-era-market-strategy.md`, `videos_future-ai-search-ready-video.md`, AI-era readiness language in the master blueprint, all 12 standalone video files, short-form plan, calendar, and launch-video compatibility pointer |
| MLD-A021 | Founder review of launch video system | Codex | Done | Added `__docs__/videos/videos_founder-review.md`; approved production preparation, rejected risky claims, and marked public publishing blocked until production gates pass |
| MLD-A022 | HyperFrames 30-sec launch announcement draft | Codex | Done | Created `__docs__/videos/hyperframes/menulist-launch-announcement-30s/` with visual identity, composition source, narration WAV, rendered MP4, review frames, and production note |
| MLD-A023 | HyperFrames Founder / Brand POV draft | Codex | Done | Created `__docs__/videos/hyperframes/menulist-founder-brand-pov/` with visual identity, founder POV script, composition source, narration WAV, rendered 75s MP4, review frames, and production note |
| MLD-A024 | HyperFrames-only audio production plan | Codex | Done | Added `__docs__/videos/videos_audio-production-research-and-plan.md`; defaulted MenuList video production to local HyperFrames plus FFmpeg, classified macOS `say` as scratch-only, and defined local TTS/BGM/SFX/mix/master gates |
| MLD-A025 | Audio v2 rescue pass for rendered HyperFrames drafts | Codex | Done | Created landscape 30-sec, native 9:16 30-sec, and Founder POV audio-v2 MP4s using local Kokoro `af_nova`, FreeToUse `Enlivening` BGM, FFmpeg ducking/loudnorm, real MenuList icon, and website blue theme; still needs founder listen approval before public use |

## Research Actions

| ID | Research | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-R001 | Product Hunt current launch rules | Codex | Done | Recorded in research doc |
| MLD-R002 | SEO and AI-search guidance | Codex | Done | Google Search sources recorded |
| MLD-R003 | India social/messaging data | Codex | Done | DataReportal and Meta sources recorded |
| MLD-R004 | Outreach compliance baseline | Codex | Done | WhatsApp, Gmail, FTC, TRAI, DPDP sources recorded |
| MLD-R005 | Competitor and clutter positioning scan | Codex | Done | Created `menulist-marketing-distribution_market-clutter-scan.md` with comparison sets, category guardrails, example market signals, and differentiation copy bank |
| MLD-R006 | Broad SMB category proof matrix | Codex | Done | Covered in `menulist-marketing-distribution_demo-universe.md` through demo pack, required proof surfaces, SEO page gate, and asset matrix |
| MLD-R007 | Launch-platform and international-acquisition source check | Codex | Done | Product Hunt, Show HN, WhatsApp Business policy, Google Business Profile, Apple Business Connect, LINE, and Kakao checks recorded in `menulist-marketing-distribution_launch-distribution-review.md` |
| MLD-R008 | End-to-end growth research and private Growth Engine alignment | Codex | Done | Created `menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md`; confirms Search Console host gate, WhatsApp consent gate, source-provider restrictions, proof-led SEO, controlled outbound, and private internal Growth Engine build order |
| MLD-R009 | Creator distribution article fit review | Codex | Done | Accepted local creator tests only as proof/content experiments for MenuList; CampaignCue owns the creator-fit brief primitive. No MenuList influencer workflow or creator product scope added |
| MLD-R010 | AI-startup growth playbook fit review | Codex | Done | Captured in `../menulist-signaldesk/menulist-signaldesk_growth-playbook-review-2026-06-24.md`; adopt activation-proof loop and recommended Bengaluru pod hypothesis, reject generic viral/outbound automation copy |
| MLD-R011 | Founder distribution and automation research | Codex | Done | Captured in `../menulist-signaldesk/menulist-signaldesk_founder-distribution-research-2026-06-24.md`; startup/founder/community research confirms Activation Concierge, proof assets, demand listening, and objection learning before more outbound automation |
| MLD-R012 | QR-to-WhatsApp A/B testing blueprint review | Codex | Done | Accepted the funnel model only as a future governed experiment feature: physical asset -> tracked landing/redirect -> WhatsApp click -> consent -> outcome dashboard |
| MLD-R013 | Branded QR physical-action creative review | Codex | Done | Accepted branded physical action points as a MenuList Assets doctrine; rejected generic QR generator and artistic QR output until scan-safety tests exist |
| MLD-R014 | 2026 AI/search-era video strategy check | Codex | Done | Source-checked Google Search Central, BrightLocal, Toast, Wyzowl, YouTube, and Sprout signals; accepted readiness/source-quality framing and rejected ranking/recommendation guarantees |

## Launch Actions

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-L001 | Product Hunt profile readiness | Founder | Not started | Account age/profile/community presence |
| MLD-L002 | Product Hunt draft | Codex + Founder | Not started | Do after assets |
| MLD-L003 | Launch-day response plan | Codex + Founder | Done | Created `menulist-marketing-distribution_launch-day-response-plan.md`; founder still must run launch-day replies |
| MLD-L004 | Launch week content calendar | Codex | Done | Created `menulist-marketing-distribution_launch-week-content-calendar.md`; posts are not scheduled |
| MLD-L005 | Post-launch follow-up board | Codex | Done | Created `menulist-marketing-distribution_post-launch-follow-up-board.md`; no CRM/runtime automation added |
| MLD-L006 | Product Hunt target-date readiness gate | Codex + Founder | Done | Gate is defined in `menulist-marketing-distribution_launch-distribution-review.md` and `menulist-marketing-distribution_product-hunt-launch-page-spec.md`; launch remains unscheduled until gates pass |
| MLD-L007 | Product Hunt launch page spec | Codex | Done | Created `menulist-marketing-distribution_product-hunt-launch-page-spec.md`; no `/launch/product-hunt` route created |
| MLD-L008 | Show HN tryable-demo gate | Codex | Deferred | Use Show HN only after public demo pages exist without signup barriers; do not post a landing page |
| MLD-L009 | Directory submissions backlog | Codex | Deferred | BetaList, Uneed, SaaSHub, AlternativeTo, and similar directories wait until proof assets and launch page are ready |
| MLD-L010 | AppSumo/review-platform evaluation | Founder + Codex | Deferred | Revisit 4-6 months after onboarding cost, support load, pricing, and plan limits are stable |

## International Acquisition Actions

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-I001 | Create international market-pod plan | Codex | Done | Initial pod model recorded in `menulist-marketing-distribution_launch-distribution-review.md` |
| MLD-I002 | Build market-pod lead board fields | Codex | Done | Created `menulist-marketing-distribution_market-pod-lead-board.md` with fields, scoring, states, CSV header, and first-sprint template |
| MLD-I003 | Draft first market-pod lead list | Founder + Codex | Blocked | Recommended default pending founder approval: Bengaluru, Indiranagar + Koramangala, cafes/dessert shops/QSR/cloud-kitchen-facing storefronts, founder email/manual export first; needs allowed source policy and sender identity before real leads |
| MLD-I004 | Country/market landing page briefs | Codex | Deferred | `/global`, `/in`, `/ae`, and `/us` need proof assets, route-specific copy, and intake-path decisions before code |
| MLD-I005 | LINE/Kakao intake research | Codex | Deferred | Later-market research only; no product, route, or integration claim until local partner/compliance path is clear |

## Paid Marketing Actions

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-P001 | Define paid entry criteria | Codex | Done | Strategy doc |
| MLD-P002 | Define first paid tests | Codex | Done | Strategy doc |
| MLD-P003 | Set budget ceiling | Founder | Blocked | Needed before ads |
| MLD-P004 | Retargeting/search setup | Founder + Codex | Deferred | After funnel proof |

## Verification Actions

| ID | Action | Owner | Status | Notes |
| --- | --- | --- | --- | --- |
| MLD-V001 | Docs structure check | Codex | Done | Folder created with README and operating docs |
| MLD-V002 | Source transcript coverage check | Codex | Done | 62 messages, 32/32 turns |
| MLD-V003 | Runtime verification | Codex | Deferred | No upload/extraction/claim runtime changed in this pass |
| MLD-V004 | Typecheck | Codex | Done | Passed `npx tsc --noEmit --incremental false --pretty false` after broad-SMB conversion copy pass |
| MLD-V005 | Website copy verification | Codex | Done | Passed locale JSON parse, stale-copy scan, `git diff --check`, `npm run verify:website-resource-locales`, `npm run verify:agent-readiness`, and `npm run lint` |
| MLD-V006 | Demo universe docs verification | Codex | Done | `git diff --check` after adding the demo universe brief, source-list pack, screenshot capture plan, and register updates |
| MLD-V007 | Create-menu pipeline code-contract verification | Codex | Done | `npm run verify:menu-extraction-pipeline` passed 27/27; `npm run verify:menu-extraction-pipeline:dry-run` passed 48/48 |
| MLD-V008 | Activation/follow-up docs verification | Codex | Done | `git diff --check` after adding docs-first activation tracking and follow-up templates |
| MLD-V009 | Launch-support docs verification | Codex | Done | `git diff --check` passed; claim-boundary scan only found negative guardrail wording in the new launch-support docs |
| MLD-V010 | WhatsApp campaign page verification | Codex | Done | Passed locale JSON parse, English/Hindi key parity, `npm run verify:agent-readiness`, `npm run verify:website-resource-locales`, `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, `git diff --check`, HTTP 200/text smoke, and Playwright desktop/mobile screenshots |
| MLD-V011 | Launch-distribution review docs verification | Codex | Done | `git diff --check` passed; claim-boundary scan found only guardrail/negative wording and existing historical references |
| MLD-V012 | Pending-action cross-check verification | Codex | Done | `git diff --check`, markdown relative-link check, claim-boundary scan, `npm run verify:env-targets`, `npm run verify:agent-readiness`, `npm run verify:website-resource-locales`, `npm run verify:public-business-truth`, `npx tsc --noEmit --incremental false --pretty false`, and `npm run lint` passed |
| MLD-V013 | Placeholder-backed industry route verification | Codex | Done | Passed `git diff --check`, `npm run verify:agent-readiness`, `npm run verify:website-resource-locales`, `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, local HTTP/text smoke, SVG asset smoke, and browser desktop/mobile render checks |
| MLD-V014 | QR trust-cue hardening verification | Codex | Done | Passed `npm run verify:menu-card-export`, `npm run verify:printable-asset-templates`, `git diff --check`, focused ESLint, and `npx tsc --noEmit --incremental false --pretty false` |
| MLD-V015 | QR WhatsApp Experiments docs verification | Codex | Done | Passed `git diff --check`, feature-boundary grep, docs file inventory, claim-boundary scan, and `npx tsc --noEmit --incremental false --pretty false` |
| MLD-V016 | Branded QR Action Templates alignment verification | Codex | Done | Passed `git diff --check`, docs file inventory, boundary grep, and prohibited-claim scan; hits were only negative guardrail wording |
| MLD-V017 | Launch video system doc verification | Codex | Done | Live site checked on July 7, 2026; docs-only update passed `git diff --check`, targeted prohibited-claim scan, and local markdown table/link smoke |
| MLD-V018 | Dedicated video folder docs verification | Codex | Done | Type-wise video docs pass `git diff --check`, markdown relative-link smoke, and targeted claim-boundary scan |
| MLD-V019 | 12-video production blueprint verification | Codex | Done | Master handoff doc checked for all 12 required video sections, `git diff --check`, markdown relative-link smoke, and targeted claim-boundary scan |
| MLD-V020 | Individual 12-video file verification | Codex | Done | All standalone `videos_01-*` through `videos_12-*` files checked for required A-P structure, markdown links, whitespace, and claim-boundary wording |
| MLD-V021 | AI-era video strategy verification | Codex | Done | AI/search-era docs pass source-link, markdown-link, whitespace, and prohibited-claim checks; unsafe search/AI claims remain negative guardrails only |
| MLD-V022 | Founder review verification | Codex | Done | Founder review doc passed markdown link, whitespace, and claim-boundary checks; verdict is production-prep approved but publish-blocked until gates pass |
| MLD-V023 | HyperFrames draft verification | Codex | Done | Installed Node 22 through existing nvm for HyperFrames only; `npm run check` passed with 0 errors and 0 layout issues; rendered 30s MP4 with H.264 video and AAC audio; visually checked review frames |
| MLD-V024 | Founder POV HyperFrames verification | Codex | Done | `npm run check` passed with 0 lint warnings, no console errors, 57 WCAG-passing text elements, and 0 layout issues; rendered 75.03s MP4 with H.264 video and AAC audio; visually checked review frames at 2s, 12s, 24s, 36s, 48s, 60s, and 70s |
| MLD-V025 | Audio production plan verification | Codex | Done | Passed `git diff --check`, relative-link smoke, targeted claim-boundary scan, local HyperFrames CLI probe for `tts`, `transcribe`, and `beats`, and local Kokoro candidate generation; prohibited-claim hits are negative guardrails only |
| MLD-V026 | Launch announcement audio v2 verification | Codex | Done | `npm run check` passed with 0 errors, no console errors, 67 WCAG-passing text elements, and 0 layout issues; rendered MP4 is 1920 x 1080, 30fps, H.264 video, AAC audio, 30.04 seconds; loudness spot-check found `input_i=-16.58`, `input_tp=-4.60`; review frames checked at 1s, 11s, 18s, and 26s |
| MLD-V027 | Launch announcement vertical audio v2 verification | Codex | Done | Native 9:16 HyperFrames project passed `npm run check` with 0 errors and 0 layout issues; rendered MP4 is 1080 x 1920, 30fps, H.264 video, AAC audio, 30.04 seconds, 3.5 MB; review frames checked at 1s, 11s, 18s, and 26s |
| MLD-V028 | Founder POV audio v2 verification | Codex | Done | Founder POV HyperFrames project passed `npm run check` with 0 errors, 0 warnings, no console errors, 62 WCAG-passing text elements, and 0 layout issues; rendered MP4 is 1920 x 1080, 30fps, H.264 video, AAC audio, 75.03 seconds, 7.5 MB; loudness spot-check found `input_i=-16.73`, `input_tp=-4.78`; review frames checked at 2s, 12s, 24s, 36s, 48s, 60s, and 70s |
