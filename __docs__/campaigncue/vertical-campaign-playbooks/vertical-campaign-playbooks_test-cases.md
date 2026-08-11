# Vertical Campaign Playbooks - Test Cases

- Every supported CampaignCue business type resolves to a playbook.
- Every referenced recipe exists exactly once.
- Every primary vertical has at least two vertical-specific recipes plus safe shared actions.
- Recipe arrays remain within Daily Desk bounds.
- Every recipe has `not_used` and `not_useful` result options.
- Every recipe has guardrails and manual delivery steps.
- High-risk verticals include explicit claim and privacy restrictions.
- New recipes create missing-input gates when current facts are absent.
- Complete, current fixtures can reach a non-blocked recommendation.
- The module imports no Firebase, Storage, provider, model, or browser runtime.
