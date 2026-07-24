# MenuList First Proof Distribution Run - Operating Pack

**Status:** Prepared; execution blocked until the first permissioned activation and item-level proof permission

**Created:** July 11, 2026

**Owner:** Founder

**System:** SignalDesk Content Distribution Rail and Trust Partner Rail

**Scope:** One canonical customer-proof asset, four bounded derivative jobs, manual publication, and activation-linked measurement

## Objective

Turn the first owner-approved two-surface MenuList activation into one controlled distribution run:

```txt
permissioned activation
-> canonical proof packet
-> SignalDesk content source
-> customer-proof content asset
-> founder, short-video, and partner drafts
-> founder approval
-> manual publication or partner delivery
-> compact performance capture
-> continue, narrow, hold, or stop
```

This pack does not authorize contact, proof use, publication, partner outreach, spend, or external account access.

SignalDesk may open Content with a target-scoped `proofTargetId` preparation hint only after the durable target projection records an activation time, evidence reference, approved `menulist-signed` or `owner-reviewed-manual` integrity, and two distinct surfaces. The client then uses already loaded target, permission, source, and pod summaries to prefill the existing Content Rail only. It performs no write, creates no proof permission/source/asset/draft automatically, and cannot move any entry gate from `Blocked` to `Pass`.

## Entry Gates

Every gate must be `Pass` before the SignalDesk content asset can move from `hold` to `ready`.

| Gate | Required evidence | State |
| --- | --- | --- |
| Permissioned owner path | Founder-supplied business or approved partner introduction | Blocked |
| Owner-reviewed MenuList outcome | Current list approved and public link published | Blocked |
| Two-surface activation | Google/Profile plus one approved additional surface | Blocked |
| Proof eligibility | Completed proof packet under the pilot proof pack | Blocked |
| Item-level permission | Quote, screenshots, logo, menu details, and channels approved separately | Blocked |
| Claim review | Observable factual claims only | Blocked |
| Revocation owner | Named person and removal path recorded | Blocked |
| CTA readiness | One approved next action and working eligible route | Prepared |
| Content kill switch | `content-distribution` scope available | Implemented |
| Publishing boundary | Manual publication only | Implemented |

## Canonical Proof Packet Dependency

Use [`menulist-marketing-distribution_pilot-proof-and-owner-learning-pack.md`](./menulist-marketing-distribution_pilot-proof-and-owner-learning-pack.md).

Required proof facts:

- business and location identity approved for use;
- original current-list problem stated without exaggeration;
- owner-reviewed MenuList public link recorded;
- first and second customer surfaces recorded;
- activation date recorded;
- only approved quote and screenshots attached;
- permission scope, expiry, revocation, and takedown owner recorded;
- no revenue, ranking, traffic, sales-lift, or conversion-lift claim without direct evidence.

## SignalDesk Source Record

Create through `upsert-content-source` only after proof permission exists.

| Runtime field | First-run value |
| --- | --- |
| `title` | `First permissioned two-surface MenuList activation` plus approved business label |
| `sourceType` | `customer-story` |
| `sourceUrl` | Approved proof source or internal proof reference; no private customer payload in a public URL |
| `status` | `hold` until every entry gate passes; then `active` |
| `defaultAudience` | `restaurant-owner` |
| `defaultMarketPodId` | Approved Bengaluru pod ID |

Do not place phone numbers, emails, private messages, unapproved screenshots, or raw customer documents in the source URL or title.

## SignalDesk Canonical Content Asset

Create through `create-content-asset` only from the approved source.

| Runtime field | First-run value |
| --- | --- |
| `title` | Approved business result in plain factual language |
| `canonicalMessage` | One problem, one owner-reviewed change, two confirmed surfaces, one next action |
| `proofLevel` | `customer-proof` |
| `primaryAudience` | `restaurant-owner` |
| `sourceType` | `customer-story` |
| `sourceId` | Source record above |
| `ctaId` | Approved no-cost current-list consistency check/private-preview CTA |
| `marketPodId` | Approved Bengaluru pod ID |
| `status` | `hold` while any permission, claim, route, or revocation risk remains; otherwise `ready` |
| `riskNotes` | Every unresolved permission, identity, claim, route, disclosure, or expiry issue |
| `sourceNotes` | Proof packet ID, permission date, approved items/channels, expiry, and revocation owner |

### Canonical message pattern

```txt
[Approved business label] had different current-list information across [approved factual surfaces].
The owner reviewed one MenuList customer link and confirmed it for [surface one] and [surface two].
The observed result is one owner-reviewed current source on those surfaces.
[Approved audience] can request a current-list consistency check through [one approved CTA].
```

Delete any sentence that cannot be proved from the packet.

## First Derivative Set

Generate only these draft jobs through `generate-content-distribution-drafts`:

| Job | SignalDesk channel | Purpose | Publication boundary |
| --- | --- | --- | --- |
| Founder learning post | `linkedin` | Explain the owner problem, verified change, and operating lesson | Founder manually publishes after approval |
| Founder short post | `x` | Concise verified learning and one CTA | Founder manually publishes after approval |
| Visual transformation | `short-video` | Instagram Reel/YouTube Short derivative from the approved full proof | Manual platform upload after asset and disclosure review |
| Full case walkthrough | `other` | Two-to-four-minute YouTube walkthrough; source for later clips | Manual upload after title, thumbnail, route, and proof review |
| Trust-partner brief | `partner-brief` | Give approved photographers/consultants one factual referral story and next action | Manual delivery to an approved partner path |

Do not generate email, newsletter, blog, paid-ad, Reddit promotional, or additional channel drafts in the first run.

## One Job Per Channel

| Surface | Assigned job | Not allowed |
| --- | --- | --- |
| LinkedIn | Founder operating lesson and qualified owner/partner conversation | Generic thought leadership or unsupported outcome claim |
| X | Founder learning and ecosystem/partner discovery | Automated replies or restaurant mention harvesting |
| Instagram | Visual proof and local trust | Cold DM, follower optimization, unapproved customer identity |
| YouTube | Durable case explanation | Generic restaurant-marketing channel or unrelated posting quota |
| Partner brief | Permissioned owner introduction and second-surface help | Unapproved commission, spend, or public partner claim |
| Reddit | Listening only in this first run | Promotional draft, automated response, or lead scraping |
| Google/Profile | Activation surface owned by the business | Content campaign destination controlled without owner authority |

## Approval Packet

The founder approval packet must answer:

1. Which proof packet and business/location does this use?
2. Which quote, screenshot, logo, menu detail, and channel permissions exist?
3. What exact factual claim does every derivative make?
4. Which audience and market pod are included?
5. What single CTA will execute after publication?
6. Which channels are included and what job does each have?
7. Who will publish or deliver each item manually?
8. What is the maximum external cost? For this run: `₹0`.
9. What automatically holds or stops the run?
10. How will every derivative be removed after revocation or expiry?

Allowed decisions:

- approve;
- approve with narrower channels or claims;
- hold;
- reject;
- pause content-distribution scope;
- redirect to a different proof or CTA.

## Manual Publication Ledger

Record after each approved manual action:

| Field | Value |
| --- | --- |
| `contentAssetId` | Pending |
| `contentDraftId` | Pending per channel |
| Channel and account | Pending; founder-approved account only |
| Manual publisher | Pending |
| Published URL | Pending |
| Published timestamp | Pending |
| Approved CTA route | Pending |
| Proof permission expiry | Pending |
| Disclosure included | Pending where applicable |
| Revocation owner | Pending |

Do not mark a SignalDesk calendar item `published` before the real manual URL and time are recorded.

## Performance Capture

Use `record-content-performance` with the existing compact fields:

| Runtime field | First-run interpretation |
| --- | --- |
| `views` | Platform-reported views; diagnostic only |
| `clicks` | Supported tracked route clicks when available |
| `ownerLeads` | Qualified owner conversations attributable to the derivative |
| `currentListSubmissions` | Eligible current-list submissions attributable to the derivative |
| `activations` | Two-surface MenuList activations attributable to the derivative |
| `engagementQuality` | Evidence-based quality rating; not raw like count |

Also review founder attention minutes through the existing opportunity/operating summaries. Do not add customer identity or raw social payloads to performance summaries.

## Decision Rules

| Result | Decision |
| --- | --- |
| Qualified response or partner introduction leads to a preview/activation inside the attention boundary | Continue the same proof/channel job once |
| Conversation quality is useful but no preview begins | Narrow the audience, CTA, or proof framing |
| Views occur without qualified conversations, submissions, referrals, or activations | Stop expanding the channel; do not optimize vanity metrics |
| One partner niche repeatedly produces activated accounts | Expand only that existing Trust Partner Rail niche |
| Proof permission is narrowed, expires, or is revoked | Hold the asset and remove dependent drafts/calendar items/public uses |
| Complaint, misleading claim, privacy concern, or account warning appears | Pause affected scope immediately and require founder review |
| A paid amplification request appears | Hold until a separate budget envelope, rights review, and proven organic result exist |

## Revocation And Expiry Runbook

1. Set the canonical content asset to `hold` or `archived`.
2. Hold or reject every dependent draft.
3. Hold queued calendar items.
4. Remove or correct every manually published derivative through its account owner.
5. Record the removed URLs, time, reason, and owner.
6. Stop partner reuse and notify any partner who received the brief.
7. Preserve only the bounded internal audit record required by policy.
8. Do not reuse the proof in later content or model prompts.

## Completion Definition

The first run is complete only when:

- one permissioned canonical proof asset exists;
- every derivative has an explicit channel job and one CTA;
- the founder has approved each published/delivered item;
- manual publication URLs/timestamps are recorded;
- compact performance and founder attention are reviewed;
- the outcome is classified `continue`, `narrow`, `hold`, or `stop`;
- all proof permission and revocation responsibilities remain current.

## Current State

Prepared in the repo:

- distribution workflow research and executive brief;
- post-activation proof and owner-learning pack;
- SignalDesk Content Distribution Rail;
- SignalDesk Trust Partner Rail;
- first CTA, Bengaluru pod, channel mix, performance fields, approval, calendar, audit, and kill switch.

Still externally required:

1. one real permissioned business or approved partner introduction;
2. exact founder/manual sender identity for the permitted contact path;
3. owner-reviewed two-surface activation;
4. item-level proof permission;
5. founder approval before every manual publication or partner delivery.
