# Global Accessibility Verification

## Source gate

`npm run verify:global-accessibility-boundary` checks:

- no maintained `src/app` viewport disables zoom;
- raw TSX images under `src/app` and `src/components` have alternatives;
- shared mobile keyboard, touch-target, back-label, and floating-label contracts remain present;
- owner and website skip navigation remains wired;
- global focus and reduced-motion styles remain active;
- known clickable-span and undersized-mobile-control regressions do not return;
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
