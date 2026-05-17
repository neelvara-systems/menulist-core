# Stage 5 Output - Post-Build Refinement + CRO

**Date:** May 16, 2026
**Status:** Completed
**Base implementation:** Stage 4 Direction A - Official Source Authority
**Scope:** Static website copy, homepage-supporting metadata, shared CTA consistency, get-started copy, and docs alignment

## Scope Guardrail

- Canonical cleanup later removed the old website source-code backup; use the current implementation as the only source version.
- This pass did not rebuild the homepage from scratch.
- Pricing, payment, subscription, Razorpay, auth wrappers, onboarding payment behavior, and `/create-menu` runtime implementation were not edited.
- Changes stayed in static marketing components, locale files, metadata copy, and docs.

## Part 1 - Critical Marketing Audit

Strongest sections:

- Hero visual and "official source" positioning clearly move MenuList away from generic digital-menu framing.
- Problem section keeps the old site psychology: stale public menu information is already felt by owners.
- Public proof section correctly separates MenuList-owned surfaces from external placement.
- Customer browse proof adds believable end-customer value instead of dashboard density.

Weakest areas found:

- Header, footer, get-started, and supporting page CTAs still had older "Create your MenuList" / "Where your menu lives" language.
- Get-started page used hardcoded English copy instead of the website translation namespace.
- Website README still marked v2 "Upload your menu. Your business is online." as active.
- Marketing playbook still labelled the hype/domination phase as active.
- A few visible copy slots overclaimed automatic behavior where calmer source/published-surface language is safer.

Most differentiated:

- Owner-approved source -> public menu -> official page -> QR/customer app/screens/share links.

Most commoditized before refinement:

- Generic "Create your MenuList" CTA and old footer tagline.

## Part 2 - Strategic Refinement Plan

Quick wins implemented:

- Align shared CTA to "Create your official menu ->".
- Move get-started copy into `Website.GetStarted` locale keys.
- Update footer tagline to "One official source for your menu and business details."
- Tighten proof language around digital screens and QR menu to current published-source framing.
- Update root/website OG alt/title consistency.
- Mark old v2 marketing/docs as historical rather than active.

Medium-effort improvements deferred:

- Rewrite supporting `/features` and `/how-it-works` pages into the full official-source narrative.
- Replace old OG image asset with a Stage 6 screenshot-led official-source composite.
- Capture real product screenshots from current owner and public flows.

High-impact strategic refinements deferred:

- Dedicated conversion review of `/get-started` -> `/pricing` -> onboarding path.
- Pricing page copy alignment, only after a separate billing/payment risk review.

## Part 3 - Screenshot & Visual Audit

Current visual role:

- Hero is a coded product composite, not a captured real screenshot.
- Customer browse proof is a coded preview that communicates public menu behavior.
- Public proof surfaces are icon/cards, not real screenshots.

Visual strengths:

- Calm and readable.
- Avoids fake analytics dashboards.
- Clearly explains multi-surface public output.

Visual weaknesses:

- Still needs real captured owner/public screens before launch-quality asset production.
- Hero visual can become stronger after Stage 6 with product-derived screenshot composites.
- Browser app verification showed stale service-worker/cache content in the in-app browser even after hard reload, so shell HTTP checks were used as the authoritative local verification for current served HTML.

Recommended treatment:

- Keep coded visuals for now.
- Stage 6 should prepare real screenshots for hero, public proof, customer browse, and workflow sections.

## Part 4 - Conversion Optimization Audit

Largest conversion risks reduced:

- CTA inconsistency across homepage, header, footer, legal, and trust pages.
- Get-started copy sounding generic rather than official-source specific.
- Old v2 docs encouraging a future accidental rollback to hype framing.

Remaining conversion bottlenecks:

- `/get-started` still routes authenticated users to `/pricing`; this behavior was intentionally preserved and requires separate funnel review.
- No real product screenshots near hero yet.
- No customer proof/testimonials yet.

## Part 5 - Messaging Refinement System

Refined now:

- Header CTA: official-source aligned.
- Footer tagline: infrastructure/source aligned.
- Get-started title/subtitle: owner control before public publishing.
- FAQ technical setup answer: replaced broad "distribution automatically" phrasing with approved-source public-surface phrasing.

Future variations to test:

- Workflow-led: "Start with the menu you already use."
- Trust-led: "One public source customers can trust."
- Public-presence-led: "The official source for what customers see."

## Part 6 - Proof & Trust Upgrade Plan

Proof currently present:

- Owner-approved publishing.
- Public menu and Official Business Page.
- QR/customer app/screens/share link surface map.
- Customer browse proof.
- Security/trust page still available.

Proof still missing:

- Real screenshots.
- Founder-approved customer outcomes.
- Real business examples.
- Updated OG/social visual.

Proof needing validation before publishing:

- Any metric claim.
- Automatic external-platform sync.
- Location-chain scale claims beyond implemented behavior.

## Part 7 - A/B Testing Roadmap

Recommended first tests:

1. Hero headline: official-source vs public-trust framing.
2. Hero visual: coded composite vs screenshot-led composite.
3. CTA label: "Create your official menu" vs "Start with your current menu".
4. Proof placement: public proof immediately after hero vs after problem.
5. Get-started subtitle: control-led vs speed-led.

Avoid low-value tests:

- Button color tweaks.
- Decorative animation changes.
- Generic "AI" or "all-in-one" wording.

## Part 8 - Mobile Experience Audit

Current risk:

- Shell HTTP verification confirms served content, but in-app browser visual verification was blocked by stale service-worker/cache behavior.

Mobile priorities for Stage 6/7:

- Capture fresh mobile viewport screenshots in a cache-clean browser.
- Check hero visual scaling and surface-pill wrapping.
- Check sticky CTA does not cover final CTA/FAQ content.
- Check get-started copy and Google button sizing.

## Part 9 - Launch Readiness Score

| Area | Score | Notes |
| --- | ---: | --- |
| Clarity | 8 | Core homepage message is strong. |
| Trust | 7 | Better after copy tightening, still needs real proof assets. |
| Infrastructure signaling | 8 | Official-source direction is visible. |
| Screenshot quality | 5 | Coded visuals only; real screenshots needed. |
| Product truth | 8 | Claims now more cautious and codebase-aligned. |
| Conversion readiness | 7 | CTA consistency improved; funnel needs separate review. |
| Visual maturity | 7 | Calm and credible, but asset pack missing. |
| Mobile quality | 6 | Requires fresh cache-clean visual QA. |
| Positioning precision | 8 | v2 hype docs no longer marked active. |
| Distinctiveness | 7 | Better than digital-menu framing, still needs proof visuals. |

## Part 10 - Immediate Improvement Priorities

Implemented immediately:

- Shared CTA alignment.
- Get-started copy localization and repositioning.
- Root/website metadata alt consistency.
- Cautious proof copy.
- README/content/marketing-doc governance updates.

Next immediate priorities:

- Stage 6 screenshot production.
- OG/social asset replacement.
- Supporting page official-source rewrite.
- Fresh browser visual QA with service worker/cache cleared.
- Dedicated get-started/pricing funnel audit.

## Part 11 - Implementation Refinement Pass

Files refined:

- `src/components/website/get-started/GetStartedPage.tsx`
- `src/app/layout.tsx`
- `src/app/(website)/layout.tsx`
- `src/components/website/legal/PrivacyPolicyPage.tsx`
- `src/components/website/legal/TermsOfServicePage.tsx`
- `src/components/website/trust-security/TrustSecurityPage.tsx`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_marketing.md`

Files intentionally untouched:

- `/pricing` route and pricing components.
- Razorpay APIs and payment hooks.
- Auth wrapper behavior.
- Onboarding/payment flow.
- `/create-menu` runtime flow.

## Part 12 - Final Strategic Recommendation

Strongest part of current site:

- The homepage now clearly frames MenuList as the official customer-facing source, not a QR menu tool.

Weakest part:

- Launch asset proof is still mostly coded/composite, not captured from the live product.

Strongest visible differentiator:

- Owner-approved source feeding public menu, official page, QR assets, customer app, screens, and share links.

Biggest messaging risk:

- Accidentally reverting to old "upload menu, business online" hype or automatic external-sync claims.

Best next step:

- Proceed to Stage 6 for screenshot and asset production before final launch polish.

## Validation

Commands/checks run:

- `node` JSON parse and EN/HI Website key parity.
- `npx tsc --noEmit --incremental false`.
- `npm run lint`.
- `npm run build`.
- Local HTTP checks on `/`, `/get-started`, `/features`, `/how-it-works`, `/privacy-policy`, `/terms-of-service`, and `/trust-security`.

Results:

- TypeScript passed.
- Lint passed.
- Build passed.
- Locale JSON and focused Website key parity passed.
- Local HTTP checks returned 200 and confirmed the new official CTA/footer/get-started copy is served.

Known validation note:

- `npm run build` still prints existing Next.js dynamic-server cookie warnings for website routes during static generation, then completes successfully with those routes dynamic.
- In-app browser DOM showed stale old homepage content from service-worker/cache state, while direct local HTTP returned current content. Fresh visual QA should be repeated in Stage 6/7 after clearing the browser service worker/cache or using a clean browser profile.
