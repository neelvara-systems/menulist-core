# Videos - Production Plan

**Status:** Production planning draft
**Created:** July 7, 2026
**Primary output:** Shot plan, delivery schedule, and final video gates

**Mandatory production standard:** [MenuList Founder-Approved Video Production Standard](./videos_founder-approved-production-standard.md).

## Purpose

This document defines how MenuList video assets should be produced after scripts are ready.

The goal is to make video production calm, product-led, and proof-safe.

Every video version follows the conversion-first workflow in [videos_hyperframes-operating-guide.md](./videos_hyperframes-operating-guide.md). Complete [videos_conversion-brief-template.md](./videos_conversion-brief-template.md) and add the asset to [videos_campaign-measurement-ledger.md](./videos_campaign-measurement-ledger.md) before animation begins.

## Visual Direction

Use calm, operational visuals:

- owner phone screen;
- real counter, table, QR, package, or printed-card context;
- clean screen recordings;
- before/after public menu examples;
- private preview screens;
- approval cards;
- customer page browsing;
- print and QR assets;
- multi-location dashboard;
- Business Health `No action needed` state.

Avoid:

- dramatic AI robot visuals;
- fake revenue charts;
- fake testimonials;
- restaurant stock footage with no product;
- promises about Google ranking;
- claims of automatic external-platform updates;
- generic QR-code-only visuals;
- heavy dashboard shots that make owners feel they must monitor constantly.

## CTA Lines

Use these consistently:

1. Create customer link.
2. Start menu preview.
3. Put one trusted customer link online.
4. Review before publishing.
5. Start from your current list.
6. See your menu as a customer link.
7. One approved list. Every customer link.

## Week 1 - Strategy And Scripts

Create:

- master product script;
- demo script;
- 10 short-form scripts;
- feature video scripts;
- shot list;
- demo account with fictional menu/service-list data;
- final claim-boundary checklist.
- one conversion brief per master, cutdown, native aspect version, or hook variant;
- one campaign-ledger row per planned distributable version.

Done when:

- scripts are in `__docs__/videos/`;
- founder approves script direction;
- claim-boundary scan is complete;
- required visuals are listed.
- funnel stage, proof moment, CTA, destination, primary metric, asset id, and paid eligibility are locked.

## Week 2 - Recording

Capture:

- product screen recordings;
- mobile customer view;
- owner dashboard view;
- AI Menu Manager approval card;
- Business Health stable state;
- QR and print mockups;
- optional founder/talking-head footage.

Recording requirements:

- hide notifications;
- close unrelated tabs;
- use fictional or permissioned data only;
- label demo visuals when needed;
- no debug banners, tenant IDs, secrets, console errors, or internal tooling;
- keep browser zoom and device frame consistent.

## Week 3 - Editing

Deliver:

- 75-second product launch film;
- 30-second launch cut;
- 15-second ad cut;
- 6-second bumper;
- 2-3 minute demo;
- 8-12 reels;
- captioned versions.

Editing requirements:

- captions readable on 320px and 390px widths;
- no text-heavy frames;
- no unsupported platform-sync implication;
- no fake performance numbers;
- end card uses approved CTA;
- all demo footage remains sample-safe.
- final edit still matches its `conversion.md` belief change, proof moment, and linked action;
- hook variants change only the declared test variable.

Audio requirements:

- do not use macOS `say` narration beyond scratch timing;
- use founder voice or approved local TTS for production review;
- choose a BGM rule for every video, including explicit "no music" if used;
- use only license-recorded music and SFX;
- keep `.media/manifest.jsonl` provenance and separate `assets/licenses/` rights evidence for any third-party or hosted asset;
- do not use HeyGen Free Plan output in production-bound MenuList assets;
- keep production zero-cost and local-only: no paid APIs, subscriptions, metered credits, cloud rendering or generation, paid media catalogs, paid plugins, or account-backed generation services;
- add SFX only for meaningful UI moments such as upload, preview, approval, QR scan, and CTA;
- duck BGM under voice;
- normalize public masters to the approved loudness target;
- check audio on laptop speakers, earbuds, and phone speaker.

## Week 4 - Launch And Testing

Publish:

- hero video on website only after final asset approval;
- launch video on LinkedIn, Instagram, and YouTube;
- reels daily for 7-10 days;
- paid ads with 6s, 15s, and 30s variants after tracking gates pass;
- demo video for sales conversations.

Launch testing requirements:

- use a unique `utm_content` for every materially different version;
- record publish URL/date and platform retention in the campaign ledger;
- establish an organic baseline before interpreting paid efficiency;
- keep paid distribution blocked until the primary and guard product milestones are measurable;
- decide `keep`, `iterate one variable`, `scale`, or `retire` after each review window.

## Shot List

| Shot | Required for | Notes |
| --- | --- | --- |
| Old PDF/menu screenshot | Hero, reels, paid ads | Use fictional menu only |
| Stale QR page | Hero, QR reel | Show problem without blaming owner |
| WhatsApp/Instagram/print price drift | Hero, reels | Avoid implying automatic platform sync |
| Source upload | Hero, demo, setup reel | Show menu photos, PDF, owned link, and no typing required to start |
| Private preview | Hero, demo, approval reel | Must clearly show not-public-yet state |
| Approval step | Hero, demo, trust videos | Owner approval first |
| Customer link live | All | Core product proof |
| Official Business Page | Hero, feature, demo | Menu/service list plus details/actions |
| QR and print files | Hero, feature, reels | Standard scan-safe QR visuals |
| AI Menu Manager card | Hero, feature | Message in, card prepared, approval first |
| Business Health stable state | Hero, feature | Use `No action needed` |
| Multi-location master/outlet | Feature | Master list plus local flexibility |

## Asset Naming

Use predictable names when files are eventually created:

```text
menulist-video-hero-75s-v1.mp4
menulist-video-launch-cut-30s-v1.mp4
menulist-video-demo-3min-v1.mp4
menulist-reel-old-pdf-15s-v1.mp4
menulist-reel-qr-stale-15s-v1.mp4
menulist-reel-owner-approval-20s-v1.mp4
menulist-ad-bumper-6s-v1.mp4
menulist-ad-cut-15s-v1.mp4
menulist-ad-cut-30s-v1.mp4
```

## Production Gates

Do not record or publish final assets until these are true:

- Gate 0 conversion brief exists and the asset is entered in the campaign ledger;

- final demo tenant, demo screenshots, or approved mockups exist;
- no real customer data appears without permission;
- all demo-like assets are labeled when needed;
- founder decides voiceover/talking-head involvement;
- external-platform claims have been checked;
- AI Menu Manager claims mention owner approval and unsupported external platforms correctly;
- multi-location claims match the current master/outlet contract;
- CTAs point to the correct active funnel;
- mobile captions are readable at 320px and 390px widths;
- no video script claims ranking, revenue lift, sales lift, official platform partnerships, or automatic external posting.
- no draft uses macOS `say` audio for production or public review.
- distribution package has a unique asset id, `utm_content`, publish owner, and paid-eligibility status;
- post-publish review date and decision owner are assigned.

## Current Blockers

Production is still blocked by:

- actual routed product screenshots or approved demo mockups;
- final demo tenant/source-list approval;
- founder voiceover, talking-head, or approved local TTS decision;
- production audio pass for existing HyperFrames drafts;
- visual editing;
- final claim-boundary review;
- upload destination decision if a Product Hunt video is used;
- paid-tracking and campaign gates before ad spend.
- consent-aware create-menu milestone attribution from source selection through first approved publish before paid scale.

## Final Review Checklist

Before publishing any video:

- script still matches current MenuList website/product truth;
- no unapproved external-platform update claim;
- no public promise of ranking, traffic, revenue, conversion, or sales lift;
- no real business data without permission;
- demo data is labeled when needed;
- captions fit mobile;
- CTA is current;
- asset is filed under the video launch tracker;
- marketing/distribution action register is updated.
- `conversion.md` matches the final edit and CTA destination;
- campaign ledger contains the final asset id, `utm_content`, status, and paid-eligibility decision;
- baseline/result fields remain `Not available` rather than invented when no real measurement exists.
