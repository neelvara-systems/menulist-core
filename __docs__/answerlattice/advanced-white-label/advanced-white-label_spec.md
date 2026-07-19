# Advanced White Label Specification

> **Status:** Private prototype only
> **Decision:** Deprioritize customer delivery; keep disabled

## Customer Problem

A SaaS founder may eventually want support surfaces to use one company name, logo, color system, support contact, and legal-link set. That problem matters only when the same validated profile is consumed consistently by the deployed surfaces the customer actually uses.

The current profile editor alone does not solve that problem. It prepares bounded data without claiming that the widget, hosted help, knowledge base, emails, or APIs are white-labelled.

## Current Contract

1. `ENABLE_ANSWERLATTICE_WHITE_LABEL` must be true before the private governance tab appears.
2. The current session must have Answerlattice governance access and an exact positive `tId` and `sId`.
3. One document is read from `platformSummary/branding_{tId}_{sId}`.
4. Stored `pId`, `tId`, and `sId` must match the current workspace.
5. The profile is normalized through `AnswerlatticeAdvancedBrandingSchema`.
6. Save validates the same strict schema before one tenant-scoped Firestore write.
7. No customer runtime, cache version, bundle, notification, or public output changes.

## Allowed Fields

| Field group | Contract |
|---|---|
| Identity | `companyName`, 1-100 trimmed characters |
| Assets | Optional `logoUrl` and `faviconUrl`, HTTPS only, no credentials, whitespace, or fragment, maximum 500 characters |
| Colors | Six-digit hexadecimal values only |
| Visibility | Required boolean `poweredByVisible` |
| Contact | Optional valid `supportEmail`, maximum 160 characters |
| Legal | Optional HTTPS privacy and terms URLs under the same URL policy |

## Non-Goals

- No arbitrary CSS, HTML, JavaScript, or font loading.
- No theme marketplace or documentation-site builder.
- No image upload or asset transformation pipeline.
- No custom domain behavior.
- No per-surface override system.
- No customer-facing application until all selected surfaces share one validated read model.
- No claim that hiding the powered-by badge is commercially available.

## Activation Gates

The flag may be reconsidered only after a named customer validates the need, the exact delivery surfaces are selected, asset ownership and deletion are defined, contrast/accessibility checks exist, cache propagation is atomic, fallbacks are tested, pricing entitlement is decided, and browser/mobile evidence passes.
