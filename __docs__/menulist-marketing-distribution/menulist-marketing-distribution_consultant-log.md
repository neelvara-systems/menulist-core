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
- `__docs__/CHANGELOG.md`
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
