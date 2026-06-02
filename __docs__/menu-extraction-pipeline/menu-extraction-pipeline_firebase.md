# Menu Extraction Pipeline — Firebase

**Status:** Implemented
**Last Updated:** June 2, 2026

## Collections

| Collection | Change |
| --- | --- |
| `menuImageProcessingJobs` | Central queue for all extraction entry points. |
| `publicMenuDrafts` | Public drafts now receive extraction completion/failure from the central worker. |
| `menuLinkImportArtifacts` | Unchanged; authenticated link imports still store private artifacts before job creation. |
| `projects/{tId}/{sId}` | Project writes now require the project document to exist. |
| `messagingOnboardingSessions` | Unchanged watcher flow; destination metadata only. |

## Rules

`menuImageProcessingJobs` client create is now denied. Owner surfaces create jobs through `POST /api/menu-extraction/jobs`; public and messaging jobs use Admin SDK.

Client reads, cancellation, and preview-review updates remain available through the existing owner job rules. Cancellation updates are field-restricted to status/timestamp fields so browser clients cannot mutate server-owned job payloads while cancelling.

## Storage Prefixes

The worker accepts only expected Storage prefixes:

- Owner upload: `projects/files/{tId}/{sId}/`
- Authenticated link import: `menuLinkImports/{tId}/{sId}/{projectId}/`
- Public draft: `publicMenuDrafts/{draftId}/`
- Messaging onboarding: `messagingOnboarding/{sessionId}/`

The worker also validates MIME type by source/destination before AI work. Public image drafts cannot use PDFs, while authenticated owner upload and link-import paths can still process PDF artifacts where those entry points allow them.

## Cost

Owner uploads now add one protected API write path before the same job write. The menu-intake identity check already existed; the server route now repeats/enforces it immediately before job creation when enabled.

Public create-menu no longer runs extraction inside the API request. It adds one `menuImageProcessingJobs` write and normal worker status writes, while removing request-lifecycle AI work from the public route.

No new collection, index, scheduled function, or Storage bucket was added.
