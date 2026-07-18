# Public Truth Check - Validation

**Status:** V1 owner readiness and fix loop validated
**Last Updated:** July 16, 2026
**Audience:** Developers, QA, product

---

## Scope

This validation covers the owner-side expansion of Public Truth Check inside Business Health, the exact owner fix loop, and the July 4, 2026 derived fix-list layer.

The implementation keeps the existing `menulist_owner` report path and includes eighteen read-only module rows:

- Public truth basics
- QR link health
- Menu or service clarity
- Price and availability clarity
- PDF cleanup readiness
- WhatsApp action link
- Hours readiness
- Photo and visual identity
- Customer question coverage
- Booking and inquiry readiness
- Google profile handoff
- Menu freshness

## Validation Matrix

| Check | Status | Evidence |
| --- | --- | --- |
| Owner report remains `menulist_owner` | Pass | `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` |
| Eighteen V1 modules exist | Pass | `OwnerPublicTruthReadinessModuleId` in `ownerPublicTruthReadiness.ts` |
| Desktop Business Health renders module rows | Pass | `PublicTruthOwnerCheckCard.tsx` renders `report.modules.map` |
| Desktop rows route to existing owner fix surfaces | Pass | Module `fixHref` values route to `/business-settings`, `/projects`, or `/qr-code` |
| Desktop primary action uses the first missing module fix target | Pass | `PublicTruthOwnerCheckCard.tsx` resolves `moduleAction.fixHref` and `moduleAction.actionLabel` |
| Owner report derives setup jobs | Pass | `ownerPublicTruthReadiness.ts` exposes `setupJobList` through `buildOwnerPublicTruthSetupJobList` |
| Desktop Business Health renders fix list | Pass | `PublicTruthOwnerCheckCard.tsx` renders `report.setupJobList` as `Fix list` |
| Mobile Business Health renders module rows | Pass | `MobilePublicTruthOwnerCheckCard.tsx` renders `report.modules.map` |
| Mobile Business Health renders fix list | Pass | `MobilePublicTruthOwnerCheckCard.tsx` renders `report.setupJobList` through `mobileFixTarget` callbacks |
| Mobile rows route through shell callbacks | Pass | `MobileBusinessHealthScreen.tsx` maps `mobileFixTarget` to Menu tab, Share tab, or More sub-screens |
| Mobile card remains read-only | Pass | No report write, mutation, `window.location`, or desktop route bypass is added |
| No V1 report storage | Pass | Owner report/hook/card contain no Firestore writes or `platformSummary/publicTruthTools_` persistence |
| No external source inspection | Pass | Owner report boundaries keep `externalSourcesFetched: false`, `aiOrSearchChecked: false`, and `rankingPromise: false` |

## Commands

```bash
npm run verify:public-truth-check
npm run verify:owner-business-assistant
npm run verify:public-truth-tools
npx tsc --noEmit --incremental false
```

## Result

The V1 owner-side Public Truth Check is now a Public Truth Tools readiness card with direct fix routing, not a separate dashboard. It remains read-only, source-backed, and bounded to existing MenuList owner data.
