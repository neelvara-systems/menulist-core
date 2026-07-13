# MenuList Weekly Distribution Watch

**Status:** Active Codex weekly automation

**Created:** July 11, 2026

**Activated:** July 11, 2026

**Recommended cadence:** Monday at 9:00 AM Asia/Kolkata

**Owner:** Founder with Codex research support

**Scope:** Read-only weekly changes in distribution workflows and platform rules

## Purpose

Keep the distribution plan current without repeatedly reopening the whole strategy or turning every platform announcement into product work.

The watch should detect only material changes that affect:

- Google Business Profile, Google Maps, restaurant menus, local discovery, or Ask Maps;
- Instagram local discovery, creator collaboration, partnership ads, links, or disclosure;
- YouTube creator, Shorts, search, link, analytics, or brand-partner workflows;
- X organic/community/paid workflow changes relevant to founder or partner distribution;
- Reddit community participation, business engagement, promotion, spam, or measurement rules;
- Product Hunt launch rules and maker workflow;
- local restaurant/SMB trust-partner and creator practices in India, especially Bengaluru;
- proof-led content repurposing, referral, marketplace, and paid amplification patterns.

## Weekly Research Prompt

```txt
Research material changes from the prior seven days across Google Business Profile and Maps,
Instagram creator and local discovery, YouTube creator and search workflows, X, Reddit,
local SMB and restaurant distribution, trust-partner and creator workflows, Product Hunt,
and paid amplification.

Prefer official primary sources. Use practitioner discussions only as clearly labeled
directional evidence. Compare findings against the current MenuList distribution workflow
research and the existing SignalDesk Content Distribution and Trust Partner rails.

Report only material changes, with adopt, delay, or reject decisions, direct source links,
implications for the founder-approved Bengaluru proof trial, and an explicit
"No material change" conclusion when appropriate.

Do not contact businesses, publish content, modify external accounts, enable spend,
infer outreach permission, or change product/runtime scope.
```

## Required Output

| Section | Required content |
| --- | --- |
| Date and review window | Exact seven-day interval |
| Material changes | Only changes that affect the operating plan, permission, channel job, measurement, or platform risk |
| Adopt | Smallest repo-fit action supported by current evidence |
| Delay | Useful change that lacks proof, authority, owner input, or platform eligibility |
| Reject | Wrong-fit commerce, CRM, scraping, auto-publishing, unsafe outreach, or vanity optimization |
| SignalDesk implication | Existing rail to reuse and whether any repeated ambiguity exists |
| Bengaluru implication | Effect on the zero-spend proof trial |
| Sources | Direct links, publish dates, and platform/source type |
| Decision | Continue, narrow, change proof, change channel, pause, or no material change |

## Materiality Gate

A weekly finding is material only when it changes at least one of:

- owner or customer permission requirements;
- public-business data authority;
- supported link or profile behavior;
- channel discovery or collaboration workflow;
- disclosure, spam, or promotion policy;
- available measurement tied to qualified responses or activation;
- provider eligibility, delegation, or support burden;
- approved trial stop conditions;
- evidence required before paid amplification.

Do not treat ordinary feature promotion, algorithm speculation, agency opinion, isolated viral posts, or self-reported impressions as a material change.

## Source Hierarchy

1. Official platform policies, help centers, product announcements, and developer documentation.
2. Public business/creator program documentation.
3. Directly observable local partner or restaurant workflows.
4. Reputable reporting with primary-source references.
5. Practitioner/community discussions, labeled anecdotal or directional.

Do not convert a community post into a factual platform rule or outreach lead.

## Safe Follow-Through

Allowed without additional founder authority:

- update internal research conclusions;
- identify a stale link or changed platform rule;
- recommend `adopt`, `delay`, or `reject`;
- propose a narrower content or partner test;
- record an unresolved founder/provider/legal dependency.

Not allowed without explicit authority:

- external outreach;
- account creation or configuration;
- content publication;
- proof reuse;
- paid promotion or creator spend;
- provider application;
- runtime/API/collection changes;
- automatic change to an approved operating envelope.

## Scheduler State

The supported Codex recurring automation is active.

Automation:

- name: `MenuList distribution watch`;
- automation id: `menulist-distribution-watch`;
- cadence: Monday, 9:00 AM Asia/Kolkata;
- workspace: `/Users/danny/Projects/MenuListAi/menulist-core`;
- execution: read-only research and report;
- prompt: the exact weekly research prompt above;
- status: active;
- no external mutations.

Before any future schedule or prompt change, check for the existing automation id above and update it instead of creating a duplicate.

No raw cron, launchd job, GitHub Actions workflow, or hand-written automation configuration is used.
