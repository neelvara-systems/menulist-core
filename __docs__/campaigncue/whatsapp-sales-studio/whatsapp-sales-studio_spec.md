# WhatsApp Sales Studio - Spec

## Summary

WhatsApp Sales Studio creates consent-aware WhatsApp campaign messages for local businesses. It supports message drafts, approved template planning, manual send packs, segmentation notes, opt-out posture, and analytics capture.

## External Policy Reality

- Meta states that businesses must obtain user opt-in before sending WhatsApp message templates and the opt-in must clarify the business name and intent: https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform
- Meta provides WhatsApp policy enforcement docs for repeated policy violations and marketing-message enforcement: https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement
- Meta documents a `user_preferences` webhook for marketing preference changes: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/user_preferences/
- Meta documents WhatsApp Business Platform pricing as delivered template-message pricing on a per-message basis: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Meta documents per-user marketing template message limits when users are less likely to engage: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits

## Goals

- Help owners create WhatsApp campaigns without encouraging spam.
- Keep opt-in, opt-out, template, and campaign purpose visible before send/export.
- Support manual download/export where direct send is not enabled or policy-approved.
- Track replies and outcomes without over-reading customer data.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Consent gate | Campaign cannot move to send/export until consent posture is selected and recorded. |
| Template mode | Approved-template workflows are separated from manual download/export workflows. |
| Opt-out posture | Opt-out handling is visible in campaign review and analytics. |
| Segment notes | Owner sees intended audience, source, and exclusion rules before use. |
| Manual fallback | Owner can download/export a message pack without API send. |
| Trust check | Price, offer, deadline, and claim checks run before handoff. |
| Pricing visibility | Direct-send mode shows message pricing posture before send. |
| Preference sync | Connected mode records stop/resume preference events when available. |

## Non-Goals

- It does not scrape phone numbers.
- It does not bypass WhatsApp Business Platform approval.
- It does not send cold spam or guarantee message delivery.

## Risks

- Messaging policy changes can break direct-send assumptions.
- Poor consent tracking can create legal and platform risk.
- Over-personalized copy can feel invasive for small businesses.
