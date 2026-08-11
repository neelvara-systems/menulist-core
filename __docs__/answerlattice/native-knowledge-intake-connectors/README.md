# Answerlattice - GitHub Change Intake

> **Status:** Local source complete; hosted QA pending
> **Feature:** 41 of 44
> **Version:** 2.0.0
> **Last Updated:** 2026-08-11
> **Flag:** `ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS: false`

## Decision

Implement exactly one read-only native provider: GitHub Change Intake.

The owner installs a repository-scoped GitHub App and selects up to ten repositories. Answerlattice can receive:

- published GitHub Releases; and
- merged pull requests on each repository's default branch, when the owner enables that option.

Each accepted event becomes a bounded, private, unreviewed source in the existing Knowledge Intake flow:

```text
signed GitHub event
-> selected repository and event policy check
-> bounded change summary (no source code or patch)
-> existing Knowledge Intake job and source
-> owner-triggered draft analysis
-> source governance and owner approval
-> existing release, Answer Test, knowledge, and distribution controls
```

GitHub does not become a source of approved truth by itself. A release or merged pull request is evidence that the product may have changed.

## Why This Provider

The existing manual GitHub Release handoff proves the product boundary but still requires repeated copying. GitHub is the smallest useful automation because product changes already originate there for the primary solo-founder and small SaaS team ICP. It strengthens Release-to-Truth without expanding Answerlattice into a helpdesk, documentation CMS, issue tracker, or generic connector platform.

## Day-One Scope

- GitHub App installation with repository-level access.
- Signed, short-lived, session-bound setup state.
- GitHub user authorization after installation so the setup callback does not trust a spoofable `installation_id`.
- Stage-specific canonical callback and return URLs; request host headers never select an OAuth destination.
- Owner selection of up to ten repositories.
- Active-subscription enforcement during setup, policy changes, and event intake.
- Published Release intake.
- Optional merged pull-request intake, restricted to the repository default branch.
- Optional required pull-request labels to reduce noise.
- GitHub App repository permissions limited to metadata read, contents read for Release events, and pull-request read for the optional merged-PR path.
- Webhook subscriptions limited to Release, Pull request, Installation, and Installation repositories events.
- Signed webhook validation, bounded payloads, replay protection, and a daily workspace cap.
- Narrow GraphQL file-path lookup for admitted pull requests; the REST file response that includes patches is not used.
- Deterministic source identity and rolling bounded intake jobs.
- Disconnect, installation suspension/deletion handling, audit records, and workspace lifecycle cleanup.
- Reconnect staging that leaves a healthy active connection running until the owner confirms the replacement repository selection.
- Existing responsive Knowledge Intake review and publication workflow.

## Explicit Non-Goals

- no polling or scheduler;
- no repository clone, code embedding, patch retention, or source-code search;
- no commit-by-commit ingestion;
- no GitHub write-back, issue creation, status update, or pull-request comment;
- no automatic model call when a webhook arrives;
- no automatic release creation, canonical-answer mutation, article update, changelog publication, or customer message;
- no Notion, Drive, Slack, helpdesk, or second provider in this implementation;
- no shared connector SDK before this provider proves sustained owner value.

The existing outbound GitHub issue adapter remains a separate execution integration. It must not be used for inbound source access.

## Rollout State

The source implementation remains disabled by default until the GitHub App credentials, callback URLs, repository permissions, hosted webhook behavior, and one real workspace are verified. The false flag is a rollout gate, not a partial implementation.

## Verification

- `npm run verify:answerlattice-native-intake-connectors`
- `npm run test:answerlattice-github-change-intake`
- `npm run verify:answerlattice-runtime-truth`
- `npm run docs:check-links`
