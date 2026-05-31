# Growth Engine Core Doctrine

**Status:** Locked planning doctrine
**Product:** Growth Engine
**Product code:** `GE` proposed

---

## 1. Identity

Growth Engine is the internal acquisition control system for MenuList.

It exists to:

```txt
find qualified business leads
understand fit and risk
contact safely
route interest into MenuList onboarding
learn what converts
protect cost and channel reputation
```

It does not exist to maximize scraping, message volume, or automation.

## 2. North Star

The north-star metric is:

```txt
growth-sourced completed MenuList onboardings
```

Secondary metrics matter only if they explain the north star:

- valid lead rate
- eligible lead rate
- interested reply rate
- onboarding start rate
- completion rate
- cost per completed onboarding
- DNC/complaint rate
- manual decisions per completion

## 3. Product Law

No outreach without:

1. source provenance
2. dedupe
3. suppression check
4. channel eligibility
5. approved template
6. campaign cap
7. stop rule
8. dry-run report
9. kill-switch coverage
10. tracked onboarding route when a link is used

## 4. System Posture

Growth Engine is a controlled operator system.

It should run on:

- queues
- exceptions
- approvals
- summaries
- dry-runs
- safety alerts
- budget caps

It should not run on:

- random lead browsing
- manual spreadsheets
- untracked sends
- free-form AI decisions
- unmanaged provider scripts
- "send to all" behavior

## 5. Relationship To MenuList

Growth Engine serves MenuList but does not become MenuList.

MenuList owns:

- business truth
- onboarding
- menu creation
- owner activation
- public surfaces
- billing

Growth Engine owns:

- acquisition
- lead operations
- campaigns
- outreach
- attribution
- source/channel/template learning

MenuList must continue to work if Growth Engine is disabled.

## 6. Artifact Doctrine

Personalized artifacts are useful, but only when truthful, private, and rights-safe.

Allowed:

- noindex claim preview
- public-info audit
- menu/hours freshness report
- tracked onboarding prefill preview

Not allowed:

- mass public demo websites
- fake owner-verified pages
- rehosted third-party photos/reviews
- invented menu items, offers, prices, or ratings

## 7. AI Doctrine

AI is a bounded worker, not an authority.

AI may:

- classify lead fit
- summarize source notes
- detect need/risk
- draft inside approved templates
- classify replies
- recommend next action
- produce reports

AI may not:

- decide to send without policy checks
- invent claims
- override suppression
- choose illegal/unsafe channels
- generate public owner-verified truth
- write arbitrary outreach from a blank page

## 8. Safety Doctrine

Safety beats throughput.

The system should pause or slow down when:

- DNC rises
- complaint rate rises
- wrong-contact rate rises
- provider deliverability drops
- costs exceed thresholds
- AI evals fail
- source quality degrades

Scaling is allowed only after safety is stable.
