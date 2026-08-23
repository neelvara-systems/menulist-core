# MenuList Content Credit Decision Record

**Status:** Approved and implemented runtime policy
**Decision date:** August 22, 2026
**Product:** MenuList only
**Depends on:** [`launch-pricing-contract-2026-08.md`](../razorpay/launch-pricing-contract-2026-08.md)
**External input reviewed:** [`temp-pricing-strategy-menulist-chat.md`](../main-website/website-prep-codex-prompts/temp-pricing-strategy-menulist-chat.md)

## Purpose

This record defines the implemented long-term Content Credit policy. Tax behavior is owned by [`billing-taxation`](../billing-taxation/README.md); invoice and credit-note presentation remain separate billing-document decisions.

The pasted ChatGPT conversation is advisory input. Current MenuList product behavior, source code, maintained documentation, official provider pricing, and the owner-first product doctrine are the decision authority.

MenuList is not live. No grandfathering, balance migration, or historical backfill is required for this policy. The implementation should be treated as the fresh canonical contract.

## Executive Decision

Use **Content Credits** as a transparent owner-facing measure for explicit content preparation and transformation work.

Do not charge credits for factual maintenance, publishing, public correctness, synchronization, or other core MenuList infrastructure. An owner must always be able to correct prices, availability, hours, contact details, menu structure, and public business facts without considering credits.

Recommended commercial values:

| Plan or purchase | Recommended Content Credits | Reset or validity |
| --- | ---: | --- |
| Seven-day setup | No wallet | Initial guarded preparation is included |
| Official | 75 per billing cycle | Monthly; unused included credits do not roll over |
| Pro | 250 per billing cycle | Monthly; unused included credits do not roll over |
| Multi-location | 300 per paid active location, minimum 600 | Monthly; shared through the effective billing store |
| Content Credit Pack | 250 for ₹799 or $29, before applicable tax | Purchased balance persists while the billing account remains current |
| Referrer reward | 100 | Promotional balance, not purchased value |
| Referred paid business | 50 | Promotional balance, not purchased value |

Annual subscriptions replenish included credits monthly. They do not receive the annual total in advance.

India and global subscriptions use the same Content Credit allowance for the same plan. Regional currency changes the price book, not product capacity.

## Adopt, Change, Reject

### Adopt

1. Use the public name **Content Credits**, not AI credits.
2. Keep plan entitlement separate from variable-cost usage.
3. Keep facts and ordinary owner updates free.
4. Meter explicit generation and transformation work.
5. Keep one Pack rather than creating several Pack choices.
6. Replenish annual-plan allowances monthly.
7. Reserve capacity before provider work, settle valid output, and refund technical failure.
8. Charge partial batches only for valid successful outputs.
9. Require explicit owner action before customer credits can be spent.
10. Keep generated descriptions, translations, edits, and synthetic images behind owner review.
11. Retain 100/50 referral rewards, but account for them separately from purchased value.

### Change

1. Replace region-specific monthly allowances with one allowance per public plan.
2. Increase Pro from the current INR allowance of 200 to 250, while reducing the current USD allowance from 400 to the same 250.
3. Make Multi-location allowance quantity-aware: 300 credits per paid active location, with the existing minimum quantity of two producing 600 credits.
4. Reduce the India 250-credit Pack base price from ₹2,999 to ₹799. Keep the global base price at $29.
5. Show owners the usable Content Credit balance and exact action estimate instead of hiding included monthly capacity.
6. Version the server-owned operation catalog and snapshot the applied version and rate on every reservation.
7. Remove hidden overdraft and enforce an exact non-negative balance.
8. Stop turning unearned future annual allowances into permanent Pack credits during subscription replacement.
9. Preserve purchased value across a valid subscription replacement and define a bounded cancellation/reactivation policy before launch.
10. Separate referral/promotional grants from purchased Pack accounting even if both contribute to the displayed usable total.

### Reject

1. Reject a tenant-wide wallet disconnected from billing-store authority.
2. Reject three-cycle rollover for included plan credits.
3. Reject a 20-credit synthetic image rate without evidence from MenuList's actual operation and Pack economics.
4. Reject a browser-editable or ordinary Firestore-configurable billing rate table.
5. Reject automatic overage billing.
6. Reject autonomous background spending without prior owner authorization.
7. Reject credit charges for technical retries, cache refreshes, public rendering, or internal operations.
8. Reject hiding a balance that can block an owner operation.

## Governing Product Rule

> Content Credits are used when MenuList prepares or transforms content at the owner's request. Normal menu and business updates never use credits.

### Always free to the owner

- Initial guarded menu intake and extraction
- Manual menu edits
- Price and availability changes
- Hours, contact details, directions, and business-information changes
- Deterministic category and item movement
- Factual AI Menu Manager commands
- Publishing and republishing
- QR generation and scanning
- Official Business Page rendering
- Public menu and customer-link rendering
- Digital-screen refreshes
- Print-file rendering from already approved data
- Core validation and freshness checks
- Business Health status
- Analytics and customer-action reporting
- Customer feedback and correction handling
- Initial SEO/AEO and structured-data preparation
- Cache invalidation and synchronization
- Internal monitoring, support, and reliability operations
- Technical retries caused by MenuList or provider failure

Free does not mean unlogged. Provider-backed free, public, and internal operations remain in cost telemetry with zero owner credits.

### Metered owner-requested work

| Current operation | Recommended rate | Billing unit | Decision |
| --- | ---: | --- | --- |
| Description rewrite | 1 | Successful item output | Keep |
| Generated menu image | 5 | Successful image output | Keep |
| Batch-generated menu image | 5 | Successful image output | Keep |
| Add a language | 3 | Successful translation request | Keep current runtime semantics |
| Translate one item | 1 | Successful item/language output | Keep |
| Translate text embedded in an image | 5 | Successful image output | Keep |
| Edit an image | 5 | Successful image output | Keep |
| Campaign caption | 1 | Successful output | Keep while the MenuList surface remains supported |
| Print design recommendation | 1 | Successful recommendation | Keep |
| Review reply suggestion | 1 | Successful suggestion | Keep |

The public examples must reflect runtime billing units. In particular, **Add a language** is currently admitted and reserved per translation request, not automatically per item. Public copy must not claim item-by-item charging for that operation unless the runtime is changed first.

### Operations requiring a future explicit action ID

Do not overload an existing action ID when introducing any of these:

- Repeat business-copy generation after the included first pass
- Owner-requested bulk spelling or formatting transformation
- Owner-requested bulk category rewriting or normalization
- Background removal if it uses a different provider/cost path from image editing
- Repeat source extraction that is intentionally sold as an enhancement rather than core correction

Each new action requires an explicit zero or positive rate, provider-cost fallback, owner-facing estimate, and settlement test before release.

## Allowance Rationale

### Official: 75 credits

Official remains a complete single-business public-truth product. Its allowance supports occasional preparation without positioning Official as a content-production subscription.

Examples:

- 15 generated or edited images; or
- 75 description rewrites; or
- a mixed month such as 8 images, 25 rewrites, one language-add request, and 7 item translations.

This retains the current India allowance and gives owners more practical room than the pasted 50-credit proposal.

### Pro: 250 credits

Pro sells ongoing operating relief and richer preparation. A 250-credit allowance is easy to understand because it equals one Pack and supports meaningful monthly work.

Examples:

- 20 generated images, 100 rewrites, and 50 item translations; or
- 50 generated or edited images; or
- 250 description rewrites.

This replaces the inconsistent current regional values of 200 INR and 400 USD.

### Multi-location: 300 credits per paid location

Multi-location is priced per active location. Capacity should therefore scale with paid quantity rather than remain fixed for an account with two or twenty locations.

- Minimum paid quantity: 2
- Minimum monthly allowance: 600
- Third paid location: 900 total
- Fourth paid location: 1,200 total

The allowance is available through the effective billing store. Linked outlets use the existing inherited HQ billing authority; they do not receive independent wallets that bypass paid quantity or master/outlet governance.

## Pack Economics

### Recommended Pack

| Region | Base price | Credits | Effective base price per credit |
| --- | ---: | ---: | ---: |
| India | ₹799 | 250 | ₹3.196 |
| Global | $29 | 250 | $0.116 |

Applicable tax is outside this decision and will be settled in the taxation item. The values above are base commercial prices.

### Cost check

Current official Google pricing lists approximately $0.0336 for a 1K Gemini 3.1 Flash-Lite image and $0.067 for a 1K Gemini 3.1 Flash Image output. At the repository's current internal conversion reference, those are approximately ₹3.23 and ₹6.44 per output before retries, storage, moderation, and orchestration.

At the recommended five-credit image rate, one 250-credit Pack supports at most 50 image outputs:

| Worst-case Pack use | Approximate raw provider cost | India base revenue before gateway fee and tax |
| --- | ---: | ---: |
| 50 cost-focused generated images | ₹162 | ₹799 |
| 50 higher-cost edits/images | ₹322 | ₹799 |

Razorpay's public standard pricing states 2% plus GST on its transaction fee. At ₹799, the standard gateway fee plus GST on that fee is approximately ₹18.86 before any provider-specific variation.

The ₹799 recommendation therefore retains material room for retries, storage, moderation, and operating overhead while remaining proportionate to the ₹599 Official and ₹1,499 Pro subscriptions. The current ₹2,999 India Pack is commercially disproportionate: it costs five Official months or two Pro months and discourages legitimate occasional top-ups.

Official sources:

- [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Razorpay pricing](https://razorpay.com/pricing/)

Provider economics remain internal and must not appear in website or owner-facing copy.

## Balance and Consumption Policy

### Balance categories

The accounting system must distinguish:

1. **Included balance**: monthly plan allowance.
2. **Purchased balance**: paid Content Credit Packs.
3. **Promotional balance**: referral or founder-approved grants.
4. **Reserved balance**: temporarily held for an in-flight operation.

The owner can see one usable total with a clear breakdown. Provider cost and internal margin remain private.

### Consumption order

1. Included balance
2. Promotional balance with an explicit expiry, if applicable
3. Purchased balance

The applied buckets must be recorded at reservation so settlement and refund restore the exact source balances once.

### Included credits

- Reset to the current plan allowance on the billing-cycle boundary.
- Do not roll over.
- Do not become cash, refunds, or Pack credits.
- Do not replenish early because of calendar-month calculations.
- Annual subscriptions replenish on anchored monthly boundaries.

### Purchased credits

- Require a current paid MenuList entitlement to use.
- Persist across monthly resets.
- Persist across a valid same-billing-store plan replacement.
- Must not be silently discarded at cancellation or reactivation.
- Must not be converted to cash except through the approved refund/credit-note process.

**Approved cancellation rule:** Freeze purchased credits on cancellation and restore them if the same billing store reactivates within 365 days. After that bounded recovery window, the frozen service balance is no longer restorable. Purchase terms and owner-facing cancellation copy must state this clearly.

The current behavior, where expired-subscription Pack credits become orphaned and inaccessible, is rejected for a fresh long-term system.

### Promotional credits

- Keep 100 referrer and 50 referred-business rewards.
- Store their source and issuance event separately from paid Pack purchases.
- Never represent them as cash paid by the customer.
- Require current paid entitlement before use.
- Use a clear validity policy; recommended validity is 12 months from issuance.

## Reservation and Settlement Invariants

Every metered operation must:

1. Resolve the current entitled subscription and effective billing store.
2. Resolve a server-owned action ID and versioned rate.
3. Calculate and show the owner the estimate before confirmation where the action has a confirmation surface.
4. Reserve exact credits before provider work.
5. Execute the provider operation.
6. Settle only valid successful output units.
7. Refund unused reservation buckets exactly once.
8. Record provider/model usage internally.
9. Return billing-store-scoped remaining balances for desktop/mobile synchronization without an extra Firestore read.
10. Never allow any balance to become negative.

Additional invariants:

- Duplicate idempotency keys do not charge twice.
- Technical failure consumes zero credits.
- A technically valid owner-requested output consumes credits even if the owner later chooses not to publish it.
- A user-requested regeneration is a new paid operation.
- Partial batch success charges only successful outputs.
- Automated background work cannot use owner credits without explicit prior authorization.
- Browser-supplied action costs, quantities, balances, and settlement values are never authoritative.

## Remove Hidden Overdraft

Set the effective overdraft to zero.

The current 20% hidden overdraft creates inconsistent behavior: an operation can be admitted without enough recorded balance, while reservation and settlement still require exact bucket accounting. Long-term billing should be deterministic.

Owner goodwill should be handled through an explicit, auditable promotional grant or a technical retry refund, not an invisible percentage.

## Upgrade and Replacement Policy

### Carry forward

On a valid same-billing-store plan replacement:

- Preserve purchased balance.
- Preserve unexpired promotional balance.
- Do not carry unused included balance into the replacement subscription.
- Never convert future unearned annual monthly allowances into permanent purchased balance.

Future annual allowances and the current recurring balance are not converted into purchased credits during replacement.

### Multi-location quantity changes

- Monthly allowance derives from the settled paid quantity.
- Increasing quantity changes the allowance only after captured-payment/provider settlement authority is established.
- Decreasing quantity applies the lower allowance at the next defined billing boundary unless an explicit prorated policy is approved.
- A quantity change must not mint purchased Pack credits.

## Owner UX Contract

Desktop and mobile Billing must present the same facts:

- **Content Credits available**: usable total.
- **Included this cycle**: current recurring balance and next reset date.
- **Pack credits**: purchased balance.
- **Reward credits**: promotional balance when non-zero.
- Exact credit estimate before a metered action.
- Exact successful charge after completion.
- Calm insufficient-balance action leading to the single Pack.
- Refund or restored-balance confirmation after technical failure when relevant.

Do not show:

- Provider/model names
- Tokens
- Raw provider cost
- Margin
- Internal INR-per-credit valuation
- Hidden overdraft
- Unverified outcome promises

Recommended owner copy:

> Content Credits are used when MenuList prepares or transforms descriptions, translations, and images for you. Normal menu and business updates never use credits.

## Versioned Rate Catalog

The rate catalog must remain source-controlled and server-authoritative.

Each metered transaction should snapshot:

- `actionId`
- `rateVersion`
- `creditsPerUnit`
- `requestedUnits`
- `successfulUnits`
- `creditsReserved`
- `creditsSettled`
- `creditsRefunded`
- exact source buckets
- model/provider metadata for internal reconciliation

Future rate changes apply prospectively. They must not rewrite historical operation meaning or alter an in-flight reservation.

Do not use a browser-readable remote configuration as billing authority. If founder-operated rate administration is introduced later, it requires signed server-side publication, effective dates, audit history, rollback, and code-defined validation bounds.

## Current Source Evidence Map

| Current behavior | Source authority | Why it matters |
| --- | --- | --- |
| Unified B2C allowances and quantity-aware Multi-location allowance | `src/data/shared/contentCreditPolicy.ts` and `src/data/PlatformPlansList.ts` | Official 75, Pro 250, Multi-location 300 per paid location |
| One 250-credit Pack at ₹799 / $29 | `src/data/shared/contentCreditPolicy.ts` and `src/data/PlatformPlansList.ts` | One server-owned commercial pack contract |
| Public-safe weighted operation rates | `src/data/shared/contentCreditPolicy.ts` | Remains the shared owner-facing example source |
| Full zero/paid action registry and provider-cost fallback | `src/constants/AI/unitCosts.ts` | Versioned rates with strict zero overdraft |
| Pre-provider check, exact reservation, settlement, and refund | `src/lib/ai/capacityCheck.ts` | Preserve the existing transaction architecture |
| Language addition is currently reserved per translation request | `src/app/api/translations/route.ts` | Public examples must not claim per-item charging for this action |
| Description rewrites admit the requested output count and settle per request | `src/app/api/descriptions/route.ts` | Supports successful-output billing |
| Image generation admits estimated quantity and reserves before provider work | `src/app/api/image-generation/route.ts` | Supports five credits per successful image |
| Upgrade calculation excludes recurring and future annual allowances for MenuList | `src/utils/razorpay.ts` | Only purchased and valid promotional value transfers |
| Upgrade settlement preserves purchased and unexpired promotional balances | `src/lib/billing/productBillingServer.ts` | Replacement does not mint Pack value |
| Desktop Billing shows included, purchased, promotional, and usable totals | `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx` | Owner-visible balance truth |
| Mobile Billing shows the same balance breakdown | `src/components/mobile/screens/MobileBillingScreen.tsx` | Desktop/mobile parity |
| Referral rewards add to expiring promotional credits | `src/data/shared/ownerReferralPolicy.ts` and `src/lib/ownerReferral/ownerReferralSettlementServer.ts` | Reward value remains distinct from paid Pack value |

## Implemented Runtime Contract

1. B2C allowances are 75 / 250 / quantity-scaled Multi-location in both currencies.
2. The India Pack base price is ₹799 and the global base price is $29.
3. Exact reservation replaced overdraft-specific behavior.
4. One shared allowance resolver accepts plan ID and settled quantity.
5. The MenuList operation-rate catalog is versioned.
6. Promotional balance is separate from purchased Pack balance.
7. Valid replacement preserves purchased/promotional value without carrying recurring or future annual included capacity.
8. Cancellation freezes unused purchased value and qualifying reactivation restores it once within 365 days.
9. Desktop and mobile expose the same owner-safe balance breakdown.
10. Website pricing, help content, Pack examples, referral copy, transactions, and notifications use the same contract.
11. Maintained source comments and docs no longer present the retired launch model as intended behavior.

## Verification Requirements

### Source and policy

- Every MenuList AI action has an explicit zero or positive rate.
- No MenuList public/internal/free action can decrement owner credits.
- India and global variants of the same plan resolve the same allowance.
- Multi-location allowance equals the settled per-location allowance multiplied by paid quantity.
- Public examples are derived from the shared public-safe policy.

### Accounting

- Exact non-negative safe integers only.
- Included, promotional, and purchased consumption order is deterministic.
- Concurrent reservations cannot overspend.
- Duplicate requests and duplicate webhooks cannot double-charge or double-grant.
- Partial success and technical failure restore exact buckets once.
- Stale reservation recovery is idempotent.
- Monthly and annual anchored resets are correct across timezone/month boundaries.
- Upgrade never converts future annual allowance into persistent Pack value.
- Cancellation/reactivation preserves or expires purchased value according to the approved rule.

### Surfaces

- Desktop Billing and mobile Billing show the same balance truth.
- Every metered desktop/mobile action shows or can derive the same estimate.
- Pack purchase and referral examples match current rates.
- Website, pricing, help, FAQ, transaction history, and notifications use non-technical owner language.

### Release

- TypeScript and lint pass.
- Credit-policy, top-up, settlement, replacement, and referral tests pass.
- Firestore emulator concurrency and retry cases pass.
- Razorpay sandbox Pack purchase and subscription replacement pass.
- Firebase changes promote to MenuList QA and production in the same session after local validation.
- Vercel deployment remains explicit opt-in.

## Approved Commercial Choices

1. **Allowances:** 75 Official, 250 Pro, 300 per paid Multi-location location.
2. **Pack:** 250 credits for ₹799 / $29 before applicable tax.
3. **Cancellation validity:** 365-day reactivation window for frozen purchased credits.

Tax display, GST, and international export treatment are implemented through the separate billing-taxation contract. Invoice wording and credit-note behavior remain outside this record.
