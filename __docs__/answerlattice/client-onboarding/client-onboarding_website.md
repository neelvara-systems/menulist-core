# Answerlattice Client Onboarding — Website Contract

> **Last Audited:** 2026-08-13

## Entry Surface

- Public route: `/get-started`
- Authentication: Google through the shared NextAuth surface
- Required input: company name
- Optional product profile: product name, HTTP(S) URL without embedded credentials, support email, billing model, initial product surfaces, and one closed-list first-discovery source
- Commercial input: current monthly plan and INR/USD checkout currency

The page may explain that setup is self-service. It must not state that signup alone activates paid service, imports every source, installs the widget, or proves answer quality.

## Completion Surface

After a valid server response, the page shows:

- selected plan and pending billing amount;
- provider checkout when the stored URL passes the exact Razorpay-host boundary;
- one-time widget key for a newly finalized attempt, or a rotation instruction for a recovered attempt;
- dashboard and activation next steps.

The page does not automatically redirect. The founder chooses the next action.

## Recovery Copy

- `ANSWERLATTICE_PROVIDER_RECOVERY_PENDING`: payment setup is still being verified; wait and retry with the same details.
- `ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED`: the exact previous checkout is terminal; retry setup with the same details.
- `ANSWERLATTICE_SETUP_REQUEST_CHANGED`: retry with the original details until the attempt is resolved.
- `ANSWERLATTICE_SETUP_IN_PROGRESS`: allow the active attempt to finish before retrying.
- `429`: respect the displayed wait instruction and `Retry-After`.

Do not tell a founder to submit changed plan/company details to “unstick” an active attempt. Do not ask them to create a second account.

## Analytics Boundary

- Record workspace completion only after strict response validation.
- Record widget-key generation only when a new plaintext key is actually returned.
- Keep checkout click separate from payment activation.
- Never label an onboarding response, checkout open, or dashboard visit as customer-support resolution.
- Treat optional self-reported discovery as directional cohort evidence. Do not send it as an analytics event or reinterpret it as last-click attribution.
