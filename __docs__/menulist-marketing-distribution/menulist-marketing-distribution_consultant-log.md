# MenuList Marketing Distribution - Consultant Log

**Status:** Active log
**Created:** June 22, 2026
**Purpose:** Preserve marketing decisions, rationale, blockers, and verification evidence as work progresses.

## Log Rules

- Add a dated entry after every non-trivial marketing/distribution session.
- Record decisions in plain language.
- Link to files, sources, and action IDs.
- Separate founder-side blockers from Codex-side work.
- Do not leave important decisions only in chat.

## July 7, 2026 - HyperFrames Draft Video Created

### Context

Founder asked whether Codex could create the MenuList video with HyperFrames and then instructed Codex to proceed without waiting.

### Work Completed

Created a HyperFrames project for the 30-second Launch Announcement Cut:

- `__docs__/videos/hyperframes/menulist-launch-announcement-30s/`
- `__docs__/videos/videos_hyperframes-production.md`

Rendered output:

- `__docs__/videos/hyperframes/menulist-launch-announcement-30s/renders/menulist-launch-announcement-30s-draft.mp4`

### Environment

Installed Node 22 through the existing local `nvm` install and used it only for HyperFrames commands. The MenuList app runtime and package dependencies were not changed.

HyperFrames TTS failed because the local Kokoro/espeak package expected a missing `phontab` file. Used macOS `say` plus FFmpeg instead and kept only the generated `assets/narration.wav`.

### Verification

- `cd __docs__/videos/hyperframes/menulist-launch-announcement-30s && npm run check` passed inside the HyperFrames project.
- HyperFrames lint: 0 errors.
- HyperFrames validate: no console errors and all text passed WCAG AA.
- HyperFrames inspect: 0 layout issues.
- Rendered MP4: 1920 x 1080, 30fps, H.264 video, AAC audio.
- Review frames checked at 1s, 11s, 18s, and 26s.

### Boundaries

The draft uses CSS-built mock UI and demo data only. It is suitable for internal production review, not public launch publishing. No public website copy, runtime app code, paid ad launch, Vercel deploy, Firebase deploy, external-platform claim, ranking claim, or AI recommendation claim was added.

## July 7, 2026 - Founder Review Of Video System

### Context

Founder asked Codex to review the full MenuList video system as a founder/product-strategy reviewer with both MenuList doctrine and current market context in mind.

### Decision

Approved the launch video system for production preparation.

Not approved for public publishing yet.

The approved foundation remains:

```text
One approved customer link for your menu, services, and business details.
```

The approved AI-era expansion is:

```text
One approved customer link - ready for customers, search, and AI-era discovery.
```

This expansion must stay readiness/source-quality language and must never become a ranking, AI recommendation, traffic, citation, revenue, or automatic external-platform update claim.

### File Added

- `__docs__/videos/videos_founder-review.md`

### Action Register

- Added `MLD-A021` for the founder review doc.
- Added `MLD-V022` for founder review verification.

### Boundaries

No runtime code, website copy, paid ad launch, production asset, external platform integration, Vercel deploy, Firebase deploy, ranking claim, AI recommendation claim, or automatic external update claim was added.

## July 7, 2026 - AI-Era Video Strategy Addendum

### Context

Founder shared a 2026 market-positioning note arguing that MenuList should use the AI era to look more necessary and trustworthy without becoming an AI-hype product.

### Decision

Accepted the direction with strict wording boundaries.

MenuList can use:

```text
One approved customer link - ready for customers, search, and AI-era discovery.
```

This is an expansion of the core product line, not a replacement. It means MenuList keeps business information clean, current, structured, and owner-approved so customers and discovery systems have a better source to read.

MenuList must not claim guaranteed Google ranking, ChatGPT recommendations, AI citations, traffic, revenue, or automatic external-platform updates.

### Files Added Or Updated

- `__docs__/videos/videos_ai-era-market-strategy.md`
- `__docs__/videos/videos_future-ai-search-ready-video.md`
- `__docs__/videos/videos_launch-product-marketing-production-blueprint.md`
- `__docs__/videos/videos_short-form-reels.md`
- `__docs__/videos/videos_campaign-calendar.md`
- `__docs__/videos/videos_01-*` through `videos_12-*`
- `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_launch-video-scripts.md`
- `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_action-register.md`

### Boundaries

No public website copy, runtime code, external platform integration, search-ranking claim, AI-recommendation claim, paid ad launch, Vercel deploy, Firebase deploy, or production build was added.

## June 25, 2026 - QR Print Trust-Cue Hardening

### Context

Founder shared an external QR trust-cue proposal covering branded QR cards, WhatsApp badges, consent snippets, HTTPS preview pages, short links, placement UTMs, and a one-week A/B test.

### Decision

Accept the core psychology inside existing MenuList surfaces: the printed object is the product, and it should communicate business identity, current official action, scan-safe QR, short link, and attribution before the customer studies the QR pattern.

Do not create a standalone QR product or route. Assets, Print Menu Surfaces, Printable Asset Templates, and Menu Kit already own the output system. MenuList should not market itself as a QR maker.

Do not add a preview interstitial before ordinary MenuList menu/service/catalog QR scans. Those scans should open the live page directly.

Do not print "Verified", "Secure", "No spam", WhatsApp badges, or WhatsApp consent snippets on normal MenuList page QR assets. WhatsApp-specific consent and preview behavior belongs to a separate WhatsApp-owned flow with production number, response owner, consent copy, tracking, privacy, and Firebase cost decisions.

### Files Changed

- `src/lib/menu-kit/templates/*`
- `src/lib/print-menu-surfaces/templates/*`
- `src/lib/printable-asset-templates/editorDocumentAdapter.ts`
- `src/lib/physical-surfaces/*`
- `src/lib/utils/qrCode.ts`
- `scripts/verification/verify-menu-card-export.js`
- `scripts/verification/verify-printable-asset-templates.js`
- `__docs__/print-assets/`
- `__docs__/print-menu-surfaces/`
- `__docs__/printable-asset-templates/`
- `__docs__/menu-kit/`

### Boundary

No WhatsApp automation, scan ledger, click ledger, A/B ledger, preview route, Firebase rule/index/function change, Vercel deploy, Firebase deploy, production build, or public WhatsApp claim was added.

## June 24, 2026 - Activation Proof Runtime Foundation

### Context

Founder asked how MenuList practically knows whether an activation action is done and pointed to the existing discovery setup screen.

### Decision

Use the existing MenuList activation/discovery surfaces instead of creating a new Activation Concierge route. Action-done proof now has two runtime classes:

- MenuList-recorded owner action: copy, WhatsApp share, QR download, Menu Kit download, or native share recorded in `starterActivationSignals`.
- Owner-confirmed external placement: Google Business, Instagram Bio, or WhatsApp Profile marked in Presence Monitor and stored in `menuPresence`.

External platform placement is not claimed as API-verified.

### Files Changed

- `src/lib/onboarding/starterActivation.ts`
- `src/components/onboarding/StarterActivationBanner.tsx`
- `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx`
- `src/components/mobile/components/PresenceMonitor.tsx`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`
- `scripts/verification/verify-menulist-activation-concierge.js`
- `package.json`
- `__docs__/menulist-activation-concierge/`
- `__docs__/menu-presence-monitor/`

### Verification

- Added `npm run verify:menulist-activation-concierge`.
- TypeScript pass completed after runtime changes.

### Action Register

- Marked `MLD-F011` done for the existing-surface Activation Concierge runtime foundation.

## June 24, 2026 - Activation Concierge Doc Set

### Context

Founder asked Codex to do the needful after the founder-distribution research and mark the accepted work done from Codex's side.

### Decision

The next valid MenuList-side work is Activation Concierge: upload or receive the current list, prepare a preview, owner approves, customer link publishes, two customer surfaces are activated, and proof becomes eligible only after confirmation and permission.

This is not a SignalDesk feature. SignalDesk may route and observe outcomes, but MenuList owns upload, extraction, preview, claim, publish, QR/share/presence, and public truth.

### Files Added

- `../menulist-activation-concierge/README.md`
- `../menulist-activation-concierge/menulist-activation-concierge_spec.md`
- `../menulist-activation-concierge/menulist-activation-concierge_impl.md`
- `../menulist-activation-concierge/menulist-activation-concierge_marketing.md`
- `../menulist-activation-concierge/menulist-activation-concierge_website.md`
- `../menulist-activation-concierge/menulist-activation-concierge_helpdoc.md`
- `../menulist-activation-concierge/menulist-activation-concierge_firebase.md`
- `../menulist-activation-concierge/menulist-activation-concierge_mobile-support.md`
- `../menulist-activation-concierge/menulist-activation-concierge_test-cases.md`

### Action Register

- Marked `SD-F022` done for the separate MenuList Activation Concierge doc set.
- Added `MLD-F010` as done for Activation Concierge docs.
- Added `MLD-F011` for runtime implementation pending founder route decision at that time.

### Boundaries

No runtime code, public route, provider send, external API, paid campaign, SignalDesk public page, SignalDesk MenuList truth write, Firebase deploy, Vercel deploy, or production build was added.

## June 24, 2026 - Founder Distribution Deep Research

### Context

Founder asked Codex to research how successful startups and solo product owners handle marketing/distribution across X, Reddit, founder communities, and adjacent case studies, then translate that into what MenuList should do and automate so one founder can operate it.

### Decision

MenuList should not copy generic viral-launch, influencer, or lead-blasting playbooks. The validated pattern is narrow audience, fast first result, shareable proof artifact, trust channel, activation measurement, and repeated learning.

For MenuList, the matching loop is: current-list problem found, MenuList preview prepared, owner approves, official customer link published, QR/WhatsApp/Google/Profile/Instagram/staff surface activated, proof asset created, then SignalDesk recommends the next target, proof draft, partner, or pod decision.

The next build should be MenuList-side Activation Concierge and proof automation before more provider adapters, sequencer plumbing, paid campaigns, or social/WhatsApp automation.

### File Added

- `../menulist-signaldesk/menulist-signaldesk_founder-distribution-research-2026-06-24.md`

### Action Register

- Added `MLD-R011` for founder distribution and automation research.
- Added `SD-D024` for the SignalDesk research document.
- Moved `SD-F022` from deferred to not started as the next recommended MenuList-side Activation Concierge doc set.

### Boundaries

No runtime code, provider adapter, external account, paid API, outreach, social automation, WhatsApp automation, public SignalDesk page, Firebase deploy, Vercel deploy, or MenuList truth write was added.

### Remaining Founder-Side Blockers

- Approve first market pod or revise the recommended Bengaluru Indiranagar + Koramangala restaurant pod.
- Approve first self-service CTA and proof format.
- Decide sender identity, physical address policy, and source policy before real outreach.
- Approve whether Activation Concierge starts as a local/demo path or direct owner-facing MenuList route.

## June 24, 2026 - Creator Distribution Article Fit

### Context

Founder shared an external consumer-app influencer distribution article and a ChatGPT interpretation, then asked Codex to turn the accepted parts into repo changes.

### Decision

MenuList should not become an influencer or creator-campaign product. The article is useful for MenuList only as a proof/content distribution discipline: test small local creator or category angles, measure actual activation, and keep the launch story centered on one owner-approved customer link.

CampaignCue owns the product primitive: local creator test brief, creator/audience-fit checklist, lightweight creator brief, 3-test plan, flat-fee boundary, disclosure/consent notes, and result-memory prompt inside the existing campaign pack/export runtime.

### Files Changed

- `src/constants/campaigncue/outputPicker.ts`
- `src/lib/campaigncue/server.ts`
- `scripts/verification/verify-campaigncue-pack-templates.js`
- `__docs__/campaigncue/`
- `menulist-marketing-distribution_strategy.md`
- `menulist-marketing-distribution_action-register.md`

### Boundaries

No MenuList influencer workflow, CampaignCue creator marketplace, creator CRM, contract/payment flow, provider integration, Firebase rule/index/function change, Vercel deploy, Firebase deploy, production build, paid ad, outreach, or real creator deal was added.

## June 23, 2026 - Placeholder Demo Asset Bridge

### Context

Founder approved using placeholder demo assets for now so Codex could proceed past the blocker that demo public pages, screenshots, and videos were still pending before salon/spa/service-list SEO pages.

### Decision

Use clearly labelled synthetic placeholders as a temporary bridge. They can support layout, SEO route review, and internal launch preparation, but they do not count as final customer proof.

### Files Added

- `public/images/website/demo-placeholders/glow-blade-service-list-placeholder.svg`
- `public/images/website/demo-placeholders/service-list-proof-grid-placeholder.svg`
- `public/images/website/demo-placeholders/spark-detailing-rate-card-placeholder.svg`
- `public/images/website/demo-placeholders/launch-video-poster-placeholder.svg`
- `menulist-marketing-distribution_demo-placeholder-assets.md`

### Runtime Surfaces Added

- `/industries/salons-spas`
- `/industries/service-list-businesses`
- `/industries/local-service-businesses`

### Remaining Founder-Side Requirement

Replace placeholders with approved routed demo screenshots or permissioned assets before Product Hunt gallery use, paid traffic, broad partner outreach, or final public campaign visuals.

### Verification

Passed `git diff --check`, `npm run verify:agent-readiness`, `npm run verify:website-resource-locales`, `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, local HTTP/text smoke for the three new industry routes and four SVG assets, and browser desktop/mobile render checks for title/H1, placeholder image loading, placeholder label presence, and horizontal overflow.

---

## June 23, 2026 - End-to-End Growth Research and Marketing Verdict

### Context

Founder asked Codex to act as the end-to-end MenuList marketing expert, use the full conversation context, perform web research, and identify what else must be done.

### Decision

MenuList marketing should center on one repeatable job:

> Turn the current customer-facing list into one official customer link.

The WhatsApp-first India wedge remains valid, but only as consent-aware intake and click-to-message, not bulk WhatsApp outreach or platform-sync claims.

The private Growth Engine should be built as an internal acquisition control room for the MenuList team. It should support sourcing, scoring, evidence packets, approved drafts, inbox/reply handling, attribution, suppression, and demand signals. It should not become a public product or autonomous outbound machine.

### Sources Checked

- Google AI Search optimization guidance.
- Google Search Console guidance.
- Google Business Profile menu/services guidance.
- WhatsApp opt-in, policy, and click-to-WhatsApp materials.
- FTC CAN-SPAM and Gmail sender guidance.
- Google Maps Platform terms, GBP API policy, and Foursquare Places terms.
- Apify Google Maps scraper market pages.
- Toast restaurant operator survey, Restaurant Dive website behavior report, Rio SEO local search behavior study.
- Product Hunt launch preparation guidance.
- India DPDP Act source.

### File Added

- `menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md`

### Action Register

- Added `MLD-R008` for the end-to-end growth research and private Growth Engine alignment.

### Remaining Founder-Side Blockers

- Production host/canonical alignment before Search Console.
- Production WhatsApp number/account, response owner, hours, consent copy, and tracking.
- First market pod: city, vertical, contact path, and sender identity.
- Approved demo tenant/source and proof assets.
- Email sender identity, physical address policy, unsubscribe, and suppression.
- Budget ceiling before any paid click-to-WhatsApp test.

### Boundaries

No outreach, paid ad, Product Hunt launch, external account setup, Vercel deploy, Firebase deploy, production build, WhatsApp provider configuration, or real customer-data operation was run.

---

## June 23, 2026 - Full Session Cross-Check

### Context

Founder asked to cross-check everything done in the whole session.

### Scope Checked

- Current dirty worktree and changed-file inventory.
- Marketing/distribution action register.
- SEO launch action register.
- WhatsApp runtime flags and `/whatsapp` test-number CTA references.
- Auth/internal noindex changes.
- Stale public menu slug noindex behavior.
- Launch distribution, Product Hunt, international market-pod, compliance, and WhatsApp SEO docs.
- Claim boundaries across website/docs/LLM context.

### Verification Commands

```bash
git diff --check
npm run verify:env-targets
npm run verify:agent-readiness
npm run verify:website-resource-locales
npm run verify:public-business-truth
npx tsc --noEmit --incremental false --pretty false
npm run lint
```

### Result

All commands passed.

The claim-boundary scan found only negative guardrail wording, archived historical examples, or existing `do not claim` language. No positive unsupported public claim was found in the live website copy checked in this pass.

### Remaining Pending Items

No Codex-side launch documentation item remains open from this session. Remaining work is intentionally gated:

- production WhatsApp number/account, response owner, and operating hours;
- runtime tracking decision beyond the manual board;
- demo public pages, screenshots, and videos;
- founder video/sender identity and budget ceiling;
- approved pilot businesses or partner leads;
- first market-pod city, vertical, contact path, and sender identity;
- Product Hunt profile/draft/scheduling after proof assets and launch URL are ready;
- Search Console and production host alignment;
- paid ads, directories, Show HN, country pages, LINE/Kakao, and AppSumo later.

### Non-Session Artifacts Observed

`routes-manifest.json` and `tmp/` are untracked existing artifacts that appear older and unrelated to this MenuList marketing/SEO pass. They were inspected and left untouched.

### Boundaries

No production build, Vercel deploy, Firebase deploy, external account setup, Product Hunt draft, ad, outreach, WhatsApp provider secret, or real customer data operation was run.

---

## June 23, 2026 - Pending Launch Work Cross-Check

### Context

Founder asked whether anything was still pending and asked Codex to cross-check and do the needful.

### Cross-Check Result

Codex-side docs that were still pending have now been completed:

- WhatsApp compliance checklist.
- WhatsApp SEO/content briefs.
- "100 SMB Lists in 100 Hours" ops playbook.
- Product Hunt launch-page spec.
- Market-pod lead board template.

### Remaining True Blockers

These are not Codex-documentation gaps anymore:

| Blocker | Owner | Why it remains pending |
| --- | --- | --- |
| Production WhatsApp destination | Founder | `/whatsapp` still uses the supplied test number until production account/number is approved. |
| Response owner and hours | Founder | Needed before broad WhatsApp traffic. |
| Runtime tracking decision | Founder + Codex | Manual board exists; runtime instrumentation is still a separate product decision. |
| Demo public pages/screenshots/videos | Founder + Codex | Needs approved demo tenant/source and visual production pass. |
| First market-pod lead list | Founder + Codex | Founder must choose first city, vertical, contact path, and sender identity before real lead collection. |
| Product Hunt draft/scheduling | Founder + Codex | Waits on proof assets, launch URL readiness, offer approval, and response coverage. |
| Paid ads and broad outreach | Founder | Blocked until production WhatsApp readiness, proof, tracking, and pilot results exist. |

### Files Added

- `menulist-marketing-distribution_whatsapp-compliance-checklist.md`
- `menulist-marketing-distribution_whatsapp-seo-content-briefs.md`
- `menulist-marketing-distribution_100-smb-lists-ops-playbook.md`
- `menulist-marketing-distribution_market-pod-lead-board.md`
- `menulist-marketing-distribution_product-hunt-launch-page-spec.md`

### Boundaries

- No code route, Product Hunt draft, external account setup, outreach, paid ad, Firebase deploy, Vercel deploy, production build, or WhatsApp provider setting was changed.

---

## June 23, 2026 - Launch Platform and International Acquisition Review

### Context

Founder pasted a new ChatGPT launch-distribution playbook that expanded the WhatsApp-first strategy into Product Hunt timing, LinkedIn/X/Instagram/YouTube/HN/Reddit/directories, partner launch, international market pods, and country-specific intake channels.

### Decisions

- Accepted the deeper launch doctrine: WhatsApp-first, not WhatsApp-only.
- Kept the MenuList-owned public wording centered on `official customer link` instead of drifting into unsupported platform claims.
- Accepted `Forward any SMB list into one official customer link` as the Product Hunt-facing tagline candidate.
- Accepted Tuesday, August 11, 2026 at 12:01am Pacific / 12:31pm IST as a conditional Product Hunt target, not a scheduled launch.
- Accepted market-pod acquisition: India/GCC first, LATAM second, US/Canada/Australia/UK upload/Google/Instagram-first, LINE/Kakao markets later, WeChat/China deferred.
- Kept Product Hunt as a credibility, feedback, and partner event rather than the primary SMB acquisition channel.

### Boundaries

- No `/global`, `/in`, `/ae`, `/us`, `/launch/product-hunt`, `/examples`, `/partners`, or `/audit` code route was added.
- No Product Hunt launch was scheduled.
- No outreach, paid ads, external platform setup, WhatsApp automation, Firebase deploy, Vercel deploy, or production build was run.
- Do not claim WhatsApp Catalog sync, official WhatsApp/Meta partnership, reply-command approval, automatic Google/Instagram/Yelp/Apple/LINE/Kakao updates, or AppSumo readiness.

### Sources Checked

- Product Hunt launch and preparation guides.
- Hacker News Show HN guidelines.
- WhatsApp Business Messaging Policy.
- Google Business Profile.
- Apple Business Connect.
- LINE Official Account.
- KakaoTalk Channel.

### Files Updated

- `menulist-marketing-distribution_launch-distribution-review.md`
- `README.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_execution-plan.md`
- `menulist-marketing-distribution_product-hunt-asset-pack.md`
- `menulist-marketing-distribution_research.md`
- `menulist-marketing-distribution_consultant-log.md`

### Next

1. Replace the test WhatsApp number with the production destination before broad traffic.
2. Create final demo public pages, screenshots, and videos.
3. Build the market-pod lead board fields.
4. Keep the August 11 Product Hunt date gated by proof assets, launch URL, offer, and launch-day response coverage.

---

## June 22, 2026 - Test WhatsApp CTA Wired

### Context

Founder supplied test WhatsApp number `+1 555 657 1424` and asked for a cross-check against the WhatsApp-first hype strategy, the ChatGPT response, and the code/docs changes already made.

### Decisions

- Wired the `/whatsapp` primary and final CTAs to `https://wa.me/15556571424` with a prefilled owner-started current-list message.
- Kept `/features/menu-import` as the secondary import-flow path instead of removing the upload/import fallback story.
- Updated public CTA copy to `Send list on WhatsApp` so the campaign page matches the selected wedge.
- Kept production launch gated on final public WhatsApp account, response owner, operating hours, consent copy, tracking, and permissioned proof assets.

### Alignment Verdict

- Aligned with the WhatsApp-first moat: the first action is now WhatsApp, not dashboard-first.
- Aligned with broad SMB direction: the prefill and page copy include menus, service lists, rate cards, catalogs, package lists, and price lists.
- Aligned with trust guardrails: no WhatsApp/Meta partnership, automatic catalog sync, scraped-number outreach, fake metrics, or publish-without-approval claim was added.
- Partially complete against the full hype plan: `/whatsapp` and click-to-WhatsApp are live for the test number; sticky site-wide WhatsApp CTA, tracking, SEO cluster pages, public challenge ops, and proof assets remain controlled follow-up work.

### Boundaries

- No provider secret, webhook, Cloud Function, Firestore rule, Firebase deploy, Vercel deploy, production build, outbound WhatsApp message, ad, or tracking setup was changed.
- The configured number is treated as a test number until the founder approves the production WhatsApp account and operating model.

---

## June 22, 2026 - WhatsApp-First Moat Strategy

### Context

Founder identified WhatsApp onboarding as a priority MenuList moat for India and asked for a deep consultant plan combining the pasted ChatGPT strategy, repo truth, and current market research.

### Decision

- Accepted WhatsApp-first onboarding as the priority India wedge.
- Refined the safe core line to: `Send your current list on WhatsApp. MenuList turns it into one official customer link.`
- Set the campaign name to `Forward It. Make It Official.`
- Renamed the launch stunt from restaurant-only wording to `100 WhatsApp Lists in 100 Hours` so it covers restaurants, cafes, bakeries, salons, spas, service businesses, catalogs, packages, price lists, and rate cards.
- Kept MenuList broad across customer-facing SMBs; WhatsApp is the front door, not a restaurant-only repositioning.

### Codebase Reality

- `/create-menu` already supports an owner-authenticated preview path with WhatsApp OTP, image upload, owned public-list link import, durable public drafts, extraction jobs, and claim/publish cache revalidation.
- The current public `/create-menu` client upload tab accepts JPEG, PNG, and WebP image files, not direct public PDF upload.
- Owner-side extraction has broader PDF support, and public link import can read supported public PDF/image links, but the WhatsApp campaign should not promise direct PDF forwarding as a fully live public self-serve path until product work or manual handoff is explicit.
- Superseded by the later product-truth correction below: the native inbound WhatsApp messaging-onboarding pipeline exists and is documented under `__docs__/messaging-onboarding/`. Still do not claim WhatsApp catalog sync, official WhatsApp partnership, or WhatsApp-reply `APPROVE` publishing.

### Research Used

- WhatsApp Business catalog and help resources.
- WhatsApp Business Terms and Meta opt-in guidance.
- TechCrunch coverage on WhatsApp India/business usage and spam risk.
- Cluely virality writing and press coverage.
- Google Search Central SEO and helpful-content guidance.

### Files Updated

- `menulist-marketing-distribution_whatsapp-first-hype-strategy.md`
- `README.md`
- `menulist-marketing-distribution_strategy.md`
- `menulist-marketing-distribution_research.md`
- `menulist-marketing-distribution_execution-plan.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`

### Blockers

| Blocker | Owner | Why it matters |
| --- | --- | --- |
| Official WhatsApp destination number/account | Founder | Superseded by the later test CTA: test number is configured; final public account and operating ownership remain needed before production traffic |
| Public PDF/file intake decision | Founder + Codex | Resolved after checking messaging-onboarding docs: WhatsApp file intake exists there; `/create-menu` remains image/link fallback |
| Pilot business/partner access | Founder | Needed for real proof before challenge/paid launch |
| Capacity ceiling | Founder | Prevents a public challenge from overwhelming manual preview work |

### Next

1. Replace the test WhatsApp number with the production destination when ready.
2. Confirm operating owner, hours, consent copy, and tracking before broad click-to-WhatsApp traffic.
3. Build fictional WhatsApp conversation screenshot/video assets from the on-page demo.
4. Prepare the "100 WhatsApp Lists in 100 Hours" ops plan.
5. Run a small permissioned pilot before paid click-to-WhatsApp tests.

### Verification

- Docs-only pass.
- No runtime changes.
- No Firebase changes.

---

## June 22, 2026 - WhatsApp Campaign Page Shipped and Product Truth Corrected

### Context

The founder clarified that the whole WhatsApp flow has already been implemented and tested, with its doc set under `__docs__/messaging-onboarding/`. The marketing plan previously treated native WhatsApp intake as a future gap, so the website and marketing docs needed to be corrected before campaign execution.

### Decisions

- Added public `/whatsapp` campaign route with localized English/Hindi copy, structured metadata, chat-style proof visual, trust boundaries, and safe `/create-menu` fallback CTA.
- Registered `/whatsapp` in `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt`.
- Created `menulist-marketing-distribution_whatsapp-intake-playbook.md` for owner-facing message states, consent boundaries, and two-surface activation handoff.
- Corrected the WhatsApp-first hype strategy and action register to show messaging-onboarding PDF/file intake as implemented through the WhatsApp runtime.
- Kept click-to-WhatsApp CTA blocked until the founder confirms public phone/account, response ownership, hours, follow-up policy, and tracking decision.

### Boundaries

- No provider secret, webhook, Cloud Function, Firestore rule, Firebase deploy, Vercel deploy, or production build was changed.
- No real WhatsApp message, outreach, Product Hunt setup, ad, or external tracking configuration was created.
- No official WhatsApp/Meta partnership, automatic WhatsApp catalog sync, scraped-number outreach, or reply-command approval claim was added.

### Next Work

1. Founder confirms public WhatsApp onboarding number/account and response owner.
2. Switch `/whatsapp` CTA from `/create-menu` fallback to prefilled click-to-WhatsApp only after the destination/tracking decision is final.
3. Capture desktop/mobile proof screenshots or short videos from the new page and demo flow.
4. Prepare the "100 WhatsApp Lists in 100 Hours" ops plan.
5. Run a small permissioned pilot before paid click-to-WhatsApp tests.

### Verification

- Locale JSON parse passed for English and Hindi.
- English/Hindi `Website.WhatsAppOnboardingPage` key parity passed.
- `npm run verify:agent-readiness` passed.
- `npm run verify:website-resource-locales` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed.
- `git diff --check` passed.
- Local `/whatsapp` HTTP smoke returned 200 and expected title/H1/copy.
- Playwright desktop and mobile screenshots rendered the hero, CTA, and chat proof visual without blank state or obvious overlap.
- No deploy.

## June 22, 2026 - Website Readiness Cross-Check

### Context

Founder asked to cross-check and make the broad-SMB marketing/website changes ready.

### Decisions

- Treated browser-negotiated locale behavior as launch-critical because Chrome selected `en-GB` and exposed stale menu-only funnel copy.
- Kept the broad positioning: customer-facing SMBs with menus, service lists, catalogues, price lists, and public offer lists.
- Kept Product Hunt, paid traffic, and assisted setup blocked until upload -> preview -> claim/publish is E2E verified with a real owner session.

### Fixes Applied

- Synced stale `en-GB` homepage and create-menu acquisition copy to the current broad customer-link framing.
- Tightened homepage mobile hero spacing/actions and compacted the shared consent banner so the first-fold CTA stays visible.
- Broadened pricing proof copy from scattered menu files to scattered list files.

### Verification

- Passed all-locale JSON parse, English/Hindi Website key parity, `verify:website-resource-locales`, `verify:agent-readiness`, TypeScript, lint, `git diff --check`, route HTTP/text smoke, and Chrome DevTools mobile screenshot checks.
- Evidence is recorded in `__docs__/menulist-seo-launch/menulist-seo-launch_verification.md`.

### Remaining

- Authenticated upload -> preview -> claim/publish E2E.
- Non-code search/distribution setup: Search Console, Bing Webmaster Tools, IndexNow decision, directory submissions, external audits, and launch outreach.

## June 22, 2026 - Operating Folder Created

### Context

Founder asked to treat Codex as the MenuList marketing consultant and to maintain ongoing MenuList marketing/distribution docs inside `__docs__`.

The captured ChatGPT conversation covered 15 marketing/distribution points:

1. positioning
2. ICP
3. launch offer
4. website conversion
5. demo assets
6. video storytelling
7. Product Hunt
8. social content
9. direct outreach
10. partners/resellers
11. SEO/content
12. launch calendar
13. metrics
14. post-launch follow-up
15. paid marketing

### Decisions

- Created `__docs__/menulist-marketing-distribution/` as the active operating folder.
- Accepted ChatGPT's 15-point index as the working structure, but not as authority.
- Confirmed MenuList should be marketed as the official customer-facing source, not a QR menu utility or generic AI generator.
- Confirmed Product Hunt is a proof/feedback event, not the primary growth engine.
- Confirmed paid marketing starts only after upload, preview, approval, publish, and two-surface activation are measurable.
- Confirmed unconsented WhatsApp/SMS/call outreach is blocked by default.

### Research Used

- Product Hunt launch and preparation docs.
- Google Search Central SEO and AI-search guidance.
- DataReportal Digital 2026 India.
- Meta India WhatsApp business behavior reporting.
- WhatsApp Business Terms and Messaging Policy.
- Gmail sender guidelines.
- FTC CAN-SPAM guide.
- TRAI 2025 UCC amendments.
- Digital Personal Data Protection Act, 2023.
- Google Ads video creative guidance.
- LinkedIn B2B marketing plan guidance.

### Files Created

- `README.md`
- `menulist-marketing-distribution_source-review.md`
- `menulist-marketing-distribution_research.md`
- `menulist-marketing-distribution_strategy.md`
- `menulist-marketing-distribution_execution-plan.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`

### Founder Inputs Needed

| Input | Why |
| --- | --- |
| Broad SMB category stance | Resolved June 22, 2026: target broad customer-facing SMBs with current menus/service lists, not one isolated market |
| Demo data approach | Determines screenshot/video safety |
| Founder video preference | Determines launch video style |
| Outreach sender identity | Needed before email/partner outreach |
| Assisted setup budget ceiling | Controls acquisition subsidy |

### Verification

- Docs-only pass.
- No runtime changes.
- No Firebase changes.
- No deploy.

### Next Recommended Session

Create the multi-category demo universe and asset brief.

---

## June 22, 2026 - First Code Pass: Create-Menu Funnel Copy

### Context

Founder asked to do the code changes that can be done before finalizing the first marketing proof system.

### Decisions

- Kept the homepage structure unchanged because the current hero CTA already pointed to `/create-menu`; this CTA wording was later superseded by the broad-SMB conversion copy pass.
- Reframed `/create-menu` as the path to create the official customer link from the current menu source.
- Reframed embedded public `Powered by MenuList` CTA copy away from generic `Create your own menu in minutes`.
- Kept upload, extraction, claim, publish, auth, and payment runtime out of scope.

### Files Updated

- `src/app/(website)/create-menu/page.tsx`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`
- `public/llms.txt`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_seo-aeo.md`
- `__docs__/main-website/main-website_seo-aeo-marketing-brief.md`
- `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_action-register.md`
- `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_execution-plan.md`
- `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_source-review.md`

### Remaining

- Verify upload -> preview -> claim path before any Product Hunt launch or paid traffic.
- Create category-specific proof before writing outreach and demo scripts.

### Verification

- Locale JSON parse passed for `en-US` and `hi-IN`.
- Stale runtime/docs copy scan passed for the replaced generic create-menu wording.
- `git diff --check` passed.
- `npm run verify:website-resource-locales` passed.
- `npm run verify:agent-readiness` passed.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed.

---

## June 22, 2026 - Broad SMB Conversion Copy Pass

### Context

Founder clarified that MenuList should not target one single market and should cater to list-driven SMBs such as restaurants, cafes, salons, spas, package businesses, and local services. A follow-up codebase audit found that the homepage headline and LLM context were already broad, but first-touch CTAs and `/create-menu` intake copy still leaned food-menu-only.

### Decisions

- Changed primary public website CTAs that represent the main acquisition funnel to `Create customer link`.
- Broadened `/create-menu` metadata and English/Hindi visible copy to cover menu, price-list, catalogue, and service-list sources.
- Kept menu-specific feature/resource pages allowed to use menu language where the page is explicitly about menus.
- Kept upload, extraction, claim, publish, auth, pricing, Firebase, Cloud Functions, and deployment out of scope.

### Files Updated

- `src/app/(website)/create-menu/page.tsx`
- `src/components/website/legal/PrivacyPolicyPage.tsx`
- `src/components/website/legal/TermsOfServicePage.tsx`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`
- `public/llms.txt`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_seo-aeo.md`
- `__docs__/main-website/main-website_seo-aeo-marketing-brief.md`
- `__docs__/changelog.md`
- `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_action-register.md`

### Remaining

- Verify upload -> preview -> claim path before Product Hunt, paid traffic, or assisted-setup outreach.
- Build the multi-category demo universe brief before adding new industry/service-list pages.

### Verification

- Locale JSON parse passed for `en-US` and `hi-IN`.
- Stale broad-SMB conversion scan passed with only historical/allowed references left.
- `git diff --check` passed.
- `npm run verify:website-resource-locales` passed.
- `npm run verify:agent-readiness` passed after aligning the website title verifier with the current broad title constant.
- `npx tsc --noEmit --incremental false --pretty false` passed.
- `npm run lint` passed.

---

## June 22, 2026 - Broad SMB Category Decision

### Context

Founder clarified that MenuList should not target one single market. The product should cater to as many relevant SMBs as possible, starting with obvious categories where a digital menu, service list, package list, price list, or rate card matters.

### Decision

- MenuList's launch market is broad customer-facing SMBs with current lists customers need to see.
- Restaurants, cafes, salons, and spas are all first-class proof categories.
- The first proof system should also leave room for bakeries, caterers, barbers, studios, clinics, repair shops, local services, retail counters, and multi-location SMBs.
- The market is cluttered, so MenuList should not sound like another QR menu tool, restaurant website builder, generic digital menu maker, social page, or local-agency setup offer.

### Positioning Update

The shared proof line is:

> Current list -> official customer link -> two customer surfaces.

Category examples can change, but the promise stays the same.

### Files Updated

- `README.md`
- `menulist-marketing-distribution_strategy.md`
- `menulist-marketing-distribution_execution-plan.md`
- `menulist-marketing-distribution_research.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_source-review.md`

### Next Recommended Session

Create `MLD-A001`: the multi-category demo universe brief.

---

## June 22, 2026 - Multi-Category Demo Universe Brief Created

### Context

Founder asked Codex to proceed with the next code-side/launch-prep step after broad-SMB SEO readiness: create or prepare the multi-category demo/proof universe before adding salon, spa, service-list, or local-service SEO pages.

### Decisions

- Created the canonical demo universe brief as `menulist-marketing-distribution_demo-universe.md`.
- Set fictional demo businesses as the default until real customers give permission.
- Required `Sample business. Demo data only.` labeling where an asset could be mistaken for a real customer case.
- Defined six core demos: Local Table Cafe, Glow & Blade Studio, Spark Auto Detailing, PawKind Grooming, Lens & Vows Studio, and BloomBox Florals.
- Defined four expanded demos: FlexPoint Studio, CleanFold Laundry, SkillBridge Coaching, and Urban Glow Group.
- Moved MLD-A001 and MLD-R006 to done.

### Boundaries

- No public website route, SEO page, customer menu runtime, owner dashboard runtime, Firebase rule, Cloud Function, pricing, billing, build, or deployment change was made.
- The brief is ready for asset production, but screenshots, videos, Product Hunt gallery files, and new service-list SEO pages are not created yet.

### Next Work

1. Create fictional source lists for the six core demos.
2. Build a screenshot capture plan against safe MenuList routes/states.
3. Draft Product Hunt gallery copy and short video scripts from the demo universe.
4. Add salon/spa or service-list SEO pages only after proof assets exist.

### Verification

- `git diff --check` passed after the documentation update.

---

## June 22, 2026 - Demo Source Lists and Capture Plan Added

### Context

After MLD-A001 was created, the next practical blocker was raw demo material. Without source lists and a capture plan, Product Hunt assets, videos, screenshots, and service-list SEO pages would still depend on chat memory or ad hoc invented examples.

### Decisions

- Created `menulist-marketing-distribution_demo-source-lists.md` with fictional source material for all six core demos.
- Created `menulist-marketing-distribution_screenshot-capture-plan.md` with capture surfaces, viewports, redaction rules, file naming, and approval gates.
- Kept runtime demo tenant creation out of scope because there is no existing safe MenuList demo-seed pattern for this broad proof universe.
- Moved MLD-A009 and MLD-A010 to done.

### Boundaries

- No Firestore writes, Storage uploads, seed scripts, website routes, public assets, Product Hunt files, production builds, deployments, or external setup were run.
- The source lists are fictional and must stay labeled as demo/sample data where public assets could be mistaken for customer proof.

### Next Work

1. Draft Product Hunt gallery copy and short video scripts from these demos.
2. Decide whether to create routed demo tenants for real product screenshots.
3. Capture public product proof only after demo states are safe and approved.
4. Add service-list SEO pages only after proof assets exist.

### Verification

- `git diff --check` passed after the docs update.

---

## June 22, 2026 - Product Hunt Asset Copy and Video Scripts Drafted

### Context

With the demo universe, source lists, and screenshot capture plan in place, the next unblocked launch-prep work was to turn that material into Product Hunt gallery copy and video scripts without creating public files or scheduling launch.

### Decisions

- Created `menulist-marketing-distribution_product-hunt-asset-pack.md`.
- Created `menulist-marketing-distribution_launch-video-scripts.md`.
- Moved MLD-A002, MLD-A003, MLD-A004, and MLD-A011 to done as draft-copy/script artifacts.
- Kept Product Hunt launch draft, gallery image production, video recording, and scheduling out of scope.

### Boundaries

- No Product Hunt page was created or scheduled.
- No image/video files were generated.
- No public website assets were moved into `public/`.
- No runtime, build, deploy, Firebase, billing, Search Console, or external setup work was done.

### Next Work

1. Founder decision: create routed demo tenants or use static source/mock visuals for first asset production.
2. Produce actual gallery images and optional video.
3. Build launch-day response plan and post-launch follow-up board.
4. Add service-list SEO pages only after proof assets exist.

### Verification

- `git diff --check` passed after the docs update.

---

## June 22, 2026 - Create-Menu Pipeline Code Contract Verified

### Context

The launch funnel depends on upload -> preview -> claim/publish working before traffic or Product Hunt attention is sent into `/create-menu`.

### Checks Run

```bash
npm run verify:menu-extraction-pipeline
npm run verify:menu-extraction-pipeline:dry-run
git diff --check
```

### Results

- `npm run verify:menu-extraction-pipeline` passed 27/27 checks.
- `npm run verify:menu-extraction-pipeline:dry-run` passed 48/48 checks.
- `git diff --check` passed.

### Decision

MLD-F003 is complete as a code-contract verification. The remaining real smoke test is MLD-F007: run a safe demo upload -> preview -> claim -> publish path with approved demo data and Firebase/runtime access.

### Boundaries

- No real upload was submitted.
- No Firestore writes, Storage writes, Cloud Functions, Firebase deploy, production build, Vercel deploy, Product Hunt setup, or Search Console setup was run.

---

## June 22, 2026 - Activation Tracking and Follow-Up Plan Added

### Context

After the create-menu pipeline code contract passed, the remaining launch funnel gap was not another page. It was the owner/customer-surface activation definition and follow-up states needed after a public link exists.

### Decisions

- Created `menulist-marketing-distribution_activation-follow-up.md`.
- Defined activation as published MenuList customer link plus two customer surfaces active within seven days.
- Documented valid customer surfaces, funnel states, tracking sheet columns, and follow-up templates.
- Moved MLD-F004, MLD-F005, and MLD-A008 to done as docs-first planning artifacts.

### Boundaries

- No analytics instrumentation, CRM, email automation, WhatsApp automation, Firestore writes, external setup, deploy, or follow-up sending was done.
- Runtime tracking remains deferred until the manual workflow is proven.

### Verification

- `git diff --check` passed after the docs update.

---

## June 22, 2026 - Launch Support Pack Completed

### Context

After the demo universe, Product Hunt copy, launch video scripts, and activation plan were drafted, the remaining docs-first launch gaps were founder content, partner positioning, manual outreach, launch-day routing, launch-week sequencing, and a follow-up board.

The user also confirmed MenuList should stay broad across relevant SMB categories, not one market only, while recognizing that digital menus and adjacent SMB tools are already crowded.

### Decisions

- Created `menulist-marketing-distribution_market-clutter-scan.md` to document comparison sets and keep public copy out of generic QR/menu/site/booking language.
- Created `menulist-marketing-distribution_founder-post-pack.md` for founder-led broad-SMB, Product Hunt, partner, and pilot posts.
- Created `menulist-marketing-distribution_partner-brief.md` for setup partner conversations.
- Created `menulist-marketing-distribution_outreach-scripts.md` for manual, consent-aware owner and partner outreach.
- Created `menulist-marketing-distribution_launch-day-response-plan.md` for Product Hunt/public launch routing and reply boundaries.
- Created `menulist-marketing-distribution_launch-week-content-calendar.md` for a practical launch-week sequence.
- Created `menulist-marketing-distribution_post-launch-follow-up-board.md` for manual post-launch lead and activation tracking.
- Moved MLD-A005, MLD-A006, MLD-A007, MLD-R005, MLD-L003, MLD-L004, and MLD-L005 to done as docs-first artifacts.

### Boundaries

- No outreach was sent.
- No Product Hunt draft was created.
- No post was scheduled.
- No CRM, analytics instrumentation, email automation, WhatsApp automation, Firestore writes, external setup, production build, Vercel deploy, or Search Console setup was done.
- Actual screenshots, final gallery images, final video files, routed demo tenants, and public service-list SEO pages remain blocked until proof assets exist.

### Verification

- `git diff --check` passed after the launch-support docs update.
- Claim-boundary scan only found negative guardrail wording such as "do not claim", "does not replace", and "no guarantee" statements.

---

## June 24, 2026 - AI Startup Growth Playbook Fit Review

### Context

The founder shared a synthesized review comparing MenuList to fast-growing AI products and solo-founder distribution workflows. The review was evaluated through the MenuList marketing/distribution doctrine and SignalDesk's private internal boundary.

### Decisions

- Adopt the activation-proof loop, not generic viral launch tactics.
- Use the MenuList equivalent of first-use magic: current menu/source -> preview -> owner approval -> official customer link -> two customer surfaces -> proof asset.
- Keep the north star as two-surface activation within seven days.
- Record the recommended first pod hypothesis as Bengaluru, Indiranagar + Koramangala, cafes/dessert shops/QSR/cloud-kitchen-facing storefronts, founder email/manual export first.
- Treat Activation Concierge as MenuList-side product work, with SignalDesk only routing and observing outcomes.
- Keep cold WhatsApp, cold Meta DMs, Reddit/X auto-replies, LinkedIn automation, provider send, paid campaign automation, and auto-publish rejected until explicit policy gates change.

### Files Updated

- `../menulist-signaldesk/menulist-signaldesk_growth-playbook-review-2026-06-24.md`
- `menulist-marketing-distribution_strategy.md`
- `menulist-marketing-distribution_action-register.md`
- `../menulist-signaldesk/menulist-signaldesk_action-register.md`
- `../menulist-signaldesk/menulist-signaldesk_feature-map.md`
- `../menulist-signaldesk/menulist-signaldesk_validation.md`

### Boundaries

- No outreach was sent.
- No runtime feature was added.
- No public SignalDesk page, public MenuList route, provider send, paid campaign, auto-publish, Firebase deploy, production build, or Vercel deploy was run.

---

## June 25, 2026 - QR WhatsApp Experiments Boundary

### Context

The founder shared an end-to-end QR-to-WhatsApp A/B testing blueprint covering physical exposure, scans, landing pages, WhatsApp click-to-chat, consent, conversation outcomes, dashboards, and experiment decisions.

### Decisions

- Accept the strategic model, but keep it out of ordinary Assets/Menu Kit QR output.
- Create `qr-whatsapp-experiments` as a separate MenuList feature boundary with docs, mobile review, Firebase cost posture, and a disabled runtime flag.
- Prefer tracked landing page -> WhatsApp for measurable campaigns.
- Keep direct QR-to-WhatsApp available only as a lower-measurement mode.
- Choose campaign winners from qualified WhatsApp starts, consent, leads, bookings, orders, redemptions, or revenue signals, not raw scan count alone.
- Keep normal MenuList menu/service/catalog QR scans direct to the live page with no interstitial.
- Require aggregate-first storage and explicit consent handling before runtime implementation.

### Files Updated

- `../qr-whatsapp-experiments/`
- `../../src/config/features.ts`
- `../print-assets/README.md`
- `../print-assets/print-assets_spec.md`
- `../print-assets/print-assets_firebase.md`
- `../print-assets/print-assets_marketing.md`
- `../print-assets/print-assets_helpdoc.md`
- `menulist-marketing-distribution_action-register.md`
- `README.md`

### Boundaries

- No WhatsApp provider send was added.
- No scan ledger, click ledger, webhook, public token route, Firestore rule/index, Storage path, Cloud Function, API route, production build, Vercel deploy, or Firebase deploy was added.
- This remains docs-ready until security, privacy, public route, and data model work are implemented behind `ENABLE_QR_WHATSAPP_EXPERIMENTS`.

---

## June 25, 2026 - Branded QR Action Templates Alignment

### Context

The founder shared branded QR examples and an external analysis arguing that the larger opportunity is turning physical QR touchpoints into branded, measurable customer-action surfaces rather than making prettier QR codes.

### Decisions

- Accept the core direction as a MenuList Assets doctrine: branded physical action points, not generic QR generation.
- Keep the production-safe default as a standard QR with strong contrast, four-module quiet zone, visible short link/destination cue, and brand/CTA/frame around the QR.
- Treat distorted, heavily recolored, logo-overlaid, or artistic QR patterns as rejected until scan-regression coverage exists across devices and printed materials.
- Keep standard action templates inside Assets/Printable Asset Templates and Menu Kit.
- Keep measured WhatsApp outcomes inside QR WhatsApp Experiments.
- Do not add a new runtime feature flag because this is a cross-feature alignment layer over existing `ENABLE_PRINTABLE_ASSET_TEMPLATES`, `ENABLE_MENU_KIT`, and future `ENABLE_QR_WHATSAPP_EXPERIMENTS`.

### Files Updated

- `../branded-qr-action-templates/`
- `../printable-asset-templates/README.md`
- `../printable-asset-templates/printable-asset-templates_spec.md`
- `../printable-asset-templates/printable-asset-templates_marketing.md`
- `../printable-asset-templates/printable-asset-templates_firebase.md`
- `../print-assets/README.md`
- `../print-assets/print-assets_spec.md`
- `../print-assets/print-assets_marketing.md`
- `../print-assets/print-assets_website.md`
- `../print-assets/print-assets_helpdoc.md`
- `../print-assets/print-assets_firebase.md`
- `../menu-kit/README.md`
- `../qr-whatsapp-experiments/`
- `menulist-marketing-distribution_action-register.md`
- `README.md`

### Boundaries

- No QR art generator was added.
- No scan ledger, click ledger, public route, Firestore rule/index, Storage path, Cloud Function, API route, production build, Vercel deploy, or Firebase deploy was added.
- Public claims remain proof-gated. Do not publish scan-lift or sales-lift claims without measured MenuList data.

---

## July 7, 2026 - Launch Video System Expanded

### Context

The founder shared a full MenuList launch-video strategy built around one approved menu/service list, one trusted customer link, and public surfaces staying aligned. The plan was checked against current MenuList marketing doctrine, the existing marketing/distribution docs, and the live `menulist.online` homepage, How It Works, AI Menu Manager, Official Business Page, and Multi-location positioning.

### Decisions

- Accepted the video angle: one approved customer link for menus, services, and business details.
- Rejected QR-menu-only framing and generic AI restaurant software framing.
- Expanded `menulist-marketing-distribution_launch-video-scripts.md` from a small script pack into a full video system covering the hero launch film, 30-second launch cut, 2-3 minute demo, feature videos, reels, paid cutdowns, campaign timing, visual direction, CTA language, and production gates.
- Kept AI Menu Manager video copy centered on message in, card prepared, owner approval, and receipt after supported work.
- Kept external-platform wording bounded: MenuList can provide the owner-approved link for places such as WhatsApp, Instagram, Google profile, QR, packaging, and print, but it must not claim automatic external-platform posting or sync.

### Files Updated

- `menulist-marketing-distribution_launch-video-scripts.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`
- `README.md`
- `../marketing/README.md`

### Boundaries

- No video files were created.
- No website code, locale copy, public route, runtime feature, Firebase target, production build, Vercel deploy, paid campaign, analytics instrumentation, or external upload was changed.
- Final production remains blocked on routed demo screenshots or approved mockups, founder voiceover/talking-head decision, final claim-boundary review, and campaign upload destinations.

### Verification

- Live site checked on July 7, 2026 for homepage, AI Menu Manager, Official Business Page, How It Works, and Multi-location claim fit.
- `git diff --check` passed.
- Targeted prohibited-claim scan found no unsafe positive claims in the launch video system doc.

---

## July 7, 2026 - Dedicated Video Folder Created

### Context

The founder asked for a dedicated folder under `__docs__/videos/` with each mentioned video type split into its own doc because all of this belongs to MenuList launch, marketing, distribution, and pre-production planning.

### Decisions

- Created `__docs__/videos/` as the canonical video-planning home.
- Split the prior launch-video system into type-wise docs:
  - launch / hero video;
  - product demo video;
  - feature videos;
  - short-form reels and shorts;
  - paid ad cutdowns;
  - campaign calendar;
  - production plan.
- Kept the existing `menulist-marketing-distribution_launch-video-scripts.md` file as a compatibility pointer only.
- Updated marketing and marketing-distribution indexes so future work lands in `__docs__/videos/`.

### Files Updated

- `../videos/README.md`
- `../videos/videos_launch-hero-video.md`
- `../videos/videos_product-demo-video.md`
- `../videos/videos_feature-videos.md`
- `../videos/videos_short-form-reels.md`
- `../videos/videos_paid-ad-cutdowns.md`
- `../videos/videos_campaign-calendar.md`
- `../videos/videos_production-plan.md`
- `menulist-marketing-distribution_launch-video-scripts.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`
- `README.md`
- `../marketing/README.md`

### Boundaries

- No video files were created.
- No public website copy, locale files, routes, runtime code, Firebase target, production build, Vercel deploy, paid campaign, or external upload was changed.
- Production still needs routed screenshots or approved mockups, founder voiceover/talking-head decision, final claim review, and campaign upload destinations.

---

## July 7, 2026 - 12-Video Production Handoff Blueprint

### Context

The founder provided a production-handoff prompt asking for a complete, design-team-ready document for 12 MenuList launch and product marketing videos. The required scope included executive summary, brand and messaging rules, visual language, production assumptions, exact A-P sections for every video, frame plans, voiceover, on-screen text, UI requirements, motion and sound direction, versioning, thumbnails, launch sequencing, review checklist, deliverables, and editor notes.

### Decisions

- Created `../videos/videos_launch-product-marketing-production-blueprint.md` as the master design-team handoff.
- Covered all 12 required videos:
  - 75-sec Product Launch / Hero Film;
  - 2-3 min Product Demo Walkthrough;
  - 30-sec Launch Announcement Cut;
  - Old PDF Problem Reel;
  - QR Stale Page Reel;
  - Photo/PDF to Customer Link Reel;
  - Owner Approval / Review Before Publishing Reel;
  - One Link Everywhere Reel;
  - AI Menu Manager Reel;
  - Official Business Page Reel;
  - Multi-location Reel;
  - Founder / Brand POV Video.
- Kept the strategy centered on public-business truth infrastructure and one approved customer link.
- Preserved strict claim boundaries against QR-only positioning, generic AI hype, fake metrics, fake customer proof, ranking/growth claims, and automatic external-platform update claims.

### Files Updated

- `../videos/videos_launch-product-marketing-production-blueprint.md`
- `../videos/README.md`
- `menulist-marketing-distribution_launch-video-scripts.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`

### Boundaries

- No video files were created.
- No public website copy, locale files, runtime code, routes, Firebase targets, production build, Vercel deploy, paid campaign, or external upload was changed.
- The document is ready for production planning; visual production remains blocked on actual routed screenshots or approved mockups, founder footage decisions, and final asset review.

---

## July 7, 2026 - Individual Video Handoff Files Added

### Context

The founder asked whether the full production blueprint had been added to each individual type-wise file. The master blueprint already contained the full A-P sections, but the folder still needed standalone files for each of the 12 required video types.

### Decisions

- Added one standalone production handoff file per required video type under `__docs__/videos/`.
- Each standalone file includes shared positioning, claim boundaries, and the full A-P production structure for that video.
- Updated `../videos/README.md` with an individual 12-video handoff table.

### Files Added

- `../videos/videos_01-product-launch-hero-film.md`
- `../videos/videos_02-product-demo-walkthrough.md`
- `../videos/videos_03-launch-announcement-cut.md`
- `../videos/videos_04-old-pdf-problem-reel.md`
- `../videos/videos_05-qr-stale-page-reel.md`
- `../videos/videos_06-photo-pdf-to-customer-link-reel.md`
- `../videos/videos_07-owner-approval-review-before-publishing-reel.md`
- `../videos/videos_08-one-link-everywhere-reel.md`
- `../videos/videos_09-ai-menu-manager-reel.md`
- `../videos/videos_10-official-business-page-reel.md`
- `../videos/videos_11-multi-location-reel.md`
- `../videos/videos_12-founder-brand-pov-video.md`

### Boundaries

- No video files were created.
- No runtime code, public website copy, locale files, routes, deploys, paid campaigns, or external uploads were changed.

---

## July 7, 2026 - HyperFrames Founder POV Draft Rendered

### Context

The founder asked Codex to continue without waiting for more permission and act from the MenuList founder point of view. Because no founder footage was available yet, the next practical asset was a faceless Founder / Brand POV draft using the approved MenuList video doctrine, founder-style narration, and product-flow motion scenes.

### Decisions

- Created a dedicated HyperFrames project for the Founder / Brand POV video.
- Kept the video centered on owner pain, scattered public information, one approved customer link, review before publishing, controlled updates, and AI-era readiness without ranking or automation promises.
- Used generated local review narration only as a placeholder for production review.
- Rendered a 75-second 16:9 MP4 and extracted review frames for manual visual inspection.

### Files Added Or Updated

- `../videos/hyperframes/menulist-founder-brand-pov/`
- `../videos/videos_hyperframes-production.md`
- `../videos/README.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`

### Verification

- `cd __docs__/videos/hyperframes/menulist-founder-brand-pov && npm run check` passed with 0 lint warnings, no console errors, 57 WCAG-passing text elements, and 0 layout issues.
- Rendered MP4 passed metadata check: H.264, 1920 x 1080, 30fps, 2,250 frames, 75.03 seconds.
- Review frames were extracted and visually checked at 2s, 12s, 24s, 36s, 48s, 60s, and 70s.

### Boundaries

- This is still a draft, not a final public launch asset.
- Founder audio or founder talking-head footage should replace the local generated review narration before public use.
- Product screens remain CSS-built mockups until approved demo screenshots or final UI captures are available.
- No public website copy, locale files, runtime code, Firebase target, production build, Vercel deploy, paid campaign, or external upload was changed.

---

## July 10, 2026 - Growth Learning System Wired

### Decisions

- Measured the `Powered by MenuList` loop with fixed non-tenant attribution through create-menu draft, claim, and Founder Monitor counters.
- Replaced cancellation display strings and the mobile catch-all reason with stable cross-surface reason codes; aggregate founder views never receive free text.
- Expanded owner-confirmed discovery placement to Apple Business Connect and Bing Places without external sync or verification claims.
- Created a physical partner pilot for printers, photographers, hospitality consultants, and QR/signage suppliers.
- Created the first ten-business Bengaluru learning board without scraping or inventing business data.
- Kept extraction as intake; the market position remains owner-approved official source alignment.

### Owner-Controlled Next Action

The founder supplies the first permissioned businesses or approved partner introductions and the sender identity. Codex can then operate the maintained cohort board and review real activation, payment, churn, and proof-permission evidence.

---

## July 10, 2026 - Current Market Growth Systems Gap Audit

### Context

The founder requested deep internet research into growth systems used by other restaurant, SMB, local-discovery, partner, review, and AI-distribution platforms that MenuList might be ignoring.

### Decisions

- Corrected the initial market hypothesis against repo truth: MenuList already has public free tools, machine-readable business truth, owner referral, a role-gated reseller dashboard, physical partner pilot, SignalDesk partner/revenue rails, activation tracking, and public-loop growth intelligence.
- Identified the primary operating gap as real permissioned proof, paid/day-30 evidence, and independent reviews rather than another frontend feature or acquisition channel.
- Added a separate proof-and-retention review to the Bengaluru ten-business board so acquisition source can be reviewed against activation, first payment, day-30 state, interviews, approved proof, and neutral review requests.
- Recommended a small invitation-only founder owner clinic after three activated businesses; rejected building a community product.
- Kept Google/Apple/API and direct AI-provider work behind an explicit eligibility, delegation, consent, revocation, reporting, and data-authority dossier after cohort proof.
- Rejected POS/order/loyalty/guest-CRM expansion, UCP commerce, broad listings syndication, another partner portal, generic free tools, and tiny-sample benchmark claims.

### Files Added Or Updated

- `menulist-marketing-distribution_market-growth-gap-audit-2026-07-10.md`
- `menulist-marketing-distribution_bengaluru-ten-business-pilot.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`
- `README.md`

### Boundaries

- No product runtime, website route, public copy, locale, Firebase target, provider account, outreach, review request, paid campaign, build, or deploy was changed.
- Real businesses, sender identity, proof permission, and external account decisions remain founder-controlled.
- Runtime source-to-day-30 work remains gated until the manual cohort demonstrates a repeated founder decision need.

---

## July 10, 2026 - Growth Gap Operating Packs Completed

### Context

The founder instructed Codex to do the necessary follow-through after the current market growth systems gap audit.

### Decisions

- Reused SignalDesk Evidence Packets for pre-outreach source facts and kept post-activation customer proof in a separate marketing operating pack.
- Created a complete proof contract covering eligibility, states, packet worksheet, item-level permission, activation/day-30 interviews, claim classes, neutral independent-review requests, first owner clinic, AssetOS/SignalDesk handoff, revocation, and takedown.
- Prepared the Google/Apple/Bing/read-only AI distribution dossier now without waiting for provider integration authorization.
- Kept actual provider applications behind five permissioned activations, three day-30 active businesses, repeated owner demand, and founder/legal/security/cost ownership.
- Preserved the existing reseller, partner, SignalDesk, Activation Concierge, and ten-business board boundaries; no duplicate lead, CRM, partner, or evidence runtime was added.
- Completed the first daily cap of five public evidence-only Bengaluru candidate reviews in the SignalDesk trial board: three Pass, one Unsure, and one Fail. No contact fields, outreach permission, or inferred consent were recorded.

### Files Added Or Updated

- `menulist-marketing-distribution_pilot-proof-and-owner-learning-pack.md`
- `menulist-marketing-distribution_publisher-ai-distribution-readiness.md`
- `menulist-marketing-distribution_market-growth-gap-audit-2026-07-10.md`
- `menulist-marketing-distribution_bengaluru-ten-business-pilot.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`
- `README.md`
- `../menulist-signaldesk/menulist-signaldesk_bengaluru-activation-trial-operating-pack-2026-07-10.md`
- `../menulist-signaldesk/menulist-signaldesk_action-register.md`

### Boundaries

- No real business was added, contacted, interviewed, or used as proof.
- No review profile, provider account, API request, OAuth client, external send, public asset, runtime code, Firebase target, build, or deploy was created.
- The immediate external blocker remains a permissioned owner introduction and sender identity.

---

## July 11, 2026 - Cross-Platform Distribution Workflow Research

### Context

The founder asked for deep internet research into the workflow people actually follow for distribution, after the earlier X, Reddit, Instagram, YouTube, Google, competitor, and Bengaluru channel research.

### Decisions

- Separated channel choice from operating workflow: the repeated market sequence is narrow audience -> canonical proof -> channel-native derivative -> trusted distribution -> one measurable next action -> activation -> learning -> proof/referral/review reuse.
- Confirmed that founder-led first-customer work remains manual, researched, value-first, and outcome-led before purchased lists or broad automation.
- Confirmed that content operators create one pillar asset, plan derivatives, publish natively, engage in replies, and connect performance to downstream business outcomes rather than copying one post everywhere.
- Confirmed that X and Reddit work as conversation/listening systems first; Reddit explicitly favors listening, useful comments, community-rule fit, and organic proof before paid amplification.
- Confirmed that creator workflows require audience fit, portfolio review, a clear brief, terms/rights/disclosure, native publishing, result review, and permission before paid amplification.
- Confirmed that YouTube requires audience-led repeatable formats and supported link routes; Shorts description/comment URLs are not clickable.
- Confirmed that Google/Profile is an activation and current-truth surface with measurable menu, website, call, direction, booking, and other eligible interactions, not merely a content feed.
- Kept Product Hunt as a later proof/feedback event and paid media behind proven organic proof, measurable activation, approved budget, and stop rules.
- Cross-checked current SignalDesk runtime: the Content Distribution Rail and Trust Partner Rail already cover the required internal primitives, so no new runtime module or collection is justified before a real distribution run.

### Files Added Or Updated

- `menulist-marketing-distribution_distribution-workflow-research-2026-07-11.md`
- `menulist-marketing-distribution_distribution-workflow-brief-2026-07-11.html`
- `menulist-marketing-distribution_execution-plan.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`
- `README.md`

### Current Next Action

1. Founder supplies one real permissioned business or approved partner introduction.
2. Founder confirms the exact sender/manual identity for that contact path.
3. Complete one private preview and one two-surface activation.
4. Obtain item-level owner permission for the first proof packet.
5. Use the existing SignalDesk content and trust-partner rails to prepare one approval-gated derivative set and measured distribution run.

### Boundaries

- No business was contacted, no external account was created, no content was published, and no provider or media spend was enabled.
- No runtime code, collection, API, feature flag, public website route, Firebase target, build, or deploy was changed.
- Public sources remain research inputs rather than MenuList proof or outreach authority.

---

## July 11, 2026 - Distribution Research Converted Into First-Run Operations

### Context

The founder instructed Codex to do the necessary follow-through after the cross-platform distribution workflow research.

### Decisions

- Mapped the first customer-proof distribution run to the exact existing SignalDesk content source, canonical asset, CTA, channel draft, approval, calendar, performance, audit, and kill-switch contracts.
- Limited the first derivative set to founder LinkedIn, founder X, short-video, full-case, and trust-partner brief jobs; Reddit remains listening-only and email/newsletter/blog/paid drafts remain excluded.
- Kept the canonical content asset on `hold` until a permissioned activation, two-surface outcome, item-level proof permission, claim review, CTA readiness, and revocation owner all pass.
- Defined manual publication ledger, compact performance interpretation, continue/narrow/hold/stop rules, and proof revocation propagation without adding runtime fields or collections.
- Prepared a weekly read-only distribution watch for Monday 9:00 AM Asia/Kolkata with official-source priority, materiality gates, adopt/delay/reject output, and explicit external-mutation blocks.
- Activated the supported Codex recurring automation as `menulist-distribution-watch`. No raw cron, launchd, GitHub Actions, or hand-written automation file was created as a workaround.

### Files Added Or Updated

- `menulist-marketing-distribution_first-proof-distribution-run-operating-pack.md`
- `menulist-marketing-distribution_weekly-distribution-watch.md`
- `menulist-marketing-distribution_execution-plan.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`
- `README.md`
- `../menulist-signaldesk/menulist-signaldesk_action-register.md`
- `../menulist-signaldesk/signaldesk-content-distribution-rail/README.md`

### Verification

- `npm run docs:check-links -- --root __docs__/menulist-marketing-distribution` passed with 0 broken links and 0 naming violations.
- Scoped `git diff --check` passed for the MenuList marketing distribution docs and the touched SignalDesk distribution references.
- Targeted claim-boundary scan across the first-proof run pack, weekly watch spec, workflow research, and HTML brief found only negative guardrail wording.
- Scoped diff review confirmed this remains docs-only distribution planning with no runtime, Firebase, public-route, send, publish, or provider changes.
- Checked for an existing local Codex automation directory before activation; none existed, so no duplicate watch was created.
- Viewed the saved Codex automation card for `menulist-distribution-watch` after activation.

### Boundaries

- No business was contacted and no proof was created from a real business.
- No external content was published, partner was approached, account was modified, or spend was enabled.
- No application runtime, Firestore collection, API, feature flag, Firebase target, build, or deploy was changed.
- Live execution still requires one permissioned owner/partner path, sender/manual identity, two-surface activation, item-level proof permission, and founder publication approval.

---

## July 11, 2026 - Current AI Revenue Workflow Deep Research

### Context

The founder requested a renewed deep internet review of how teams currently use AI to drive sales, marketing, and distribution, followed by the necessary repo-side cross-check and operating plan.

### Research Coverage

- account and meeting research;
- first-party and third-party signal orchestration;
- enrichment, fit, intent, and prioritization;
- evidence-grounded outbound preparation;
- inbound qualification and routing;
- meeting notes, conversation intelligence, and proposed CRM updates;
- standard proposals, quotes, and commercial rules;
- content supply chains, creative derivatives, and localization;
- creator/partner matching and amplification;
- paid-media optimization;
- Google and AI-search discovery readiness;
- activation, lifecycle, retention, expansion, and referral;
- AI contribution attribution, evaluation, governance, and safe pause;
- current practitioner uses and failure reports from seller and marketer discussions.

### Decisions

- Confirmed the market is moving from isolated AI writing tools toward shared-context, closed-loop revenue workflows.
- Confirmed the strongest current uses are research, preparation, classification, summarization, repurposing, follow-up drafting, recordkeeping, and outcome analysis.
- Confirmed autonomous signal-to-send outbound remains one of the highest-risk and least universally mature motions because AI scales weak ICP, timing, proof, source-rights, and sender-health mistakes.
- Confirmed creator platforms use AI primarily for fit recommendations, translation, derivative creation, delivery optimization, and paid amplification while human authenticity, rights, disclosure, and commercial judgment remain necessary.
- Confirmed Google continues to recommend ordinary helpful-content and technical SEO fundamentals for AI search features rather than special GEO tricks.
- Cross-checked SignalDesk runtime and docs: the system already has the required account, source, evidence, AI evaluation, policy, budget, approval, content, partner, opportunity, offer, activation, attribution, audit, and kill-switch foundations.
- Rejected a new generic AI agent, CRM, social publisher, campaign optimizer, or collection before real proof.
- Adopted shadow mode as the current trial posture: AI prepares; founder accepts, edits, rejects, or holds; no AI send occurs.
- Kept meeting/transcript, calendar, proposal, payment, creator scoring, lifecycle automation, paid optimization, and new AI-contribution summaries evidence-gated.
- Preserved the immediate external blocker: one permissioned owner or partner introduction plus exact sender/manual identity.

### Files Added Or Updated

- `../menulist-signaldesk/menulist-signaldesk_ai-sales-marketing-distribution-research-2026-07-11.md`
- `../menulist-signaldesk/menulist-signaldesk_ai-revenue-workflow-market-brief-2026-07-11.html`
- `../menulist-signaldesk/README.md`
- `../menulist-signaldesk/menulist-signaldesk_action-register.md`
- `menulist-marketing-distribution_execution-plan.md`
- `menulist-marketing-distribution_action-register.md`
- `menulist-marketing-distribution_consultant-log.md`
- `README.md`

### Current Next Action

1. Founder supplies one permissioned Bengaluru business or approved trust-partner introduction.
2. Founder confirms the sender/manual identity and response owner.
3. SignalDesk prepares the first AI account recommendation in shadow mode.
4. MenuList prepares a private preview and completes a two-surface activation.
5. Record AI acceptance, edits, rejected facts, founder attention, objections, cost, and outcome.
6. Add runtime only if repeated evidence shows an existing record or summary cannot represent the workflow.

### Verification

- `npm run verify:signaldesk` passed with 2,221 checks.
- SignalDesk and marketing-distribution documentation link checks both passed with 0 broken links and 0 naming violations.
- Scoped `git diff --check` passed across the two new artifacts and all updated SignalDesk/marketing operating docs.
- The HTML contract contains the required Overview, Competitors, Guidance, and Sources sections, 24 direct external sources, and responsive styling.
- Chrome desktop and small-screen renders were visually reviewed; responsive overflow hardening was added after the first small-screen capture, and the corrected render passed.
- Chrome print-to-PDF smoke produced an eight-page local review artifact; no PDF was added to the repo.
- The existing `menulist-distribution-watch` automation remains active and was not duplicated or widened in this pass.

### Boundaries

- No business was contacted and no customer data was used.
- No external content was published, account was changed, creator or partner was approached, or spend was enabled.
- No provider, CRM, calendar, proposal, payment, ad, or social platform was connected.
- No runtime code, API, collection, feature flag, Firebase target, build, or deploy was changed.
- Vendor and practitioner sources remain directional market evidence, not MenuList performance proof or outreach authority.

---

## August 13, 2026 - Gamma AI Discovery Review And External Insight Intake Hardening

### Context

The founder supplied a 23-point summary of a Gamma growth discussion and asked
for the valid codebase changes plus a durable system for future articles and AI
conversations.

### Decisions

- Reused the maintained MenuList external-insight ledger and portfolio
  distribution ledger instead of creating a competing notes folder.
- Preserved the supplied claims as source assertions because no original video,
  transcript, methodology, or evidence workbook was supplied.
- Adopted the real measurement gap: visible click/referrer analytics can miss
  AI-assisted discovery, so paid onboarding now asks one optional closed-list
  first-discovery question.
- Rejected free text and retained only a shared `method`, `channel`, and broad
  `category` vocabulary.
- Stored the answer on the existing tenant creation write for MenuList and
  Answerlattice. No extra collection, index, scheduler, provider call, analytics
  event, or Firestore operation was introduced.
- Kept the Answerlattice answer outside the provisioning fingerprint so a
  marketing field cannot change billing, recovery, ownership, or entitlement.
- Deferred every unsupported percentage, multiplier, indexing delay, citation
  lifetime, platform-source absolute, agent app, agent install, and autonomous
  signup idea to explicit evidence and product gates.
- Rejected agent-only persuasion, prompt injection, fake urgency, fabricated
  discounts, competitor manipulation, and autonomous billing, publishing, or
  business-truth authority.

### Durable Intake System

- MenuList-only sources route to `ML-MKT-EXT-NNN` entries.
- Cross-product sources route to `PP-DIST-EXT-NNN`, with compact product-local
  entries only when they change active work.
- Product-specific sources stay in that product's maintained docs.
- Every entry carries source limits, status, topics, use trigger, revalidation
  trigger, verdict, current decision, related truth, and outcome history.
- `npm run verify:marketing-external-insights` guards sequential IDs, required
  fields, routing documentation, and the shared signup attribution contract.

### Verification

- `npm run verify:marketing-external-insights` passed with 11 sequential
  MenuList entries and the shared discovery behavior test.
- Purchase-intent, MenuList onboarding authority/compensation, and Answerlattice
  onboarding provisioning contract tests passed.
- Exact TypeScript, full repo lint, focused changed-file lint, locale JSON,
  website resource locales, dependency freeze, docs links, and diff integrity
  passed. Docs reported 0 broken links and the same 62 existing video/HyperFrames
  naming warnings.
- The broad `verify-answerlattice-runtime-truth.js` source gate stops on its
  existing expectation for a checkout analytics label using `result.plan`; the
  checked-in `HEAD` form already uses `planId` for that setup-submit label. The
  mismatch predates this change and the focused provisioning gate passes.

### Boundaries

- No external content was published, account was changed, provider was
  connected, campaign was started, business was contacted, or spend was enabled.
- No AI app, MCP expansion, autonomous signup, comparison page, Reddit tactic,
  or reporting dashboard was added.
- Manual tenant-cohort review remains sufficient until real signup volume shows
  a repeated reporting need.

---

## August 13, 2026 - DistributionOS Internal System

### Context

The founder decided that repeated marketing and distribution articles should
use an internal operating system, comparable in governance shape to AssetOS and
SecurityOS, so future tasks can be coordinated through one stable tag.

### Decision

- Created DistributionOS as a repo-local knowledge intake, validation,
  retrieval, and product-routing system.
- Added `$distribution-os` as the stable invocation for future tasks.
- Kept the existing MenuList and portfolio Markdown ledgers canonical rather
  than creating another database or duplicate entry manifest.
- Registered current product/surface classes and their truth paths, execution
  owners, and exclusions.
- Preserved SignalDesk as the MenuList execution, experiment, approval,
  attribution, and outcome owner.
- Kept `APPLY_NOW` as an internal decision only; it never grants publishing,
  outreach, account/provider, spend, or deploy authority.

### Implementation

- Added `packages/distribution-os/` with typed boundaries, product/ledger
  profiles, Markdown parsing, registry audit, and read-only retrieval planner.
- Added `.agents/skills/distribution-os/` with UI metadata and detailed product
  routing.
- Added the complete internal documentation set in
  `__docs__/distribution-operating-system/`.
- Added the internal feature flag and focused source/behavior verification.

### Boundaries

- No public route, website promotion, dashboard, mobile screen, API, database,
  Firebase operation, scheduler, external research automation, AI/provider call,
  scraping, publishing, outreach, account action, spend, build, or deploy was
  added.
- Audit success proves repository integrity only; it does not validate an
  external source or prove a distribution tactic works.

---

## August 13, 2026 - DistributionOS Default Capture Correction

### Finding

The separate-thread SEO article test correctly invoked DistributionOS,
preserved source limitations, classified claims, routed MenuList and
Answerlattice separately, and protected SignalDesk/external-action boundaries.
It did not preserve the reviewed source because the initial review-only rule
blocked all documentation writes.

That behavior was safe but incomplete for the founder's intended long-term
knowledge collection system.

### Correction

- A substantive matching input now authorizes one canonical ledger record by
  default unless the founder says `do not log this`.
- Review/default intake may update only the selected insight ledger and directly
  required internal index, action-log, changelog, and validation records.
- Product code, public/product docs, campaigns, pages, publishing, outreach,
  accounts/providers, spend, builds, and deployments remain separately gated.
- Exact duplicate sources update outcome history instead of creating another
  ID.
- Useful confirmation and important rejection are retained so future strategy
  can retrieve what was already accepted or ruled out.

### Recovered Test Input

The SaaS SEO page-family article is now stored as `PP-DIST-EXT-003`. Its durable
decision is to use the nine families as an opportunity taxonomy, strengthen
existing MenuList and Answerlattice canonical pages first, require live demand
and proof before new URLs, and reject bulk/automatic publishing or a duplicate
cross-product SEO runtime.

---

## August 14, 2026 - DistributionOS Living-Bible Curation Model

### Founder Correction

The founder clarified that DistributionOS should not preserve every shared X
post or article. The goal is not to track what was shared, when it was shared,
or why it appeared in a chat. The goal is a continuously improved marketing and
distribution Bible that can guide future work after many external inputs have
been evaluated.

### Final Model

- The Marketing and Distribution Bible is the primary future reading surface.
- Codex autonomously decides whether an input adds durable value using current
  repo truth, product strategy, existing doctrine, and evidence quality.
- Admission requires a material doctrine improvement/correction, reusable
  workflow or measurement pattern, important risk, real decision/gate change,
  or credible hypothesis evidence.
- Repetition, unsupported folklore, temporary tricks, ungrounded tool lists,
  and interesting but non-decision-useful content create no durable record.
- Useful knowledge is synthesized thematically; the Bible is not chronological.
- Existing ledgers remain supporting evidence only when provenance or detailed
  product/claim validation will help later.
- SignalDesk and product systems retain execution and outcome ownership.

### Initial Bible

The first edition synthesizes the current durable doctrine for product truth,
proof before scale, audience/problem alignment, qualified outcomes, SEO page
admission, AI discovery and dark attribution, organic content, video, paid
acquisition, permissioned field distribution, measurement, system ownership,
product routing, and revalidation.

---

## August 27, 2026 - Owner-Language Boundary Applied Repo-Wide

### Decision

Kept `public-business truth infrastructure` as MenuList's internal category and architecture language, while making the external owner promise one owner-approved customer link for the latest version the owner publishes.

### Work Completed

- Updated canonical language governance and the global ChatGPT handoff.
- Updated the founder-approved video standard, launch blueprint, active video handoffs, founder review, and active HyperFrames wording.
- Replaced unqualified `always latest` wording in the Official Business Page sharing card and staff WhatsApp template.
- Added the reusable category-to-buyer translation and absolute-claim boundary to DistributionOS and MenuList marketing operations.
- Added `ML-MKT-EXT-012` and verifier coverage for the durable decision.

### Boundary

No public claim may imply that MenuList silently updates unsupported external platforms. Owner review, publication, supported MenuList outputs, and latest-published-version language remain explicit.

---

## September 3, 2026 - Successful Launch Deep Research And MenuList Command Plan

### Decision

Adopt the mechanism behind concentrated launch attention—one portable claim,
one visible proof moment, relevant voices with distinct jobs, bounded waves,
and fast follow-through—only after MenuList has permissioned owner proof and
operational capacity. Do not treat one viral post, Product Hunt rank, creator
volume, or a preferred weekday as the launch engine.

### Evidence

- Compared first-party or founder-written retrospectives from Resend, Dub,
  Tally, Product Hunt, Superhuman, Linear, Dropbox, and YC.
- Rechecked current X authenticity and paid-partnership rules, Product Hunt
  account/sharing/scheduling guidance, WhatsApp opt-in policy, and India
  influencer disclosure guidance.
- Distinguished each case's existing audience, product maturity, community,
  or relaunch advantage from the reusable mechanism.

### MenuList Outcome

- Created the canonical report at
  `launch-research-2026-09-03/report-source.md`.
- Defined six launch gates: product/route, proof, intake/capacity,
  message/assets, channels/compliance, and measurement/continuation.
- Retired the expired August 11, 2026 Product Hunt target and the unsupported
  assumption that Tuesday is inherently best.
- Kept Product Hunt as a credibility/feedback event, X as a qualified-attention
  layer, WhatsApp as owner-initiated intake, and two-surface activation plus
  day-30 state as the outcome standard.
- Preserved the external-action boundary: no account action, outreach,
  publication, creator contact, spend, scheduling, deploy, or launch occurred.
