# Answerlattice Client Onboarding — Marketing

> **Last Audited:** 2026-08-14

## Safe Positioning

Answerlattice offers authenticated self-service setup for founder-led SaaS teams. A founder can select the product areas customers ask about, preview relevant starter support checks, then select a paid monthly plan, create a product workspace, receive a one-time widget key, and continue to knowledge activation without a mandatory sales call.

## Verified Claims

- Google-authenticated self-service workspace creation is implemented.
- A deterministic client-only preview prioritizes up to four maintained First Trusted Answer starter questions from the selected product surfaces before plan selection.
- Launch, Growth, and Studio monthly plans are available with INR or USD pricing; the validated billing country determines the checkout currency.
- The flow is resumable across response loss and indeterminate provider outcomes.
- An exact known cancelled, completed, or expired checkout is separated from unknown provider state and can be retried after scoped recovery. This is not a claim that every provider failure self-recovers.
- The initial widget key is shown once; lost plaintext credentials require rotation.
- Unknown payment-provider state is held for recovery rather than silently treated as success or failure.
- The optional first-discovery question uses a closed list, accepts no free text, and does not affect payment or entitlement.

## Claims Requiring External Evidence

- Setup completes in a specific number of minutes.
- Every founder completes setup without assistance.
- Payment succeeds, activation is immediate, or the provider never duplicates subscriptions.
- A created workspace has accurate product knowledge or is ready for live customer support.
- The widget reduces support volume or resolves a stated percentage of questions.

## Prohibited Claims

- “Free workspace” or “no payment required.”
- “Guaranteed instant activation.”
- “Exactly once” provider execution.
- “Automatic cancellation” after any onboarding failure.
- “Your data is fully imported during signup.”
- “AnswerLattice analyzed your website,” “generated your answers,” or “your answers are ready” based on the pre-plan preview.
- “The one-time widget key can be recovered later.”

## Conversion Event

The commercial event is a founder reaching a valid `payment_pending` workspace with a safe checkout link and an explicit next step. It is not a completed payment, accurate answer set, installed widget, or verified customer resolution.

Self-reported discovery is directional acquisition evidence, not proof that one
channel caused signup and not permission to claim AI recommendation volume.
