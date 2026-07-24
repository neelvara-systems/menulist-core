# SignalDesk Operating Layer - Mobile Support

**Status:** Dashboard-only mobile visibility; mutation surfaces are desktop-only
**Created:** June 24, 2026
**Last Updated:** July 21, 2026

## Current Contract

SignalDesk mobile is a compact read-only Dashboard. The Mission, Opportunities, Research Agent, experiment, offer, reply-playbook, source-quality, and market-pod workspaces are not mobile screens.

The server also enforces mobile read-only admission, so hiding desktop controls is not the security boundary.

## Mobile Available

- Compact Dashboard summaries admitted by enabled feature flags.
- Current status, risk, and founder-attention information already included by the dashboard contract.
- Existing emergency Control Room visibility where separately supported.

## Mobile Unavailable

- Opening a Mission or Opportunities editor.
- Preparing or reviewing a mission.
- Running provider research or changing source configuration.
- Creating/reviewing experiments.
- Editing offers or reply playbooks.
- Creating source-quality snapshots or market-pod recommendations.
- Sending, exporting, publishing, approving spend, or changing provider controls.

## Future Admission

A dedicated mobile Operating Layer should be considered only if observed use proves a frequent, time-sensitive founder decision that cannot be handled by the compact dashboard or desktop workspace. It must reuse the existing DAL, permissions, flags, and server read-only enforcement rather than creating a separate data path.
