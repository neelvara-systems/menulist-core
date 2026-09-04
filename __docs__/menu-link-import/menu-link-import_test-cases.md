# Menu Link Import Test Cases

**Boundary Reviewed:** September 4, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## API

- Unauthenticated `POST /api/menu-link-imports` and `POST /api/public/create-menu` link requests return `401` before source acquisition.
- Feature flag off returns 404.
- Missing permission confirmation returns 400.
- Invalid URL returns 400.
- `file:`, `ftp:`, `data:`, and `javascript:` URLs are rejected.
- Mobile keeps Import disabled for those invalid schemes even after permission
  is checked, shows an announced safe validation message, and performs no
  missing-project creation or protected request.
- Mobile names the URL input from its visible import purpose rather than the
  example URL placeholder.
- `localhost`, `127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`, and metadata hostnames are rejected.
- Redirect to unsafe target is rejected.
- IPv6 literals across the full `fe80::/10` link-local range, including
  `fe90::1`, `fea0::1`, and `febf::1`, are rejected before network access.
- Deprecated `fec0::/10` site-local IPv6 literals are rejected before network
  access.
- IPv4-compatible, IPv4-mapped hexadecimal, and NAT64 IPv6 literal forms that could resolve to private/local targets are rejected.
- HTTP/S URLs with non-standard explicit ports are rejected by both client and server validation.
- Oversized response is rejected.
- Unsupported content type is rejected.
- PDF/JPEG/PNG/WebP responses whose magic bytes do not match their admitted binary type are rejected before Storage.
- A project ID outside the authenticated tenant/store `{tId}-...-{sId}` contract returns 403 before project/provider work; owner image/PDF upload uses the same shared scope guard.
- A rate-limit provider outage fails closed with fixed 503 copy and no source-acquisition or persistence work.
- Owner route responses remain `private, no-store` and `nosniff` for success and failure paths.
- Valid HTML menu creates `menuLinkImportArtifacts` and `menuImageProcessingJobs`.
- Seven-day retention deletes only exact terminal or already-pruned job artifacts, skips active jobs, rejects cross-tenant/job/path mismatches, and preserves metadata when Storage deletion cannot be confirmed.
- Valid direct PDF/image creates a job with original content type.
- Homepage with same-origin menu/catalog link follows bounded candidates and creates a text artifact from the selected page.
- Homepage with Schema.org `hasMenu` URL follows the same-origin structured menu URL.
- Homepage with direct same-origin menu PDF/image link creates a PDF/image artifact.
- Menu split across multiple same-origin HTML pages combines only bounded high-confidence pages into one text artifact.
- Homepage/menu index with only cross-domain menu candidates does not crawl those candidates automatically.
- Non-menu app shell or mainpage route returns `NO_MENU_CONTENT_FOUND` and does not create a job.
- Client validation preserves `#/...` and `#!/...` SPA routes but removes ordinary content anchors.
- Render dependency discovery reads no more than 12 same-origin scripts at 512 KiB each, admits no more than 16 total hosts, and subjects every candidate host to the existing unsafe-IP and DNS validation before Chrome starts.
- Chrome can contact only DNS-pinned admitted hosts; unlisted hosts use the dead proxy and cannot inherit Chrome's implicit loopback bypass.
- Text extraction accepts only the exact current job artifact path, or the exact bound public-draft text path, in the configured Storage bucket.
- Deterministic text extraction runs only for a single English target language; multilingual and non-English jobs retain the existing AI extraction/translation path.

## Signed-in `/create-menu`

- The page is reachable before sign-in, but link submit redirects to sign-in before the request is sent.
- A signed-in permission-confirmed link request creates one owner-bound `publicMenuDrafts` record, one shared processing job, and one private source object.
- The route uses `PUBLIC_MENU_ENTRY_AUTH` with HMAC-hashed user identity, not an anonymous IP-only link-import limit.
- Preview polling is owner-bound and authenticated.
- Draft claim remains authenticated and is required before tenant/store/project publication.

## Desktop

- Feature flag off hides the link import UI.
- Feature flag on shows the link import UI without changing file upload.
- Permission checkbox gates submit.
- Existing active job is reused.
- Successful import sets active processing job.
- Failed import shows owner-safe fallback copy.
- Homepage import with a linked menu page still lands in the same processing/review UI.
- Multi-page import still shows one review job and one imported source file.
- Local selected files disable link import until the owner uploads or clears them.
- An active link import disables Upload & Continue until the job finishes or review opens.
- Approved non-image link source files render in the project file list without image preview assumptions.

## Mobile

- Feature flag off hides the link import UI.
- Feature flag on shows link entry.
- Link import can create a new project when no current project is selected.
- Successful import closes into the existing job tracking flow.
- Once files are selected, mobile remains on the normal file review/upload path rather than showing a second link import action.

## Review

- Link jobs always land in review.
- Previews with more than 200 candidates start with zero selected changes on desktop and mobile; groups with more than 50 rows start collapsed.
- Selecting a new item whose category is also new selects that category automatically.
- Deselecting a new category also deselects dependent new items.
- The comparison and apply boundaries reject a new item when its category is neither already present nor approved in the same review.
- Discarding review marks the job cancelled and does not mutate project files.
- Approving review creates a project file entry from the source artifact and saves extracted data.
- Partial approval persists the exact positive `appliedChangeCount`, reports that count in completion UI, and sends only the approved preview subset to downstream side effects.
- Firestore rules reject completed review counts below 1 or above 5,000 and reject `appliedChangeCount` on discarded reviews.
- Refresh after completion does not reopen the review sheet.
- Public cache invalidation runs only after approval.
