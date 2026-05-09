# Media Image System Spec

## Goal

MenuList must prepare every business image according to the place where it appears. The owner should not need to understand pixels, file formats, or compression.

## Product Rule

Every saved image has one media purpose. That purpose decides:

- accepted file types
- max source size
- minimum dimensions
- final aspect ratio choices
- target output size
- compression quality
- public rendering behavior

## Image Profiles

| Type | Default ratio | Allowed ratios | Max source | Output target | Public budget |
| --- | --- | --- | --- | --- | --- |
| Menu item | 1:1 | 1:1, 4:3 | 8MB | 1200px max | 500KB |
| Category image | 4:3 | 4:3, 1:1 | 8MB | 1200px max | 500KB |
| Project image | 16:9 | 16:9, 1:1 | 8MB | 1600px max | 650KB |
| Menu background | 16:9 | 16:9 | 10MB | 1400px max | 800KB |
| Business logo | 1:1 | 1:1 | 5MB | 512px max | 350KB |
| Business cover | 16:9 | 16:9 | 10MB | 1600px max | 800KB |
| Digital screen slide | 16:9 | 16:9 | 10MB | 1920px max | 500KB |
| Gallery image | 4:3 | 4:3, 1:1 | 8MB | 1400px max | 700KB |

Menu cover is intentionally not a separate profile. If a menu needs a cover-like preview, use `projectImage` so menu previews, share cards, and discovery cards do not drift into separate image contracts.

## Format Rules

Accepted source files:

- JPG/JPEG
- PNG
- WebP

Rejected source files:

- SVG
- GIF
- HEIC/HEIF
- PDF or non-image files

Logo output keeps PNG when transparency matters. Other managed images prefer compact public-safe output through the shared canvas optimizer.

## Owner UX

The owner sees only the controls that apply to the selected image type.

Examples:

- Menu item image: Square, Landscape
- Menu background: Widescreen only
- Logo: Square only
- Project image: Widescreen, Square
- Digital screen slide: Widescreen only

No generic "choose any shape" control is allowed on public-output images.

Owner-facing upload surfaces use one shared image card so placeholder, preview, upload, drag/drop, paste, replace, adjust, remove, and reset behavior stays consistent. The card is a UI shell only; media profile validation and output preparation stay in `prepareMediaImage`.

Manual Adjust is available only where owner framing control adds value without slowing everyday item work:

- Project image
- Menu background
- Business logo
- Official Business Page gallery image
- Digital screen slide
- Future business cover

The flow is upload, automatic preparation, preview, optional Adjust, then save. Adjust is profile-locked and supports drag, zoom, rotate, and reset. Owners do not control final output size, output format, or compression.

Menu item images stay automatic. MenuList should not force owners through manual crop for every item photo.

## Public Output Rules

- Public menu item images use reserved image slots to avoid layout shift.
- Menu background images must never reduce readability.
- Logos must stay clear and should not be aggressively compressed.
- Raw originals are not served intentionally as the public presentation contract.

## Non-Goals

- No new external image CDN vendor in this implementation.
- No dependency upgrade.
- No owner-facing advanced editor.
- No arbitrary image type creation.
