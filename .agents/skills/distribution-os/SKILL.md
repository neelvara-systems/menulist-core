---
name: distribution-os
description: Curate, validate, synthesize, retrieve, and route marketing or distribution knowledge against the living repository Bible and current product truth. Use when the user tags `$distribution-os`, shares an article, post, video, transcript, AI conversation, competitor example, growth tactic, channel claim, or market observation, or asks what prior distribution doctrine says. Decide whether the material is useful enough to improve the Bible; do not store every shared source. Also use when deciding whether an input needs supporting evidence, product work, SignalDesk execution, deferral, more research, or rejection.
---

# DistributionOS

DistributionOS is the repository's internal marketing and distribution curator. It decides whether external material deserves a durable place in the living Marketing and Distribution Bible, synthesizes only decision-useful knowledge, and keeps SignalDesk as the execution and attribution owner.

## Detection Rule

The `$distribution-os` tag is optional. Automatically use this skill whenever the substance of a user-shared input concerns marketing, distribution, acquisition, positioning, launch, channels, discovery, SEO/AEO, citations, attribution, partnerships, creator/content tactics, paid growth, competitor distribution, or an external growth claim—even when the user shares it in another repository task and does not name DistributionOS.

Detect from content and intent, not from exact wording. If the input primarily belongs to another established system, such as SecurityOS, AssetOS, PresenceOS, CampaignCue, or a product-specific doctrine, use that system too or route to it without duplicating ownership. Do not claim to detect content that was never provided or made accessible in the current task context.

## Required Context

1. Read `references/product-routing.md` completely.
2. Read `packages/distribution-os/README.md`.
3. Read `__docs__/distribution-operating-system/distribution-operating-system_bible.md` completely. This is the primary synthesis and the first comparison point.
4. Read the relevant product truth paths named in the routing reference.
5. Retrieve supporting evidence only when the topic or decision needs provenance or detailed prior validation:

   ```bash
   npm run distribution-os:plan -- --product menulist --topic ai-discovery
   ```

6. If the input affects MenuList, read `__docs__/menulist-marketing-distribution/README.md`; read its external-insight ledger only when evidence detail is needed.
7. If it affects multiple products, use the portfolio evidence ledger only when a product-by-product decision trail is needed.
8. If it proposes execution, experiments, attribution, approval, outreach, publishing, or spend for MenuList, read `__docs__/menulist-signaldesk/README.md` before deciding.

Tell the user in commentary that `$distribution-os` is being used and identify any source limitation that materially limits validation.

## Authority Check

Classify the request before editing:

- **Review and selective curation:** Sharing an input authorizes DistributionOS to decide whether it improves the Bible. Update the Bible only when the admission test passes. Do not create a record merely to show that the content was shared. Add supporting evidence-ledger detail only when provenance, claim validation, or a durable product-decision trail will matter later. Do not change product code, public/product docs, campaigns, pages, publishing, outreach, spend, deployments, or accounts/providers.
- **Bounded implementation:** The user explicitly asks to “do the needful,” implement valid changes, or update docs. Apply only the smallest evidence-backed internal changes within the existing product boundary.
- **External execution:** Publishing, outreach, partnerships, ads, provider/account actions, spend, or deployment require explicit authority for that action. A valid insight or `APPLY_NOW` status is not authority.

Selective Bible curation is part of DistributionOS review, not product implementation. The user expects Codex to use knowledge of the current repository, products, strategy, and prior doctrine to make the admission decision without asking whether every source should be stored.

## Intake Workflow

### 1. Preserve source truth

For validation, identify what was actually supplied: URL or no URL, author/publisher if known, source type, and whether the input is full text, a summary, selected claims, or an AI interpretation. Summarize copyrighted material unless fuller retention is necessary and authorized.

Do not convert a founder-supplied summary into a verified original-source claim. Name missing methodology, transcript, data, dates, or evidence.

Source handling is for validation, not diary-building. The Bible should preserve the useful doctrine, not who shared what on which day.

### 2. Validate before adopting

- Check current repository code, docs, feature flags, and verifiers first.
- Browse current primary sources for unstable platform, product, legal, pricing, policy, API, ranking, recommendation, or market claims.
- Treat numeric growth claims, citation/indexing timelines, platform absolutes, and causality claims as unverified until evidence supports them.
- Separate durable principle, plausible hypothesis, source assertion, repo fact, and measured first-party outcome.

### 3. Run the Bible admission test

Admit and synthesize only when at least one is true:

- the input adds a durable principle that applies beyond the source;
- it materially improves or corrects an existing Bible doctrine;
- it contributes a reusable workflow, decision rule, or measurement pattern;
- it exposes an important manipulation pattern, risk, or failure mode;
- it changes a current product decision, gate, priority, or operating boundary;
- it supplies credible evidence for an existing hypothesis.

Do not store when the input is repetitive without material nuance, unsupported platform folklore, an irrelevant or short-lived tactic, a tool list without a real workflow need, or interesting but not decision-useful.

If admitted, rewrite the durable lesson into the relevant thematic Bible section. Do not append a chronological article summary.

### 4. Classify claim by claim when detailed evidence is needed

Use exactly one maintained verdict for each material idea:

- `APPLY_NOW` — valid for current bounded internal work.
- `ALREADY_COVERED` — confirms an existing rule or implementation.
- `DEFERRED_REFERENCE` — useful only when the named gate occurs.
- `RESEARCH_REQUIRED` — plausible but insufficiently supported.
- `REJECTED` — unsafe, unsupported, stale, manipulative, or outside product doctrine.

For mixed inputs, do not force one verdict over every claim. Preserve accepted, modified, deferred, and rejected parts explicitly.

### 5. Route by product and responsibility

- Portfolio doctrine: update the relevant section of the Marketing and Distribution Bible.
- MenuList-only detailed evidence: add the next `ML-MKT-EXT-NNN` entry only when provenance or a later product decision will need the full validation trail.
- Cross-product detailed evidence: add the next `PP-DIST-EXT-NNN` entry only when a durable product-by-product decision trail is necessary.
- Single non-MenuList product: update its maintained docs only when separately authorized and the insight changes active work; otherwise capture only the reusable doctrine in the Bible.
- SignalDesk: route approved execution evidence, experiment design, approval, attribution, and outcomes there. Do not duplicate those records in DistributionOS.
- CampaignCue: route reviewed campaign-output work there; DistributionOS does not publish.
- AssetOS/SecurityOS: route asset/security responsibilities to their existing systems.

No Bible or evidence-ledger change is a valid outcome when the source adds nothing materially useful. Say so briefly and rely on the existing doctrine.

### 6. Choose the smallest valid change

Potential outcomes include:

- no repository change because the useful parts are already represented;
- a synthesized Bible improvement without a source-ledger entry;
- a Bible improvement plus a supporting evidence entry when provenance matters;
- an existing-doc correction;
- a bounded, feature-flagged implementation backed by current evidence;
- a SignalDesk action or gate;
- a research requirement with an explicit revalidation trigger;
- a rejection with enough reasoning to prevent repeated reconsideration.

Do not create a database, dashboard, API, scheduler, provider integration, scraping job, autonomous agent, public comparison page, or duplicate product system merely because an external source suggests it.

### 7. Close the loop

For selective curation or broader authorized edits:

1. Update the Bible only when the admission test passes.
2. Add/update supporting evidence only when provenance or detailed validation will be useful later.
3. Update related product truth only when separately authorized.
4. Update the relevant action register or operating log only when work/state changed.
5. Update `__docs__/changelog.md` for material system changes.
6. Run `npm run verify:distribution-os`.
7. Run focused product verifiers for any implementation change.
8. Run docs links, typecheck, lint, and dependency freeze in proportion to the change.
9. Report what improved the Bible, what was already covered, and what was intentionally not retained.
10. Report verified local truth separately from external, deploy, owner, account, data-volume, or platform blockers.

## Retrieval Commands

```bash
npm run distribution-os:audit
npm run distribution-os:plan
npm run distribution-os:plan -- --product answerlattice
npm run distribution-os:plan -- --topic paid-acquisition
npm run distribution-os:plan -- --status deferred-reference
npm run distribution-os:plan -- --entry PP-DIST-EXT-002
```

These commands read repository files only. They do not browse, research, execute evidence, change ledger status, or act externally.

## Non-Negotiable Boundaries

- No fake urgency, agent-only persuasion, prompt injection, competitor manipulation, impersonation, undisclosed amplification, or fabricated evidence.
- No claim that an LLM, platform, algorithm, or citation system behaves universally without current evidence.
- No autonomous signup, billing, publishing, outreach, business-truth authority, or provider installation.
- No public branding or marketing for DistributionOS.
- No inference that a registry audit proves a strategy or channel works.
- No duplicate SignalDesk execution or measurement subsystem.
