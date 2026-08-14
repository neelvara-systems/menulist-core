# Distribution Operating System - Specification

> Version: 1.0
> Status: Implemented
> Date: August 13, 2026

## Problem

External marketing and distribution material arrives repeatedly through chat. Without a common intake contract, useful ideas can disappear, weak claims can become assumed truth, the same tactic can be reconsidered without history, and one product's playbook can leak into another product's boundary.

The repository already has a MenuList external-insight ledger, a portfolio distribution ledger, product docs, and SignalDesk execution records. The missing layer was a curated primary synthesis. Without it, collecting every source would create an archive rather than a reusable marketing and distribution operating doctrine.

## Goals

1. Let the founder invoke one stable tag: `$distribution-os`.
2. Automatically detect matching marketing/distribution content even when the tag is omitted or the content appears in another repository task.
3. Maintain one living Marketing and Distribution Bible as the primary synthesis.
4. Decide autonomously whether shared material is sufficiently useful to improve the Bible.
5. Preserve source limitations and avoid false verification claims.
6. Validate time-sensitive claims against current primary sources and repo truth.
7. Classify material ideas using one maintained five-status vocabulary when detailed evidence is warranted.
8. Route decisions by current product class and product authority.
9. Retrieve supporting evidence before related strategy or implementation when needed.
10. Apply only the smallest authorized evidence-backed change.
11. Keep external execution and measurement in the correct existing system.

## Status Contract

| Status | Meaning | Does not mean |
| --- | --- | --- |
| `APPLY_NOW` | Valid for current bounded internal work | Permission to publish, contact, spend, deploy, or operate an account |
| `ALREADY_COVERED` | Confirms current doctrine, docs, or code | Proof that the source's results will reproduce |
| `DEFERRED_REFERENCE` | Useful after a named gate | Approved backlog work without revalidation |
| `RESEARCH_REQUIRED` | Plausible but not sufficiently supported | Safe to repeat publicly or implement |
| `REJECTED` | Unsafe, unsupported, stale, manipulative, or wrong fit | Permanently immutable if new reliable evidence changes the facts |

## Functional Requirements

### Intake

- Detect DistributionOS fit from the substance and intent of accessible content; the explicit tag is not required.
- Do not imply awareness of content that was not shared, linked, or otherwise accessible in the active task context.
- Compare the input with the full Bible and current product truth before deciding whether to store anything.
- Admit only durable principles, material doctrine improvements/corrections, reusable workflows or measurements, important risks, real decision/gate changes, or credible hypothesis evidence.
- Do not store repetition without material nuance, unsupported folklore, irrelevant or short-lived tactics, ungrounded tool lists, or interesting but non-decision-useful content.
- Synthesize admitted knowledge into the relevant thematic Bible section rather than appending a chronological article summary.
- When supporting evidence is warranted, preserve the stable source, author/publisher when known, source type, coverage limits, and validation context needed to reassess the claim. A share diary is not required.
- Summarize copyrighted material unless fuller retention is necessary and authorized.
- Preserve whether the founder supplied full text, a summary, selected claims, or an AI interpretation.

### Validation

- Repository truth must be checked before adoption.
- Platform, policy, API, pricing, legal, ranking, recommendation, and market claims must be rechecked against current primary sources when they can drift.
- Numeric claims and platform absolutes must remain source assertions until adequately supported.
- Mixed sources must receive claim-level verdicts rather than one blanket acceptance.

### Routing

- Portfolio-level durable doctrine belongs in the Bible.
- MenuList-only evidence records use sequential `ML-MKT-EXT-NNN` IDs only when provenance or detailed later validation is valuable.
- Cross-product evidence records use sequential `PP-DIST-EXT-NNN` IDs only when a product-by-product decision trail is valuable.
- Single non-MenuList product truth changes remain separately authorized.
- SignalDesk owns MenuList execution, approvals, attribution, and outcomes.
- Selective curation writes are limited to the Bible, optional supporting evidence, and directly required internal index/log/changelog/validation records; product implementation and external execution retain separate authority.

### Retrieval

- The Bible must be read first for current doctrine.
- Supporting evidence must remain searchable by product, topic, status, and exact ID.
- Evidence results must expose exact ledger path/line, use trigger, and revalidation trigger.
- Retrieval must not change entry state or perform research/execution.

### Audit

- IDs are unique and sequential per ledger.
- Required metadata and sections are present.
- Product profiles and truth paths are valid.
- Internal feature flag, package commands, docs, and skill are present.
- Audit success means registry integrity only.

## Non-Goals

- No public product, dashboard, customer/owner UI, CRM, data warehouse, or analytics runtime.
- No duplicate JSON copy of Markdown entries.
- No scheduler, crawler, feed reader, automatic web research, or AI summarization service.
- No publishing, outreach, ad operation, partnership action, provider connection, spend, deployment, or customer-data mutation.
- No duplicate SignalDesk evidence, experiment, attribution, or outcome system.

## Acceptance Criteria

- `$distribution-os` is a valid repo-local skill with UI metadata and routing reference.
- The Bible is primary and contains the required doctrine, curation, channel, measurement, and ownership sections.
- Two existing ledgers remain valid supporting evidence archives.
- Product/topic/status/entry evidence retrieval works locally and read-only.
- All ten registered product/surface classes have explicit truth paths, execution owner, and exclusions.
- The full internal documentation set defines public, mobile, Firebase, and execution boundaries.
- Focused verifier, registry tests, skill validation, typecheck, lint, docs links, dependency freeze, and diff integrity pass.
