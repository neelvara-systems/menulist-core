# AnswerLattice Website Firebase And Cost Contract

> **Status:** Implemented source contract
> **Last audited:** July 19, 2026

## Infrastructure Boundary

The public AnswerLattice site is hosted through the existing web application but uses AnswerLattice-owned Firebase/admin boundaries for AnswerLattice data. It must not write public enquiries, onboarding state, or support content into MenuList product collections.

## Operation Inventory

| Public action | Firestore/provider effect |
|---|---|
| Browse static pages | Zero Firestore operations |
| Run deterministic demo | Zero Firestore and zero AI-provider operations |
| Read pricing | Zero Firestore operations; plan source is bundled code |
| Accept/decline website analytics | Browser consent state; configured analytics only after acceptance |
| Submit contact form | One AnswerLattice enquiry write after strict post-sanitization validation, fail-closed rate limit, honeypot, and captcha admission |
| Start authenticated onboarding | Uses the Feature 28 provisioning transaction and Razorpay subscription flow |
| Open payment checkout | Razorpay-hosted provider flow; provider confirmation owns paid state |

## Contact Data

`src/app/api/answerlattice/public/contact/route.ts` writes to `DB_COLLECTIONS.ANSWERLATTICE_CONTACT_ENQUIRIES` with:

- `pId: AL`;
- sanitized bounded fields;
- consent and source path;
- hashed client IP;
- server timestamps;
- the `contactEnquiries` retention policy.

The public limiter fails closed: if its provider cannot determine admission, the route returns `503` before the enquiry write. Required name/message values are checked again after markup removal, and product URLs are limited to HTTP or HTTPS, so a syntactically present but empty or unsafe normalized value cannot enter the collection.

The request body is capped at 8KB. The form response is capped at 8KB. Raw exception/provider text is not returned.

## Onboarding

The website does not own a second provisioning model. `/api/answerlattice/onboard` and the self-service onboarding dossier own authentication, admission, Firestore transactions, provider recovery, compensation, subscription identity, product surfaces, and one-time widget-key behavior.

The browser submits only the selected current monthly plan, INR/USD currency, bounded profile data, and selected surfaces. Workspace creation is not paid activation; provider-confirmed settlement remains required.

## Deployment

This Feature 33 pass changes no Firestore rules, indexes, Storage rules, or Cloud Functions, so no Firebase deploy is required.

The root application dependency changes only its existing SMTP runtime: vulnerable direct Nodemailer `7.0.13` is replaced by the `nodemailer9` npm alias pinned to `9.0.3`. Existing root mail consumers import one typed wrapper. The alias deliberately does not satisfy NextAuth 4's unused optional `nodemailer ^7.0.7` peer, and Answerlattice Functions retain their independent direct `nodemailer` `9.0.3` pin. This does not add a provider, request, collection, or Firebase deployment target.

Hosted-domain routing, Vercel deployment, Firebase credentials, Razorpay test mode, SMTP, Turnstile, analytics IDs, and search indexing remain environment evidence rather than local source proof.
