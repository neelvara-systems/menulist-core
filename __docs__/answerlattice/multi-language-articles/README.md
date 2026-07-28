# Answerlattice Multi-Language Articles

> **Status:** Draft generator source-hardened; customer delivery not implemented
> **Version:** 1.0.0
> **Last verified:** 2026-07-20
> **Flag:** `ENABLE_ANSWERLATTICE_MULTI_LANGUAGE=false`

## Purpose

This rollout-gated workflow can prepare a private, source-fingerprinted translation draft for one English (`en-US`) KB article and one supported target locale.

It is not a multilingual help-center runtime. Answerlattice currently has no verified tenant locale configuration, human approval action, customer locale selection, locale fallback, translated search/indexing, translated compiled bundle, or translated public-content projection. The feature stays disabled.

## Frozen Boundary

- AI output is always stored with `status: draft`.
- Strict JSON schema failures write nothing.
- The source article must have exact `pId: AL` and workspace scope, and is re-read with the same checks in a transaction after the model call.
- A changed source or existing locale translation blocks the write.
- Translation drafts do not bump public KB/context versions.
- Public content and Support Truth Export exclude drafts.
- Provider attempts are recorded with an explicit outcome even when the provider fails, its output is rejected, or the final draft write conflicts. The route awaits the failure-contained operation-log settlement before returning.
- Human-reviewed publication and customer delivery require a separate docs-first implementation plus customer validation.

## Documents

| Document | Purpose |
|---|---|
| [multi-language-articles_spec.md](./multi-language-articles_spec.md) | Product contract and non-goals |
| [multi-language-articles_impl.md](./multi-language-articles_impl.md) | Runtime and file map |
| [multi-language-articles_firebase.md](./multi-language-articles_firebase.md) | Data and cost contract |
| [multi-language-articles_helpdoc.md](./multi-language-articles_helpdoc.md) | Owner-visible availability |
| [multi-language-articles_mobile-support.md](./multi-language-articles_mobile-support.md) | Mobile assessment |
| [multi-language-articles_marketing.md](./multi-language-articles_marketing.md) | Claim boundary |
| [multi-language-articles_website.md](./multi-language-articles_website.md) | Public-site boundary |
| [multi-language-articles_test-cases.md](./multi-language-articles_test-cases.md) | Verification cases |
| [multi-language-articles_validation.md](./multi-language-articles_validation.md) | Latest audit evidence |
