# Official Business Page Public Route Audit - July 30, 2026

## Scope and Confidence

This audit traced the public tenant root, multi-location selector, outlet OBP,
menu handoff, metadata, structured data, media failure states, customer PWA
prompt, owner color/settings sources, cache boundaries, and responsive output.

Confidence is high for current source behavior and local hydrated rendering.
Deployed-host cache observation, real search-engine validation, and physical
device certification remain external evidence.

## Canonical Flow

```text
stores/{storeId} + projects/storesSummary
  -> host-derived tenant identity
  -> canonical active/non-blocked store lookup
  -> bounded menu and outlet projections
  -> localized OBP/brand render
  -> metadata + JSON-LD
  -> public menu/action links
  -> cache tags: menu-store-{storeId}, store-{storeId}, client-stores
```

Canonical truth:

- Business identity, public presence, contact, address, hours, special hours,
  PWA settings, and OBP accent: `stores/{storeId}`.
- Published menu availability and deterministic project order: tenant/store
  scoped project projection used by `OBPContent`.
- Multi-location membership: canonical active `stores` query. `storesSummary`
  is not routing or authorization truth.
- Public route identity: request Host authority plus canonical store
  subdomain/custom-domain fields.

## Findings and Fixes

### High: infrastructure failures rendered false business truth

Menu-summary failure became `hasMenu: false`, and active-store-count failure
became `1`. A Firestore/cache outage could therefore tell customers the menu was
not published or hide the location selector.

Fix: exhausted bounded retry/timeout reads now throw into the localized public
error boundary. Failure remains a failure and cannot become business truth.

### High: multi-location root omitted the master location

The brand selector required every location to have an `outletSlug`, while the
master store intentionally has none. The live QA root displayed one branch even
though two active canonical stores existed.

Fix: the master location now routes through the canonical `/menu`
compatibility path; non-master locations still require a validated stored slug.

### High: account email leaked into public structured data

OBP and menu JSON-LD treated the login/account email as a public business
contact even though it was not visibly published by the owner.

Fix: account email was removed from both schema paths and from the owner
customer-preview claim. A future public email requires a separate explicit
public field and owner workflow.

### Medium: multi-location brand root had no JSON-LD

The visible brand selector was indexable but emitted no structured data,
contradicting the maintained discovery contract.

Fix: it now emits an Organization graph sourced from the same bounded canonical
selector projection. Each visible location is represented as a linked
LocalBusiness. It does not misapply one outlet's hours/address to the brand.

### Medium: failed public media looked broken

The live QA logo and two menu images return HTTP 402 from a legacy Storage
bucket. The prior UI exposed broken-image icons, alt text, and blank media
cards. Normal `onError` handling also missed failures completed before hydration.

Fix: cover, logo, outlet, menu, and gallery paths now fail to intentional
fallback states. Brand and outlet fallbacks use the owner OBP accent; menu
fallbacks use centered neutral menu artwork. The component checks
`complete/naturalWidth` after hydration as well as handling `error`.

### Medium: many-menu mobile pages delayed primary actions

Nine active menus produced more than 1,300px of large cards before Call,
WhatsApp, Feedback, and Location.

Fix: 5+ menu sets use compact equal 90px rows on mobile. One to four menus and
desktop retain the image-led card treatment. In the audited fixture, action
controls moved to approximately 1,273px without hiding or reordering menus.

### Low: mobile language controls were undersized

Language targets rendered at 28px high.

Fix: mobile targets are now 44px. The audited 390px layout fits all four
languages with no horizontal overflow.

## Browser Evidence

Before:

- [Brand root desktop](./audit-evidence/2026-07-30/01-brand-root-desktop-before.png)
- [Outlet desktop](./audit-evidence/2026-07-30/02-outlet-desktop-before.png)

After:

- [Brand root desktop](./audit-evidence/2026-07-30/03-brand-root-desktop-after.png)
- [Outlet desktop](./audit-evidence/2026-07-30/04-outlet-desktop-after.png)
- [Brand root mobile](./audit-evidence/2026-07-30/05-brand-root-mobile-after.png)
- [Outlet mobile](./audit-evidence/2026-07-30/06-outlet-mobile-after.png)
- [Outlet mobile actions/details](./audit-evidence/2026-07-30/07-outlet-mobile-details-after.png)
- [Brand root light theme](./audit-evidence/2026-07-30/08-brand-root-light-desktop-after.png)

Validated viewports:

- Desktop: 1440x900, zero horizontal overflow.
- Mobile: 390x844, zero horizontal overflow.
- Mobile language targets: 44px.
- Mobile location cards: 74px.
- Call, WhatsApp, and Feedback actions: 54px.
- Long menu labels wrap without clipping.
- Dark mode retains the owner `publicPresence.accentColor` (`#14b8a6` in the
  fixture) for initials and brand accents.
- Light mode rendered the same owner accent as `rgb(20, 184, 166)` against the
  OBP neutral background, and the theme control switched back to dark mode.
- Third-visit PWA install prompt rendered, dismissed, and remained removed.

The red `N / Issue` badge in local after-images is Next.js development tooling,
not shipped OBP UI.

## Verification

Passed:

- `npm run typecheck`
- Focused ESLint on all changed OBP, owner-preview, and verifier files
- `npm run verify:official-business-page-boundary`
- `npm run test:obp-schema-timestamp-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:public-customer-delivery`
- `npm run verify:public-customer-localization`
- `npm run verify:multi-location-boundary`
- `npm run test:project-slug-backfill-boundary`
- `git diff --check`

Browser checks also confirmed:

- Brand metadata uses the brand identity.
- Outlet schema is `Restaurant`/LocalBusiness-family with no email.
- Brand schema is `Organization`, contains both visible locations, and has no
  email.
- The master link is `/menu`; the branch uses its validated owner slug.
- Failed legacy media leaves no `<img>` after hydrated fallback.
- Theme toggle and PWA prompt dismissal are interactive.

## Remaining Risks

- The QA fixture's original Firebase Storage URLs still return HTTP 402.
  Presentation is now safe, but the owner must re-upload those images or the
  legacy bucket must be restored for real photography to return.
- No full Next.js production build or Vercel deployment was run for this
  bounded route audit. Production/staging will retain the old behavior until
  the app change is built and deployed through the normal release process.
- Search-engine rich-result validation and post-deploy cache observation remain
  pending.
- The audit browser used a local platform-domain alias solely for hydrated
  tenant-host testing. Local Firebase bootstrap also logged the existing project
  mismatch diagnostic; server-side QA reads still returned the fixture data.
- The install prompt is intentionally eligible on the third visit (or an
  explicit `?pwa=install` link) and remains owner-controlled. It is a fixed
  bottom dialog, so production monitoring should compare install conversion
  against prompt dismissals and menu engagement.

No known critical or high-severity source correctness issue remains in the
public OBP route after this audit.
