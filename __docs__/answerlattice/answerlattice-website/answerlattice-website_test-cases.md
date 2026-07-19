# AnswerLattice Website Test Cases

> **Last audited:** July 19, 2026

## Automated Source Gate

Run:

```bash
npm run verify:answerlattice-public-website
```

The gate verifies:

1. Starter, Growth, and Studio monthly INR/USD prices and credits match the plan source.
2. Pricing, FAQ, Billing, and the pricing resource match operation-level support-credit costs and zero-credit paths.
3. The public page registry has unique public paths and every registered page file exists.
4. The sitemap uses the registry and does not manufacture `lastmod`.
5. The demo is a disclosed six-stage state machine with no fetch, Firebase, or model dependency.
6. Forbidden claims and unsupported schema types stay out of public source.
7. Get Started uses native form submission, bound labels, bounded fields, legal links, selected-surface admission, bounded responses, and safe checkout URLs.
8. Contact uses semantic typed controls, consent links, bounded I/O, validation, abuse controls, and retention.
9. Mobile navigation traps and restores focus and has no duplicate touch activation.
10. Trust and Privacy render shared retention constants and preserve the Gemini no-training/zero-retention non-claim.
11. Terms preserve the operating trade-name, customer-content, cancellation/end-of-cycle, deletion, answer-reliance, and legal-completion boundaries.
12. Root mail uses only the `nodemailer9` alias resolved to `9.0.3`, direct root `nodemailer` remains absent for NextAuth optional-peer compatibility, and Answerlattice Functions retain their independent `9.0.3` pin.
13. The complete website documentation dossier exists.

## Functional Cases

1. Pricing displays three monthly plans in increasing INR price order and equivalent USD amounts.
2. A plan CTA reaches Get Started with the selected plan.
3. Invalid plan/currency query values fall back to Starter/INR.
4. Enter submits the valid details form.
5. Empty, one-character, over-length, invalid-email, credential-bearing URL, and no-surface submissions stop before the API request.
6. Strictly admitted onboarding success shows only an allowlisted checkout URL and one-time widget-key state.
7. Malformed, oversized, redirected, or unexpected onboarding responses use fixed failure copy.
8. Contact rejects missing consent, short messages, invalid email/URL, oversized payloads, failed captcha, and rate-limit admission.
9. Demo reset and all six stages remain keyboard reachable and disclose sample/runtime status.
10. Mobile drawer cycles focus, closes with Escape, and restores the trigger.
11. Pricing and FAQ identify only provider fallback, full-runtime answer tests, first-ten starter generation, OCR, and transcription as charged operations.
12. Trust and Privacy display retention values from the shared source and do not state unverified AI-provider training or zero-retention guarantees.
13. Terms show the Neelvara Systems operating trade-name relationship, current cancellation/end-of-cycle behavior, and the explicit legal-counsel completion boundary.
14. `npm ls nodemailer nodemailer9 --all` succeeds with only the root `nodemailer9@npm:nodemailer@9.0.3` runtime, and the security audit reports no Nodemailer advisory.

## External Release Evidence

- hosted `answerlattice.com` and QA route smoke;
- canonical/robots/sitemap/JSON-LD inspection from deployed HTML;
- real Google sign-in and AnswerLattice session scope;
- disposable Razorpay test-mode checkout, webhook, Billing, and Activation convergence;
- Turnstile and public contact write/retention evidence;
- consent accept/decline analytics network inspection;
- mobile/desktop keyboard, screen-reader, contrast, zoom, and reduced-motion checks;
- legal-counsel approval of the commercial terms;
- deployed Gemini billing tier, enabled-feature, abuse-monitoring, and zero-retention configuration evidence for any future provider data-use claim;
- real buyer comprehension, activation, payment, and retained-use evidence.

Local source completion must not be reported as any of those external outcomes.
