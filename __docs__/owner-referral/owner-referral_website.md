# Owner Referral - Website Content

**Feature:** Owner Referral
**Status:** Implemented behind disabled acquisition controls; public release not approved
**Primary route:** `/invite#r=<authenticated-encrypted-token>`
**Last updated:** July 10, 2026
**Audience:** Website, product, legal, localization

---

## Publication Boundary

The route and referral legal source exist in code, but acquisition remains disabled. Do not enable or promote the route until legal review, payment sandbox evidence, Firebase deployment, and production-host browser/device QA are complete.

The route is a private referral handoff, not an indexable acquisition page.

---

## Page Principles

- one short trusted handoff;
- one real MenuList product proof;
- payment-only reward rule above the fold;
- explicit business-name/status privacy notice;
- primary referral CTA and secondary non-referral path;
- three short setup steps;
- three-step follow-through and normal footer;
- no activation checklist, countdown, cap, tier, testimonial, or long-form marketing page.

---

## Metadata

**Page title:** Business owner invitation - MenuList

**Meta description:** A MenuList business invited you to create your official customer link.

**Robots:** `noindex, nofollow`

**Canonical:** `/create-menu`

**Open Graph title:** Business owner invitation - MenuList

**Open Graph description:** A MenuList business invited you to create your official customer link.

Never place the token, referrer identity, reward amounts, business name, or status in metadata. The token remains in the URL fragment and is removed before analytics.

---

## Valid Invitation Page

### Hero

**Eyebrow:** Business owner invitation

**Headline:** Another business owner invited you to MenuList.

**Body:** Keep your menu and public business information current from one place, with one customer link that stays up to date.

**Reward disclosure:** Your business receives 50 credits. The inviting business receives 100 credits.

**Payment/no-limit line:** Credits are added when both MenuList subscriptions are paid. There is no referral limit or extra activity requirement.

**Privacy notice:** If you continue through this invitation, the referring business can see your business display name and a general referral status. MenuList does not share your contact details, plan, payment amount, payment method, or account activity.

**Primary CTA:** Create my customer link

**Secondary CTA:** Continue without referral

The primary CTA calls the capture endpoint. The secondary CTA opens normal `/create-menu` without setting the referral cookie.

### Product Proof

Show one real MenuList public-menu mobile image beside the handoff copy.

This proof explains MenuList. It is not a referral qualification requirement.

### How It Works

1. Add your menu.
2. Review your details.
3. Publish one link.

These are product-setup steps, not referral qualification conditions.

---

## Existing MenuList Business Continuation

The public `/invite` route does not inspect authentication, subscription, or payment state. It captures a valid invitation only after the CTA and continues to `/create-menu`. Existing-unpaid and existing-paid handling occurs in the protected setup/subscription routes.

### Existing Unpaid Business

The existing business may bind the referral before its first successful MenuList subscription payment. Normal setup/subscription flow retains the captured referral.

### Existing Paid Business

The protected subscription flow detects prior successful payment transactionally, does not create a referral, clears the capture cookie, and continues normal billing without exposing payment detail to the referrer.

This is the only causal timing boundary. Do not add usage, source, identity, reseller, plan, geography, volume, or retention explanations.

---

## Invalid or Expired Link

**Headline:** This invitation is unavailable

**Body:** Ask the business that invited you for a new link, or continue with normal MenuList setup.

**Primary CTA:** Create my customer link

Do not reveal whether the token was invalid, expired, tampered with, or globally invalidated.

---

## Support Copy Bank

The following answers are approved for Help or support use. They are intentionally not rendered on the short `/invite` handoff page.

### What do both businesses receive?

The referring business receives 100 credits. Your business receives 50 credits.

### When are credits added?

As soon as MenuList verifies that both businesses have paid MenuList subscriptions.

### Do I need to publish or complete any actions?

No. Publishing, sharing, QR downloads, distribution actions, and waiting periods are not referral requirements.

### Is there a referral limit?

No. Each distinct referred business can issue one reward pair after both subscriptions are paid.

### What can credits be used for?

Generated menu images, descriptions, translations, and edits. Credits are not cash and core menu publishing, QR codes, and customer links do not depend on the reward balance.

### What can the referring business see?

Your business display name and a general referral status. It cannot see your contact details, plan, payment amount, payment method, or account activity.

### Can an existing MenuList business use the invitation?

An existing unpaid business can attach the invitation before its first paid MenuList subscription. A business that already completed its first paid subscription cannot add a referral retroactively.

---

## Pricing Page Boundary

Owner Referral is not a pricing-card headline. A pricing FAQ may say:

**Question:** Does MenuList have owner invitations?

**Answer:** Eligible MenuList businesses can privately invite another business. After both subscriptions are paid, MenuList adds 100 credits to the referring business and 50 credits to the referred business. There is no referral limit or post-payment action requirement.

Do not show currency equivalents, countdowns, scarcity, tiers, or `Refer and earn` copy.

---

## Terms of Service Source

The Owner Referral section must cover:

1. **Referral timing:** Attribution must be bound before the referred business's first successful MenuList subscription payment.
2. **Two paid businesses:** Both distinct MenuList subscription wallets must be verified paid.
3. **Reward:** 100 credits to the referrer and 50 to the referred business.
4. **Immediate settlement:** Issue when both paid states are verified; otherwise keep payment-pending without expiry.
5. **No cap:** No rolling, calendar, or lifetime reward limit.
6. **No activation conditions:** No publish, source, QR, distribution, usage, or retention requirement.
7. **No category exclusions:** Plan tier, interval, geography, category, onboarding source, reseller/agency involvement, owner identity, business-name similarity, device, IP, and phone do not change eligibility when the two paid-wallet rule is met.
8. **One issue per referred wallet:** Deterministic settlement prevents duplicate issue.
9. **No cash value:** Credits are non-transferable and not redeemable for money.
10. **Privacy:** Referrer sees business display name and general status only after pre-capture disclosure.
11. **Final wallet issue:** Later cancellation, refund, or chargeback does not subtract pooled Pack credits; existing payment/account policies remain separate.
12. **Program control:** MenuList may pause new invitations or settlement for operational integrity while preserving already-attributed records.

---

## Analytics

No referral-specific website analytics events are emitted in the current implementation. If approved later, the allowed anonymous event vocabulary is:

- invite page viewed;
- referral CTA selected;
- non-referral path selected;
- pricing selected;
- invalid/expired state viewed.

Never send token, tenant/store/user/subscription/payment IDs, business name, contact, plan, price, or referral status to website analytics.

---

## Website Acceptance

- [x] Payment-only rule and 100/50 rewards appear above the fold.
- [x] No referral cap or post-payment condition appears.
- [x] Business-name/general-status disclosure appears before capture.
- [x] Non-referral path does not set a cookie.
- [x] Existing unpaid and existing paid states are handled in protected continuation routes.
- [x] Token is absent from metadata, logs, and analytics.
- [x] Page remains noindex, frame-denied, mobile-first, and short.
- [x] English/Hindi runtime copy, legal source copy, Help, spec, and runtime rules match.
