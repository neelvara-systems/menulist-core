# MenuList Help Center — Feature Documentation

> **Location:** `__docs__/answerlattice/help-center/`
> **Purpose:** Documents MenuList's owner-facing support client and its scoped Answerlattice runtime boundary
> **Last Updated:** 2026-07-16

---

## Document Index

| Document | Purpose |
| --- | --- |
| `help-center_spec.md` | Owner and operator behavior |
| `help-center_impl.md` | Routes, components, DAL and runtime contracts |
| `help-center_firebase.md` | Firestore, Storage, provider and cost boundaries |
| `help-center_marketing.md` | Approved internal positioning and forbidden claims |
| `help-center_website.md` | Current website/content decision |
| `help-center_helpdoc.md` | Owner instructions and failure fallbacks |
| `help-center_mobile-support.md` | MobileShell routing and touch behavior |
| `help-center_decoupling-analysis.md` | Historical pre-separation assessment; not current architecture authority |

## Current Boundary

`/help-center` is a MenuList owner surface. Search, knowledge content, FAQs, changelog, feedback and support tickets use the signed-in user's explicit Answerlattice product-account scope. MenuList source identity is retained only as bounded `sourceContext`; Answerlattice remains the owner of support data and provider operations.

The Help Center does not mount Answerlattice governance, drift, mutation, coverage or platform administration inside the owner tab set. It also does not become a separate helpdesk product.

Current local source gate:

```bash
npm run verify:help-center-boundary
```

The gate covers authenticated/bounded search, response normalization, internal related-content links, desktop and MobileShell routing, scoped ticket reads and transactions, attachment admission/opening, append-only Firestore history, immutable satisfaction, current footer routes and maintained docs. Dedicated and shared Firestore rule emulator suites remain required because the repository supports a separate active Answerlattice target plus an explicit local shared-mode compatibility target.

## Release Boundary

Source gates do not prove target deployment, Answerlattice product-account provisioning, Firebase Auth claim sync, SMTP/provider availability, browser/device behavior or production-host routing. Those remain release evidence. Vercel deployment is owner-approved only.
