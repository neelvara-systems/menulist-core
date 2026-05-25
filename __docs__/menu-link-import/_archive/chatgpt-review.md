# ChatGPT Conversation Review: Menu Link Import

## Verdict

Partial agreement.

The strategic direction is correct: link import can reduce setup friction and fit MenuList's public-truth intake layer when it is owner-provided, reviewed, and never auto-published.

The proposed architecture was too broad for v1. It included Playwright, Crawlee, Firecrawl, Apify, Browserless, Gemini URL Context, vendor fallback adapters, source monitoring, and multi-source comparison. Those are not needed to ship a safe first version and would add dependency, policy, and operational risk before the feature proves itself.

## Accepted

- Owner-provided menu link.
- Permission confirmation.
- Draft/review before publish.
- SSRF protection as a P0 requirement.
- Store source provenance.
- Use existing extraction and review path.
- Keep copy conservative.

## Rejected For v1

- Generic crawler posture.
- Marketplace scraping.
- CAPTCHA/login bypass.
- Gemini web tooling as canonical acquisition.
- Third-party crawler as a foundation.
- Auto-publish.
- Scheduled source monitoring.
- Google Business Profile writeback.

## Final MenuList Decision

Build a MenuList-owned direct acquisition route that creates a private source artifact and routes into the existing extraction job queue. Force review for link jobs. Approval writes through the existing project mutation and public cache path.

