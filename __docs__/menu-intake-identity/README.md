# Menu Intake Identity

Shared preflight layer for uploaded menu files before full extraction.

| Audience | Document |
| --- | --- |
| Product | [menu-intake-identity_spec.md](./menu-intake-identity_spec.md) |
| Engineering | [menu-intake-identity_impl.md](./menu-intake-identity_impl.md) |
| Cost | [menu-intake-identity_firebase.md](./menu-intake-identity_firebase.md) |
| Mobile | [menu-intake-identity_mobile-support.md](./menu-intake-identity_mobile-support.md) |
| Help | [menu-intake-identity_helpdoc.md](./menu-intake-identity_helpdoc.md) |
| Website | [menu-intake-identity_website.md](./menu-intake-identity_website.md) |
| Marketing | [menu-intake-identity_marketing.md](./menu-intake-identity_marketing.md) |
| QA | [menu-intake-identity_test-cases.md](./menu-intake-identity_test-cases.md) |

## Status

Implemented.

## Purpose

Menu upload currently validates file type/size, then sends the files into full AI extraction. Messaging onboarding separately extracts business name, phone, address, business type, valid menu pages, and non-menu files. This feature turns that identity check into shared intake infrastructure for dashboard upload, mobile upload, and messaging onboarding.

The layer must stay conservative: AI may suggest identity and warn about obvious mismatch, but owner-entered business truth is never overwritten automatically. When detected business name, phone, address, or type differ from the current store, desktop and mobile can ask the owner whether to save those details. Only selected fields are written.

For a strong mismatch or high truth-risk upload in an existing project, the owner can either add the upload there anyway or create a new menu from the same valid uploaded files. Non-menu files are ignored and removed from temporary storage before extraction.

Desktop and mobile preflight calls use the shared browser request boundary: same-origin credentials, no-store cache policy, manual redirect handling, bounded response parsing, and fixed owner-safe failure copy.
