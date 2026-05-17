# Stage 7.4 Output - Copy, Case, and Motion Polish

**Date:** May 17, 2026
**Scope:** Homepage wording, capitalization, website CSS polish, and motion behavior
**Status:** Implemented

## What Changed

- Reviewed visible homepage wording for grammar, capitalization, and customer-facing clarity.
- Replaced internal/revenue-review phrasing in the revenue path with owner-facing copy.
- Normalized product-surface casing across the homepage and shared footer, including `QR menu`, `public page`, `digital screens`, `Print/PDF`, `customer app`, and `Official Business Page`.
- Corrected spelling/casing drift in demo labels, FAQ wording, analytics labels, workflow labels, and footer navigation.
- Removed viewport-based website font scaling and negative letter spacing from `src/styles/website.css`.
- Added subtle hover motion to revenue-path, public-drift, link, and proof elements.
- Added CSS reduced-motion safeguards and updated shared Framer Motion reveal components to respect reduced-motion preferences.
- Added `WebsiteHeadline` as the shared hero/section heading renderer and routed static website `ws-h1/ws-h2` headings through it so highlight treatment, sizing, and optional `fontSize` overrides stay consistent.

## Files Updated

- `public/locales/menulist.ai/en-US.json`
- `src/styles/website.css`
- `src/components/website/shared/AnimateOnScroll.tsx`
- `src/components/website/shared/WebsiteHeadline.tsx`
- `src/components/website/shared/SectionHeading.tsx`
- `src/components/website/home/HeroSection.tsx`
- `src/components/website/home/RevenuePathSection.tsx`
- `src/components/website/home/FinalCtaSection.tsx`
- `src/components/website/about/AboutPage.tsx`
- `src/components/website/contact/ContactPage.tsx`
- `src/components/website/features/FeaturesPage.tsx`
- `src/components/website/get-started/GetStartedPage.tsx`
- `src/components/website/legal/PrivacyPolicyPage.tsx`
- `src/components/website/legal/RefundPolicyPage.tsx`
- `src/components/website/legal/TermsOfServicePage.tsx`
- `src/components/website/multi-location/MultiLocationPage.tsx`
- `src/components/website/product/ProductPage.tsx`
- `src/components/website/trust-security/TrustSecurityPage.tsx`
- `src/components/website/SchemaMarkup.tsx`
- `__docs__/main-website/README.md`
- `__docs__/main-website/main-website_impl.md`
- `__docs__/main-website/main-website_content.md`

## Protected Scope

The pass did not touch pricing, payment, Razorpay, subscription, billing, auth, checkout, or create-menu runtime logic.

## Decision Notes

- Copy should sound like MenuList is helping a non-technical owner keep public business information current, not like an internal website-review memo.
- Motion should add polish through small state changes and scroll reveals, not become a visual feature.
- Reduced-motion support is required so the website remains accessible and calm.
- Hero, section, and CTA headings should use `WebsiteHeadline` directly or through `SectionHeading`; pricing/payment runtime surfaces were left outside this visual refactor.

## Follow-Up

- Other locale files still need a dedicated translation pass if the updated `Website` copy must be fully localized before broad multilingual launch.
- Real product screenshots should replace synthetic/draft website visuals after a founder-approved demo tenant is prepared.
