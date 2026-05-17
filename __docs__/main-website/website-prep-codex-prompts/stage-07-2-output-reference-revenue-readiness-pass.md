# Stage 7.2 — Reference-Informed Revenue Readiness Pass

**Status:** Completed
**Date:** May 17, 2026
**Scope:** Main website footer and conversion/resource architecture

## Sources Reviewed

- `https://www.lenis.dev/`
- `https://upscayl.org/`
- `https://paper.design/`
- `https://kestra.io/`
- `https://stripe.com/`
- `https://linear.app/`
- `https://vercel.com/`
- `https://www.notion.com/product`

## Patterns Worth Adapting

### Paper

Useful pattern:

- Rich footer as a real product navigation layer, not only legal links.
- Closing CTA before footer navigation.
- Clear product/resource/legal grouping.
- Recent/workflow/resource blocks near the end of the page.

MenuList adaptation:

- Replace the old dark footer with a revenue-focused footer that gives visitors a second conversion moment, proof cards, and structured product/source/resource/legal navigation.
- Keep the tone calmer than Paper because MenuList sells trust to SMB owners, not creative experimentation.

### Kestra

Useful pattern:

- Hero and page architecture focus on category authority, use cases, proof, and governance.
- Strong explicit positioning: one platform, workflows, governance, reliability.
- Use-case navigation turns a broad platform into clear buyer paths.

MenuList adaptation:

- Preserve "one source" as the dominant category frame.
- Use proof cards and source navigation to show that MenuList is more than a QR menu.
- Do not borrow enterprise-heavy language or unsupported metrics.

### Stripe

Useful pattern:

- Revenue-first language, proof density, customer stories, reliability signals, resource-heavy footer.
- Multiple conversion paths: start now, contact sales, pricing, docs/resources.

MenuList adaptation:

- Make the footer a high-intent conversion area with `Create your official menu` and `See plans`.
- Keep reliability and public-source proof visible without inventing customer metrics.

### Upscayl

Useful pattern:

- Makes the audience list obvious.
- Uses comparison/alternative pressure and social proof.

MenuList adaptation:

- Keep industry breadth visible elsewhere on the homepage.
- Avoid copying playful hype because MenuList needs operational credibility.

### Lenis

Useful pattern:

- Direct objection handling.
- Explains why the product should exist despite category skepticism.

MenuList adaptation:

- Footer source line now directly says MenuList is not a QR menu maker; it is the source behind menu, page, QR assets, screens, PDFs, and links.

## Implementation

Changed:

- `src/components/website/Footer.tsx`
- `src/styles/website.css`
- `public/locales/menulist.ai/en-US.json`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_impl.md`

Added:

- Revenue-focused closing CTA in footer.
- Three footer proof cards:
  - owner approval before publishing
  - one source for public surfaces
  - single-location simple, chain-capable
- Four footer navigation groups:
  - Product
  - Source
  - Resources
  - Legal
- Stronger source positioning line:
  - MenuList is not a QR menu maker. It is the source behind your menu, page, QR assets, screens, PDFs, and links.

## Explicitly Not Copied

- Paper's playful/agent-heavy tone.
- Lenis's highly stylized motion-first art direction.
- Upscayl's hype tone and heavy testimonial carousel.
- Kestra's enterprise metrics and logo proof.
- Stripe's customer metrics and enterprise customer-story proof.

Those are not safe until MenuList has founder-approved proof, customer evidence, or real telemetry.

## Protected Scope Check

No pricing/payment/auth/onboarding/create-menu runtime logic should be changed by this pass. `/pricing` is linked from the footer but not modified.

## Launch Recommendation

This pass improves self-selling because the end of every website page now does more work:

- repeats the core source-of-truth position,
- gives high-intent visitors a CTA,
- routes skeptical visitors to trust/resources,
- makes MenuList look like a durable product system rather than a simple homepage.

