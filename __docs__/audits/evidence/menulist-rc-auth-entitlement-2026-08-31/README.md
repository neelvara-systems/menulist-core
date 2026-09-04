# MenuList local auth and entitlement replay — 2026-08-31

This folder contains current-run local browser evidence for the reported
credential-whitespace and unpaid subscription recovery journey.

- `01-desktop-unpaid-billing-gate.jpg`: desktop Billing renders the truthful
  no-subscription state and the reachable **View Plans** action.
- `02-mobile-unpaid-billing-gate.jpg`: MobileShell Billing renders the same
  state with the mobile **Choose a Plan** action at 390×844.
- `03-mobile-pricing-after-choose-plan.jpg`: the mobile recovery action reaches
  Pricing without horizontal document overflow.
- `04-pro-billing-required-validation.jpg`: desktop Pro selection opens the
  pre-provider billing-details dialog.
- `05-mobile-pro-billing-required-validation.jpg`: the same dialog remains
  usable at 390×844 and blocks an empty Continue attempt with required-detail
  recovery.
- `06-mobile-restored-entitled-dashboard.jpg`: after restoring the deterministic
  provider-free reseller entitlement, MobileShell reaches the owner workspace
  without a subscription gate.
- `07-desktop-restored-entitled-dashboard.jpg`: the restored entitlement also
  reaches the desktop owner dashboard.
- `08-desktop-saved-person-selected.jpg`: an emulator-only owner creates and
  auto-selects a disposable saved-person profile with two private synthetic
  references; no image-generation provider is invoked.
- `09-desktop-saved-person-withdrawn.jpg`: withdrawal immediately removes the
  profile from active generation choices and exposes the governed delete path.
- `10-mobile-image-modal-layering-before.jpg`: the phone-width item editor
  remains above the nested image sheet before MLRC-483, making the image flow
  visually and pointer inaccessible.
- `11-mobile-image-modal-layering-after.jpg`: after MLRC-483, the nested image
  sheet owns the top layer at 390×844 and its upload controls are reachable.
- `12-mobile-saved-person-controls.jpg`: the corrected mobile sheet accepts a
  pointer transition to **Generate Photo** and renders the provider-free saved
  person selector.
- `13-mobile-saved-person-selected.jpg`: mobile selects the exact active
  profile/version while retaining the desktop-only lifecycle-management copy.
- `14-mobile-saved-person-option-open.jpg`: the phone-width selector exposes
  the exact active disposable profile as an owner-selectable option.

The positive sign-ins used a disposable local Firebase Emulator owner. Email
and password values are intentionally absent from this evidence. The unpaid
state was created by deleting only the deterministic local subscription fixture
and was restored with the maintained fixture seeder. No cloud Firebase write,
live Razorpay execution, checkout, payment, webhook, Git mutation, staging push,
Vercel build, deployment, or production mutation occurred.

The saved-person references are non-person synthetic artwork used only to test
the consent, private-storage, selection, withdrawal, and cleanup boundaries.
Both disposable profiles and all four private emulator objects were removed
after the replay. The Generate and Quick Generate actions were deliberately not
activated.
