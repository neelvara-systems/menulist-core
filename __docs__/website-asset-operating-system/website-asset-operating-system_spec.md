# Website Asset Operating System - Spec

**Audience:** Founder, product, design, Codex operators
**Status:** Internal v1 implemented
**Product boundary:** Separate-product-style internal architecture, Answerlattice-adjacent
**Not a public feature:** Yes
**Public launch:** No

---

## Executive Summary

Website Asset Operating System creates a durable repo-native contract for website and marketing assets across MenuList and Answerlattice.

Today, MenuList already has generated website assets and strict asset requirements. Answerlattice has a complete public website with reusable visual proof components. The missing layer is a shared operating contract that tells Codex:

- what asset slots exist;
- why each slot exists;
- which brand rules apply;
- which files satisfy the slot;
- whether an asset is missing, stale, oversized, or off-contract;
- which assets can be safely generated automatically;
- which assets require founder approval.

The first version creates the contract, package, audit loop, review loop, and brief generator. It does not generate polished videos or publish new public media.

The practical product thesis is Answerlattice-adjacent: Answerlattice governs what support knowledge should say; AssetOS governs what product media should show and whether that media still matches the real product.

## Goals

1. Preserve MenuList and Answerlattice brand/product context in durable repo files.
2. Give Codex a repeatable workflow for asset audit, brief generation, review, and safe regeneration.
3. Prevent asset sprawl through manifest ownership, naming rules, budgets, and stale detection.
4. Keep MenuList, Answerlattice, GrowthOS, and KitStamp product boundaries intact.
5. Support deterministic asset production before optional manual finishing tools.
6. Reuse Answerlattice product-surface, intake, release, feedback, and drift context as read-only source material for asset briefs and stale-review decisions.

## Non-Goals

| Non-goal | Reason |
| --- | --- |
| Public standalone product | No external ICP or public runtime exists yet. |
| Owner-facing MenuList feature | The workflow is for founder/operator marketing assets, not SMB owners. |
| Answerlattice runtime feature | It can sit beside Answerlattice's product truth layer, but it does not answer support questions, publish KB content, mutate signals, or control widgets. |
| GrowthOS feature | It does not generate SMB promotion kits for customers. |
| KitStamp launch | It is not a content-preparation workspace with users, billing, or export kits. |
| First-pass final videos | Contract must exist before media generation. |
| GUI editor dependency | OpenScreen/OpenVid are optional finishing tools, not the core. |

## Users

| User | Job |
| --- | --- |
| Founder | Ask Codex to refresh assets without restating product and brand context. |
| Codex | Read repo contract, audit missing/stale assets, generate briefs, update manifests. |
| Designer/future operator | Review briefs, reference banks, and quality scores before publishing assets. |
| Developer | Maintain scripts, manifests, slots, and website media components. |

## Current Repo Reality

| Area | Current truth |
| --- | --- |
| Product separation | Product identities are locked and cannot blur. See `__docs__/constitution/12-product-separation-doctrine.md:14`. |
| Product sequence | Later products must not start before MenuList is stable. See `__docs__/constitution/11-product-evolution-doctrine.md:50`. |
| MenuList website assets | Existing asset rules and generated P0 visuals already live under `__docs__/main-website/` and `public/images/website/`. |
| Answerlattice website assets | Answerlattice has static public proof components, OG image, logo, PWA icons, and splash assets. |
| Answerlattice operating surface | Answerlattice has product surfaces, knowledge intake, canonical answers, feedback signals, drift governance, changelog context, and readiness summaries that can inform asset briefs without becoming AssetOS state. |
| Scripts | Root scripts now include asset audit, review, brief, fingerprint, and missing-placeholder commands. |
| Dependencies | Playwright, Remotion, Motion Canvas, and FFmpeg wrappers are not present in `package.json`. |

## Requirements

### Product Boundary

| Requirement | Rule |
| --- | --- |
| Internal only | The first version is not public, billable, or owner-facing. |
| Cross-product | MenuList and Answerlattice can both declare asset slots without sharing product identity. |
| Read-only product input | Asset scripts may inspect website source, docs, tokens, and public demo data; they must not mutate MenuList or Answerlattice product data. |
| Approval split | Safe deterministic assets can be generated; brand-defining hero/launch assets require founder approval before publishing. |

### Answerlattice-Adjacent Source Model

| Answerlattice surface | AssetOS use | Boundary |
| --- | --- | --- |
| Product surfaces | Use as source context for what Answerlattice screens, concepts, and public proof should show. | Do not create, edit, or publish product surfaces. |
| Knowledge intake | Use approved source references to improve asset briefs. | Do not ingest files into Answerlattice or approve knowledge drafts. |
| Canonical answers and KB | Use approved public truth to avoid misleading website media. | Do not write KB, FAQs, answers, or mutations. |
| Changelog and release context | Mark assets for review when product behavior or claims changed. | Do not publish releases or public changelog entries. |
| Feedback, support signals, and drift | Identify missing, confusing, or stale public proof. | Do not write signals, tickets, Support Board cards, or drift decisions. |
| Readiness and trust summaries | Help founder decide whether a visual is safe to show. | Do not change readiness scoring or customer-facing support state. |

### Asset Contract

Each asset slot must define:

- stable `id`;
- product/brand;
- page/route;
- placement;
- asset type;
- narrative intent;
- hard rejection rules;
- required output formats;
- size budgets;
- destination path;
- consuming component or route;
- approval level;
- source fingerprints.

### Manifest

The manifest must define:

- every known asset;
- current status: missing, draft, generated, approved, stale, retired;
- file paths or external storage URLs;
- source recipe/brief;
- generated-from commit;
- source fingerprints;
- size data;
- reviewer decision.

### Audit

The audit script must detect:

1. slot missing from manifest;
2. manifest file missing on disk;
3. oversized file;
4. missing poster/fallback;
5. missing brief;
6. stale source fingerprint;
7. asset not referenced by any slot;
8. public file that violates storage rules;
9. asset requiring founder approval.

### Review

The review script must score:

- strategic fit;
- brand fit;
- narrative clarity;
- performance/file size;
- fallback completeness;
- manifest correctness;
- public-claim safety;
- approval status.

### Brief Generation

Briefs must be generated before assets. Each brief should read:

- asset slot;
- brand context;
- current page/source files;
- current website copy;
- design-system references;
- current assets;
- relevant Answerlattice product-surface, release, intake, signal, or drift context when the slot is Answerlattice-related;
- relevant demo-flow rules.

## Autonomy Levels

| Level | Name | Codex may do |
| --- | --- | --- |
| 1 | Audit only | Report missing, stale, oversized, disconnected, or off-contract assets. |
| 2 | Safe generation | Generate deterministic briefs, posters, OG images, screenshots, simple static composites, and optimized variants. |
| 3 | Founder approval | Prepare hero motion, launch videos, brand-defining Answerlattice motion, real customer screenshots, analytics proof, and ad/social campaign visuals for review. |

## Brand Direction

### MenuList

MenuList assets can show concrete product UI. They must reinforce:

- customer-facing business truth;
- one owner-approved source;
- public menu and Official Business Page proof;
- calm operational reliability;
- no fake dashboards;
- no external sync claims unless implemented;
- no "AI" visual language.

### Answerlattice

Answerlattice assets should feel systemic and infrastructural. They must reinforce:

- governed answer infrastructure;
- canonical answers;
- governed review;
- page-aware widget and hosted help;
- product-surface context;
- dark infrastructure visual system;
- no generic SaaS dashboard energy;
- no MenuList-style restaurant visuals.

## First Version Scope

The first implementation creates:

1. `AGENTS.md` asset rules.
2. `.agents/skills/website-asset-factory/SKILL.md`.
3. Brand context docs for MenuList and Answerlattice.
4. Asset slot files for MenuList and Answerlattice website assets.
5. `packages/asset-factory/manifest/assets.json`.
6. `packages/asset-factory/scripts/audit-assets.ts`.
7. `packages/asset-factory/scripts/review-assets.ts`.
8. `packages/asset-factory/scripts/generate-brief.ts`.
9. Brief, reference, raw, working, and published directories.
10. Root scripts for audit/review/brief.
11. README for the internal workflow.
12. Optional GitHub/Codex prompt file for asset review.
13. Internal feature flag `ENABLE_WEBSITE_ASSET_OPERATING_SYSTEM`.

## Internal Product Architecture Decision

The product is architected as separate internal infrastructure now:

- package boundary: `packages/asset-factory/`;
- docs boundary: `__docs__/website-asset-operating-system/`;
- agent boundary: `.agents/skills/website-asset-factory/`;
- runtime boundary: no public route, no MenuList owner UI, no Answerlattice runtime UI;
- data boundary: local files only, no Firebase.

This lets the system be tested on MenuList and Answerlattice assets without creating public product pressure.

For Answerlattice, this means AssetOS can become the internal media layer beside the governed answer infrastructure. It should consume Answerlattice truth as evidence, not become a second Answerlattice database or runtime.

## Open Questions

| Question | Current answer |
| --- | --- |
| Should this include MyCodex assets? | Not in first pass. It is internal-docs/PWA work, not public marketing. |
| Should media live in Git? | Small published website assets can; raw/working/large launch files should not. |
| Should Remotion be installed? | Not until implementation needs code-rendered video and license review is complete. |
| Should Playwright be installed? | Only after the first audit/brief scripts land and capture flows are specified. |
| Should this update public website copy? | No. It is an internal operating layer. |
