# Approval and Comment Inbox

**Status:** Implemented and locally verified; authenticated multi-role QA remains pending

The Approval and Comment Inbox keeps owner, reviewer, local-manager, and agency feedback attached to the existing Campaign Pack. A reviewer can add one specific comment, an authorized reviewer can resolve it, and the pack cannot be approved while an open comment remains.

The current thread is embedded as a bounded `approvalInbox` projection on the campaign already loaded by the workspace overview and mirrored atomically to the existing deterministic `approvalRequests` document. No comments collection or additional overview query is added.

## Documents

- [Specification](./approval-comment-inbox_spec.md)
- [Implementation](./approval-comment-inbox_impl.md)
- [Firebase](./approval-comment-inbox_firebase.md)
- [Mobile](./approval-comment-inbox_mobile-support.md)
- [Tests](./approval-comment-inbox_test-cases.md)
- [Help](./approval-comment-inbox_helpdoc.md)
- [Marketing](./approval-comment-inbox_marketing.md)
- [Website](./approval-comment-inbox_website.md)
- [Validation](./approval-comment-inbox_validation.md)
