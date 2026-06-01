# Social Content — Documentation Hub

> **Feature:** Today / Social Content
> **Status:** Today read/complete/skip surface implemented. Legacy owner generation retired; Weekly Growth Pack paused behind a disabled flag.
> **Last Updated:** June 1, 2026

---

## Quick Navigation

| Document | Purpose |
|----------|---------|
| [social-content-product-strategy.md](./social-content-product-strategy.md) | Product strategy document |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Implementation notes |
| [testing-guide.md](./testing-guide.md) | Testing guide |
| [social-content_validation.md](./social-content_validation.md) | Validation report |
| [social-content_code-review.md](./social-content_code-review.md) | Code review findings |
| [social-content_logic-verification.md](./social-content_logic-verification.md) | Logic verification |

## One-Liner

Prepare owner-ready actions from current MenuList truth: one Today action and operational follow-ups. The weekly copy pack remains a hidden experiment.

## Current Surface

- Desktop owner route: `/today`, rendered by `src/components/templates/main-app/today/index.tsx`.
- Mobile owner tab: `Today`, currently rendered by `src/components/mobile/screens/MobileHoursScreen.tsx`.
- Shared data path: `platformSummary/campaigns_{sId}` through `src/hooks/useTodayCampaigns.ts`.
- Existing master flag: `FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED`.
- Owner generation path: deleted. Do not show `Generate Today Action` or add a replacement Social Content generation route while GrowthOS owns new generated actions.
- Weekly pack flag: `FEATURE_FLAGS.ENABLE_TODAY_WEEKLY_GROWTH_PACK` defaults to `false`.

## June 1, 2026 Addendum

The old manual `Generate Today Action` prompt is retired from desktop and mobile Today.

Decision:

- Keep reading `platformSummary/campaigns_{sId}` because it still carries existing Today campaigns, staff prompt, and physical-surface cards.
- Keep complete/skip/download/copy paths for already-prepared items.
- Do not ask owners to generate weak one-off actions from Today.
- Delete, rather than flag, the retired generator path so no hidden endpoint, helper, or old campaign engine remains.
- GrowthOS / `Today's Sales Pack` owns new generated action creation for Pro/Premium stores.

## May 31, 2026 Addendum

The GrowthOS planning conversation produced a smaller MenuList-safe wedge: a deterministic Weekly Growth Pack inside Today, not a separate GrowthOS product.

## Product Pause Decision

The Weekly Growth Pack is not freeze-ready and should not roll out as a main feature now.

Reason: owner need and usability are not proven. It currently feels like a side feature unless it is clearly secondary to Today keeping the business truth ready.

Current decision:

- Keep `FEATURE_FLAGS.ENABLE_TODAY_WEEKLY_GROWTH_PACK` set to `false`.
- Do not add it as a main module, navigation item, website claim, or GrowthOS launch promise.
- Do not move it into KitStamp. KitStamp is Stage 3 content preparation and Final Content Kit export, not weekly growth actions.
- Revisit only after a small owner pilot shows owners copy/share the output without extra explanation.
- Keep Today focused on public business truth first: hours, live menu, public link, inactive items, and store status.

Implementation scope:

- Client-side pack builder: `src/lib/today/weeklyGrowthPack.ts`.
- Desktop card: `src/components/templates/main-app/today/components/WeeklyGrowthPack/`.
- Mobile card: `src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx`.
- No new route, no new product domain, no scheduler, no direct posting, and no new Firestore write path.

Firebase cost impact: `$0.00`. The pack reuses data already loaded by Today and only copies text to the owner clipboard.
