# Answerlattice Pre-Onboarding Input Kit

> **Feature:** Client-side preparation system for Answerlattice onboarding inputs
> **Status:** DOCUMENTED + PUBLIC WEBSITE INPUT CREATED
> **Date:** 2026-05-31
> **Audience:** Product, Website, Support, Customer Success, AI coding-agent users
> **Doctrine fit:** Strengthens Knowledge Intake, Product Surfaces, Canonical Answers, and Drift Governance without turning Answerlattice into a helpdesk or generic documentation CMS.

---

## What This Is

The Pre-Onboarding Input Kit is a reusable preparation stage before a client starts Answerlattice onboarding.

It gives a SaaS founder or product owner a master prompt they can run inside Codex, Cursor, Windsurf, Antigravity, Claude Code, or another AI coding tool. The agent inspects whatever source bundle the client has: repo/code when available, docs, website links, help content, owner notes, policies, routes, support flows, screenshots, and risk boundaries. It then creates a structured upload folder for Answerlattice Knowledge Intake.

The MenuList onboarding package is the reference coverage example. It is not the required product shape. Other products may have no repo access, no docs folder, a website-only footprint, or only owner notes before launch.

The maintained reference package is [`menulist-answerlattice-upload-inputs/`](../../../menulist-answerlattice-upload-inputs/). It intentionally lives at the repository root because it is an operator/upload artifact, not Answerlattice feature documentation or product runtime. Its governing contract remains this folder.

## What This Is Not

- Not a crawler that secretly imports everything.
- Not a replacement for Answerlattice Knowledge Intake.
- Not automatic canonical-answer publishing.
- Not a legal/security approval process.
- Not a requirement that customers expose private production data.
- Not a guarantee that every AI IDE can inspect every private repo, login-only app, website, recording, or local file.
- Not permission to process private sources in an unapproved AI tool.
- Not a path for tickets or repeated replies to become approved truth automatically.

## Why This Matters

Answerlattice works best when source input is already organized around product truth:

- what the product is;
- what users ask;
- what product surfaces exist;
- what public claims are safe;
- what answers need review;
- what screenshots can be used;
- what should stay escalation-gated.

Most SaaS teams already have that information scattered across code, docs, websites, release notes, help centers, and support replies. The pre-onboarding kit turns scattered material into an Answerlattice-ready source package.

## Source Modes

The public prompt supports:

| Mode | Use when | Required handling |
| --- | --- | --- |
| `repo_and_website` | Repo/docs and public website are available. | Inspect both and map evidence to source files. |
| `multi_product_repo` | One repo/workspace contains several products, apps, packages, brands, or dashboards. | Map all products first, target the named product, include shared infrastructure only when support-relevant, and exclude sister-product facts. |
| `website_only` | Public site/help/legal pages exist, but repo is unavailable. | Mark repo coverage unavailable. |
| `docs_only` | Local/exported docs exist, but live website is unavailable. | Mark website verification pending. |
| `owner_notes_only` | Product owner provides notes, screenshots, and known policies only. | Create a starter package and mark unsupported facts pending. |
| `mixed` | Any partial combination of sources exists. | Use provided sources and explicitly list missing source families. |

## Multi-Product Codebase Handling

When a client gives the AI agent a repo or workspace that contains more than one product, the agent must not prepare one blended Answerlattice package. It must:

- identify product-like surfaces from folders, packages, route groups, domain configs, deployment targets, docs roots, constants, and READMEs;
- match the target product using product name, slug, public website URL, app URL, and target paths;
- include shared auth, billing, roles, integrations, widget/runtime, API contracts, legal pages, and navigation only when they affect the target product support truth;
- exclude sister-product feature docs, route maps, screenshots, marketing claims, pricing, legal pages, and support flows unless explicitly shared;
- document product boundaries in `production-onboarding/product-boundary-and-exclusions.md` and source family `25` (the maintained MenuList reference uses `source-inputs/25-repo-docs-menulist-source-map.md`).

## Market-Informed Source Patterns

The public prompt also accounts for common product categories adjacent to Answerlattice:

- docs platforms that use Git/repo-backed documentation;
- knowledge tools that sync public URLs and multiple knowledge sources;
- API documentation tools that transform OpenAPI/OAS files into API references;
- demo/walkthrough tools that record product flows and produce guided steps, transcripts, or embeddable demos;
- support tools that turn help center articles, macros, CSV/Markdown files, or solved-ticket patterns into answer drafts.

Answerlattice should support these input expectations without copying their publishing model. Pre-onboarding output remains review-ready source material, not an approved public demo, website page, FAQ, or legal answer.

## Compatibility And Limits

The pre-onboarding prompt is designed for capable AI coding agents, but it is not universally guaranteed across every model, IDE, product, private app, or source shape.

The output quality depends on:

- which files, URLs, screenshots, recordings, API specs, and exports the owner provides;
- whether the AI IDE has permission to read local files and private repos;
- whether public websites, help centers, and app pages are reachable from that session;
- whether login-only screens are represented by approved exports, screenshots, recordings, or owner notes;
- whether the owner reviews and corrects the generated package before upload.

If a source cannot be inspected, the agent must mark it as pending or unavailable. It must not claim full coverage for blocked sources.

For each source, the package records authority, approval status, access scope, citation eligibility, applicability, and conflicts. Private sources require owner permission for the selected AI tool and cannot be marked for public citation. Support records remain signals until their facts are verified against an authoritative source or approved by the owner.

## Public Surfaces

Primary human route: `/pre-onboarding`

| Surface | Purpose |
| --- | --- |
| `/pre-onboarding` | Buyer-facing page explaining the pre-onboarding workflow, with a prompt modal for copy and Markdown download. |
| `/pre-onboarding.md` | Machine-readable master prompt for AI coding agents. |
| `/pre-onboarding/codex.md` | Codex start wrapper plus the shared master prompt. |
| `/pre-onboarding/cursor.md` | Cursor start wrapper plus the shared master prompt. |
| `/pre-onboarding/claude-code.md` | Claude Code start wrapper plus the shared master prompt. |
| `/pre-onboarding/replit.md` | Replit start wrapper plus the shared master prompt. |
| `/pre-onboarding/lovable.md` | Lovable start wrapper plus the shared master prompt. |
| `/pre-onboarding/guide` | Detailed owner and AI-agent runbook, with prompt modal access. |
| `/pre-onboarding/owner-guide.md` | Machine-readable owner checklist. |
| `/pre-onboarding/agent-guide.md` | Machine-readable agent operating guide. |
| `/resources` | Links to pre-onboarding as part of rollout planning. |

The main website should send owners to `/pre-onboarding` first. Tool wrappers change only the starting instructions; every wrapper embeds the same master safety, source-boundary, validation, and owner-review contract. The guide and markdown routes stay available for deep reading, direct AI-agent access, and downloadable instructions.

## Internal Files

| File | Purpose |
| --- | --- |
| `pre-onboarding-input-kit_spec.md` | Product requirements and success standard. |
| `pre-onboarding-input-kit_impl.md` | Implementation and output contract. |
| `pre-onboarding-input-kit_website.md` | Public website content plan. |
| `pre-onboarding-input-kit_helpdoc.md` | Customer-facing usage guide. |
| `pre-onboarding-input-kit_owner-guide.md` | End-to-end owner guide. |
| `pre-onboarding-input-kit_agent-guide.md` | AI agent operating guide. |
| `pre-onboarding-input-kit_marketing.md` | Positioning and enablement. |
| `pre-onboarding-input-kit_firebase.md` | Cost and data-impact note. |
| `pre-onboarding-input-kit_test-cases.md` | Validation matrix. |
| `pre-onboarding-input-kit_market-research.md` | Official-source research behind repo, URL, API, support-export, and demo/walkthrough handling. |
| `pre-onboarding-master-prompt.md` | Human-readable prompt source for review. |

## Operating Standard

The output standard is "complete coverage of available source truth", not "guessed production truth".

Before a client enables live user support in Answerlattice, account-specific and production-only facts still need review:

- current production host;
- active feature flags;
- plan/account entitlements;
- legal, billing, privacy, and security policies;
- approved screenshot tenant;
- public marketing permission.

## Relationship To Knowledge Intake

The Pre-Onboarding Input Kit prepares cleaner input for Answerlattice Knowledge Intake. It does not bypass Answerlattice.

Expected flow:

1. Client runs the prompt in their AI IDE.
2. Agent creates a `*-answerlattice-pre-onboarding-inputs/` folder.
3. Client reviews the folder for private data and correctness.
4. Client uploads selected sources through Answerlattice Knowledge Intake.
5. Answerlattice creates review drafts.
6. Owner approves KB/FAQ/product-surface/canonical proposal outputs.
7. Live support is enabled only after coverage tests pass.

## Version History

| Date | Change |
| --- | --- |
| 2026-05-31 | Initial reusable process extracted from the MenuList-on-Answerlattice onboarding package. |
| 2026-05-31 | Generalized source modes and explicit copy/paste placeholders for non-MenuList product shapes. |
| 2026-05-31 | Added multi-product repo targeting, shared-infra handling, and sister-product exclusion rules. |
| 2026-05-31 | Added market-informed handling for repo-to-docs, URL sync, OpenAPI, support exports, demo walkthroughs, FAQs, and website asset briefs. |
| 2026-05-31 | Added explicit source-access, AI IDE capability, and no-guarantee safety boundaries. |
| 2026-05-31 | Added in-page prompt modal with copy-to-clipboard and Markdown download actions. |
| 2026-05-31 | Promoted `/pre-onboarding` as the main public entry across header, homepage, resources, get-started, mobile navigation, and footer. |
| 2026-07-19 | Aligned generated payloads with the strict Knowledge Intake API, added source authority/conflict and private-source permission contracts, and hardened Markdown responses plus dialog focus behavior. |
| 2026-07-20 | Reconciled the MenuList reference package with the current 26-source contract, strict add-source API, canonical host, feature inventory, legal/billing truth, and live-support coverage verifier. |
