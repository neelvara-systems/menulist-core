# Creative Studio - Spec

## Summary

Creative Studio turns approved campaign intent into static assets for local-business promotion: captions, headlines, item/service copy, square posts, story layouts, offer cards, menu/service highlights, and ad-ready variants.

## Goals

- Create campaign-ready static creative from approved business facts.
- Keep every asset tied to source data, selected channel, and campaign goal.
- Let owners review, regenerate a specific variant, or export without learning design tools.
- Keep brand style, location, price, availability, and offer constraints visible before export.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Source-aware asset brief | Every generation request includes selected business fact, campaign cue, channel, CTA, and trust status. |
| Channel-specific variants | Instagram post/story, WhatsApp image, Google update image, flyer, and ad creative use separate size/copy constraints. |
| Fact lock | Price, address, offer date, opening time, service name, and menu item name cannot be changed by creative generation. |
| Regenerate by part | User can regenerate caption, headline, image prompt, or layout variant without recreating the whole pack. |
| Canvas-local editing actions | When a Creative Studio asset opens in the shared editor, selected layers expose quick edit, color, style, position, lock, duplicate, delete, group, and distribute actions directly on the canvas. |
| Ready-made text templates | Owners can add local, data-backed text combinations for common SMB posts such as sales, food specials, appointments, openings, reviews, events, and hiring; inserted text remains editable and removable as normal layers. |
| Manual export | Download/copy options exist even when direct publish integration is unavailable. |
| Trust handoff | Creative outputs move through Creative Trust Center before publish/export. |

## Non-Goals

- It is not a full design-suite replacement.
- It does not invent discounts, inventory, service results, endorsements, or review quotes.
- It does not publish automatically without owner approval.

## Risks

- Generic-looking assets can weaken the product wedge.
- Asset generation can become expensive if retries are unbounded.
- Unsupported channel sizes can produce poor crops if not fixed per channel.
