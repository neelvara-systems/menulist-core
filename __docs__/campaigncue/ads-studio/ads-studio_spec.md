# Ads Studio - Spec

## Summary

Ads Studio prepares ad-ready campaign packs for local businesses: headlines, primary text, creative variants, audience notes, CTA, landing destination, UTM plan, budget recommendation, and policy risk review.

## External Policy Reality

- Google Ads policy requires clear, honest ads and prohibits misleading business practices: https://support.google.com/adspolicy/answer/6020955
- Google Ads API quota and mutate behavior depend on developer token access level and API operation limits: https://developers.google.com/google-ads/api/docs/best-practices/quotas
- Meta Advertising Standards prohibit deceptive or misleading practices: https://transparency.meta.com/policies/ad-standards/
- Meta personal-attributes policy prohibits ads that assert or imply personal attributes of the viewer: https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/
- Meta health and wellness policy restricts weight-loss, cosmetic, adult, and reproductive-health advertising categories: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness/
- Meta unacceptable-business-practices policy prohibits deceptive or misleading practices: https://transparency.meta.com/policies/ad-standards/fraud-scams/unacceptable-business-practices/
- Meta's hosted Ads MCP server exposes permission-scoped reporting, ad management, catalog, signal-health, troubleshooting, experiment, and activity-log tools to MCP-compatible agents: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview

## Goals

- Make local ads easier to prepare without hiding platform policy risk.
- Keep copy, creative, audience, budget, and destination in one pack.
- Support manual handoff to ad platforms or agencies.
- Preserve a read-first future path for provider evidence without making Meta the Campaign Decision Engine.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Ad pack default | Output includes copy variants, creative refs, CTA, audience notes, budget notes, and destination. |
| Policy risk check | Trust Center flags misleading claims, unsupported offers, restricted categories, and destination risk. |
| Manual handoff | Owner or agency can download/copy ad pack without API publishing. |
| Budget clarity | Suggested budget is advisory and never auto-spent without explicit approval. |
| UTM support | Campaign links can include UTM parameters and source tracking. |
| API gating | Direct ad creation requires configured ad account, role, policy status, and explicit approval. |
| Read-first provider posture | Reporting, activity logs, signal health, and troubleshooting may be considered only after explicit owner connection, verified Meta permissions, tenant isolation, and a deterministic tool allowlist. |
| Model boundary | A model may summarize validated provider evidence, but it cannot choose arbitrary MCP tools, decide spend, select business facts, or mutate ads. |
| Provider evidence | Imported metrics must remain confidence-labelled platform evidence and must not be presented as proven sales, bookings, or ROI. |
| Write isolation | Ad creation/editing, budget changes, catalog mutations, and experiment mutations remain blocked until a separate high-risk mutation contract is approved. |
| Personal-attribute safety | Ad copy avoids implying the viewer has a condition, insecurity, status, or protected/personal attribute. |
| Destination review | Landing destination is checked for mismatch, missing offer details, broken links, and unsupported claims. |
| Restricted-category warning | Salon, beauty, wellness, medical-adjacent, finance, alcohol, political, and other restricted categories show policy warnings before handoff. |

## Non-Goals

- It does not guarantee ad approval.
- It does not automatically spend money.
- It does not replace ad-platform policy review.
- It does not currently connect Meta accounts, call Meta's MCP server, import provider metrics, or create/edit Meta ads.
- It does not make Meta reporting authoritative over CampaignCue business facts, owner approval, or result memory.

## Risks

- Ads can trigger platform review or disapproval.
- Salon/health/beauty categories need careful claim limits.
- API account permissions and quotas can block automation.
- MCP tool inventories, scopes, provider behavior, and availability can change independently of CampaignCue.
- Platform metrics can be incomplete, delayed, attributed differently, or unavailable for a selected date range.
