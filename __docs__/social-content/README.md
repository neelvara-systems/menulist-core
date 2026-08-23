# Social Content — Documentation Hub

> **Feature:** Today / Social Content
> **Status:** Today read/complete/skip surface implemented. Legacy owner generation retired; Weekly Growth Pack paused behind a disabled flag. Campaign diagnostics are bounded.
> **Last Updated:** June 29, 2026

---

## Quick Navigation

| Document | Purpose |
|----------|---------|
| [social-content-product-strategy.md](./social-content-product-strategy.md) | Product strategy document |
| [social-content_impl.md](./social-content_impl.md) | Implementation notes |
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
- Shared diagnostic path: `src/lib/campaigns/campaignDiagnostics.ts` for Today action and export/download failure logging.
- Existing master flag: `FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED`.
- Owner generation path: deleted. Do not show `Generate Today Action` or add a replacement Social Content generation route while GrowthOS owns new generated actions.
- Weekly pack flag: `FEATURE_FLAGS.ENABLE_TODAY_WEEKLY_GROWTH_PACK` defaults to `false`.

## June 29, 2026 Today WhatsApp Handoff Addendum

Today campaign WhatsApp actions use `src/lib/campaigns/todayActionExecutor.ts` to build the generated `wa.me` URL, open it with `noopener,noreferrer`, and then attempt the shared campaign clipboard helper. Copy success requires Clipboard API success or an acknowledged textarea fallback. Rejected Clipboard API writes fall through to the same acknowledged textarea fallback before failure.

Blocked or thrown WhatsApp opens log `today_campaign_whatsapp_open_failed` with bounded surface/item presence-length metadata, menu-link presence, message length, share URL length, and normalized source error metadata only. Failed copy diagnostics add clipboard/fallback support booleans to the same bounded surface/item/message metadata. The code must not log raw generated WhatsApp URLs, menu links, owner item names, generated messages, or browser exception payloads.

`npm run verify:public-business-truth` enforces the safe WhatsApp open and bounded diagnostic contract.

## July 10, 2026 Campaign Action Integrity Addendum

Prepared Today complete/skip actions use a Firestore transaction across the campaign document, `platformSummary/campaigns_{sId}`, and the deterministic `campaignExports/{tId}/{sId}/complete_{campaignId}` completion marker. The transaction verifies the persisted tenant, store, campaign, project, type, and allowed surface before any write. A duplicate completion returns the existing matching marker without incrementing stats or writing a second export; a duplicate skip returns the persisted skip/suppression result without incrementing counters again. Partial campaign/export/summary commits are no longer possible in the current path.

Campaign document and export `tId`/`sId` fields are numeric, matching the repository tenant contract and active session. Firestore path rules continue comparing the path IDs through string normalization for compatibility. Existing resolved records without the deterministic completion marker fail closed instead of creating a guessed duplicate export.

Each first completion performs three atomic writes; each first skip performs two atomic writes. Idempotent retries normally perform zero writes, except a retry may perform one summary-healing write if a resolved campaign still appears in Today. `npm run verify:public-business-truth` covers the transaction, deterministic marker, identity checks, idempotent branches, suppression cleanup, and pure summary transitions.

## June 29, 2026 Addendum

The paused Weekly Growth Pack copy path now follows the same bounded diagnostic contract as Today campaign actions when an owner copy action fully fails.

Guarded paths:

- `src/lib/today/weeklyGrowthPack.ts`
- `src/components/templates/main-app/today/components/WeeklyGrowthPack/index.tsx`
- `src/components/mobile/components/TodayWeeklyGrowthPackCard.tsx`

Failed copy logs use `today_weekly_growth_pack_copy_failed` with asset id/title/destination/copy and primary-subject presence/length metadata, asset counts, ready-action counts, clipboard/fallback support booleans, controlled failure stage, and normalized source error name/code/status only. The code must not log raw generated copy, menu links, owner-entered text, or browser exception payloads.

`npm run verify:public-business-truth` enforces the weekly-pack copy diagnostic contract.

## June 27, 2026 Addendum

Desktop Today and shared campaign surface failure paths now use bounded diagnostics instead of direct browser console output. The guarded paths are:

- `src/components/templates/main-app/today/index.tsx`
- `src/components/templates/main-app/today/hooks/useCampaignActions.ts`
- `src/components/mobile/screens/MobileHoursScreen.tsx`
- `src/lib/campaigns/todayActionExecutor.ts`
- `src/lib/campaigns/executionSurfaces.ts`
- `src/lib/campaigns/campaignDiagnostics.ts`

Failure logging records normalized `today_campaign_*` and `campaign_*` codes plus bounded presence/length metadata and source error name/code/status. It must not log raw campaign IDs, project IDs, item names, menu links, image URLs, captions, owner content, or browser/provider exception objects.

Mobile Today owner mutation/download failures also use `src/components/mobile/utils/mobileOwnerDiagnostics.ts` for close-today, today-hours update, temporary-status set/clear, tent-card download, and counter-sticker download failures.

`npm run verify:public-business-truth` enforces the diagnostic contract.

## June 28, 2026 Addendum

Today campaign WhatsApp image share, poster, QR tent, and screen downloads use a single browser-side helper in `src/lib/campaigns/executionSurfaces.ts`. The helper accepts expected image URL shapes only, fetches with manual redirect handling, then checks response status, content type, content length, blob type, and blob size before creating a share/download file. Its browser-local copy helper falls through from rejected Clipboard API writes to acknowledged textarea fallback and records clipboard/fallback support booleans on failed copy diagnostics. This keeps existing owner actions intact while preventing raw `fetch(imageUrl)` or redirected targets from returning arbitrary oversized or non-image blobs.

`npm run verify:public-business-truth` enforces the image fetch helper contract.

## June 1, 2026 Addendum

The old manual `Generate Today Action` prompt is retired from desktop and mobile Today.

Decision:

- Keep reading `platformSummary/campaigns_{sId}` because it still carries existing Today campaigns, staff prompt, and physical-surface cards.
- Keep complete/skip/download/copy paths for already-prepared items.
- Do not ask owners to generate weak one-off actions from Today.
- Delete, rather than flag, the retired generator path so no hidden endpoint, helper, or old campaign engine remains.
- GrowthOS / `Today's Sales Pack` owns new generated action creation for Pro/Multi-location stores.

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
