---
version: "1.0"
name: MenuList - Frame
description: >
  Video-first MenuList brand system for launch films, product demonstrations,
  explainers, motion graphics, founder videos, social cuts, and sales assets.
  Calm operational clarity, owner control, and one approved public source are
  the governing ideas. The frame should feel like MenuList, not generic SaaS.
unit: "the frame - 1920x1080 primary; native 1080x1920 and 1080x1080 variants"
principle: "owner relief first; product truth visible; atoms are fixed; composition serves the message"

sources:
  website-css: "src/styles/website.css"
  font: "src/fonts/local/inter-latin-variable.woff2"
  logo-motion: "src/components/atoms/animatedVerticalLogo/"
  founder-standard: "__docs__/videos/videos_founder-approved-production-standard.md"

colors:
  canvas: "#FFFFFF"
  canvas-subtle: "#F8FAFC"
  canvas-accent: "#EFF6FF"
  surface: "#FFFFFF"
  ink: "#0F172A"
  ink-secondary: "#475569"
  ink-muted: "#94A3B8"
  brand-primary: "#1E40AF"
  brand-action: "#0051D1"
  brand-sky: "#0284C7"
  brand-cyan: "#27A8E3"
  brand-light: "#DBEAFE"
  warm-accent: "#DE77A1"
  border: "#E2E8F0"
  border-subtle: "#F1F5F9"
  success: "#059669"
  warning: "#D97706"
  error: "#DC2626"
  gradient: "linear-gradient(90deg, #0051D1 0%, #0284C7 52%, #27A8E3 100%)"

radii:
  small: "4px"
  medium: "6px"
  large: "8px"
  pill: "999px"
  circle: "50%"

shadows:
  small: "0 1px 2px rgb(0 0 0 / 0.05)"
  medium: "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)"
  large: "0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.05)"

typography:
  h1: { fontFamily: "Inter", cqw: 4.2, weight: 750, lineHeight: 1.08, tracking: "0", color: "ink" }
  h2: { fontFamily: "Inter", cqw: 3.0, weight: 720, lineHeight: 1.12, tracking: "0", color: "ink" }
  h3: { fontFamily: "Inter", cqw: 2.0, weight: 700, lineHeight: 1.2, tracking: "0", color: "ink" }
  body: { fontFamily: "Inter", cqw: 1.35, weight: 430, lineHeight: 1.5, tracking: "0", color: "ink-secondary" }
  label: { fontFamily: "Inter", cqw: 0.95, weight: 650, lineHeight: 1.25, tracking: "0", color: "brand-action" }
  ui: { fontFamily: "Inter", cqw: 1.0, weight: 500, lineHeight: 1.3, tracking: "0", color: "ink" }
  caption: { fontFamily: "Inter", cqw: 2.5, weight: 650, lineHeight: 1.35, tracking: "0", color: "ink" }
  metric: { fontFamily: "Inter", cqw: 4.0, weight: 760, lineHeight: 1.0, tracking: "0", color: "brand-action" }

spacing:
  safe-x-landscape: "5cqw"
  safe-y-landscape: "5cqh"
  safe-x-vertical: "7cqw"
  safe-y-vertical: "5cqh"
  content-gap: "1.6cqw"
  card-padding: "1.6cqw"
  caption-bottom-landscape: "7cqh"
  caption-bottom-vertical: "12cqh"

motion:
  standard-enter: "0.35-0.70s, power2.out, opacity plus transform only"
  standard-exit: "0.25-0.45s, power1.inOut, preserve outgoing visual weight"
  micro-action: "0.18-0.28s, restrained press and settle"
  transition-overlap: "0.35-0.55s, outgoing proof remains visible until incoming proof has weight"
  text-reveal: "left-to-right phrase or word reveal; no scrambling, spinning, bounce, or cursor gimmick"
  workflow-motion: "input becomes structured preview; approval changes state; one link connects to supported surfaces"
  logo: "use the founder-frozen deterministic two-path draw, trace, wordmark fill, and settle"
  end-settle: "one restrained 1.02-1.04 scale bump, then a useful static hold"

components:
  proof-card:
    backgroundColor: "rgba(255,255,255,0.92)"
    border: "1px solid #E2E8F0"
    rounded: "8px"
    shadow: "shadows.medium"
    description: "One real product fact or state. Never nest inside another card."
  glass-callout:
    backgroundColor: "rgba(255,255,255,0.72)"
    border: "1px solid rgba(226,232,240,0.82)"
    rounded: "8px"
    shadow: "shadows.small"
    description: "Use only when translucency improves separation; never neon or decorative."
  cta:
    backgroundColor: "#0051D1"
    textColor: "#FFFFFF"
    rounded: "6px"
    typography: "Inter 700, tracking 0"
    description: "One concrete action only."
  gradient-phrase:
    background: "colors.gradient"
    description: "At most one meaningful phrase per scene; remaining headline stays #0F172A."
  status-approved:
    backgroundColor: "#F0FDF4"
    textColor: "#047857"
    border: "1px solid rgba(5,150,105,0.22)"
    rounded: "999px"
    description: "Reserved for a truthful approved or stable state."
  caption-line:
    backgroundColor: "transparent"
    border: "none"
    shadow: "none"
    description: "No caption pill. Upcoming words muted, current word blue, spoken words dark."
---

# MenuList Frame System

## Brand Register

MenuList video should feel calm, current, practical, and trustworthy. The hero is the owner's approved public truth, not artificial intelligence, a dashboard, or visual effects.

The default message is:

```text
One approved customer link for your menu, services, and business details.
```

The default owner-ease proof order is:

1. The owner already has menu photos, a PDF, an owned list, or a service list.
2. The owner uploads what already exists.
3. MenuList prepares a private customer-facing version.
4. The owner reviews important details.
5. Nothing important becomes public until approval.
6. One approved link supports MenuList QR, page, print, sharing, and customer actions.

## The Frame

- Primary canvas: 1920x1080.
- Vertical and square versions are native compositions, not crops.
- Every frame has one dominant claim and one dominant proof surface.
- Use a zone-based layout: claim and proof, before and after, or source and outcome.
- Product claims require a visible product state, transformation, or approved mockup.
- Empty space is deliberate breathing room, not an invitation to add labels or decorations.
- Keep persistent authorship as a quiet bottom-right MenuList watermark. Do not recreate a website header.

## Typography

- Use the repo-local Inter variable font for every role.
- Letter spacing is always 0, including uppercase labels.
- Landscape headline floor: 60px. In-feed headline floor: 90px.
- Landscape body floor: 24px. In-feed body floor: 32px.
- Captions use no enclosing pill or card.
- Captions are a maximum of two lines.
- Upcoming caption words use `#94A3B8`; the current word uses `#0051D1`; spoken words use `#0F172A`.
- Use sentence case except for short operational labels.

## Color And Gradient

- Default to the light website system.
- Headlines remain dark for authority and readability.
- Use the website gradient on one decision phrase or owner outcome per scene.
- Do not use the gradient as a full-frame background or decorative wallpaper.
- Warm pink is a scarce secondary accent, not part of every frame.
- Semantic red, amber, and green communicate real states only.

## Surfaces

- Cards use 8px radius or less.
- Borders are light and shadows are restrained.
- Glass is allowed only when it clarifies layer separation.
- No dark device frames, nested cards, repeated blue grids, repeated horizontal bands, floating orbs, neon edges, or generic futuristic surfaces.
- Phone and desktop UI should look native and light, with enough scale to read the important state.

## Motion Language

Motion explains state change:

- existing menu photos or a PDF organize into a private preview;
- a cursor or tap points to one real action and then leaves;
- approval changes a visible state from private to approved;
- a single link becomes the source behind supported customer surfaces;
- a master list connects to outlets while allowed local differences remain controlled.

Use restrained lift, scale, blur, masks, focus, and overlapping transitions. Avoid constant floating, elastic movement, aggressive parallax, glitch, vortex, liquid glass, and unexplained 3D motion.

Scene changes must not expose a pale blank frame. Keep the outgoing proof present until the incoming frame has enough visual weight.

## Logo And Slates

- Use the plain original MenuList symbol with no square tile, card, or faded duplicate.
- Keep the final product name `MenuList`, not `MenuList AI`.
- Opening and final lockups use symbol left; `MenuList` and `One approved customer link` form a left-aligned two-row stack on the right.
- Use the exact founder-frozen symbol path geometry and one-cycle animation.
- Encoded frame zero must already be a useful branded poster.
- Hold the final complete lockup through the end of the file.

## Captions

The default caption treatment is deliberately quiet:

- transparent background;
- no outer card or pill;
- muted upcoming words;
- current spoken word in MenuList blue;
- completed words in dark ink;
- a small scale settle may accompany the current word;
- captions never cover the product action, price, approval control, or approved-link proof.

## Frame Treatments

### 1. Brand Lockup

Poster-safe symbol and wordmark animation, followed by a clean static hold. Low density.

### 2. Owner Problem

One scattered-information problem with a direct owner consequence. No invented numbers. Medium-low density.

### 3. Existing Menu Intake

Menu photos or a PDF become a structured private preview. The transformation is the focal motion. Medium density.

### 4. Owner Approval

Private state, review action, and approved result remain visible in sequence. Approval is never implied or skipped. Medium density.

### 5. One Link Propagation

The approved customer link is central; supported MenuList outputs connect around it with clear labels. Do not imply external-platform synchronization. Medium density.

### 6. Controlled AI Assistance

Owner message, prepared card, owner review, approval, and customer result. The owner is the authority. Medium density.

### 7. Multi-location Governance

Master list, linked outlets, and controlled local variation. Avoid autonomous propagation claims. Medium-high density.

### 8. CTA

One action, one destination, one brand lockup. Low density and a useful final hold.

## Research And Data

- Supplied product facts and approved UI do not require external search.
- Public facts require current primary-source verification and a source date.
- Internal performance claims require an approved export or read model.
- Every number needs meaning, unit, date or period, and visual context.
- Never invent customer counts, adoption, rankings, recommendations, revenue, traffic, or growth.

## Do Not Use

- `AI-powered restaurant software` positioning.
- QR-menu-only positioning.
- Guaranteed search, ranking, recommendation, traffic, conversion, revenue, or sales claims.
- Automatic Google, Instagram, Zomato, Swiggy, WhatsApp catalog, or delivery-platform update claims.
- AI avatars, robots, glowing brains, fake testimonials, fake logos, or fake metrics.
- Serif or monospace display typography.
- Negative tracking.
- Tiny production labels or duplicate lower-third summaries.
