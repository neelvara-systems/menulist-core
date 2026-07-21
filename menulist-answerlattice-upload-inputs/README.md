# MenuList Answerlattice Upload Inputs

**Status:** Prepared package for Answerlattice Knowledge Intake
**Created:** 2026-05-31
**Last verified against current repo truth:** 2026-07-20
**Product source:** MenuList
**Target product:** Answerlattice
**Primary use:** Onboard MenuList as a real Answerlattice production client, support live MenuList SMB owners through Answerlattice, then use reviewed MenuList-derived Answerlattice dashboard state for Answerlattice website, demo, and marketing assets.

## What This Package Does

This root folder packages MenuList knowledge, live-owner support coverage, production onboarding inputs, dashboard demo-data requirements, and website asset planning into an Answerlattice-ready operator package.

It is not a new MenuList feature, not an Answerlattice runtime folder, and not a public website asset folder. It is an operator package for onboarding MenuList into Answerlattice, uploading source material, preparing product-surface context, and capturing approved proof after the production setup exists.

## What I Checked

Answerlattice intake currently supports:

- owner-triggered intake jobs;
- pasted text, selected public URLs, browser-extracted text files, screenshots/images, and short media evidence;
- source review before publish;
- publishing into existing runtime paths: KB articles, FAQ, product surfaces, and canonical mutation proposals;
- a 50-source limit per intake job;
- 40,000 characters of stored source text per source in runtime normalization;
- visible owner approval before anything becomes authoritative.

Evidence:

- `src/types/answerlattice/index.ts`
- `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/sources/route.ts`
- `src/lib/answerlattice/knowledgeIntake.ts`
- `__docs__/answerlattice/pre-onboarding-input-kit/`
- `__docs__/answerlattice/knowledge-intake-command-center/`

## Folder Map

| Path | Purpose |
| --- | --- |
| `upload-manifest.json` | Machine-readable source map for upload order, source types, evidence authority, approval state, access, citation eligibility, applicability, conflicts, and intended destinations. |
| `api-payloads/create-job.json` | Suggested Answerlattice intake job payload. |
| `api-payloads/add-source-payloads.jsonl` | Add-source payload skeletons for API-assisted upload. |
| `source-inputs/` | Answerlattice source files, each prepared as an independent upload/paste source. Files `01` through `26` are required before live SMB owner support is enabled. Files `22` through `26` reconcile the live website and repo docs. |
| `production-onboarding/` | Production client profile, product boundary, onboarding runbook, dashboard data requirements, product surface map, widget context, data-safety rules, and owner-pending activation work. |
| `asset-inputs/` | Website/marketing asset capture plan, approved generated MenuList assets, and private reference capture map. |

## Recommended Upload Order

1. Complete the approval and environment steps in `production-onboarding/onboarding-runbook.md`.
2. Create an Answerlattice Knowledge Intake job using `api-payloads/create-job.json`, or create a job in the Answerlattice dashboard named `MenuList production client onboarding and asset proof`.
3. Upload or paste the files in `source-inputs/` in numeric order. Do not enable live owner support or prepare Answerlattice website/demo assets until files `01` through `26` are imported and reviewed.
4. Upload `source-inputs/08-support-faq-seed.csv` as a CSV source.
5. Add selected canonical `https://menulist.ai` public pages through Answerlattice discovery only after the prepared source chunks are imported. Treat any currently hosted preview/alias as deployment evidence, not canonical product truth.
6. Create Product Surfaces from `production-onboarding/product-surface-map.csv`.
7. Connect the MenuList production widget only after allowed origins and the Answerlattice-issued widget key are ready.
8. Do not publish generated canonical answers directly. Review items should stay as drafts or mutation proposals until approved.
9. Run the live support coverage checklist and review every owner-style test question before enabling Answerlattice for live MenuList owners.
10. Capture Answerlattice dashboard and MenuList screenshots only after the demo-data requirements are met and approved.

## Payload Readiness

`api-payloads/add-source-payloads.jsonl` is intentionally a review-only skeleton. Before direct API use, add the reviewed body of the matching source file as `contentText` on every line. Do not send a non-website skeleton without `contentText`; it will create a `needs_text` source rather than an intake-ready source.

The prepared multi-page website summaries in files `22` through `24` are `product_note` sources. They are not represented as one fake multi-URL website source. Add individual public pages later with one singular `originUrl` per source if live discovery is required.

Run the package verifier before upload:

```bash
npm run verify:menulist-answerlattice-upload-package
```

## Product Boundary

MenuList should be treated as Answerlattice's best production example because MenuList is a real product with:

- a public source of truth;
- owner-approved content;
- customer-facing surfaces;
- page and surface context;
- structured public discovery;
- staff, mobile, multi-location, and operational proof.

Answerlattice should not store MenuList tenant IDs, store IDs, owner emails, phone numbers, private support records, payment details, or internal dashboard secrets in public-facing outputs. MenuList identity belongs in `sourceContext`, product surface labels, and source metadata, while Answerlattice-owned documents stay Answerlattice-owned.

## Asset Boundary

The copied assets in `asset-inputs/current-approved-assets/` are already generated MenuList website visuals. They are useful for Answerlattice asset briefs, examples, and internal marketing planning.

The copied captures in `asset-inputs/private-reference-captures/` are private synthetic references only. They must not be described as real customer proof or moved into public destinations without a separate approval pass.

Real Answerlattice website proof should come later from `asset-inputs/future-routed-captures/` after MenuList is onboarded as a production Answerlattice client, the dashboard has meaningful state, and public screenshot use is approved.

## Live Support Boundary

Because live MenuList SMB owners may use Answerlattice for help, Answerlattice must not answer from incomplete or unreviewed generated drafts.

Before live use:

- import source files `01` through `26`;
- approve canonical answers for common owner workflows;
- keep billing, legal, privacy, ownership, integration, and incident topics escalation-gated;
- create support board cards for weak or missing answers;
- verify MenuList widget context on approved production owner routes.

## Pending Owner-Controlled Work

The package is source-ready, but it does not perform production onboarding. The following remain pending until the owner completes them:

- approve MenuList production use inside Answerlattice;
- choose the approved production workspace and screenshot tenant;
- confirm legal/privacy and public-marketing permission;
- create the Answerlattice workspace and active license;
- issue the widget key and approve exact origins;
- upload and review the 26 sources;
- approve canonical answers and product surfaces;
- run the complete owner-question set;
- deploy/configure the widget through the normal release process;
- complete authenticated browser/device, provider, and production-host evidence.
