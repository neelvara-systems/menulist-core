# B2C View — Current Implementation

**Status:** Local source complete; not current launch certification
**Last Updated:** July 29, 2026

This is the maintained implementation note. The former implementation narrative is preserved at `_archive/b2c-view_impl-pre-2026-07-16.md` and is historical only.

**Launch boundary:** Current approval still requires the [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md), Digital Menu Output Constitution checks, `npm run verify:menu-design-presentation-boundary`, public cache/deploy evidence, browser/mobile customer-menu QA, and target production smoke.

## Runtime flow

1. `src/app/client/[[...slug]]/page.tsx` resolves canonical public project/store truth and creates the allowlisted client payload.
2. `ClientMenuRenderer` and `MainContentRenderer` pass the project, store, active language, and precomputed blocks into `menuPageNew.tsx`.
3. `resolveMenuDesignConfig()` normalizes owner preview config. Public rendering independently calls `normalizeMenuMood()` and `normalizeMenuLayout()` before indexing design maps.
4. `getMoodWithBrandColor()` applies the constrained mood and contrast-safe brand accent.
5. The customer menu renders search, category navigation, visible active categories/items, item price truth, availability, item links, and `PDPModal`.

The exported older `output/MenuPage.tsx` component is not the active renderer, but it uses the same persisted-background normalizer and scroll attachment so a future import cannot reintroduce unsafe URL interpolation or mobile fixed-background behavior.

## Design sources of truth

| Contract | Source |
| --- | --- |
| moods, layouts, exact compatibility matrix, default normalization, contrast-safe mood values | `src/components/templates/main-app/projects/b2cView/designSystem/index.ts` |
| owner-selectable layouts, preferred layouts, presets, preset patches | `src/lib/menu/menuDesignPresets.ts` |
| visual preset preview | `src/components/shared/menuDesign/MenuStylePresetPreview.tsx` |
| desktop controls | `menuPage/menuPageSettingsNew.tsx` |
| MobileShell controls | `src/components/mobile/screens/MobileDesignEditorScreen.tsx` |
| live customer output | `menuPage/menuPageNew.tsx` and `output/PDPModal.tsx` |
| active option-price projection | `src/lib/pricing/publicItemPricePresentation.ts` |
| public background admission | `src/lib/menu/publicMenuBackground.ts` |

`normalizeMenuMood()` and `normalizeMenuLayout()` use owned-key checks, not
prototype membership. `resolveMenuDesignConfig()` reads only the seven known
menu fields through own data descriptors, omits unknown fields without invoking
accessors, normalizes booleans only from actual booleans, and preserves legacy
tabs as navigation intent rather than a selectable structural layout.
Compatibility helpers normalize invalid mood values before indexing the matrix.
Preset recommendation uses detailed type matching only for an exact canonical
business type; malformed/free-text values fall back to the exact canonical
business category or the governed default.

## Price presentation

`getActivePublicItemPriceAttributes()` filters unavailable price truth from presentation: inactive, missing, blank, oversized text, and non-finite numeric values do not render. `getPublicItemListPriceLabel()` returns:

- the formatted base price when there are no active priced options;
- one amount when all numeric options match;
- the minimum-to-maximum range when numeric options differ;
- a bounded distinct-label summary for valid text prices.

The card also lists every active option name and amount before interaction. `PDPModal` uses the same projection. Tap/view analytics use `parseSingleMenuPrice()` only for non-variant base prices, preventing text/range `NaN` values and stale variant base-price reporting.

## Rendering and accessibility

- Baseline mood accent/price colors pass the verifier's 4.5:1 contrast check.
- Search highlights inherit the surrounding readable text color.
- Mood metadata tags use readable heading text over decorative tints. Spice, allergen, dietary, and unavailable badges use explicit accessible foreground/background pairs.
- Price text no longer loses contrast through extra opacity.
- Unavailable item cards keep normal text opacity, add a dashed distinction, remain keyboard reachable, and include the unavailable state in the accessible label.
- Public item images keep a fixed slot and fallback on load error.
- The former 150-item estimated-height category placeholder and observer are removed. Rendering the bounded menu document keeps search, hashes, category jumps, direct item links, and layout height deterministic without introducing a measured-virtualization subsystem.

## Background media

`normalizePublicMenuBackground()` permits HTTPS URLs without credentials and safe root-relative URLs. It rejects HTTP, protocol-relative, executable/unknown schemes, control characters, oversized values, and persisted data URLs. An image data URL is admitted only when `previewMode` is explicitly true.

Desktop and mobile prepare a `menuBackground` profile, upload a data draft before publish, and store the returned public URL. Content-addressed public media follows the shared retain-until-replaced/deleted policy; an ambiguous publish failure does not destructively delete a potentially shared object. This adds no background-media cleanup collection or scheduler.

## Owner publish flow

Desktop `b2cView/index.tsx` and `MobileDesignEditorScreen.tsx`:

- clone the draft;
- normalize `config.design.menu`;
- upload a pending data background when needed;
- call `publishProject()` with `expectedModifiedOn`;
- require `assertProjectUpdateSucceeded()`;
- update local/embedded cache only from the acknowledged result;
- invoke `verifyMenuPublish()` as a non-blocking health check.

`publishProject()` owns linked versus standalone persistence, records current published truth in both branches, and revalidates public client/menu cache tags. No extra Firestore read or write was added for presentation normalization.

## Verification

Run:

```bash
npm run verify:menu-design-presentation-boundary
npx tsc --noEmit --pretty false
```

The focused verifier executes runtime checks for the exact matrix, preset
compatibility, malformed/prototype/accessor values, unknown-field omission,
canonical business-type/category recommendation, color contrast, option-price
ranges/filtering, and public-background admission. It source-checks
desktop/mobile parity, public/PDP presentation, stable large-menu rendering,
publish acknowledgement/truth/cache behavior, and this doc set.

Passing local gates is not current launch certification. Browser/mobile customer-menu QA, target deployment, authenticated owner publish smoke, public-cache observation, and production-host checks remain external pending work.
