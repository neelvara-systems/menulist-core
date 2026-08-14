# Distribution Operating System - Test Cases

> Version: 1.0
> Date: August 13, 2026

## Ledger Integrity

1. Only numeric registered-prefix headings become entries.
2. Each ledger starts at `001` and stays sequential.
3. IDs are unique across both ledgers.
4. Required metadata exists for each ledger form.
5. Required decision sections exist for each ledger form.
6. Status resolves to one of the five maintained values.
7. Every entry has at least one retrieval topic.
8. Wrapped metadata remains readable.

## Bible Integrity

1. The Bible is present and designated as the primary synthesis.
2. Core doctrine, curation, positioning, SEO, AI discovery, organic content, video, paid acquisition, permissioned distribution, measurement, ownership, and revalidation sections exist.
3. The Bible contains thematic doctrine, not a chronological source diary.
4. Supporting ledgers are described as evidence archives, not primary doctrine.

## Product Routing

1. All ten registered product/surface IDs have exactly one profile.
2. Every profile references registered ledgers and existing truth paths.
3. MenuList retrieves MenuList and portfolio entries.
4. Answerlattice and other non-MenuList products retrieve portfolio entries only.
5. Exact ID retrieval returns one entry.
6. Topic and status filters return only matching entries.
7. Unknown products and statuses fail clearly.
8. SignalDesk is named as execution owner without receiving a duplicate insight ledger.

## Boundary

1. Internal-only and read-only flags are true.
2. Public runtime, Firebase, provider, automatic research, publishing, outreach, and spend flags are false.
3. Package code contains no network, Firebase, AI SDK, HTTP client, or child-command integration.
4. Planner output cannot modify ledgers or execute a tactic.
5. Audit success cannot be described as source validation or channel success.
6. DistributionOS does not create a public website/mobile surface.

## Skill Behavior

1. `$distribution-os` triggers for a new external input or prior-knowledge request.
2. A matching article, post, video, conversation, competitor example, or growth claim triggers DistributionOS even when the tag is absent or it appears in another repository task.
3. The system does not claim awareness of content unavailable to the active task.
4. Every input is compared with the full Bible and current product truth.
5. Repetitive, unsupported, irrelevant, short-lived, or non-decision-useful content produces no durable change.
6. Admitted knowledge is synthesized into a thematic Bible section rather than logged chronologically.
7. A supporting ledger entry is added only when provenance or detailed validation will be useful later.
8. Review/curation requests do not change product code, public/product docs, campaigns, pages, accounts, providers, or external state.
9. Authorized implementation remains bounded to evidence-backed work.
10. Source limitations are preserved.
11. Unstable claims use current primary sources before adoption.
12. Mixed inputs retain separate verdicts when detailed evidence is needed.
13. External actions retain explicit separate authority.

## Verification Commands

```bash
npm run verify:distribution-os
npm run distribution-os:plan -- --product menulist --topic ai-discovery
python3 /Users/danny/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/distribution-os
npm run docs:check-links
npm run typecheck
npm run lint
npm run verify:dependency-freeze
git diff --check
```

No production build, Vercel deploy, Firebase deploy, external account action, or live campaign is required.
