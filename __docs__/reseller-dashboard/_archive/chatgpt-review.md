# Reseller Dashboard — ChatGPT Feedback Review

**Date:** February 27, 2026  
**Source:** ChatGPT doc feedback on reseller-dashboard spec + impl  
**Reviewer:** Cascade  
**Docs Updated:** spec, impl, README

---

## Audit Summary

| # | ChatGPT Point | Verdict | Action Taken |
|---|---|---|---|
| 1 | Reusing `FirestoreSubscriptionDoc` — correct | ✅ AGREE | No change (already in docs) |
| 2 | Fixed tiers — correct | ✅ AGREE | No change |
| 3 | Separate `resellerTransactions` — correct | ✅ AGREE | No change |
| 4 | Feature flag — correct | ✅ AGREE | No change |
| 5 | Caps + sunset plan — correct | ✅ AGREE | No change |
| 6 | **Use Razorpay Subscriptions (recurring) instead of Payment Links** | ✅ **AGREE — MAJOR** | Updated spec §4.1, impl §5. `getOrCreateRazorpayPlan()` already supports dynamic plan creation. `shortUrl` on subscription is shareable. Same webhooks, same state machine. |
| 7 | Define renewal anchor rule (after expiry → now, before → extend) | ✅ AGREE | Updated spec §7 |
| 8 | Cap = concurrent active (not lifetime) | ✅ AGREE | Updated spec §8.1, impl §2.3 |
| 9 | Unify state authority (subscription.status = sole authority) | ✅ AGREE | Updated spec §7 |
| 10 | Encode migration path as feature-flag-based tier sunset | ✅ AGREE | Updated impl §3 |
| 11 | Grace period dual authority risk | ✅ AGREE | Clarified in spec §7 |
| 12 | Duration = "commitment period" (not prepaid window) for online | ✅ AGREE | Updated spec §3.3, §4.1 |
| 13 | Yearly recurring plans for discount | ✅ AGREE | Updated spec §3.3 |
| 14 | 2 billing models (not 3) | ✅ AGREE | Updated spec §4, impl throughout |

### ChatGPT Accuracy: ~85%

Significantly better than typical ChatGPT reviews. The core insight — using Razorpay Subscriptions instead of Payment Links — was correct and supported by codebase evidence (`getOrCreateRazorpayPlan()`, `shortUrl`, existing webhook handler).

### What ChatGPT Got Right
- Identified that Payment Links create structural divergence
- Correctly flagged renewal anchor ambiguity
- Correctly identified cap type ambiguity
- Good strategic framing (growth adapter layer, not core engine)

### What ChatGPT Missed
- Didn't know `shortUrl` already exists on subscription objects
- Didn't know `getOrCreateRazorpayPlan()` already handles dynamic plan creation
- Didn't know existing webhook handler handles all subscription events already
- Some suggestions were already in our docs (state authority, sunset plan)
