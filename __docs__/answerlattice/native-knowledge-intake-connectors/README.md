# Answerlattice - Native Knowledge Intake Connectors

> **Status:** DO NOT BUILD NOW - RESERVED PLACEHOLDER ONLY
> **Feature:** 41 of 44
> **Version:** 1.1.0
> **Last Updated:** 2026-08-05
> **Flag:** `ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS: false`

## Current Product Truth

No native Knowledge Intake connector is implemented. The reserved app flag has no runtime consumer, no matching Functions flag, and no connected UI, API, OAuth callback, credential store, provider adapter, webhook, poller, or sync worker. Turning the flag on would enable nothing.

The working founder path is:

```text
selected public URL, file/export, pasted notes, repeated reply, screenshot, or short media
-> bounded extraction and redaction
-> source-backed review items
-> human review
-> existing KB/FAQ/product-surface/canonical-proposal destinations
```

This covers the first-use job without asking a solo founder to grant broad private-system access or maintain another integration.

The implemented release-evidence handoff does not change this status. Owners may paste or export GitHub Release text into Knowledge Intake and prepare an editable Changelog draft, but Answerlattice does not install a GitHub App, read a repository, call GitHub APIs, receive webhooks, poll releases, or synchronize version history.

## Decision

Do not build Notion, GitHub, Google Drive, Slack, inbox, or helpdesk-native intake now. Connector count is not a product outcome. The current priority remains proving that imported evidence becomes approved answers and reduces repeated founder support work.

## Reconsideration Gate

Consider one read-only connector only when all are true:

1. At least three paying workspaces request the same provider.
2. Their current export/import workflow demonstrably prevents activation or repeated maintenance.
3. The exact selected spaces/repos/projects and source permissions can be preserved.
4. Disconnect, token revocation, source deletion, dependent-answer review, and retention are designed before credential intake.
5. Poll/webhook cost, provider limits, error recovery, and support burden fit pricing.
6. The connector feeds governed evidence and proposals; it never treats imported tickets or chats as approved truth.

## Smallest Future Scope

If approved later, implement one provider only:

- read-only OAuth;
- owner-selected containers only;
- explicit initial import;
- manual refresh before background sync;
- source/version metadata and last successful sync;
- permission-loss and deletion review;
- no write-back, ticket sync, or automatic publication.

## Verification

- `npm run verify:answerlattice-native-intake-connectors`
- `npm run verify:answerlattice-runtime-truth`
- `npm run docs:check-links`
