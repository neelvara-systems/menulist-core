# Answerlattice Advanced White Label

> **Status:** Validated private profile prototype; customer delivery absent; disabled by default
> **Version:** 1.0.0
> **Last verified:** 2026-07-20
> **Flag:** `ENABLE_ANSWERLATTICE_WHITE_LABEL=false`

## Purpose

This rollout-gated feature stores one bounded branding profile for an Answerlattice workspace. It is preparation for a future, explicitly validated branding workflow.

No customer-facing runtime consumes this profile. The live widget continues to use the separate, bounded `stores/{sId}.widgetConfig` contract. Hosted help, knowledge-base pages, email notifications, compiled context, and public APIs do not read `platformSummary/branding_{tId}_{sId}`.

## Frozen Boundary

- Exact Answerlattice product and workspace ownership is required.
- Only allowlisted identity, HTTPS asset/legal-link, color, contact, and badge fields are accepted.
- Arbitrary CSS, custom fonts, scripts, HTML, theme packages, and remote execution are rejected.
- Invalid stored data falls back to the Answerlattice default profile.
- Saving the private profile does not invalidate customer caches or claim deployment.
- The feature remains disabled until a named customer workflow and all target surfaces are implemented and tested together.

## Documents

| Document | Purpose |
|---|---|
| [advanced-white-label_spec.md](./advanced-white-label_spec.md) | Product contract and non-goals |
| [advanced-white-label_impl.md](./advanced-white-label_impl.md) | Runtime and file map |
| [advanced-white-label_firebase.md](./advanced-white-label_firebase.md) | Storage, rules, cost, and deployment |
| [advanced-white-label_helpdoc.md](./advanced-white-label_helpdoc.md) | Owner availability and current workaround |
| [advanced-white-label_marketing.md](./advanced-white-label_marketing.md) | Commercial claim boundary |
| [advanced-white-label_website.md](./advanced-white-label_website.md) | Public-site boundary |
| [advanced-white-label_mobile-support.md](./advanced-white-label_mobile-support.md) | Responsive and mobile assessment |
| [advanced-white-label_test-cases.md](./advanced-white-label_test-cases.md) | Verification cases |
| [advanced-white-label_validation.md](./advanced-white-label_validation.md) | Latest audit evidence |
