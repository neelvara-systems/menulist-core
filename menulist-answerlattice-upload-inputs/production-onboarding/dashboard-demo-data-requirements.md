# Answerlattice Dashboard Demo Data Requirements For MenuList

## Goal

Answerlattice website and marketing screenshots should show a real production client state, not empty dashboard chrome or decorative mock data.

For MenuList, the dashboard needs to prove:

- Answerlattice knows the product;
- Answerlattice has reviewed knowledge;
- Answerlattice maps support knowledge to product surfaces;
- Answerlattice widget context is arriving from MenuList;
- Answerlattice governance and support loops have real items to manage.

## Minimum Ready State Before Screenshots

| Answerlattice area | Required MenuList state | Screenshot value |
| --- | --- | --- |
| Activation | Workspace, license, knowledge import, product surfaces, widget key, allowed origins, runtime seen, page context, support loop tested | Shows launch readiness instead of an empty checklist. |
| Dashboard | High-level coverage, recent activity, support/governance summary | Shows Answerlattice as an operating support workspace. |
| Knowledge Intake | Completed MenuList intake job with source files and selected public URLs | Shows how product knowledge enters Answerlattice. |
| Knowledge Base | 8 to 12 approved MenuList articles | Shows an actual support knowledge layer. |
| FAQs | At least 30 reviewed FAQ entries, seeded from the 101-question FAQ CSV and weighted toward common/high-risk owner flows | Shows broad owner coverage without treating every seed as approved. |
| Governance | Reviewed entity candidates and approved canonical answer drafts | Shows control and approval, not free-form answers. |
| Product Surfaces | All 25 mapped MenuList surfaces created or explicitly excluded, with priority routes linked to reviewed knowledge | Shows page-aware support without silent surface gaps. |
| Widget | Production key, allowed origins, blocked routes, runtime last-seen, safe configuration | Shows install and security readiness. |
| Feedback | At least 3 safe feedback items from MenuList widget or support tests | Shows signal capture. |
| Support Board | At least 4 cards: missing answer, stale article, surface gap, release note follow-up | Shows operator workflow. |
| Weekly Digest | One digest generated after intake/support-loop activity, if available | Shows executive summary value. |

## Minimum Support Readiness State

Before live MenuList owners use Answerlattice, the dashboard should also show:

- approved KB/FAQ coverage for source files `01` through `26`;
- canonical answers for common account, menu, public menu, QR/OBP, staff, location, and billing questions;
- escalation rules for billing, refunds, legal/privacy, ownership, custom domain, integrations, and incidents;
- support board cards for unresolved or weak MenuList answers;
- all 75 widget/support test questions reviewed, with feedback signals from approved MenuList desktop owner routes.

## Canonical Answer Drafts To Review

Prepare and approve stable answers for:

- What is MenuList?
- What happens when a restaurant uploads a menu?
- Does MenuList publish menu changes automatically?
- What is the Official Business Page?
- What does the public menu show?
- What does Menu Kit include?
- How do QR and saved shortcuts stay current?
- What are Digital Screens?
- How does MenuList handle multiple locations?
- What can staff users access?
- What is External Menu Sync?
- Which MenuList screenshots can be used in Answerlattice marketing?
- Can AI Menu Manager change a menu without approval?
- What happens to reserved content credits when AI work fails?
- Why can translated menu content have English fallback buttons?
- Does Owner role transfer the business account?
- Can two similarly named locations be merged automatically?

## Entity Coverage

At minimum, Answerlattice should recognize these MenuList concepts:

- MenuList
- menu
- menu item
- category
- project
- store
- outlet
- public menu
- Official Business Page
- QR code
- saved shortcut
- Menu Kit
- Digital Screen
- staff role
- customer feedback
- multi-location
- menu review
- publish
- public discovery
- AI Menu Manager
- Business Health
- content credit
- AI transaction
- localization
- timezone
- PWA update
- account lifecycle
- location identity

## Support Board Seed Cards

Create or let Answerlattice generate safe cards like:

| Card | Purpose |
| --- | --- |
| Missing answer: public menu vs Official Business Page | Shows support gap capture. |
| Stale answer: External Menu Sync wording needs review | Shows drift/governance. |
| Surface gap: `/locations` needs multi-location help coverage | Shows product-surface operations. |
| Release follow-up: Answerlattice website asset screenshots need approval status | Shows support-to-marketing dependency. |

## What Not To Capture

- Empty dashboard states.
- Placeholder "demo company" state once production MenuList onboarding exists.
- Raw support messages with private user details.
- Owner email, phone, tenant ID, store ID, project ID, payment details, debug panels, or tokens.
- Unsupported claims that Answerlattice autonomously replaces support teams, CMS workflows, or helpdesk systems.
