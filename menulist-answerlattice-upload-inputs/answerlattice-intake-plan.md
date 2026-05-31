# Answerlattice Intake Plan For MenuList

## Goal

Prepare MenuList as the production client and example product Answerlattice can understand deeply:

- what MenuList does;
- which surfaces customers and owners use;
- which knowledge is authoritative;
- what questions Answerlattice should answer;
- what topics require owner/admin review;
- which product screenshots and generated assets can support Answerlattice website and marketing work;
- which production onboarding, widget, dashboard, and approval steps are required before MenuList-derived screenshots can be used publicly;
- which live MenuList owner support questions Answerlattice must answer safely.

## Answerlattice Intake Shape

Use one Answerlattice job:

```text
MenuList production client onboarding and asset proof
```

Recommended Answerlattice job metadata:

- `title`: `MenuList production client onboarding and asset proof`
- `description`: `Answerlattice intake package for MenuList production-client onboarding, product knowledge, support examples, public-surface proof, dashboard demo state, and website asset planning.`
- `productWebsiteUrl`: `https://www.menulist.online`
- `appUrl`: `https://menulist.ai`
- `targetAudience`: `SaaS founders, product owners, and support operators evaluating Answerlattice through the MenuList example.`

Domain note: this package uses `https://www.menulist.online` as the checked website-content source because that is the live website source requested for this audit. Repo deployment docs still define `https://menulist.ai` as the production canonical MenuList host and `menulist.online` as preview/staging or alias. Confirm the active production host before enabling the production widget or public screenshots.

## Source Groups

| Group | File | Answerlattice source type | Primary tags |
| --- | --- | --- | --- |
| Product context | `source-inputs/01-product-context.md` | `product_note` | `product_context`, `positioning`, `source_of_truth` |
| Intake and owner review | `source-inputs/02-menu-intake-and-owner-review.md` | `help_doc` | `intake`, `owner_review`, `upload` |
| Public surfaces | `source-inputs/03-public-surfaces-and-discovery.md` | `help_doc` | `public_surface`, `obp`, `discovery` |
| Governance | `source-inputs/04-menu-governance-and-correctness.md` | `help_doc` | `governance`, `correctness`, `quality` |
| Operations | `source-inputs/05-owner-operations-staff-and-multi-location.md` | `help_doc` | `operations`, `mobile`, `staff`, `multi_location` |
| Answerlattice example | `source-inputs/06-answerlattice-example-story.md` | `product_note` | `answerlattice_example`, `asset_story`, `support_story` |
| Asset context | `source-inputs/07-asset-and-screenshot-context.md` | `product_note` | `assets`, `screenshots`, `website` |
| FAQ seeds | `source-inputs/08-support-faq-seed.csv` | `csv` | `faq_seed`, `support_seed` |
| Boundaries | `source-inputs/09-risk-boundaries-and-review-rules.md` | `product_note` | `risk`, `approval`, `privacy` |
| Production onboarding | `source-inputs/10-production-onboarding-context.md` | `product_note` | `production_onboarding`, `dashboard_demo`, `widget` |
| Account/access support | `source-inputs/11-account-access-and-onboarding-support.md` | `help_doc` | `account_access`, `onboarding`, `login` |
| Menu creation/editor support | `source-inputs/12-menu-creation-import-review-and-editor-support.md` | `help_doc` | `menu_creation`, `menu_import`, `editor` |
| Public menu/QR/OBP support | `source-inputs/13-public-menu-qr-sharing-and-official-page-support.md` | `help_doc` | `public_menu`, `qr`, `obp` |
| Business settings support | `source-inputs/14-business-settings-store-profile-and-presence-support.md` | `help_doc` | `business_settings`, `hours`, `presence` |
| Physical/installable surfaces | `source-inputs/15-menu-kit-digital-screens-and-customer-app-support.md` | `help_doc` | `menu_kit`, `digital_screens`, `customer_app` |
| Billing support | `source-inputs/16-billing-subscription-enhancements-and-payments-support.md` | `help_doc` | `billing`, `subscription`, `payments` |
| Staff/location support | `source-inputs/17-staff-roles-locations-and-outlet-policy-support.md` | `help_doc` | `staff`, `roles`, `locations` |
| Dashboard/feedback support | `source-inputs/18-dashboard-analytics-feedback-and-help-center-support.md` | `help_doc` | `dashboard`, `analytics`, `feedback` |
| Troubleshooting/escalation | `source-inputs/19-troubleshooting-escalation-and-risk-review-support.md` | `help_doc` | `troubleshooting`, `escalation`, `risk` |
| Live support contract | `source-inputs/20-live-owner-support-operating-contract.md` | `product_note` | `live_support`, `answer_contract` |
| Coverage index | `source-inputs/21-live-support-coverage-index.md` | `product_note` | `coverage_index`, `readiness` |
| Live website public truth | `source-inputs/22-live-website-public-truth.md` | `website_page` | `live_website`, `public_truth` |
| Website feature coverage | `source-inputs/23-live-website-feature-capability-coverage.md` | `website_page` | `features`, `capabilities` |
| Pricing/legal/trust | `source-inputs/24-public-pricing-legal-trust-and-contact-support.md` | `website_page` | `pricing`, `legal`, `trust` |
| Repo docs source map | `source-inputs/25-repo-docs-menulist-source-map.md` | `product_note` | `repo_docs`, `coverage` |
| Undercovered operations | `source-inputs/26-undercovered-operations-from-repo-docs.md` | `help_doc` | `operations`, `external_sync`, `signals` |

## Production Onboarding Inputs

Use `production-onboarding/` after the source upload starts:

| File | Use |
| --- | --- |
| `menulist-client-profile.json` | Answerlattice client profile and launch constraints for MenuList. |
| `onboarding-runbook.md` | Approval, production workspace, intake, widget, signal loop, and screenshot sequence. |
| `dashboard-demo-data-requirements.md` | Minimum meaningful Answerlattice dashboard state before website captures. |
| `product-surface-map.csv` | Product Surface records to create in Answerlattice. |
| `widget-context-events.jsonl` | Safe route-context examples for MenuList owner pages. |
| `knowledge-output-targets.md` | Expected KB, FAQ, canonical, entity, support, and asset outputs. |
| `production-data-safety.md` | Data minimization and screenshot approval rules. |
| `live-smb-support-coverage-checklist.md` | Required coverage gate before live MenuList owner support. |
| `live-owner-support-test-questions.csv` | Thirty pre-live owner-style questions for Answerlattice answer review. |

## Review Strategy

Ask Answerlattice to create review items in this order:

1. High-risk claims: pricing, billing, refunds, privacy, security, legal, integrations, POS, ranking, public discovery, and external sync.
2. Production-client readiness: license, origins, widget key, widget runtime, page context, and support signal loop.
3. Canonical product definition: MenuList as customer-facing business truth infrastructure.
4. Public surface outputs: public menu, Official Business Page, QR/share, saved shortcut, digital screens, Menu Kit.
5. Owner workflow: upload/import, extraction, review, publish, share.
6. Live support workflows: account access, editor, public menu, billing, staff, locations, analytics, feedback, and escalation.
7. Asset proof: generated placeholder assets, private reference captures, future routed demo screenshots.
8. Website-vs-doc parity: keep public website claims, help docs, and Answerlattice answers aligned.

## Publish Targets

Suitable Answerlattice destinations:

- KB article drafts for internal/external explanation.
- FAQ drafts for common buyer and support questions.
- Product-surface suggestions for Answerlattice website proof sections.
- Canonical answer mutation proposals for stable product facts.
- Activation/dashboard readiness state for MenuList as a production Answerlattice client.
- Widget runtime and product-surface coverage proof after production connection.
- Live MenuList owner support KB and FAQ coverage.
- Support board cards for any unanswered or risky owner questions.

Avoid:

- direct canonical answer publication without owner/admin review;
- changelog publication from intake;
- public website copy that claims real customer screenshots when source assets are synthetic;
- helpdesk replacement, CMS, autonomous chatbot, or broad asset-studio positioning.
- live owner answers from unreviewed generated drafts;
- invented billing, legal, privacy, custom-domain, POS, or account-ownership claims.

## Evidence Priority

Use the following source authority order for this package:

1. Current code and implemented docs under `__docs__/`.
2. Current MenuList website content and asset docs.
3. Current Answerlattice intake and doctrine docs.
4. Existing generated MenuList website assets.
5. Private synthetic reference captures.
6. The external ChatGPT conversation only where repo docs/code already validated it.
