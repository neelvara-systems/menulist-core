# Owner Referral - Mobile Support

**Feature:** Owner Referral
**Decision:** Supported inside the existing Mobile Share tab
**Status:** Implemented behind disabled rollout controls; device/payment QA pending
**Last updated:** July 11, 2026

---

## Mobile Admission

| Test | Result |
| --- | --- |
| Frequent real-world mobile action | Pass - owners commonly share through phones |
| Faster than desktop | Pass - native Share and WhatsApp are primary channels |
| Clear owner value | Pass - one paid-referral rule and fixed credits |
| Inherits shared logic | Pass - shared API, hook, token, payment, and wallet contracts |
| Fits current shell | Pass - existing Share tab and bottom sheet |

No bottom-navigation item, dashboard card, Billing shortcut, or standalone mobile route is added.

---

## Placement

Add one compact action inside `MobileShareScreen` after the existing customer-link sharing controls:

**Invite a business owner you know**

Selecting it opens `MobileOwnerReferralSheet` inside `MobileShell`.

The action is visible only when:

- acquisition is enabled for the pilot/global rollout;
- the current store is admitted by the configured pilot allowlist.

The sheet loads lazily. The protected owner API then verifies paid MenuList subscription evidence and billing-management authority. This avoids adding subscription or role reads to Mobile Share boot; an unauthorized or unpaid actor receives the same generic unavailable state.

There is no referral-count, plan-tier, category, geography, owner-identity, reseller, agency, or onboarding-source visibility check.

---

## Bottom Sheet

### Header

- title: `Invite a business owner you know`;
- close icon with accessible label;
- current mobile sheet behavior;
- no route change or nested navigation.

### Reward Summary

| Business | Copy |
| --- | --- |
| Your business | 100 credits |
| Invited business | 50 credits |

Supporting copy:

> 100 credits: up to 20 generated menu images or 100 description rewrites.

> 50 credits: up to 10 generated menu images or 50 description rewrites.

> Credits are added after both MenuList subscriptions are paid.

> No referral limit. No publishing, sharing, distribution, or waiting requirement after payment.

Do not use counters, progress rings, countdowns, confetti, tiers, currency equivalents, or cap messages.

### Share Actions

Order:

1. Share
2. WhatsApp
3. Copy link

Each control has a minimum 44x44px target, a familiar Lucide icon, visible label, and stable dimensions at 320px width.

Behavior:

- Share remains the first action; it uses native Share when available and falls back to Copy when unavailable;
- WhatsApp opens an encoded `wa.me` URL without recipient number;
- Copy uses Clipboard API and current fallback behavior;
- no recipient information is stored;
- no referral-specific analytics event is emitted in the current implementation;
- raw invite URLs never enter diagnostics.

### Disclosure

Default message:

> We use MenuList to keep our menu and business information current from one place. You can set up yours here: [invite link]
>
> MenuList adds credits to both businesses after both MenuList subscriptions are paid.

---

## Recent Status

Show at most ten rows below sharing controls.

Each row contains:

- referred business display name;
- one general status;
- relevant date;
- no chevron or drill-down;
- no plan, price, payment amount, payment method, contact, or account activity.

Statuses:

| Status | Mobile copy |
| --- | --- |
| `attributed` | Their payment pending |
| `payment_pending` | Their payment pending |
| `reward_issued` | Credits added |

Long business names use two lines, then ellipsis with an accessible full label.

---

## Screen States

### Loading

- open the sheet immediately;
- show a stable centered preparation state;
- do not block the Share screen;
- target usable state within two seconds on ordinary mobile data.

### No Referrals

> No business has started through your invitation yet.

Do not imply that a sent message was delivered or opened.

### Their Payment Pending

> Their payment pending

> Credits are added after both MenuList subscriptions are paid.

Do not tell the referrer to pressure the other business or expose which payment is missing.

### Credits Added

> Credits added

The issued row shows the `Credits added` status. Pack balance and the zero-cash `Referral reward` transaction remain visible through the existing Billing screen; the sheet adds no route or Billing shortcut.

### Feature Disabled

The entry is absent. A stale open sheet closes with generic unavailable copy. Existing settlement continues separately when its control remains enabled.

### Offline

Keep the Share screen mounted and show the sheet's calm temporary-unavailable state when its lazy API request cannot complete. Never show false payment success.

---

## Shared Logic

Mobile reuses:

- the protected owner referral API;
- `useOwnerReferral`;
- payment-only 100/50 policy constants;
- status mapping;
- share message builder;
- existing subscription and Pack-balance logic.

Mobile must not create:

- a separate referral DAL;
- a separate Firebase listener;
- a cap counter;
- an activation/distribution checklist;
- a 30-day timer;
- a scheduler status;
- direct subscription or referral writes.

---

## Accessibility and Localization

- minimum 44px touch targets;
- visible focus and keyboard access where applicable;
- sheet title announced;
- status meaning does not depend on color;
- labels fit at 320px without horizontal scroll;
- motion respects reduced-motion preference;
- external-app handoff is announced;
- English and Hindi keys ship together.

Required strings:

- Invite a business owner you know
- Share
- WhatsApp
- Copy link
- Link copied
- Your business receives 100 credits
- Invited business receives 50 credits
- Exact generated-image and description-rewrite examples
- Both subscriptions must be paid
- No referral limit
- Their payment pending
- Credits added

Forbidden strings:

- Refer and earn
- Complete two actions
- Publish to qualify
- Active for 30 days
- Reward window
- Referral limit reached
- Invite again later
- Top referrer
- Reward streak

---

## Mobile QA

| Scenario | Expected result |
| --- | --- |
| Paid eligible business | One Share-tab entry |
| Many prior rewards | Share remains available; no cap state |
| Native Share available | Share appears first |
| Native Share unavailable | Share falls back to Copy; WhatsApp and Copy remain |
| 320px width | No clipping or horizontal scroll |
| Long business name | Stable two-line row |
| Waiting referral | No private payment detail or pressure copy |
| Reward issued | 100-credit status, no duplicate write |
| Offline | Calm unavailable state |
| Dark mode | Readable controls and status |
| Staff without billing authority | API denied with generic unavailable state; no referral data returned |
| Feature off | No entry or orphan sheet |
| Shell navigation | Share screen remains mounted |

---

## Mobile Completion Gate

- [x] Payment-only rule and no-limit copy match desktop/public content.
- [x] No activation, distribution, retention, deadline, or cap UI exists.
- [x] Share order and 44px targets are implemented.
- [x] Status rows remain private, bounded, and stable for two-line long names.
- [x] English/Hindi keys and theme-token styling are implemented.
- [ ] iOS Safari and Android Chrome payment/status refresh pass.
- [x] Mobile stays inside `MobileShell`.
