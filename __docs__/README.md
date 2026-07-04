# MenuListAI Platform Documentation

**Last Updated**: July 2, 2026
**Status**: Active documentation index; not current launch certification
**Naming Convention**: `__docs__/[feature-name]/` (kebab-case) → `[feature-name]_spec.md`, `[feature-name]_impl.md`

**Launch Boundary:** This file is a documentation map only. It is not MenuList production-launch approval. Current release readiness belongs to the active [production-readiness audit](./audits/menulist-production-readiness-audit.md), [External Certification Runbook](./production-readiness/external-certification-runbook.md) evidence, source verifiers, browser/device QA, provider smoke, deploy evidence, and production-host smoke.

---

## Folder Map

### Core Product Features

| Folder                                                               | What's Inside                                                                    | Key Docs                                                                        |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **[projects/](./projects/)**                                         | Menu projects — editor, upload, AI extraction, image generation, B2B/B2C views   | `README.md`, `00-overview.md`, `11-database-layer.md`                           |
| **[client-menu/](./client-menu/)**                                   | Customer-facing QR menu, multi-tenant routing, SEO, autosell                     | `_impl.md`, `multi-tenant-architecture.md`, `seo-implementation-guide.md`       |
| **[digital-screens/](./digital-screens/)**                           | TV/tablet digital screen display, campaigns                                      | Feature docs                                                                    |
| **[multi-outlet-consistency/](./multi-outlet-consistency/)**         | Multi-chain/outlet syncing, master updates, store onboarding, AI extraction sync | `_spec.md`, `_impl.md`, `store-onboarding/`, `master-updates-awareness_impl.md` |
| **[continuous-menu-intelligence/](./continuous-menu-intelligence/)** | Menu intelligence, auto-corrections, silent monitoring                           | Feature docs                                                                    |
| **[decision-intelligence/](./decision-intelligence/)**               | Decision blocks, smart picks, confidence scoring                                 | Feature docs                                                                    |
| **[owner-business-assistant/](./owner-business-assistant/)**         | Business Health owner check with day-one Action Support planning                 | Full doc set + architecture, Firebase cost, and ChatGPT review                  |

### AI & Content Features

| Folder                                           | What's Inside                               |
| ------------------------------------------------ | ------------------------------------------- |
| **[social-content/](./social-content/)**         | Social media content generation (campaigns) |
| **[growthos-addon/](./growthos-addon/)**         | GrowthOS add-on planning for MenuList higher-tier clients |
| **[kitstamp/](./kitstamp/)**                 | KitStamp separate-product planning for approved Final Content Kits |
| **[staff-prompt/](./staff-prompt/)**             | Staff prompt system                         |
| **[gbp-sync/](./gbp-sync/)**                     | Google Business Profile sync                |
| **[reviews-reputation/](./reviews-reputation/)** | Reviews and reputation management           |
| **[physical-surfaces/](./physical-surfaces/)**   | Physical menu surfaces (print, posters)     |

### Platform & Infrastructure

| Folder                                                       | What's Inside                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **[security/](./security/)**                                 | Auth, CSP, App Check, OWASP, monitoring, input validation                |
| **[answerlattice/](./answerlattice/)**                       | Answerlattice doctrine, feature docs, runtime runbooks, onboarding, widget, API, and governance docs |
| **[auth/](./auth/)**                                         | Authentication flows, Firebase auth, NextAuth                            |
| **[auth-onboarding/](./auth-onboarding/)**                   | Onboarding flow after signup                                             |
| **[system-strengthening/](./system-strengthening/)**         | Infrastructure hardening — all audit findings, security gaps, cost bombs |
| **[deployment/](./deployment/)**                             | Production deployment guides                                             |
| **[stores-management/](./stores-management/)**               | Store CRUD, multi-store management                                       |
| **[multi-chain-permissions/](./multi-chain-permissions/)**   | Chain-level permissions and roles                                        |
| **[roles-permissions/](./roles-permissions/)**               | Role-based access control                                                |
| **[pricing-integrity-system/](./pricing-integrity-system/)** | Pricing integrity and validation                                         |
| **[hours-holiday-accuracy/](./hours-holiday-accuracy/)**     | Business hours and holiday accuracy                                      |

### Strategy & Governance

| Folder                                         | What's Inside                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| **[strategy/](./strategy/)**                   | 5-year vision, founder manifesto, pricing, market research, feature spec      |
| **[constitution/](./constitution/)**           | Core doctrine, language governance, enforcement rules, feature rejection gate |
| **[menulist-seo-launch/](./menulist-seo-launch/)** | MenuList launch SEO operating index, consultant ledger, and action register |
| **[internal-tracking/](./internal-tracking/)** | MOL (Menu Observation Layer), internal metrics                                |
| **[internal-platform/](./internal-platform/)** | Internal platform tools                                                       |

### Workflows & Tooling

| Folder                                     | What's Inside                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| **[menulist-tools/](./menulist-tools/)**   | MenuList-owned public, owner, and paid add-on tool documentation namespace     |
| **[workflows-guide/](./workflows-guide/)** | How to use Cascade `/slash-command` workflows — maps IDE_PROMPTS to automation |
| **[website-asset-operating-system/](./website-asset-operating-system/)** | Internal cross-product asset contract for MenuList and Answerlattice website media |

### Customer-Facing Surfaces

| Folder                                                   | What's Inside                                           | Key Docs                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| **[neelvara-main-website/](./neelvara-main-website/)** | Neelvara Systems parent/entity trust website       | Full docs-first set + captured ChatGPT transcript                           |
| **[main-website/](./main-website/)**                     | menulist.ai marketing website — v2 Hype/Domination      | `_spec.md`, `_impl.md`, `_marketing.md`, `_seo-aeo.md`                      |
| **[official-business-page/](./official-business-page/)** | OBP — canonical public identity page for every business | `_spec.md`, `_impl.md`, `_firebase.md`, `obp-infrastructure-freeze-plan.md` |

### Other

| Folder                                                   | What's Inside                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| **[features/](./features/)**                             | Standalone features (trust page, network monitoring, profile modal)  |
| **[onboarding/](./onboarding/)**                         | User onboarding flows                                                |
| **[legal/](./legal/)**                                   | Legal docs                                                           |
| **[sales/](./sales/)**                                   | Sales materials                                                      |
| **[patterns/](./patterns/)**                             | Reusable code patterns                                               |
| **[editor-ux-improvements/](./editor-ux-improvements/)** | Editor UX improvement plans                                          |
| **[archive/](./archive/)**                               | Historical reports, ChatGPT analyses, phase reports, and superseded docs; not current launch certification |

### Root-Level Docs (Cross-Cutting)

| Document                                                         | Purpose                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **[changelog.md](./changelog.md)**                               | Global release notes — what's new/improved/fixed                        |
| **[index.md](./index.md)**                                       | Master index — all features + doc presence table                        |
| **[maintenance-tasks.md](./maintenance-tasks.md)**               | Ongoing maintenance checklist                                           |
| **[production-testing-guide.md](./production-testing-guide.md)** | Cross-feature manual QA guide (38 tests across 6 intelligence features) |

---

## Documentation Standards

**Per `IDE_PROMPTS/2. DOCUMENT CREATION PROMPT.md` + `IDE_PROMPTS/10. CONTENT LAYERS PROMPT.md`:**

- **Folder**: `__docs__/[feature-name]/` (kebab-case)
- **MenuList tools folder**: `__docs__/menulist-tools/[tool-or-tool-family]/`
- **Internal docs**: `_spec.md`, `_impl.md`, `_marketing.md`
- **Public docs**: `_website.md` (landing page content), `_helpdoc.md` (customer help article)
- **Cost tracking**: `_firebase.md` (Firebase reads/writes/deletes — CRITICAL for revenue)
- **Project-level**: `__docs__/changelog.md` (global release notes)
- **Prefix MUST match folder name**
- **Archive rule**: Historical files go to `_archive/` subfolder — never delete, always archive
- **Single doc rule**: One comprehensive doc set per feature

---

## How to Find Things

| I need to understand...       | Go to...                                                          |
| ----------------------------- | ----------------------------------------------------------------- |
| Why a change was made         | Feature folder → `_impl.md` or `_archive/` for historical context |
| Business requirements         | Feature folder → `_spec.md`                                       |
| Website copy for a feature    | Feature folder → `_website.md`                                    |
| Help article for customers    | Feature folder → `_helpdoc.md`                                    |
| Firebase costs for a feature  | Feature folder → `_firebase.md`                                   |
| What shipped recently         | `changelog.md`                                                    |
| Security implementation       | `security/` → relevant COMPLETE_GUIDE.md                          |
| Infrastructure audit findings | `system-strengthening/` → `system-strengthening_impl.md`          |
| Multi-outlet/chain logic      | `multi-outlet-consistency/`                                       |
| Product strategy/vision       | `strategy/`                                                       |
| Governance rules              | `constitution/`                                                   |
| Historical decisions          | Feature folder → `_archive/`                                      |

---

**Last Updated**: June 30, 2026
**Documentation Version**: 4.1
