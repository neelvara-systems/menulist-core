# Founder Public Presence Content Ledger

**Status:** Active intake ledger
**Last Updated:** August 16, 2026

## Rules

- One row represents one primary lesson, not an entire feature.
- Link exact evidence before marking an item `validated`.
- Keep reusable cross-product lessons here; keep product-specific acquisition
  campaigns and launch posts in the product's own docs.
- Never delete rejected or retired ideas. Preserve the reason.
- A repository change is not automatically content-worthy.

## Ledger

| ID | Captured | Trigger or lesson | Product/source | Intended audience | Candidate format | Evidence and public boundary | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FPP-C001 | 2026-08-12 | A hidden or disabled button is not an entitlement system; the server and data layer own truth. | Cross-product security pattern | AI-built SaaS founders | X short post; later Reddit architecture answer | Current implementation verifies the three-layer pattern: the interface evaluates entitlement before loading or rendering the feature (`src/components/templates/main-app/growthos/index.tsx:157-175`, `:431-455`); the authenticated server route independently verifies scope and entitlement (`src/app/api/growthos/kits/generate/route.ts:28-45`, `:69-89`); direct browser access to the generated artifacts is denied (`firestore.rules:773-777`). Public copy remains generalized: no product name, route, collection, tenant detail, bypass procedure, or claim of perfect security. Published August 16, 2026 at 9:41 AM Asia/Kolkata: `https://x.com/proofandstate/status/2088841036009533550`. | measuring | Observe relevant replies, saves/bookmarks, relevant follows, and whether readers understood the server/data-boundary lesson; do not change strategy from one result |
| FPP-C002 | 2026-08-12 | RAG retrieves conflicts; it does not decide which source is authoritative. | Answerlattice canonical-answer doctrine | AI-built SaaS founders and support-system builders | X short post plus diagram | Use approved demo/canonical doctrine only; no customer sources or claims. Published on X August 21, 2026 at 8:00 PM Asia/Kolkata; founder confirmed on-time publication, but supplied no URL. | measuring | Observe saves, relevant replies, and whether builders understand retrieval-versus-authority; do not infer strategy from one post |
| FPP-C003 | 2026-08-12 | An AI code audit is useful only when it traces the complete request-to-write-and-read path. | Cross-product audit practice | AI-assisted founders and developers | X deeper post; Reddit technical post | Use general workflow and public repo-safe examples; do not imply every audit is exhaustive. Published on X August 19, 2026 at 8:00 PM Asia/Kolkata: `https://x.com/proofandstate/status/2090085860327006614`. | measuring | Observe whether builders understand the complete-path lesson; do not infer strategy from one post |
| FPP-C004 | 2026-08-12 | More public copies increase drift unless one customer-facing source is authoritative. | MenuList public-business-truth pattern | Founders building public or read-heavy products | X visual post | Use fictional/demo or approved public MenuList assets; no unverified owner outcome | validated | Select one clean public-safe before/after artifact |
| FPP-C005 | 2026-08-12 | Product changes can silently make a previously correct billing or permissions answer stale. | Answerlattice drift/change-control pattern | SaaS founders | X proof post; Reddit support-engineering post | Example workload is allowed; customer proof waits for evidence and consent | validated | Draft from the deterministic demo, labeling it as an example |
| FPP-C006 | 2026-08-12 | Refusing automation can be the reliable product decision when approval, evidence, or recovery is missing. | Cross-product product judgment | Product-minded founders | X short post | Name a public-safe decision and its trade-off; do not expose unreleased sequencing | captured | Choose one bounded MenuList or Answerlattice example |
| FPP-C007 | 2026-08-12 | A public write path is incomplete when it updates data but leaves the customer cache stale. | Cross-product cache discipline | SaaS founders and developers | X short post | Generalize the invalidation contract; no private route or tenant detail | measuring | Founder explicitly confirmed publication; URL and exact timestamp were not supplied. Observe relevant replies, saves, and qualified follows without inferring strategy from one result |
| FPP-C008 | 2026-08-12 | Agent output becomes a system boundary only when it has a schema, validation, and an explicit failure state. | Cross-product agent workflow | AI-assisted builders | X proof card | Use a generic contract; do not publish proprietary prompts or internal payloads | validated | Create a simple three-part proof card |
| FPP-C009 | 2026-08-12 | A preview or trial lifecycle is safer as an explicit state machine than a timestamp attached to an account. | Cross-product lifecycle pattern | SaaS founders | X text plus diagram | Use generic states and trade-offs; do not expose current billing or abuse controls | captured | Validate one public-safe state model |
| FPP-C010 | 2026-08-12 | A passing test creates false confidence when it proves the wrong scope or environment. | Cross-product verification practice | AI-assisted builders | X short post | Explain local/source/hosted evidence labels without naming private failures | validated | Draft the first-month X version |
| FPP-C011 | 2026-08-12 | Immutable snapshots can reduce read amplification on public surfaces, but make invalidation and freshness explicit obligations. | Cross-product Firebase/public data pattern | Firebase and SaaS builders | X diagram; later Reddit post | Use a modeled architecture and label it; no customer volume or private schema | captured | Prepare a simplified trade-off diagram |
| FPP-C012 | 2026-08-12 | Documentation drift is part of runtime reliability when customers or support systems depend on the answer. | Answerlattice-aligned general pattern | SaaS founders | X proof card | General lesson only; product naming waits for identity-correlation gate | validated | Draft without product name or link |
| FPP-C013 | 2026-08-14 | Open recommendation code is not a growth checklist: candidate retrieval, predicted-action ranking, visibility filtering, and transparency-tool eligibility are different systems. | [X's August 13 release](https://github.com/xai-org/x-algorithm/tree/a389166f6cf5da70a286b568c87695d4dcdce3a1) and [August 14 clarification](https://github.com/xai-org/x-algorithm/commit/c65aa179db7bdd61e2c2821eac87f208a105c053) | Technical founders building an evidence-based public presence | Concise X source note; optional architecture card | Use only official public sources and a pinned commit. Explain that weights multiply personalized predictions rather than raw engagement counts; state that parameters and experiments can change. Do not expose the founder's original account, imply privileged access, or promise reach. | validated | Keep behind production-proof posts; draft only when a real audience question makes the distinction useful |

## New Entry Template

```markdown
| FPP-C### | YYYY-MM-DD | [one primary lesson] | [product/source] | [audience] | [format] | [exact evidence and public boundary] | captured | [smallest next action] |
```

## Promotion Gate

A candidate may include a product invitation only when:

- the post already delivers standalone value;
- the named product directly implements the lesson;
- the public claim is supported by current runtime or approved evidence;
- the product's distribution gate permits the invitation;
- affiliation is obvious;
- the invitation does not distort the post into an advertisement.
