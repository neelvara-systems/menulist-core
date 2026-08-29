# Global Accessibility Verification

The maintained source boundary parses the complete MenuList owner template,
shared organism, and shared Ant-component TSX surfaces and rejects icon-only
Ant buttons without an accessible name. It preserves named Advanced/Traditional
view selectors and requires the zoom-percentage reset to be a native named
button rather than a pointer-only span (MLRC-108/MLRC-110).

The desktop owner breadcrumb also keeps explicit names on the sidebar
expand/collapse action and localized Home action (MLRC-109).

## Source gate

`npm run verify:global-accessibility-boundary` checks:

- no maintained `src/app` viewport disables zoom;
- raw TSX images under `src/app` and `src/components` have alternatives;
- shared mobile keyboard, touch-target, back-label, and floating-label contracts remain present;
- shared QR and mobile compliance policy sheets forward their visible titles to
  the underlying dialog accessible name;
- owner and website skip navigation remains wired;
- desktop vertical and horizontal support-popover destinations remain native
  buttons instead of pointer-only clickable containers;
- owner business settings, dashboard, support chat, reseller onboarding,
  digital-screen settings, activity history, AI search, knowledge base, drawer,
  and loading controls retain stable accessible names;
- the desktop item editor's visible customer-visibility, availability, and best
  seller labels remain natively associated with their named switches, without
  duplicate pointer-only text handlers;
- global focus and reduced-motion styles remain active;
- known clickable-span and undersized-mobile-control regressions do not return;
- global access-denied recovery copy uses readable punctuation instead of
  displaying encoded HTML entities;
- the global access-denied result and recovery actions fit and wrap within a
  320px viewport;
- both access-denied recovery actions retain the 44px mobile touch-target
  minimum;
- access-denied and not-found recovery actions remain visible in the initial
  320×568 viewport instead of being pushed below the fold by duplicate result
  padding, a fixed desktop-sized illustration, or safe padding added outside
  the dynamic viewport height;
- access-denied and not-found results use the shared contextual recovery
  artwork instead of Ant Design's exception statuses, which discard a supplied
  custom icon and force a fixed 251×294 illustration;
- the access-denied home action exits the owner-app host through the
  environment-governed public MenuList website URL instead of entering the
  protected dashboard;
- global not-found Back/Home actions retain the 44px mobile touch minimum, and
  Home exits app-hosted public routes through the environment-governed public
  MenuList website URL;
- the maintained document set exists.

## Supporting gates

```bash
npm run verify:mobile-shell-route-map
npm run verify:website-public-copy-boundary
npm run verify:dependency-freeze
npx eslint <touched source files>
npx tsc --noEmit --incremental false --pretty false
git diff --check
```

## External evidence still required

Source checks do not prove assistive-technology output, browser zoom/reflow at every viewport, focus order in authenticated conditional states, or device contrast behavior. Those checks remain release/owner tasks on current iOS, Android, Safari, Chrome, and desktop keyboard/screen-reader combinations.
