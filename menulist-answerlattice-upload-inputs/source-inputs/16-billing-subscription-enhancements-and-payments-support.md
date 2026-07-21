# MenuList Billing, Subscription, Enhancements, And Payments Support

**Verified:** 2026-07-20 against the current Razorpay state machine, paid-cycle entitlement, outlet/HQ scope, content-credit policy, and owner transaction presentation.

## What Answerlattice Can Safely Explain

MenuList billing can show:

- current plan;
- active, pending, paused, cancelled, expired, or past-due status;
- current billing cycle;
- renewal or access end date;
- payment method summary;
- billing history;
- enhancement balance for images, descriptions, translations, and image editing;
- paid location capacity for multi-location accounts;
- inherited HQ billing for outlet stores.

## Owner Questions

### My payment is pending.

Complete the Razorpay checkout if a payment link is available. If there is no payment link or the checkout fails, contact support.

### My payment failed.

A failed recurring payment can move the subscription to `past_due`. When the recovery start time is valid, the current runtime uses a seven-day recovery period while payment is retried. If the legacy record does not contain a valid recovery time, the owner UI says that grace-period details are unavailable rather than showing a false countdown. Retry from Billing when available or contact support.

### I use an outlet but billing points to HQ.

Some outlets inherit the HQ subscription. Plan changes, payment retries, and enhancement packs may apply to the HQ store rather than the selected outlet.

### I need another location.

For active non-manual subscriptions, billing may show paid locations and an Add paid location action. Manual/prepaid accounts should contact the reseller or support.

### What are enhancements?

Enhancements cover extra menu image generation, descriptions, translations, and image editing. Plans include typical usage. Enhancement packs are available when a business needs more.

The current Content Credit Pack adds 250 Pack credits. Current public operation rates are:

- description rewrite: 1 credit;
- generated menu image: 5 credits;
- language addition request: 3 credits;
- item translation: 1 credit;
- image translation: 5 credits;
- image edit: 5 credits.

Eligible operations show required credits before work. Paid operations reserve credits before provider work, settle the same reservation after valid output, and restore the exact reserved buckets on terminal failure. Menu extraction, first-pass item metadata, first-pass description creation, business copy setup, and selected support/control-plane operations are platform-absorbed under the current policy.

### I cancelled or my subscription is paused. Do I lose access immediately?

Current-cycle `cancelled` and legacy/provider-side `paused` subscriptions retain their purchased plan only through a valid paid `cycleEndDate`. After the paid cycle ends, the plan entitlement expires. Self-service pause/resume remains disabled in the current source.

### Why does Transactions show an AI operation?

Transactions presents the owner-safe operation status and credit effect. It does not expose raw prompts, generated response bodies, provider cost, margin, internal tokens, or secret billing identifiers.

## Review-Gated Topics

Answerlattice must not invent:

- exact prices;
- refund promises;
- cancellation guarantees beyond what the active UI and policy show;
- tax details;
- invoice/legal details;
- payment settlement timelines;
- reseller-specific commitments.
- internal monthly allowance, provider cost, margin, overdraft, or quota economics;
- self-service pause/resume while that feature remains disabled.

For those topics, Answerlattice should give the safe next step: check Billing, open a support ticket, or contact MenuList support.

## Privacy Boundary

Do not expose card numbers, UPI IDs, full private transaction/provider IDs, invoices, Razorpay IDs, raw AI prompts/responses, provider economics, or private billing metadata in Answerlattice answers or screenshots.
