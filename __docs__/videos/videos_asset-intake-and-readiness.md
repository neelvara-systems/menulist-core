# MenuList Video Asset Intake And Readiness

**Status:** Active intake contract
**Created:** August 10, 2026
**Scope:** What the team or founder supplies, how assets are verified, and when each of the 12 videos can enter production

## Purpose

The MenuList video system can be scripted and storyboarded before final assets arrive. Public production cannot use guessed UI, customer data, claims, logos, music, or product states.

This document defines the handoff. When assets arrive, they are frozen locally, checked against current product truth, and mapped to the individual video briefs.

## Intake Principle

The preferred evidence order is:

```text
Current real product capture
-> exact local reconstruction of a current product state
-> clearly labeled internal mock for a not-yet-final screen
-> no scene
```

Do not use AI-generated screenshots as product evidence. Generative tools may create non-product textures or contextual imagery only when rights and disclosure requirements are satisfied. Current MenuList launch work remains UI-led and can proceed without stock footage.

## What The Founder Or Team Can Supply

The following inputs improve the result. Missing optional assets do not block planning.

### Product Access

- approved QA/demo tenant;
- test owner account with no personal or live customer information;
- exact business/store to use in every capture;
- feature flags and release status for AI Menu Manager, Official Business Page, Business Health, and multi-location;
- permission to reset demo data between takes;
- final customer-link URL pattern to show.

### Source Menu Material

- three to six clear menu photos from one fictional or permissioned business;
- one PDF version of the same menu;
- optional owned public menu/service-list link;
- optional service-business rate card so the campaign is not restaurant-only;
- confirmation that names, prices, images, and contact details are fictional or cleared for use.

### Brand Assets

- current transparent MenuList symbol and wordmark;
- any approved horizontal and vertical lockups;
- current brand colors and fonts if they differ from the repo sources;
- founder-approved tagline and public destination;
- written approval for any partner, customer, or venue logo.

### Founder Media

- clean founder voice recording or talking-head footage;
- quiet room, stable camera, soft front light, and uncluttered real setting;
- minimum `4K` or `1080p` capture at the native frame rate;
- separate microphone audio when available;
- ten seconds of room tone;
- two complete takes plus short natural answers to the founder prompts;
- consent for the intended website, social, sales, and paid uses.

Founder footage is required only for Video 12. The other 11 videos can remain faceless and product-led.

### Audio

- approved local narration recording when replacing the retained Indian-English voice;
- any locally generated or explicitly cleared music source plus provenance;
- music and SFX must follow the zero-cost, local-only media policy;
- do not provide subscription-catalog tracks, random `no copyright` downloads, or files with unclear commercial rights.

## File Delivery Structure

Place incoming material under a dated batch before copying verified files into a project:

```text
__docs__/videos/assets-intake/
  2026-08-10-founder-batch-01/
    README.md
    source-menu/
    product-captures/
    founder-footage/
    brand/
    audio/
    rights/
```

The batch `README.md` records:

- supplier;
- delivery date;
- original filename;
- intended video(s);
- fictional, owned, permissioned, or public-source status;
- rights or consent evidence;
- whether the file contains personal information;
- checksum after intake;
- accepted, needs correction, blocked, or rejected status.

Do not rename or alter original source files. Copy accepted derivatives into the relevant HyperFrames project with a manifest and checksum.

## Product Capture Standard

### Shared Rules

- Use a clean QA/demo account, never a founder's personal account or live customer tenant.
- Remove browser extensions, personal bookmarks, notifications, email addresses, phone numbers, tokens, and unrelated tabs.
- Keep system clock, locale, currency, and business details internally consistent.
- Use one approved sample business across related scenes.
- Capture complete actions, not only static end states.
- Record the cursor separately when possible so the edit can preserve readable proof.
- Disable random animations, live notifications, and changing data during capture.
- Do not show unsupported integrations or future UI.

### Landscape Capture

- Canvas target: `1920 x 1080`.
- Capture source UI at `1920 x 1080` or higher.
- Keep the active proof within the central `1600 x 900` area.
- Use browser zoom that keeps labels and values readable after encoding.
- Record `5-10s` handles before and after each action.

### Vertical Capture

- Canvas target: `1080 x 1920`.
- Record native mobile UI or a dedicated narrow browser viewport.
- Keep essential copy and controls away from the top app label, right-side interaction rail, and bottom caption/CTA area.
- Do not scale an entire desktop dashboard into a phone-sized rectangle.
- Recompose proof cards and labels for the vertical frame.

### Frame Rate And Codec

- Capture at `30fps` unless the source interaction requires `60fps` for a specific slow-motion treatment.
- Prefer lossless or high-bitrate local capture for editing.
- Final public masters use the current HyperFrames/FFmpeg export standard.
- Keep the original capture and the normalized edit derivative.

## Canonical Demo Business

Use one internally consistent fictional business unless a permissioned real business is approved.

Recommended base:

```text
Business: Harbour Cafe
Type: Cafe
Location: Bengaluru
Currency: INR
Primary source: three menu-board photos plus one PDF
Customer link: harbour-cafe.menulist.online
```

Example menu data:

| Category | Item | Price | State |
| --- | --- | --- | --- |
| Hot Drinks | Masala tea | INR 30 | Available |
| Hot Drinks | Filter coffee | INR 45 | Available |
| Cold Drinks | Cold coffee | INR 110 | Sold out today for update scene |
| Snacks | Veg sandwich | INR 130 | Available |
| Snacks | Paneer roll | INR 160 | Available |

Use a second fictional service-business dataset only in a dedicated variant:

```text
Business: North Star Salon
Source: photographed rate card
Services: haircut, beard trim, facial, hair spa
```

Do not mix restaurant and service-list examples inside one short video unless the message specifically demonstrates category breadth.

## Required Capture Inventory

### Source Intake

- signed-in create-menu entry;
- menu-photo selection;
- PDF selection;
- owned public-link option when currently supported;
- upload/progress state;
- source accepted state;
- error and retry state only when required for onboarding content.

### Private Preview And Approval

- private/not-public label;
- prepared categories and items;
- item name, price, description, and availability;
- business details review;
- edit/correction path;
- owner approve/publish action;
- confirmation/receipt state.

### Customer Experience

- customer menu/service list landing state;
- category jump and search;
- language selector only when current and configured;
- business name, hours, location, recent-update state, and supported actions;
- current item price and sold-out state;
- customer link copied/opened from a clean browser.

### QR And Print

- generated QR asset;
- table/counter card;
- print-file preview;
- scan from an owned QR into the exact current customer link;
- no arbitrary external QR redirect demonstration.

### AI Menu Manager

- normal-language owner message;
- prepared approval card;
- customer-facing impact preview;
- owner approval;
- operation receipt;
- public page after the approved change.

### Official Business Page

- business identity;
- current menu/service list;
- hours;
- contact;
- location/directions;
- photos;
- supported call, WhatsApp, directions, booking, or order-link actions;
- any booking/order link must be visibly an owner-configured external action, not a MenuList-managed external update.

### Multi-Location

- master list;
- outlet list;
- link/governance state;
- allowed local price or availability variation;
- outlet-specific customer pages;
- approval or policy boundary used by the current implementation.

### Business Health And Activity

- `No action needed` state;
- relevant activity or feedback only when current, useful, and accurate;
- no invented graph, review count, rating, growth percentage, ranking, or uptime number.

## Video Readiness Matrix

| # | Video | Can storyboard now | Minimum production inputs | Current gate before public release |
| --- | --- | --- | --- | --- |
| 1 | Hero | Yes | All core source, preview, approval, link, customer, QR, print, and page captures | Full claim and surface review |
| 2 | Demo | Yes | Continuous verified workflow capture and final narration | End-to-end runtime review |
| 3 | Launch cut | Yes | Intake, preview, approval, and one-link outputs | No setup-time claim without evidence |
| 4 | Old PDF | Yes | Fictional PDF plus current customer page | Ensure before/after does not imply file deletion |
| 5 | QR stale page | Yes | Owned QR, stale fictional page, current MenuList page | QR destination behavior verified |
| 6 | Photo/PDF to link | Yes | Current intake and private-preview captures | Sign-in, review, and correction boundaries shown accurately |
| 7 | Owner approval | Yes | Current private, review, approval, and public states | Publication boundary verified |
| 8 | One link everywhere | Yes | Customer link plus owner-placement mockups | No unsupported synchronization |
| 9 | AI Menu Manager | Yes | Certified current message-to-receipt workflow | Runtime certification required |
| 10 | Official Business Page | Yes | Current page and supported actions | Action/link semantics verified |
| 11 | Multi-location | Yes | Current master/outlet/override/page captures | Release and governance certification required |
| 12 | Founder POV | Yes | Founder-approved voice/footage plus current product cutaways | Founder, claim, and usage consent approval |

## Intake Review Checklist

- [ ] The source file is retained unchanged.
- [ ] Ownership or permission is recorded.
- [ ] No live customer, employee, account, or payment data is visible.
- [ ] The product state matches current runtime behavior.
- [ ] The business, menu, currency, and customer-link details are consistent.
- [ ] The asset is large and clear enough for its native aspect ratio.
- [ ] The asset does not imply unsupported external synchronization.
- [ ] The asset does not contain invented metrics or testimonial evidence.
- [ ] The asset has a checksum and local manifest entry.
- [ ] The target video and exact scene are identified.

## What Does Not Need To Be Supplied

The team does not need to supply:

- paid stock footage;
- a paid music subscription;
- restaurant glamour footage for the first production phase;
- AI avatars;
- external animation templates;
- Remotion projects;
- generic dashboard illustrations;
- third-party platform logos used as decoration.

HyperFrames, the repo-local frame system, approved brand assets, current product captures, local audio, and FFmpeg are sufficient for the UI-led launch system.

## Production Handoff

When a batch is accepted:

1. Map every file to a scene in the relevant individual handoff.
2. Mark unavailable scenes as `blocked`; do not silently replace them with invented UI.
3. Freeze the source, script, audio, and aspect-ratio brief for the pass.
4. Build one primary video, review it, and update the maintained rules before reusing scenes elsewhere.
5. Render native aspect ratios from shared approved evidence.
6. Run product-truth, layout, motion, audio, first-frame, final-frame, and encoded-output QA.
7. Register the immutable output in the version and campaign ledgers.
