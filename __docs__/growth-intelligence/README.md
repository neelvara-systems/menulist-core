# MenuList Growth Intelligence

**Status:** Approved for implementation  
**Owner:** Founder  
**Surfaces:** Public Menu Entry, billing cancellation, Founder Monitor

## Purpose

Measure two growth questions with bounded existing infrastructure:

1. Do owner-visible `Powered by MenuList` links produce new public-menu drafts and claimed businesses?
2. Why do paying businesses cancel?

The feature is internal operating intelligence. It does not add an owner dashboard, customer tracking profile, advertising identifier, or new scheduled function.

## Documents

- [Specification](./growth-intelligence_spec.md)
- [Implementation](./growth-intelligence_impl.md)
- [Firebase and cost](./growth-intelligence_firebase.md)
- [Mobile support](./growth-intelligence_mobile-support.md)
- [Help boundary](./growth-intelligence_helpdoc.md)
- [Marketing boundary](./growth-intelligence_marketing.md)
- [Website boundary](./growth-intelligence_website.md)
- [Test cases](./growth-intelligence_test-cases.md)

## Source Gate

Run `npm run verify:growth-intelligence-boundary`, `npm run verify:platform-founder-monitor-boundary`, `npm run verify:public-business-truth`, `npm run verify:billing-entitlement-boundary`, and `npx tsc --noEmit` after runtime changes.

Run `npm run test:growth-intelligence:emulator` when the idempotent draft, claim, or churn counter transaction changes.
