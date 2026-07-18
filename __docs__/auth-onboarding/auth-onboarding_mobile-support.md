# Auth and Onboarding Mobile Support

**Status:** Responsive sign-in and website onboarding surface
**Last updated:** July 16, 2026

Auth and first-business setup happen before the authenticated owner shell, so they are intentionally responsive website/sign-in surfaces rather than `MobileShell` sub-screens. After sign-in and setup, owner routes continue through the normal mobile shell.

## Mobile contract

- Google remains the first sign-in option.
- One identity field supports email, phone, and Staff ID.
- Phone-like input switches to the WhatsApp OTP panel and keeps a passcode fallback.
- Phone input uses a country selector and `tel` keyboard; OTP uses the numeric keyboard and one-time-code autocomplete.
- Claim setup offers Google, email/password, and WhatsApp/passcode without leaving the sign-in surface.
- Pricing business details and Razorpay handoff work in the mobile browser.
- A returning owner with a pending onboarding subscription sees **Payment pending** and a large **Complete payment** or **Open Billing** action.
- External Razorpay links use a new browser context with `noopener,noreferrer`. Invalid stored checkout URLs are never opened; Pricing routes to Billing, while Billing keeps the safe support/no-payment-action state.
- Owner copy stays generic and does not expose Firebase, provider, token, tenant, store, or limiter details.

## PWA boundary

- No separate mobile authentication state is introduced.
- NextAuth and Firebase custom-claim sync remain shared with desktop.
- Direct sign-in/pricing routes are outside `MobileShell`; dashboard, Billing, and later owner work use the existing shell behavior.

## Required device checks

- narrow Android Chrome and iPhone Safari layouts;
- Google return to the correct host and callback path;
- WhatsApp OTP send, resend, paste/autofill, and passcode fallback;
- claim-link opening from WhatsApp and each setup mode;
- Razorpay open, dismissal, return to Pricing, pending recovery, and Billing recovery;
- post-payment dashboard handoff and Firebase-backed owner data access.

These device/provider checks remain pending until run on the target environment.
