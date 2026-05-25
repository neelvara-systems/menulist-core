# Menu Link Import Mobile Support

## Admission

Mobile support is required because menu setup is an owner workflow and owners often operate from phones. The feature passes the mobile gate because it reduces upload friction and keeps the action recoverable through review.

## Mobile Behavior

- The upload sheet shows "Import from existing menu link" only when `ENABLE_MENU_LINK_IMPORT` is true.
- The owner enters a URL and confirms permission.
- The sheet creates a project first when no current project exists, matching existing mobile upload behavior.
- The API creates the extraction job.
- The existing mobile processing/review flow continues from the job id.
- Mobile exposes link import only from the select step; once files are selected, the sheet uses the normal file review/upload path.

## Touch and Copy

- Buttons use 44px+ targets through antd-mobile large buttons.
- Copy is short and non-technical.
- Errors do not expose fetch/security details.

## Parity

Desktop and mobile call the same `createMenuLinkImportJob` client helper and protected API route. Both route into the same `menuImageProcessingJobs` and review path.
