# MenuList Live Support Coverage Index For Canonica

## Purpose

This index defines the minimum MenuList support coverage required before live SMB owners use Canonica for help.

## Required Coverage Areas

| Area | Source files in this package | Live support readiness |
| --- | --- | --- |
| Product identity and boundary | `01`, `06`, `09`, `10`, `20` | Required before any public answer. |
| Account access and onboarding | `11` | Required for login/claim/access questions. |
| Menu creation and import | `02`, `12` | Required for setup and source import questions. |
| Intake identity and upload warnings | `12`, `26` | Required for wrong-menu, wrong-outlet, incomplete-upload, and business-detail update prompts. |
| Review, editing, and bulk changes | `02`, `04`, `12`, `26` | Required for owner menu operations and visible editor state support. |
| Public menu, QR, sharing, and URL permanence | `03`, `13`, `26` | Required for customer-facing correctness, old links, QR continuity, and offline/reconnect behavior. |
| Official Business Page | `03`, `13`, `14` | Required for public business link support. |
| Business settings, hours, and open status | `14`, `26` | Required for store profile/public truth support and open/closed badge questions. |
| Use MenuList, Menu Kit, screens, customer app | `15`, `26` | Required for physical, installable, and rollout surfaces. |
| Billing, payments, enhancements | `16` | Required, but many answers stay escalation-gated. |
| Staff, roles, staff prompt, locations, outlets | `05`, `17`, `26` | Required for team, staff reference, and chain accounts. |
| Dashboard, analytics, feedback | `18` | Required for owner operating questions. |
| Troubleshooting and escalation | `19`, `20` | Required for safe live operation. |
| Screenshot and asset boundaries | `07`, `09`, `10` | Required for Canonica website/demo assets. |
| Live website public truth | `22`, `23`, `24` | Required so Canonica matches current public claims. |
| Repo docs source map and operational gaps | `25`, `26` | Required so Canonica knows where deeper source evidence lives. |

## Must-Be-Reviewed Before Production Use

Before enabling Canonica for live MenuList owners, review and approve:

- canonical answers for the owner-style support questions;
- billing and refund wording;
- support escalation wording;
- privacy/data request wording;
- integration/POS/custom domain wording;
- public menu stale-data troubleshooting;
- account access troubleshooting;
- MenuList production widget behavior and blocked routes;
- product surface mappings;
- all screenshots used for Canonica website/demo assets.

## Missing Or Account-Specific Data

This package intentionally does not include private production data such as tenant IDs, store IDs, owner emails, customer messages, invoices, or raw logs.

Canonica should retrieve account-specific state only through approved authenticated Canonica/MenuList runtime paths after production onboarding.

## Launch Rule

If a live owner asks a question and the answer is not covered by an approved source or canonical answer, Canonica should not guess. It should route to support and record the missing answer as a Canonica knowledge gap.
