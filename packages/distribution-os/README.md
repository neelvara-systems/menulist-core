# Distribution Operating System Package

DistributionOS is the repository-local curation, validation, routing, and retrieval contract for marketing and distribution knowledge. It decides whether founder-shared articles, posts, videos, conversations, competitor examples, and AI outputs materially improve the living Bible, without turning every source into a record or every idea into implementation.

## Boundary

- Internal-only; no public route, customer UI, owner UI, or public marketing.
- The living Marketing and Distribution Bible is the primary source of truth; Markdown ledgers are selected supporting evidence.
- Audit and planner commands are read-only.
- No database, Firebase operation, API route, scheduler, provider connection, AI call, scraping, publishing, outreach, account operation, deployment, or spend.
- SignalDesk continues to own MenuList execution evidence, experiments, approvals, attribution, and outcomes.
- CampaignCue continues to own reviewed campaign outputs; AssetOS owns governed media assets; SecurityOS owns security evidence.

## Source of Truth

- `__docs__/distribution-operating-system/distribution-operating-system_bible.md` — primary living marketing and distribution doctrine.
- `products/distribution-profiles.ts` — product classes, routes, truth paths, execution owners, and exclusions.
- `schemas/distribution-os-schema.ts` — typed boundary, product, ledger, status, entry, and audit contracts.
- `scripts/lib/distribution-os-ledger.ts` — Markdown parsing, audit, and query logic.
- `__docs__/menulist-marketing-distribution/menulist-marketing-distribution_external-insight-ledger.md` — selected MenuList evidence.
- `__docs__/strategy/product-portfolio-distribution-insight-ledger.md` — selected cross-product evidence and product-by-product verdicts.
- `.agents/skills/distribution-os/SKILL.md` — reusable `$distribution-os` intake workflow.
- `__docs__/distribution-operating-system/` — governed internal feature documentation.

## Commands

```bash
npm run distribution-os:audit
npm run distribution-os:audit -- --product menulist
npm run distribution-os:plan
npm run distribution-os:plan -- --product menulist --topic ai-discovery
npm run distribution-os:plan -- --status deferred-reference
npm run distribution-os:plan -- --entry ML-MKT-EXT-011
npm run verify:distribution-os
```

The audit validates the required Bible sections, selected evidence IDs/metadata, product routes, truth paths, skill/docs presence, feature flag, and npm command registration. The planner identifies the Bible as primary, then searches supporting evidence and prints revalidation triggers and exact source locations. Neither command acts on the market.

## Operating Rule

Tagging is optional. Use `$distribution-os` when you want to invoke the system explicitly, but the repo-local skill must also activate automatically when the substance of a shared article, conversation, video, post, competitor example, or growth claim fits marketing or distribution—even when it appears in another repository task.

The skill first applies a selective-curation test against the Bible and current product truth. It preserves source limitations, validates unstable claims, and decides whether the input adds durable doctrine, a reusable workflow, an important risk, a real decision/gate change, or credible evidence. It can only classify content that has been supplied or is accessible in the active task context.

Not every input is stored. Repetition without material nuance, unsupported platform folklore, short-lived tactics, tool lists without a workflow need, and interesting but non-decision-useful material produce no repository change. When an input passes admission, DistributionOS synthesizes the useful lesson into the relevant Bible section. A supporting evidence entry is added only when provenance or detailed validation will genuinely help later.

An `APPLY_NOW` verdict means the idea is valid for current internal work. It does not authorize external execution. Publishing, outreach, spend, provider/account actions, deployments, and changes to product authority always retain their own explicit gates.
