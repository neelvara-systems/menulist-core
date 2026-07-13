# CampaignCue AI Assistance Layer - Mobile Support

## Admission

Mobile is allowed for review and guided actions, not dense creative editing.

The assistant plan is suitable for mobile because each item is a short card with:

- status,
- owner value,
- current input,
- one suggested action,
- route to an existing tab.

## Mobile Behavior

- Show the deterministic recommendation first.
- Show assistant-plan cards after recommendation evidence.
- Keep actions as navigation to existing tabs.
- Do not show provider settings, prompts, model selectors, or technical metadata as primary copy.
- Do not open the full editor on mobile unless the existing editor route explicitly supports review/download scope.

## Cost and Offline Boundary

The assistant plan is rendered from existing page data. It does not start a listener, request another API endpoint, or create a provider call.
