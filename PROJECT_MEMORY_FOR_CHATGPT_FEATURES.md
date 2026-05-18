# MenuList — Features, Surfaces, and Product Behavior Memory

**Use this file for product execution, UX audits, website positioning, and feature-level parity checks.**

## 1) Feature families and owner value

### A) Core public-truth surfaces
- Public menu rendering
- Official Business Page
- Search/discovery metadata and AEO/SEO support
- Review/feedback surfaces
- Domain and public route consistency

### B) Authoring and menu management
- Intake and extraction flows
- Translation and content editing
- Item/media handling
- Special menu/project variants
- Publish/update propagation to public channels

### C) Multi-location / chain behavior
- Centralized policy or defaults with outlet-level control
- Inheritance/override patterns for branches
- Cross-location consistency and governance

### D) Operations + trust
- Analytics and operational status views
- Security/permissions and role constraints
- Workflow reliability and cache consistency
- Error and notification pathways

### E) Support/assistive surfaces
- Help, onboarding, diagnostics, and setup guidance
- Feedback loop handling (guest/owner)
- Pricing/payment surfaces and entitlements

## 2) Product doctrine for feature communication

Do not communicate MenuList as:
- a standalone “QR menu maker”
- “AI-powered restaurant software”
- feature-gym marketing platform

Communicate as:
- infrastructure for public business truth
- simplifier for SMB public consistency
- default-stable publishing and presence management

Use short owner language, no technical overload.

## 3) Homepage/marketing structure currently used

Primary homepage flow is currently 18 sections, ordered to lead from clarity to trust:

1. Hero
2. Revenue path
3. Interactive workflow
4. Problem
5. Solution
6. Stats
7. Setup relief
8. Surfaces
9. Search discovery
10. Customer browse
11. Analytics insights
12. Smart features
13. Prepared for you
14. Business
15. Industry
16. FAQ
17. Final CTA
18. Sticky CTA

Avoid turning it into a feature checklist; keep it on outcome proof and public consistency.

## 4) Important content constraints

- No fake claims about ranking or growth outcomes.
- No unverified testimonials, logos, or metrics.
- No “AI magic” framing in public copy.
- Keep CTA language concrete and low-friction.

## 5) Mobile parity expectations

Any owner/public feature change must validate:

- inherited state behavior in desktop and mobile
- touch targets and interaction clarity
- reduced copy complexity
- readability in narrow widths

Also verify public/customer routes for:
- `/app` owner/dashboard (auth-protected routes)
- `/client/*` tenant rendering behavior
- website landing and legal pages

Do not ship desktop-only changes for owner tasks without mobile equivalent or explicit tradeoff.

## 6) Documentation map for this feature layer

Use feature docs and website docs as source of truth:

- `__docs__/main-website/main-website_spec.md`
- `__docs__/main-website/main-website_content.md`
- `__docs__/main-website/main-website_impl.md`
- `__docs__/index.md`
- relevant feature `_spec/_impl/_helpdoc/_marketing/_website/_firebase/_mobile-support` folders

If behavior differs, treat docs as needing parity update.

## 7) SMB-owner usability rules that should drive feature edits

- Surface only what owner must decide now.
- Avoid multi-step controls unless required by ownership model.
- Keep side effects visible and reversible when possible.
- Prioritize “No action needed” states for stable conditions.
- Use calm confirmations and minimal modal friction.

## 8) Risks to avoid in feature/product edits

- Over-hyping capabilities that are not fully observable in product
- Introducing undocumented workflow branches
- Diverging website copy from actual capability
- Breaking tenant-domain rendering by routing edits
- Cache freshness regressions on public output paths

## 9) Recommended audit sequence for feature updates

1. Verify runtime contracts in code
2. Verify public claim alignment in website/content docs
3. Validate mobile parity (if owner/public touchpoint changes)
4. Check analytics/monitoring/error handling and cache invalidation
5. Run type/lint checks
6. Manual route-level check: desktop owner + mobile owner + public page
