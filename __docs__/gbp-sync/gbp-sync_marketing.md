# GBP Sync — Marketing & Sales Collateral

**Feature:** Google Business Profile Sync
**Status:** Reserved integration; current runtime is manual Google handoff
**Last Updated:** July 2, 2026

---

## Current Claim Boundary

Current source truth:

- `ENABLE_GBP_SYNC` is `false`.
- Google OAuth/API sync is not shipped.
- The token-store DAL fails closed with `GBP_TOKEN_STORE_DISABLED`.
- The Business Settings Google integration card is hidden while the flag is off; the shared Integrations tab may still show Platform Pull API controls.
- No owner can currently connect Google, run a sync job, or apply hours to Google from MenuList.

Sales, website, onboarding, and help copy must not claim automatic Google Business Profile updates, connect-once setup, or one-click Google fixes until API access, OAuth setup, provider smoke, deploy evidence, browser/device QA, and production-host smoke exist.

## Current Pitch

### One-Liner

**"MenuList gives you the right link to put on Google."**

### 30-Second Pitch

> "Most customers check Google before they open your menu. MenuList gives you a stable Official Business Page and menu link, so when you update Google Business Profile, you know exactly which link to use. Direct Google sync is reserved until Google API access is approved."

## Current Narrative

### Problem

Google Business Profile can point to stale menu links or old business details. Owners usually discover the mismatch only after a customer complains.

### MenuList Today

MenuList keeps the canonical public page and menu link clear. The owner still updates Google manually, using MenuList as the source.

### Reserved Integration

Direct GBP sync is a conditional integration candidate, not a current sales promise. It can only move into customer-facing claims after:

- Google Business Profile API access is approved.
- Separate OAuth credentials and secrets are configured.
- OAuth, connect-location, disconnect, sync, and apply-hours routes are implemented.
- Provider smoke proves the integration against a real test listing.
- Scoped Firebase deploy evidence exists for any changed functions/rules.
- Browser/device QA and production-host smoke are recorded.

## Approved Customer-Facing Language

Use:

- "Use your MenuList link on Google"
- "Owner-managed Google update"
- "Official Business Page link"
- "MenuList is the source to copy from"
- "Google sync is reserved until API access is approved"

Do not use:

- "automatic Google sync"
- "connect once"
- "one tap"
- "one-click Google fix"
- "MenuList updates Google automatically"
- "Google listing stays correct automatically"
- "AI-powered Google management"
- "Smart listing optimization"
- "SEO automation"

## Sales Talking Points

### If the owner asks, "Can MenuList update Google for me?"

> "Not yet. Today MenuList gives you the correct link and source details to put into Google. Direct sync is reserved until Google API access is approved and verified."

### If the owner asks, "What should I do now?"

> "Copy your MenuList Official Business Page or menu link, then paste it into Google Business Profile. Keep MenuList as the source when public details change."

### If the owner asks, "Will this change reviews or posts?"

> "No. Current MenuList Google handoff is only about pointing customers to the right public source. Reviews, posts, photos, and Q&A are not part of the current runtime."

## Internal Demo Guidance

Do not demo a Google connection flow unless the target environment has the feature flag enabled, approved GBP API access, configured OAuth secrets, and provider smoke evidence.

Allowed demo today:

1. Show the Official Business Page link.
2. Show the menu/share link.
3. Explain that the owner copies the stable MenuList link into Google.
4. Explain that direct GBP sync remains reserved until the provider gates are satisfied.

## Pricing/Packaging Boundary

Do not list Google Business Profile sync as an active plan benefit. If mentioned internally, label it as a reserved integration candidate.

---

**MARKETING REVIEW STATUS:** Source-gated handoff copy only; not active Google sync collateral
