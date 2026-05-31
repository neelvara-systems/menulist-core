# Answerlattice Pre-Onboarding Input Kit — Implementation

## Implementation Summary

This is implemented as a public static Answerlattice website resource and an internal documentation standard.

No new database collections, background jobs, provider calls, or ingestion APIs are introduced.

## Runtime Files

| File | Purpose |
| --- | --- |
| `src/app/sites/answerlattice/pre-onboarding/page.tsx` | Public page explaining the pre-onboarding workflow. |
| `src/app/sites/answerlattice/pre-onboarding/PromptModal.tsx` | Client modal that previews the master prompt, copies it to clipboard, and downloads it as Markdown. |
| `src/app/sites/answerlattice/pre-onboarding.md/route.ts` | Machine-readable master prompt route. |
| `src/app/sites/answerlattice/pre-onboarding/guide/page.tsx` | Detailed human guide for owners and agents. |
| `src/app/sites/answerlattice/pre-onboarding/owner-guide.md/route.ts` | Machine-readable owner guide. |
| `src/app/sites/answerlattice/pre-onboarding/agent-guide.md/route.ts` | Machine-readable agent guide. |
| `src/app/sites/answerlattice/components/PreOnboardingHomeSection.tsx` | Homepage placement that routes buyers to the kit before setup. |
| `src/app/sites/answerlattice/components/HeroSection.tsx` | Homepage hero source-preparation link. |
| `src/app/sites/answerlattice/components/Header.tsx` | Desktop and mobile navigation entry for `/pre-onboarding`. |
| `src/app/sites/answerlattice/components/Footer.tsx` | Footer entries for the kit and guide. |
| `src/app/sites/answerlattice/get-started/page.tsx` | Pre-signup prompt to prepare sources before workspace creation. |
| `src/lib/answerlattice/preOnboardingPrompt.ts` | Shared prompt text and output contract. |
| `src/app/sites/answerlattice/siteConfig.ts` | Sitemap/structured-data registration. |
| `src/app/sites/answerlattice/resources/page.tsx` | Resource hub link. |
| `src/lib/answerlattice/installContract/contract.ts` | LLM context link to the pre-onboarding prompt. |

## Folder Output Contract For Clients

The master prompt instructs agents to create:

```text
<product-slug>-answerlattice-pre-onboarding-inputs/
  README.md
  answerlattice-intake-plan.md
  upload-manifest.json
  source-inputs/
  api-payloads/
  production-onboarding/
    product-boundary-and-exclusions.md
  asset-inputs/
    demo-walkthrough-brief.md
    website-and-faq-asset-brief.md
```

This mirrors the Answerlattice intake package standard proven during the MenuList onboarding work while staying product-agnostic. A client does not need the same repo structure, docs folder, domain model, or public site structure to use it.

Supported source modes:

- `repo_and_website`;
- `multi_product_repo`;
- `website_only`;
- `docs_only`;
- `owner_notes_only`;
- `mixed`.

The folder contract stays stable for Answerlattice. Missing or inapplicable source families are represented with explicit `Not available` or `Not applicable` notes rather than invented support content.

The implementation must also keep the capability boundary visible: the prompt works only with sources the AI IDE can access. Blocked private repos, login-only apps, unreachable websites, unsupported media, or unavailable files must be represented as pending source-access gaps, not as covered truth.

For multi-product repos, `product-boundary-and-exclusions.md` must list:

- products/apps/packages detected;
- target product name, slug, paths, domains, and app URLs;
- shared infrastructure included and why it affects target-product support;
- sister products excluded and why;
- uncertain boundaries requiring owner confirmation.

For market-common asset requests:

- `demo-walkthrough-brief.md` captures demo goal, approved flow, steps, transcript outline, screenshot/video needs, scrub rules, and approval status.
- `website-and-faq-asset-brief.md` captures review-ready FAQ groups, website claim candidates, source URLs, source files, risky claims, and owner approval gates.

## Validation Contract

The prompt requires the agent to validate:

- source files exist and match the manifest;
- add-source payloads match source files;
- CSV files parse cleanly;
- no raw angle-bracket placeholder text remains;
- no source exceeds the configured Answerlattice size limit;
- all high-risk topics have escalation rules;
- live support test questions cover routine and risky flows;
- public website claims are represented;
- available source evidence maps are represented;
- multi-product target boundaries and exclusions are represented when relevant;
- demo, FAQ, website, API, and support-export inputs are represented as review-ready briefs or source maps;
- source-access limits are listed when the AI IDE could not inspect a repo, website, login-only app, recording, screenshot, or file;
- private data exclusion rules are present.

## Data Boundary

The generated package should not include:

- customer records;
- private user identifiers;
- tokens, cookies, API keys, secrets;
- payment details;
- raw production logs;
- service account content;
- private support messages with user data;
- unapproved screenshots.

If the client needs account-specific onboarding, that happens inside authenticated Answerlattice runtime paths after workspace creation.

## Website Implementation Notes

The public page should present pre-onboarding as a preparation aid, not a replacement for Answerlattice. The page should:

- remain the primary human route for all pre-onboarding content;
- open the master prompt in a modal with copy and `.md` download actions;
- keep the raw markdown route available for AI agents and direct access;
- explain expected output;
- explain privacy review;
- explain source-access and AI IDE capability limits;
- link back to Knowledge Intake and Get Started;
- avoid claiming that AI-generated inputs are automatically correct or guaranteed across every product and AI IDE.

## Website Placement Contract

Pre-onboarding must stay visible at the start of the Answerlattice buyer journey:

- main desktop navigation;
- mobile drawer;
- homepage hero support link;
- homepage first-scroll section after the hero;
- resources rollout path;
- get-started pre-signup context;
- footer resources column.

The `/pre-onboarding/guide`, `/pre-onboarding.md`, `/pre-onboarding/owner-guide.md`, and `/pre-onboarding/agent-guide.md` routes remain supporting routes for deep reading and AI-agent access. They should not fragment the main owner journey away from `/pre-onboarding`.

## Deployment Notes

No Firebase deployment is required for this feature.

If the public website route is changed, a normal Vercel deployment is required later. This session does not run Vercel deploys.
