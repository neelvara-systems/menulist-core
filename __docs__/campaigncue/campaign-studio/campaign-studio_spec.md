# Campaign Studio — Spec

## Summary

Campaign Studio is the central creation surface. It asks for a business goal, selected item/service/offer, CTA, output channels, and credit estimate, then creates a campaign pack.

## Goals

- Promote item/service.
- Create weekend offer.
- Announce new item/service.
- Create WhatsApp campaign.
- Create Google update.
- Create reel/video.
- Create ad variants.
- Create calendar plan.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Goal-first | User chooses a business goal before format. |
| Prefilled from cues | Accepted opportunities open with item/service/source/CTA prefilled. |
| Pack default | Default output is multi-channel pack, not one asset. |
| Credit estimate | Estimate appears before generation. |
| Partial success | Completed outputs remain usable when others fail. |
| Trust handoff | Generated outputs trigger trust checks before use. |

## Risks

- Too many options can recreate blank-tool complexity.
- Bulk generation can surprise users with high credit cost.
- Reusing old campaigns can carry stale source facts.

