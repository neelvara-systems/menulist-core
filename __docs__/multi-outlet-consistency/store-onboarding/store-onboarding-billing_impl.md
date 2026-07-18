# Store Onboarding — Current Multi-Outlet Billing Contract

**Feature:** #4C-B — Razorpay Quantity and Manual Capacity
**Status:** Billing implementation evidence; not current launch certification
**Last Reviewed:** July 16, 2026

> **Launch boundary:** Current release approval still requires Razorpay sandbox evidence for quantity update/replacement subscription paths, authenticated desktop/mobile Billing and Locations QA, the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), the [External Certification Runbook](../../production-readiness/external-certification-runbook.md), and target-environment deployment/smoke evidence.
>
> The former billing design blueprint is preserved at [`../_archive/store-onboarding-billing_impl-historical-through-2026-07-14.md`](../_archive/store-onboarding-billing_impl-historical-through-2026-07-14.md). Its next-cycle scheduling and universal quantity-equality proposals are not current runtime contracts.

## 1. Source of truth

- The active chain subscription is the HQ/master store's `subscriptions/{subscriptionId}` row.
- Outlet stores inherit access from that subscription; they do not receive a separate recurring subscription.
- `providerSubscriptionId` shaped as Razorpay `sub_...` plus `billingMode !== "manual"` identifies a provider-managed subscription.
- `billingMode: "manual"` is prepaid/offline capacity recorded by a reseller/platform workflow; MenuList does not call Razorpay for it.
- Quantity is not duplicated onto the tenant document.

## 2. Quantity semantics

| Billing mode | Meaning of `subscription.quantity` |
| --- | --- |
| Razorpay-managed | Paid chain quantity. It normally equals active stores after successful create/deactivate synchronization, but can temporarily differ when provider/local reduction is explicitly pending. |
| Manual/offline | Prepaid capacity. It may be greater than active store count and is consumed by later outlet creation; deactivation frees a replacement slot without refunding or reducing capacity. |
| UPI replacement | The new same-plan subscription carries the next paid quantity; store creation stays blocked until replacement activation/finalization makes that capacity current. |

Therefore `activeStores === subscription.quantity` is not a universal invariant. The hard invariant is: outlet creation cannot make active store count exceed currently paid/prepaid quantity.

## 3. Outlet addition admission

`POST /api/outlets/create` requires an active HQ subscription when outlet billing is enabled.

1. Calculate current active store count and target count.
2. If current quantity already covers the target, skip provider/local quantity mutation and consume existing capacity.
3. If manual capacity is exhausted, return 402 and require the reseller/platform to record another paid location first.
4. If a Razorpay-managed subscription can update quantity, update the provider first and then the local subscription.
5. If Razorpay reports the UPI quantity-update limitation, return `OUTLET_LOCATION_PAYMENT_REQUIRED` with `ADD_PAID_LOCATION`; Billing starts/reuses a same-plan replacement checkout.
6. Only after capacity is sufficient does the atomic internal outlet transaction run.

No unpaid outlet is created to recover a billing failure.

## 4. UPI replacement finalization

Replacement checkout carries `replacementForSubscriptionId`. Browser verification and signed activation/charge webhooks use the shared replacement finalizer. It prevents conflicting current/pending rows, expires the old local row atomically, carries current credits once, synchronizes entitlements, and cancels the old provider subscription when it is not already terminal. Recurring owner controls remain available only in directly billed HQ context; switched/outlet contexts are read-only.

## 5. Creation compensation

Billing runs before internal creation. If internal creation fails before commit:

- a successful provider quantity increase is reverted to the previous quantity best-effort;
- a successful local quantity increase is reverted best-effort; and
- only the creation lock acquired by that request is released.

Failures use bounded diagnostics. If the internal outlet transaction already committed, later cache/screen/assistant failure cannot enter billing compensation or remove paid capacity for an existing store.

## 6. Outlet deactivation billing

`POST /api/outlets/deactivate` commits store, tenant compact row, summary, and slug-claim truth first. Then, when immediate removal and outlet billing are enabled:

- Razorpay-managed quantity above the new active-store count is reduced at the provider and then locally.
- Manual/offline quantity is retained as prepaid capacity.
- Missing provider authority, unsupported quantity mutation, provider failure, or local synchronization failure returns `billingReductionPending: true` and `billingActionRequired: "CONTACT_SUPPORT"`.
- Desktop/mobile Locations show the support follow-up and do not imply an unqueued background update will finish.
- Repeating deactivation for an already-inactive outlet skips the store mutation and public effects but can re-attempt the unfinished quantity reduction.

There is no current next-cycle removal scheduler, `scheduledForBillingRemoval` field, or owner reactivation window.

## 7. Reconciliation boundary

`functions/src/billing/reconcileSubscriptions.ts` compares current Razorpay provider quantity with the local subscription quantity and repairs a missed/late provider webhook under its existing lease/transaction. It does not derive desired quantity from active tenant stores and does not replace the explicit support action returned by a failed deactivation reduction.

Manual/offline rows are skipped because their quantity is local prepaid authority, not provider state.

## 8. Owner surfaces

- Desktop/mobile Locations show active location count, current plan amount, eligible proration context, and Billing handoff when new paid capacity is required.
- Manual accounts see prepaid-total/capacity language rather than auto-debit proration.
- UPI accounts with exhausted capacity are directed to Billing before create.
- Unresolved deactivation reduction is a visible support action.
- Outlet/switched-store Billing views cannot mutate the HQ recurring subscription.

## 9. Failure matrix

| Failure | Store created/deactivated? | Owner result |
| --- | --- | --- |
| No active subscription | No create | Choose/fix plan (402) |
| Manual capacity exhausted | No create | Ask reseller/platform to add prepaid capacity (402) |
| UPI quantity update unsupported | No create | Add paid location from Billing replacement checkout (402) |
| Provider increase fails | No create | Billing needs attention; contact support |
| Internal create fails after increase | No create | Quantity compensation attempted; generic create failure plus operational diagnostics |
| Deactivation provider/local reduction fails | Deactivation remains committed | Explicit contact-support acknowledgement; retry is idempotent |
| Derived cache/screen effect fails | Durable mutation remains committed | No billing rollback; bounded pending-effect diagnostics |

## 10. Current feature flags

- `ENABLE_OUTLET_BILLING: true`
- `ENABLE_OUTLET_PRORATION_DISPLAY: true`
- `ENABLE_BILLING_REMOVAL_IMMEDIATE: true`
- `MAX_OUTLETS_PER_TENANT: 30`

There is no second schedule-removal flag in current source.

## 11. Verification and pending owner evidence

Local source/code gates include:

- `npm run verify:multi-location-boundary`
- `npm run verify:billing-entitlement-boundary`
- `npm run test:billing-settlement-boundaries`
- `npm run test:billing-coordination:rules`
- `npm run smoke:razorpay-sandbox-readonly`
- `npx tsc --noEmit`

Pending external checks remain: card/eMandate quantity increase and decrease, UPI replacement checkout/activation/old-subscription finalization, manual reseller capacity plus owner create, authenticated desktop/mobile messaging, and target-environment deployment/smoke.

---

**DOCUMENT STATUS:** Billing implementation evidence - not current launch certification
