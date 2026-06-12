# Source Integrations — Mobile Support Assessment

## Decision

**PARTIAL.** Mobile supports owner inputs, simple refresh, and export/download. Complex OAuth and conflict review belong to a separate future provider layer.

## Admission Test

| Gate | Result |
| --- | --- |
| Frequency | Medium; source refresh and upload happen occasionally. |
| Speed | Pass for upload/refresh, fail for full conflict review. |
| Touch | Pass for file/photo upload, fail for dense mapping tables. |
| Value | Pass for staff photo/menu upload from phone. |

## Mobile Scope

- Upload file/photo.
- Refresh source.
- Use last synced data.
- Continue in manual mode.
- See source status.

Desktop remains primary for provider connection setup, source mapping, and large conflict resolution.
