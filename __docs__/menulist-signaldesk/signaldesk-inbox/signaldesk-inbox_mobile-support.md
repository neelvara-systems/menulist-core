# SignalDesk Inbox - Mobile Support

**Status:** Observe-only
**Last reviewed:** July 21, 2026

SignalDesk uses one responsive workspace, but mutation APIs classify `capture-reply` and `record-manual-contact` as configuration actions. Mobile requests are rejected and audited by the shared mobile-action boundary.

## Available

- View the bounded Inbox conversation summaries when the workspace is accessible.
- See target name, current state, and the bounded latest-message preview.
- Use the separate emergency kill-switch controls only where the role and mobile contract explicitly permit them.

## Not Available

- Capture a reply or manual contact.
- Send or compose a response.
- Override a classification.
- Reopen a suppression.
- Operate a full conversation timeline.

Desktop capture buttons are also disabled when the signed-in member lacks `target.review`. No mobile-only DAL, screen, write path, or additional Firebase read exists.
