# MyCodex Founder Console

Private, responsive operating console for the single Neelvara platform owner.

## Status

- Product: MyCodex internal experience
- Data owners: MenuList and Answerlattice remain separate
- User: the current persisted `PLATFORM` account only
- Canonical path: `/__mycodex/operations`
- Primary devices: phone PWA and laptop browser
- Public website: none
- MyCodex Firebase: none

## Documents

| Document | Purpose |
| --- | --- |
| [mycodex-founder-console_spec.md](./mycodex-founder-console_spec.md) | Product and behavior contract |
| [mycodex-founder-console_impl.md](./mycodex-founder-console_impl.md) | Runtime architecture and file inventory |
| [mycodex-founder-console_firebase.md](./mycodex-founder-console_firebase.md) | Data ownership and paid-operation envelope |
| [mycodex-founder-console_mobile-support.md](./mycodex-founder-console_mobile-support.md) | Phone, tablet, PWA, and laptop behavior |
| [mycodex-founder-console_test-cases.md](./mycodex-founder-console_test-cases.md) | Certification matrix |
| [mycodex-founder-console_helpdoc.md](./mycodex-founder-console_helpdoc.md) | Private operator guide |
| [mycodex-founder-console_marketing.md](./mycodex-founder-console_marketing.md) | Internal positioning only |
| [mycodex-founder-console_website.md](./mycodex-founder-console_website.md) | Explicit no-public-surface boundary |

## Governing boundaries

- MyCodex owns navigation and presentation, not customer data.
- MenuList and Answerlattice keep their existing Firebase projects, APIs, authorization, tenant isolation, audit logs, and provider boundaries.
- CampaignCue is excluded until the owner explicitly reopens it.
- Platform access uses the global account-level `platformRole`; a store-scoped `role` never grants access.
- No platform mutation is available offline.
- No commit, push, Vercel deployment, or Firebase deployment is implied by this feature.
