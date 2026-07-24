# SignalDesk Trust Partner Rail - Mobile Support

**Status:** Feature 17 locally source-complete; partner workspace and mutations are desktop-only
**Created:** June 24, 2026
**Last Updated:** July 21, 2026

## Mobile Relevance Decision

**NOT ADMITTED.**

The live SignalDesk mobile contract is dashboard-only. A mobile request for the Partners workspace is rejected, and every partner action is blocked by the common mobile read-only action boundary. Emergency pause remains available only through the existing mobile Control Room contract, not through a partner-specific mobile screen.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Fail | Partner setup, evidence review, spend, and renewal are deliberate desktop operations. |
| Speed | Fail | The complete authority/evidence check is not a five-second mobile workflow. |
| Touch | Fail | Profiles, briefs, evidence URLs, metrics, and spend context require dense comparison. |
| Value | Covered elsewhere | Emergency pause is already provided by the mobile Control Room boundary. |

## Mobile Not Allowed

- create partner profiles;
- approve paid deal terms;
- edit briefs;
- approve disclosure wording;
- enter metrics;
- approve renewal.
- load `/api/signaldesk/workspace?section=partners`;
- bypass MobileShell/dashboard-only workspace rules with a desktop route.

## Emergency Boundary

An authorized founder can activate the existing `trust-partner` scoped pause from the mobile Control Room. Resume and all partner review/mutation work remain desktop-only. No partner collection is read by the dashboard-only mobile workspace.
