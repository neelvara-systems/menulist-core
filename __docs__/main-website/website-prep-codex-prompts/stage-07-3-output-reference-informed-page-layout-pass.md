# Stage 7.3 — Reference-Informed Page Layout Pass

**Date:** May 17, 2026
**Status:** Implemented
**Scope:** Homepage layout and conversion narrative

## Reason

The Stage 7.2 reference pass improved the footer only. That was too narrow for the intended review. The reference learning needed to affect the whole homepage flow: hero follow-up, proof placement, problem framing, section navigation, and revenue path clarity.

## References Considered

- Lenis: restraint, immediate clarity, low-noise section rhythm.
- Upscayl: plain audience clarity and direct product value.
- Paper: strong resource/footer architecture and confident closing conversion paths.
- Kestra: category authority, use-case navigation, and proof-first page structure.
- Stripe, Linear, Vercel, Notion: high-trust conversion architecture with strong page rhythm and restrained visuals.

## Implemented Changes

- Added `RevenuePathSection.tsx` directly after the hero.
- Reframed the homepage from "feature list" to "source becomes customer action."
- Added a link row into important proof areas: public surfaces, setup flow, business types, and pricing.
- Redesigned `ProblemSection.tsx` from generic cards into a stronger split layout with a public-menu drift stack.
- Redesigned `StatsSection.tsx` into a dark proof band so the "one source replaces many places" idea lands earlier and more seriously.
- Added anchor IDs for setup and industries so the page can route visitors to supporting proof blocks.

## Protected Scope

No pricing, payment, Razorpay, auth, checkout, billing, or create-menu logic was changed.

## Strategic Decision

Borrow conversion architecture, not brand aesthetics. MenuList should not look like Paper, Lenis, Kestra, Stripe, Linear, Vercel, or Notion. The useful pattern is a self-selling page that quickly explains:

1. why the public source matters,
2. what it replaces,
3. how it becomes visible to customers,
4. why customers can trust it,
5. how the owner starts.

## Verification

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `npm run build` after stopping the local dev server and clearing generated `.next` output
- Browser render check for revenue path, problem stack, proof band, setup anchor, industry anchor, footer, and horizontal overflow.
