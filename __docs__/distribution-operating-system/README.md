# Distribution Operating System

**Status:** Implemented internal system
**Created:** August 13, 2026
**Owner:** Founder with Codex governance
**Scope:** External marketing and distribution knowledge intake, validation, product routing, retrieval, and revalidation across the repository.

## Purpose

DistributionOS gives the founder and Codex one durable coordination contract for future articles, posts, videos, transcripts, AI conversations, competitor examples, and growth ideas. The `$distribution-os` tag is optional: matching content must activate the workflow automatically in any repository task where it is shared and accessible. The input is checked against current product truth and the living [Marketing and Distribution Bible](./distribution-operating-system_bible.md), then curated only when it materially improves what we know or how we operate.

It is not another marketing database and it is not an execution product. The Bible is the primary synthesis. Existing Markdown ledgers are supporting evidence for selected sources and detailed product decisions. SignalDesk remains the MenuList execution, experiment, approval, attribution, and outcome system.

## Selective Curation Rule

Not every shared item is stored. Codex decides using current repository truth, product strategy, prior doctrine, and evidence quality.

An input is curated only when it adds a durable principle, materially improves or corrects existing doctrine, contributes a reusable workflow or measurement pattern, exposes an important risk, changes a real product decision/gate, or supplies credible evidence for a hypothesis. Repetition, unsupported platform folklore, short-lived tricks, tool lists without a workflow need, and interesting but non-decision-useful content are not retained.

When admitted, the useful lesson is synthesized into the relevant Bible section. A source-ledger record is optional and exists only when provenance, claim-level validation, or a detailed product decision will be valuable later. We do not maintain a diary of what was shared, when it was shared, or why it appeared in a particular chat.

## System Map

```text
founder input + source limits
            |
            v
     $distribution-os curator
            |
            +--> current repo/product truth
            +--> Marketing and Distribution Bible
            +--> current primary sources when claims can drift
            +--> supporting evidence when needed
            |
            v
      Bible admission decision
       /                    \
      v                      v
no durable change      synthesize doctrine
                              |
                              +--> optional evidence record
                              v
               smallest authorized product decision
                   |
                   v
     SignalDesk or product workflow only if execution is approved
```

## Canonical Components

| Component | Purpose |
| --- | --- |
| [Marketing and Distribution Bible](./distribution-operating-system_bible.md) | Primary living synthesis used for future decisions |
| [Package README](../../packages/distribution-os/README.md) | Code boundary and commands |
| [Skill](../../.agents/skills/distribution-os/SKILL.md) | Reusable `$distribution-os` intake workflow |
| [Product routing reference](../../.agents/skills/distribution-os/references/product-routing.md) | Product classes, truth paths, and responsibility boundaries |
| [MenuList evidence ledger](../menulist-marketing-distribution/menulist-marketing-distribution_external-insight-ledger.md) | Selected MenuList source provenance and detailed validation |
| [Portfolio evidence ledger](../strategy/product-portfolio-distribution-insight-ledger.md) | Selected cross-product evidence and detailed decisions |
| [SignalDesk](../menulist-signaldesk/README.md) | Approved MenuList execution and measurement owner |

## Documentation

| Document | Audience and purpose |
| --- | --- |
| [Bible](./distribution-operating-system_bible.md) | Primary curated marketing and distribution doctrine |
| [Specification](./distribution-operating-system_spec.md) | Requirements, statuses, authority, and acceptance criteria |
| [Implementation](./distribution-operating-system_impl.md) | Package, parser, registry, CLI, skill, and maintenance design |
| [Internal positioning](./distribution-operating-system_marketing.md) | How to describe the system internally without public-product confusion |
| [Website boundary](./distribution-operating-system_website.md) | Explicit no-public-surface decision |
| [Operator guide](./distribution-operating-system_helpdoc.md) | Tag, retrieve, review, and update workflow |
| [Firebase cost](./distribution-operating-system_firebase.md) | Zero-operation contract |
| [Mobile support](./distribution-operating-system_mobile-support.md) | No owner/customer mobile admission |
| [Test cases](./distribution-operating-system_test-cases.md) | Integrity, retrieval, separation, and safety matrix |
| [Validation](./distribution-operating-system_validation.md) | Current verification evidence |

## Quick Use

In a future task, say:

> `$distribution-os` check this article against our Marketing and Distribution Bible. Add only what materially improves our doctrine or decisions; do not log it merely because I shared it.

You may also share the material without the tag. If its substance concerns marketing or distribution, Codex must detect the fit and apply DistributionOS automatically. Content that is not supplied or accessible in the task cannot be detected.

For supporting evidence retrieval after reading the Bible:

```bash
npm run distribution-os:plan -- --product menulist --topic ai-discovery
npm run distribution-os:plan -- --status deferred-reference
npm run distribution-os:plan -- --entry PP-DIST-EXT-002
```

For integrity:

```bash
npm run verify:distribution-os
```

## Non-Negotiable Boundary

`APPLY_NOW` means valid for current bounded internal work. It does not authorize publishing, outreach, account/provider operation, spending, deployment, customer-data use, autonomous signup, or changes to product authority.
