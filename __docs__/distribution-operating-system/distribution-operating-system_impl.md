# Distribution Operating System - Implementation

> Version: 1.0
> Status: Implemented
> Date: August 13, 2026

## Architecture

DistributionOS deliberately has no persistent runtime. The Git-tracked Bible is the living primary synthesis. Selected evidence remains in human-readable Markdown ledgers, which local TypeScript parses on demand.

```text
product profiles ----------+
                            |
living Bible --------------> integrity audit
                            |
supporting evidence ledgers -> parser -> read-only evidence planner

$distribution-os skill -> source/repo validation -> admission decision -> Bible synthesis or no change
```

## Components

| Component | Responsibility |
| --- | --- |
| `__docs__/distribution-operating-system/distribution-operating-system_bible.md` | Primary curated doctrine and future decision source |
| `packages/distribution-os/schemas/distribution-os-schema.ts` | Products, statuses, boundaries, ledger, entry, and audit types |
| `packages/distribution-os/products/distribution-profiles.ts` | Ledger registrations and ten product/surface routes |
| `packages/distribution-os/scripts/lib/distribution-os-ledger.ts` | Markdown parsing, audit logic, and query filtering |
| `packages/distribution-os/scripts/audit-distribution-os.ts` | Human-readable integrity audit |
| `packages/distribution-os/scripts/plan-distribution-os.ts` | Read-only retrieval by product, topic, status, or ID |
| `scripts/verification/verify-distribution-os.js` | Source/boundary contract verifier |
| `scripts/verification/test-distribution-os-registry-boundaries.ts` | Registry, query, and separation behavior tests |
| `.agents/skills/distribution-os/SKILL.md` | Reusable intake/validation workflow |
| `.agents/skills/distribution-os/references/product-routing.md` | Detailed product and responsibility routing |

## Primary And Supporting Knowledge

The Bible is canonical for reusable marketing and distribution doctrine. The ledgers are supporting evidence only: they preserve source limitations, claim-level reasoning, product-specific verdicts, and revalidation triggers where that detail is worth retaining. A parallel JSON entry registry would create drift. DistributionOS validates the Bible and parses selected evidence in place.

## Parser Contract

- Only numeric headings matching a registered prefix are entries; templates such as `ML-MKT-EXT-NNN` are ignored.
- Wrapped metadata lines are normalized for retrieval.
- Status is resolved from the maintained five-status vocabulary even when a portfolio entry includes explanatory text.
- Topics are normalized to lowercase query tokens.
- Exact file and starting line are retained for operator navigation.
- Required sections differ by ledger so existing MenuList and portfolio forms keep their appropriate human-readable structure.

## Command Contract

```bash
npm run distribution-os:audit
npm run distribution-os:audit -- --product menulist
npm run distribution-os:plan
npm run distribution-os:plan -- --product menulist --topic ai-discovery
npm run distribution-os:plan -- --status deferred-reference
npm run distribution-os:plan -- --entry ML-MKT-EXT-011
npm run verify:distribution-os
```

The audit always validates the whole system; `--product` also validates that the requested route exists. The planner names the Bible as primary and returns supporting evidence matches. It does not browse, execute commands, or write files.

## Separation From SignalDesk

DistributionOS ends when useful knowledge has been synthesized into doctrine or intentionally rejected from storage. SignalDesk begins when MenuList needs governed source evidence, an approved play, experiment state, partner/outreach state, execution, performance, attribution, or an outcome receipt. Cross-links are allowed; copied records are not.

## Change Procedure

1. Invoke `$distribution-os` and classify the user's authority.
2. Read the full Bible and relevant product truth.
3. Retrieve supporting evidence and current primary sources only where required.
4. Apply the Bible admission test.
5. Make no repository change when the input adds no durable value.
6. When admitted, synthesize the durable lesson into the relevant Bible section.
7. Add a sequential evidence entry only when provenance or detailed validation will matter later.
8. Update action/log/changelog records only when system state changed.
9. Run `npm run verify:distribution-os` plus affected-product gates.
10. Do not deploy; DistributionOS has no deployment target.
