# Menu Link Import Test Cases

## API

- Feature flag off returns 404.
- Missing permission confirmation returns 400.
- Invalid URL returns 400.
- `file:`, `ftp:`, `data:`, and `javascript:` URLs are rejected.
- `localhost`, `127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`, and metadata hostnames are rejected.
- Redirect to unsafe target is rejected.
- Oversized response is rejected.
- Unsupported content type is rejected.
- Valid HTML menu creates `menuLinkImportArtifacts` and `menuImageProcessingJobs`.
- Valid direct PDF/image creates a job with original content type.
- Homepage with same-origin menu/catalog link follows bounded candidates and creates a text artifact from the selected page.
- Homepage with Schema.org `hasMenu` URL follows the same-origin structured menu URL.
- Homepage with direct same-origin menu PDF/image link creates a PDF/image artifact.
- Menu split across multiple same-origin HTML pages combines only bounded high-confidence pages into one text artifact.
- Homepage/menu index with only cross-domain menu candidates does not crawl those candidates automatically.
- Non-menu app shell or mainpage route returns `NO_MENU_CONTENT_FOUND` and does not create a job.

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
- Discarding review marks the job cancelled and does not mutate project files.
- Approving review creates a project file entry from the source artifact and saves extracted data.
- Public cache invalidation runs only after approval.
