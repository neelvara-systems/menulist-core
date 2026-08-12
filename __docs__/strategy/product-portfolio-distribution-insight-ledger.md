# Product Portfolio Distribution Insight Ledger

**Status:** Active maintained strategy ledger
**Created:** July 28, 2026
**Owner:** Founder with Codex review
**Scope:** External distribution, founder-led marketing, organic content, channel, partnership, and audience-building inputs that need a product-by-product decision across the current portfolio.

## Purpose

This ledger prevents one generic distribution playbook from being applied to
every product in the repository.

Each entry must:

- check the current product registry and maintained product docs;
- distinguish a sellable product from an add-on, internal system, private
  surface, planned product, legacy name, or company trust surface;
- validate unstable platform claims against current primary sources;
- record what is useful for each product;
- name the proof or activation gate before external execution;
- preserve explicit rejections so unsafe tactics are not reconsidered without
  new evidence.

An entry does not authorize account creation, publishing, partnerships, paid
media, provider connections, spend, product claims, or deployment.

The founder's pseudonymous Proof & State PresenceOS is maintained in
[Founder Public Presence](../founder-public-presence/README.md). This ledger
still governs product-by-product distribution boundaries; PresenceOS must not
connect the alias to a product, company, domain, repository, or founder hub
until both this ledger's product gate and the identity-correlation audit pass.

## Statuses

- `APPLY_NOW` - update an existing internal operating rule or active bounded
  pilot; this does not imply public execution.
- `ALREADY_COVERED` - useful confirmation of an existing product rule.
- `DEFERRED_REFERENCE` - useful only after the named product gate is met.
- `RESEARCH_REQUIRED` - plausible, but not supported well enough for a product
  decision.
- `REJECTED` - unsafe, unsupported, incompatible, or outside the product
  boundary.

## Current Portfolio Classification

The stored product-code registry currently reserves MenuList, Answerlattice,
CampaignCue, MyCodex, SignalDesk, SurfaceOS, GrowthOS, and KitStamp
(`src/constants/product.ts:13`). A reserved code is not evidence that a product
is public or sellable.

| Surface | Current class | Distribution consequence | Repo evidence |
| --- | --- | --- | --- |
| MenuList | Active public product | Has its own owner-focused acquisition and proof-distribution system. | `src/constants/productDomains.ts:90`; [MenuList marketing and distribution](../menulist-marketing-distribution/README.md) |
| Answerlattice | Active separate public product | May build a distinct AI-built SaaS founder audience after keeping the First Trusted Answers wedge primary. | `src/constants/productDomains.ts:107`; [Self-sellable strategy](../answerlattice/self-sellable-product-strategy.md) |
| CampaignCue | Separate product with export/download-first runtime; public site remains feature-gated | Keep product-specific GTM research, but do not imply direct provider distribution, posting, or paid execution. | `src/constants/productDomains.ts:115`; [CampaignCue hub](../campaigncue/README.md) |
| GrowthOS / Growth Kits | MenuList Pro/Premium add-on, not a standalone product | Do not create a separate audience, account, website, or funnel. Distribute only as a MenuList proof/retention story after usage evidence. | [GrowthOS add-on hub](../growthos-addon/README.md) |
| SignalDesk | Internal MenuList growth control room | Use distribution principles inside governed research, draft, partner, approval, and outcome workflows. Never sell or publicly market SignalDesk. | [SignalDesk hub](../menulist-signaldesk/README.md) |
| MyCodex | Private documentation reader | No public distribution. | [MyCodex marketing boundary](../mycodex-pwa-shell/mycodex-pwa-shell_marketing.md) |
| SurfaceOS | Reserved planning-only product | No account, content, public claims, or channel work before product activation. | [SurfaceOS planning boundary](../surface-os/README.md) |
| KitStamp | Separate planned product; implementation not started | Retain an agency/operator distribution hypothesis only. Do not create public accounts or publish product claims. | [KitStamp hub](../kitstamp/README.md) |
| Neelvara Systems | Operating-entity trust surface, not a product | Keep it factual and quiet. Route product interest; do not turn it into a founder-content funnel. | [Neelvara website boundary](../neelvara-main-website/README.md) |
| Canonica | Legacy Answerlattice name | No separate account, content, positioning, or distribution. |

The Growth Engine planning material is source context for SignalDesk, not an
additional public product or distribution target. Website AssetOS is internal
asset-production infrastructure, not a market-facing product.

## Entries

### PP-DIST-EXT-001 - Distribution 101 Across X, YouTube, Reels, And TikTok

- **Status:** `APPLY_NOW` for bounded internal guidance; product verdicts vary
  below.
- **Shared:** July 28, 2026
- **Source:** Founder-supplied full text attributed to `@eptwts`, titled
  `distribution 101: how to sell your products`. No stable post URL was
  supplied or found during this review.
- **Source type:** X article/post
- **Topics:** founder-led-distribution, audience-product-fit, X, YouTube,
  high-intent-search, short-form, Instagram-Reels, TikTok, content-packaging,
  partnerships, disclosure, platform-integrity
- **Revalidate:** Current recommendation guidance, platform terms, account
  integrity rules, disclosure rules, product launch state, approved public
  claims, channel availability, and product-specific proof before execution.

#### Source Idea

The source argues that distribution is now a bigger bottleneck than building.
Its durable recommendations are:

- choose an audience that directly matches the buyer;
- teach from real product or operator knowledge;
- make content useful enough to save or apply;
- package YouTube ideas with a clear title and thumbnail before production;
- favor specific, high-intent educational topics over broad vanity traffic;
- use demonstrations and proof throughout the content instead of attaching an
  unrelated pitch at the end;
- adapt content to the native format of X, YouTube, Reels, and TikTok;
- measure qualified actions and sales rather than follower count alone;
- experiment because recommendation systems change.

The source also presents unverified numeric algorithm formulas, guaranteed
growth claims, high-volume posting rules, an affiliate-for-amplification tactic,
and instructions for disguising a TikTok account as US-based through a proxy,
device reset, US Apple ID, temporary phone number, false region, and account
replacement after a failed follow test.

#### Primary-Source Validation

| Source claim area | Current primary-source finding | Portfolio verdict |
| --- | --- | --- |
| X relevance and engagement | [X recommendation guidance](https://help.x.com/en/rules-and-policies/recommendations) describes a changing, multi-signal system using follows, interests, likes, reposts, replies, watched media, network popularity, health, and feedback. It explicitly says no one signal has a static universal weight. | Use audience relevance and genuine interaction. Reject exact universal weights, guaranteed launch velocity, and “100 tweets a day is harmless” as operating rules. |
| X Premium | [X Premium](https://help.x.com/en/using-x/x-premium) documents reply prioritization and creator features. It does not support a general claim that paying for Premium guarantees broad account-ranking or feed-reach uplift. | Premium may be purchased for needed product features, not as a distribution guarantee. |
| X affiliate amplification | [X paid-partnership policy](https://help.x.com/en/rules-and-policies/paid-partnerships-policy.html) treats affiliate commission and other incentives as paid partnerships requiring disclosure. | A partner may share relevant work only through an honest, disclosed agreement. Never trade an undisclosed affiliate arrangement for algorithmic amplification. |
| YouTube search | [YouTube search](https://support.google.com/youtube/answer/16090438) uses relevance, engagement, and quality, including title, tags, description, video content, and query-specific watch time. [YouTube tags guidance](https://support.google.com/youtube/answer/146402) says tags usually play a minimal role, but title, thumbnail, and description remain important. | Adopt clear search-intent packaging and faithful delivery. Reject “title and description barely matter” and the fixed formula `channel authority x (CTR + AVD)`. |
| YouTube CTR and discovery | [YouTube CTR guidance](https://support.google.com/youtube/answer/16767369) says CTR varies by traffic surface and usually falls as reach broadens. [YouTube recommendations](https://support.google.com/youtube/answer/16533387) prioritize long-term viewer satisfaction and quality over upload volume. | Compare videos against their own audience, surface, and business outcome. Do not use universal CTR, retention, upload-time, “wave,” or keyword-volume pass/fail thresholds. |
| TikTok recommendations | [TikTok recommendation guidance](https://newsroom.tiktok.com/how-tiktok-recommends-videos-for-you?lang=en) confirms that interactions, completion/watch behavior, captions, sounds, hashtags, and settings matter; country/device settings receive lower weight than expressed interests. Follower count and past viral videos are not direct ranking factors. | Adopt strong openings, relevant captions, completion-aware editing, and product-audience fit. Reject fixed “share equals ten likes,” 20% rewatch, 70% completion, length dead zones, and first-30-minute guarantees. |
| TikTok account setup | [TikTok integrity rules](https://www.tiktok.com/community-guidelines/en/integrity-authenticity/) prohibit deceptive accounts, platform manipulation, artificial engagement, bulk account operation, and attempts to trick recommendation systems. TikTok terms require accurate account information. | Hard reject proxy-based false-US identity, fake region/device setup, temporary identity workarounds, account-churn “follow tests,” and enforcement circumvention. |
| Instagram Reels | [Meta Reels guidance](https://about.fb.com/news/2023/04/instagram-reels-trending-audio-and-gifts-updates/) documents total and average watch time, replay-inclusive measurement, hook testing, and current trend discovery. It does not establish universal rules that saves are always the strongest signal, 60-90 seconds is always best, or 15 trial Reels per day is the correct scale. | Use native vertical presentation and measure retained attention, sharing, qualified visits, and product actions. Treat cadence and length as experiments, not doctrine. |
| India disclosure | [ASCI influencer guidelines](https://www.ascionline.in/the-asci-code-guidelines/) require clear disclosure when a material connection exists, including compensation, gifts, discounts, perks, affiliate arrangements, or platform-provided partnership labels. | Every Indian creator, affiliate, employee, gifted, or partner post must carry the applicable clear disclosure. |

#### Portfolio-Wide Accepted Principles

1. **One product, one buyer problem, one content promise.** Product accounts must
   not chase a convenient audience that cannot buy or use the product.
2. **Proof before volume.** Real demos, real operating lessons, approved
   evidence, and honest failure boundaries outrank a large generic content
   calendar.
3. **Package before production.** Define the intended viewer, search or feed
   context, promise, title, thumbnail/first frame, proof, and CTA before spending
   time on a long video.
4. **Teach the buyer's sub-problem.** The content should be independently useful
   and naturally demonstrate the product's role. Do not hide that the publisher
   owns, works for, or is paid by the product.
5. **Plain language, not condescension.** Simplify complex ideas for a busy
   buyer. Do not use the source's “80 IQ” framing.
6. **Business outcomes over vanity metrics.** Track qualified conversations,
   prepared inputs, demos, verified setups, activations, retained use, and
   payments where authorized. Likes and followers are diagnostic only.
7. **One proof source, many native derivatives.** A verified walkthrough may
   produce a YouTube video, short clips, an X lesson, an Instagram Reel, and a
   partner brief, with product-specific approval and disclosure.
8. **Experiment from observed results.** Platform rules change. Preserve
   hypotheses, small tests, and stop conditions instead of numeric folklore.

#### Portfolio-Wide Rejections

- no proxy, VPN, device-reset, false-region, temporary-number, or fake-account
  system to impersonate another market;
- no bought, aged, transferred, botted, follow-for-follow, or engagement-group
  accounts;
- no undisclosed affiliate, employee, gifted, or paid-partner content;
- no guarantee of followers, reach, ranking, virality, sales, or revenue;
- no spam-volume doctrine such as 100 X posts per day or 15 Reels per day;
- no fake customer, founder, staff, creator, testimonial, face, voice, or
  personal-experience proof;
- no competitor thumbnail or content copying; borrow a category convention, not
  another creator's protected expression or identity;
- no manipulative engagement bait. A relevant question or useful save/share
  prompt is acceptable; tricking users or manufacturing engagement is not;
- no “hidden VSL” deception. Commercial education should deliver the promised
  value and state the relationship and CTA clearly;
- no fixed VidIQ, CTR, retention, completion, rewatch, timing, or length
  threshold as a portfolio law.

#### Product-by-Product Decision

| Product or surface | Status | Useful translation | Current action and gate |
| --- | --- | --- | --- |
| MenuList | `ALREADY_COVERED` | Exact buyer focus, owner-problem education, verified walkthroughs, one proof source into channel-native assets, and activation metrics fit the existing Bengaluru/manual-first plan. X remains founder/partner learning; YouTube becomes durable proof after activation; Instagram/short clips derive from owner-approved proof. | No new channel or account work. Continue the current private-preview and two-surface activation gates. Record this input in the MenuList external-insight ledger. |
| Answerlattice | `APPLY_NOW` | The strongest fit is a narrow AI-built SaaS founder/small-studio audience, high-intent support-correctness topics, and proof-led product walkthroughs. The content must show time to trustworthy answers, canonical checks, widget verification, drift/refusal, and the weekly review loop. | Add this channel doctrine to the First Trusted Answers runbook. Founder/studio recruitment remains primary until the five-founder evidence test passes; public scale follows proof, not follower growth. |
| CampaignCue | `DEFERRED_REFERENCE` | Packaging before production, native channel briefs, useful-first teaching, and one-variable learning reinforce the existing Business Brain, Campaign Pack, Pattern Cue, Trust Center, and result-receipt model. | Add the research verdict to the CampaignCue founder addendum. Public GTM remains gated by accurate website/runtime claims, billing readiness, and founder approval. Export/download remains the delivery boundary. |
| Growth Kits | `ALREADY_COVERED` | The relevant story is one real MenuList action becoming accurate WhatsApp, Instagram, Google, staff, and print handoffs. | Add an explicit no-separate-audience rule. Broader content waits for repeated Pro/Premium use and owner-approved proof. |
| SignalDesk | `APPLY_NOW` | Use exact-audience briefs, proof-first assets, native derivatives, disclosed partner relationships, and outcome metrics in the existing Content Distribution and Trust Partner rails. | Update the internal Content Distribution Rail doctrine. Keep auto-publish, provider send, paid campaigns, fake engagement, and public SignalDesk marketing blocked. |
| MyCodex | `REJECTED` | None for public distribution. | Keep private. Do not create public product accounts or content. |
| SurfaceOS | `REJECTED` | None while the product remains a disabled planning placeholder. | Revisit only after the explicit activation gate creates real runtime, buyer, claims, domain, cost, and launch truth. |
| KitStamp | `DEFERRED_REFERENCE` | If activated, target content operators/agencies with high-intent demonstrations of source-to-approved-kit handoff. X/LinkedIn-style operator education and YouTube workflow demos are hypotheses, not current execution. | Record the hypothesis in internal marketing notes. Do not create accounts, publish claims, or recruit until implementation and launch gates pass. |
| Neelvara Systems | `REJECTED` | Product routing and factual company trust are sufficient. | Keep the company site quiet. No creator persona, content machine, funnel, or product-growth account for Neelvara. |
| Canonica | `REJECTED` | None. It is a legacy Answerlattice name. | No accounts, redirects beyond the maintained compatibility boundary, content, or distribution under Canonica. |

#### Measurement By Active Distribution Target

| Target | Primary measure | Secondary diagnostic | Not a success metric |
| --- | --- | --- | --- |
| MenuList | Private previews accepted, two-surface activations, seven-day activation, permissioned proof, qualified referrals | Proof views, partner conversations, demo completion | Followers, raw impressions, generic engagement |
| Answerlattice | Founders/studios recruited, first-ten question sets prepared, canonical test completion, widget verification, second weekly review | High-intent video retention, qualified demo/start clicks | Broad AI audience size |
| CampaignCue | Qualified workspace interest and, after launch, source-backed pack creation/use and result receipts | Demo/video completion and exact feature-page visits | Claims of reach or automated distribution |
| Growth Kits | Eligible owners who copy, share, print, or mark a fresh pack used without explanation | Pack-entry and stale-update behavior | Separate product followers |
| SignalDesk | Qualified conversations, previews, activations, partner-attributed outcomes, complaints, founder time | Draft approval, content performance summaries | Public awareness of SignalDesk |

#### Current Decision

The article is useful as a strategic reminder, not as an algorithm manual.

Apply the audience-product fit, proof-first education, packaging-before-
production, high-intent topic, native derivative, honest CTA, experimentation,
and outcome-measurement principles. Keep every tactic within the product's
current launch and proof boundary.

Do not implement or operationalize the proxy/account-disguise instructions,
numeric algorithm claims, guaranteed-growth formulas, spam-volume advice,
undisclosed affiliate amplification, aged-account logic, or manipulative
engagement tactics.

#### Outcome History

- July 28, 2026 - Captured the founder-supplied article, checked the current
  portfolio registry and product docs, validated unstable platform and
  disclosure claims against primary sources, and recorded a product-by-product
  decision.

## Maintenance

- Keep one entry per external portfolio-level distribution input.
- Link a product-specific ledger or runbook when an entry changes an active
  product's operating guidance.
- Do not duplicate long platform explanations across product docs; link this
  ledger and keep only the product-specific decision locally.
- Revalidate an entry when its named product gate opens or when a platform
  policy changes.
- Preserve rejected tactics unless new primary evidence and a founder decision
  justify reconsideration.
