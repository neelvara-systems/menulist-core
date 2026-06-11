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

## Goals

- Make local ads easier to prepare without hiding platform policy risk.
- Keep copy, creative, audience, budget, and destination in one pack.
- Support manual handoff to ad platforms or agencies.
- Enable API publishing only after platform credentials and compliance checks are complete.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Ad pack default | Output includes copy variants, creative refs, CTA, audience notes, budget notes, and destination. |
| Policy risk check | Trust Center flags misleading claims, unsupported offers, restricted categories, and destination risk. |
| Manual handoff | Owner or agency can download/copy ad pack without API publishing. |
| Budget clarity | Suggested budget is advisory and never auto-spent without explicit approval. |
| UTM support | Campaign links can include UTM parameters and source tracking. |
| API gating | Direct ad creation requires configured ad account, role, policy status, and explicit approval. |
| Personal-attribute safety | Ad copy avoids implying the viewer has a condition, insecurity, status, or protected/personal attribute. |
| Destination review | Landing destination is checked for mismatch, missing offer details, broken links, and unsupported claims. |
| Restricted-category warning | Salon, beauty, wellness, medical-adjacent, finance, alcohol, political, and other restricted categories show policy warnings before handoff. |

## Non-Goals

- It does not guarantee ad approval.
- It does not automatically spend money.
- It does not replace ad-platform policy review.

## Risks

- Ads can trigger platform review or disapproval.
- Salon/health/beauty categories need careful claim limits.
- API account permissions and quotas can block automation.
