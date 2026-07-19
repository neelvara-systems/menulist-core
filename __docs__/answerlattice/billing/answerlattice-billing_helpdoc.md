# Answerlattice Billing - Owner Help

> **Version:** 1.0.1  
> **Last Updated:** 2026-07-19

## Who Can Manage Billing

Only the workspace Owner or a current custom role with Billing permission can open billing details or change the subscription. A Manager or Support Staff role does not receive billing access by default.

## Choose Or Change A Plan

1. Open **Billing**.
2. Review the available Answerlattice plans.
3. Choose the plan and complete the hosted Razorpay checkout.
4. Return to Answerlattice after payment verification.

Creating a checkout does not activate paid access. The subscription must be confirmed by the payment flow.

## Interrupted Checkout

Return to **Billing**. Answerlattice can reuse the exact pending checkout when it is still valid. If the provider outcome is uncertain, do not create repeated payments; follow the recovery message or contact support with the workspace and approximate attempt time.

## Support Credits

Support-credit packs add purchased credits to the current Answerlattice subscription. Credits are applied only after successful verification or signed provider recovery. Replaying the same payment must not add credits twice.

## Transactions

Open **Transactions** to view admitted subscription charges, support-credit purchases, and support-credit usage. An invoice link appears only when it passes the verified provider-host check. Missing links do not mean the charge is missing; contact support if provider evidence is needed.

## Payment Problems

- **Checkout closed:** reopen Billing and retry or resume the pending checkout.
- **Payment pending:** wait for verification; paid access is not assumed.
- **Past due:** follow the displayed recovery path while provider retry/grace evidence is current.
- **Wrong role:** ask the Owner to grant a custom role Billing permission.
- **History unavailable:** retry later; do not repeat a successful payment only because history failed to load.
- **Billing unavailable:** use **Retry**. Plan changes stay disabled until Answerlattice confirms the current subscription state, so an unavailable read is not mistaken for an account without a subscription.

Never send card details, payment credentials, API secrets, or private provider payloads through a support ticket.
