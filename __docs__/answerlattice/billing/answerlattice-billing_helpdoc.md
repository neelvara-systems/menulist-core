# Answerlattice Billing - Owner Help

> **Version:** 2.0.0
> **Last Updated:** 2026-08-24

## Who Can Manage Billing

Only the workspace Owner or a current custom role with Billing permission can open billing details or change the subscription. A Manager or Support Staff role does not receive billing access by default.

## Choose Or Change A Plan

1. Open **Billing**.
2. Review the available Answerlattice plans.
3. Choose the plan and complete the hosted Razorpay checkout.
4. Return to Answerlattice after payment verification.

Creating a checkout does not activate paid access. The subscription must be confirmed by the payment flow.

Your billing country determines the checkout currency. India uses INR. Eligible international billing uses USD only when international checkout is available. Currency is not a preference switch.

## Interrupted Checkout

Return to **Billing**. Answerlattice can reuse the exact pending checkout when it is still valid. If the provider outcome is uncertain, do not create repeated payments; follow the recovery message or contact support with the workspace and approximate attempt time.

If the pending checkout belongs to a plan that is no longer offered, Billing shows **Choose Current Plan**. Select a current plan once. Answerlattice will replace only an unpaid checkout whose provider state can be confirmed safely; it will wait rather than create a second subscription while payment confirmation is in progress.

## Support Credits

Support-credit packs add purchased credits to the current Answerlattice subscription. Credits are applied only after successful verification or signed provider recovery. Replaying the same payment must not add credits twice.

## Transactions

Open **Transactions** to view admitted subscription charges, support-credit purchases, and support-credit usage. Open **Billing** to view issued Answerlattice invoices and credit notes. A hosted provider link appears only when it passes the verified provider-host check. Missing links do not mean the charge is missing; contact support if provider evidence is needed.

## Invoice Delivery

- Answerlattice emails an issued invoice or credit note when a valid billing, owner, or workspace support email is available and delivery is configured.
- WhatsApp delivery is additional, not a replacement for Billing. It requires a verified owner number and active notification consent.
- Delivery can be delayed or unavailable without changing the settled payment. The document remains available in Billing.
- Never pay again only because an email or WhatsApp message did not arrive.

## Refunds And Credit Notes

Refunds are provider-controlled and are not initiated from the Answerlattice browser. After a signed provider refund is settled, Answerlattice records the refund, reverses eligible purchased credits exactly once, and issues a linked credit note when legal document issuance is configured. Contact Billing support for a refund request or reconciliation question.

## Payment Problems

- **Checkout closed:** reopen Billing and retry or resume the pending checkout.
- **Payment pending:** wait for verification; paid access is not assumed.
- **Past due:** follow the displayed recovery path while provider retry/grace evidence is current.
- **Wrong role:** ask the Owner to grant a custom role Billing permission.
- **History unavailable:** retry later; do not repeat a successful payment only because history failed to load.
- **Billing unavailable:** use **Retry**. Plan changes stay disabled until Answerlattice confirms the current subscription state, so an unavailable read is not mistaken for an account without a subscription.

Never send card details, payment credentials, API secrets, or private provider payloads through a support ticket.
