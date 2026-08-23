# Commercial Readiness Owner Guide

## What owners should see

- The selected plan, billing period, location quantity, tax, and final total
  before payment.
- A processing state while Razorpay activation is still being confirmed.
- The settled payment and any available invoice or credit note in Billing.
- Content Credit balance only after a paid pack is verified.

## What owners should not need to decide

Internal plan IDs, tax-engine logic, provider webhook state, document numbering,
or retry behavior are system responsibilities. If external confirmation is
pending, the UI must state that plainly without asking the owner to reconcile
records manually.
