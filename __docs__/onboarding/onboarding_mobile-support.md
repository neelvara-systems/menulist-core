# Onboarding — Mobile Support

**Last Updated:** July 16, 2026
**Decision:** Responsive first-class website flow outside `MobileShell`

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | Limited | Usually one-time, but payment recovery and returning-owner continuation are real flows |
| **Speed** | Required | Identity, business details, session refresh, and checkout must remain usable without desktop access |
| **Touch** | Required | Sign-in, OTP, plan selection, details, and payment recovery must remain touch-safe |
| **Value** | Required | A phone-first owner must be able to establish and recover the business account |

## Runtime contract

- Sign-in and pricing/onboarding are public responsive routes, so they do not bypass an already-active owner `MobileShell` screen.
- Google, credentials, WhatsApp OTP, and claim-link modes use the same server/session contracts on mobile and desktop.
- OAuth return must preserve the claim handoff, and the synchronous claim-in-flight guard must stop a rerender from redirecting before claim completion.
- Checkout dismissal leaves the pending subscription recoverable. Pricing shows `Complete payment` only for an allowlisted Razorpay URL and otherwise routes the owner to Billing.
- Successful workspace creation refreshes the NextAuth session from Firestore before dashboard routing and Firebase custom-claim sync.
- Owner copy remains fixed and non-technical; provider or Firebase exception text is never rendered.

## Pending device evidence

Run the exact flow on narrow iOS and Android browsers, including OTP keyboard behavior, Google OAuth return, claim return, checkout open/dismiss/resume, session refresh, and first dashboard entry. Source verification is not device certification.
