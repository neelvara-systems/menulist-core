# Vertical Campaign Playbooks - Spec

## Owner Job

CampaignCue should recommend a practical campaign that fits how the business actually operates. A restaurant may need a catering inquiry pack; a salon may need a membership reminder; a local service may need a seasonal-maintenance prompt. The owner should not translate a generic template into that job.

## Contract

Each playbook declares:

- one CampaignCue business type;
- owner jobs the product can support;
- recipe IDs that are valid for that vertical;
- protected evidence the owner should confirm;
- prohibited or review-only claims; and
- safe fallback recipes.

Each recipe continues to declare required inputs, channels, outputs, print uses, photo tasks, guardrails, manual delivery steps, and bounded owner-reported result options.

## Initial Coverage

The registry covers restaurant, salon, retail, local service, fitness, clinic, and other local businesses. Multi-location and agency-client values resolve to a conservative cross-business fallback because location/client mode must not silently invent the underlying business category.

The recipe library contains twenty bounded action recipes. The six added vertical actions are catering inquiries, membership reminders, back-in-stock updates, seasonal maintenance, trial sessions, and clinic service availability.

## Non-Goals

- No template marketplace.
- No thousands of generic formats.
- No model-generated strategy.
- No automatic holiday, stock, capacity, or discount inference.
- No medical, legal, financial, guaranteed-result, or unsupported product claims.
- No direct channel posting.
