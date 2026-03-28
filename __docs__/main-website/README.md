# MenuList Main Website (menulist.ai)

**Version:** 2.4 (v2 Hype/Domination)  
**Status:** ✅ IMPLEMENTED — Active  
**Last Updated:** March 20, 2026  
**Workflow:** `.windsurf/workflows/website.md`

---

## Website Version Tracking

| Version | Name                     | Period                   | Core Message                                     | Status     |
| ------- | ------------------------ | ------------------------ | ------------------------------------------------ | ---------- |
| v1      | Infrastructure Calm      | Launch – Mar 2026        | "Your official menu. From one place."            | ARCHIVED   |
| **v2**  | **Hype/Domination**      | **Mar 2026 – active**    | **"Upload your menu. Your business is online."** | **ACTIVE** |
| v3      | Infrastructure Authority | Future (10K+ businesses) | Restore from v1                                  | PLANNED    |

---

## Quick Navigation

| Audience        | Document                                         | Purpose                                             |
| --------------- | ------------------------------------------------ | --------------------------------------------------- |
| CEO / PM        | [Spec](./main-website_spec.md)                   | v2 strategy, positioning, ChatGPT validation        |
| Developers      | [Impl](./main-website_impl.md)                   | File structure, routes, components, technical stack |
| Sales/Marketing | [Marketing](./main-website_marketing.md)         | Hype & domination marketing playbook                |
| Design/Dev      | [Design System](./main-website_design-system.md) | Colors, typography, spacing, components             |
| Design/Dev      | [Image Assets](./main-website_image-assets.md)   | Image & asset requirements                          |
| Content         | [Content](./main-website_content.md)             | Page-by-page copy specification                     |
| Dev / SEO       | [SEO & AEO](./main-website_seo-aeo.md)           | Title tags, meta, schema, AEO strategy              |

### Archive (Historical — Pre-Implementation)

| Document                                                                                                  | Purpose                                            |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [\_archive/main-website_chatgpt-analysis.md](./_archive/main-website_chatgpt-analysis.md)                 | ChatGPT conversation analysis                      |
| [\_archive/main-website_web-research.md](./_archive/main-website_web-research.md)                         | Industry research (2025-2026)                      |
| [\_archive/main-website_cascade-approach.md](./_archive/main-website_cascade-approach.md)                 | Cascade's independent design approach              |
| [\_archive/main-website_final-approach.md](./_archive/main-website_final-approach.md)                     | v1 merged approach SSOT (57KB, superseded by impl) |
| [\_archive/main-website_site-architecture.md](./_archive/main-website_site-architecture.md)               | v1 wireframes & architecture (superseded by impl)  |
| [\_archive/main-website_existing-site-audit.md](./_archive/main-website_existing-site-audit.md)           | Pre-rebuild audit of old site                      |
| [\_archive/main-website_v1-infrastructure-backup.md](./_archive/main-website_v1-infrastructure-backup.md) | v1 content backup for future restoration           |

---

## Key Files in Codebase

| File                                                        | Purpose                                        |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `src/app/(website)/layout.tsx`                              | Shared layout (locale, auth, theme, analytics) |
| `src/app/(website)/page.tsx`                                | Homepage (client-side, 12 sections)            |
| `src/app/(website)/WebsiteAuthProvider.tsx`                 | Auth context for pricing/onboarding flows      |
| `src/components/website/home/HomePage.tsx`                  | Homepage section composition                   |
| `src/components/website/Header.tsx`                         | Shared header (all pages)                      |
| `src/components/website/Footer.tsx`                         | Shared footer (all pages)                      |
| `src/components/website/SchemaMarkup.tsx`                   | Homepage JSON-LD schema                        |
| `src/components/website/GoogleAnalytics.tsx`                | GA tracking                                    |
| `src/components/website/ClarityAnalytics.tsx`               | Microsoft Clarity tracking                     |
| `src/components/website/shared/WebsiteLanguageSwitcher.tsx` | Language dropdown (8 languages)                |
| `src/config/websiteLanguages.ts`                            | Language configuration                         |
| `public/locales/menulist.ai/{locale}.json`                  | Translation files (Website namespace)          |
| `src/styles/website.css`                                    | Website-specific styles                        |
| `src/config/features.ts`                                    | `ENABLE_PUBLIC_MENU_ENTRY` flag                |

---

## Feature Flags

| Flag                       | Default | Purpose                           |
| -------------------------- | ------- | --------------------------------- |
| `ENABLE_PUBLIC_MENU_ENTRY` | `false` | Gates `/create-menu` public entry |

**Note:** `ENABLE_NEW_WEBSITE` was removed — v2 website is now the default.

---

## Key Decisions (v2 — Active)

| Decision         | Choice                                          | Reason                                    |
| ---------------- | ----------------------------------------------- | ----------------------------------------- |
| Positioning      | Menu → Internet Presence (transformation)       | Hype/domination for customer acquisition  |
| ICP              | Non-tech SMB owners (India-first, global-ready) | Primary market                            |
| Visual direction | Clean, transformation-focused, product-first    | Show magic, not features                  |
| Tone             | Direct, energetic, transformation-focused       | Hype without breaking language governance |
| CTA              | "Upload Your Menu →"                            | Action-oriented, matches hero promise     |
| Hero message     | "Upload your menu. Your business is online."    | Instant transformation understanding      |
| Feature sections | ALL preserved (14+ unique capabilities)         | Competitive advantage                     |
| Dark/Light mode  | Light mode primary (website only)               | SMB trust, readability                    |
| Homepage CSR     | `'use client'` (heavy animations)               | Framer Motion, Canvas, SVG animations     |
| Other pages SSR  | Server components with `export const metadata`  | SEO benefit for all non-homepage pages    |

---

## Version History

| Version | Date     | Changes                                                                                                                                                                                            |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Feb 2026 | Initial planning phase — all docs created                                                                                                                                                          |
| 1.1     | Feb 2026 | ChatGPT Session 2: video decision, effort-removal framework, tone calibration                                                                                                                      |
| 1.2     | Feb 2026 | Existing site audit. Pricing/auth reuse decision. Feature content integration                                                                                                                      |
| 1.3     | Feb 2026 | Complete content specification created. Language Governance verified                                                                                                                               |
| 1.4     | Feb 2026 | ChatGPT Session 3 feedback. Relief language density +15-20%                                                                                                                                        |
| 2.0     | Feb 2026 | **IMPLEMENTATION COMPLETE.** All pages built. Pricing reuses existing components                                                                                                                   |
| 2.1     | Mar 2026 | **SEO INFRASTRUCTURE.** Per-page metadata on all 13 pages. Sitemap updated                                                                                                                         |
| 2.2     | Mar 2026 | **4 NEW FEATURES.** SmartFeatures expanded. Features page updated. i18n added                                                                                                                      |
| 2.3     | Mar 2026 | **DOC REBUILD.** 7 historical docs archived. New `_impl.md` + `_spec.md` from codebase truth. SEO doc updated to match actual code metadata. Renamed `_marketing.md`                               |
| 2.4     | Mar 2026 | **MARKETING REVIEW.** ChatGPT review (~40% accuracy). Sticky CTA on scroll. PONR commitment language in FinalCta. Ad scripts + distribution nudges + activation metric added to marketing playbook |
