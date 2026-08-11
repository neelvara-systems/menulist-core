# GitHub Change Intake - Specification

> **Status:** Local source complete; hosted QA pending
> **Last Updated:** 2026-08-11

## Owner Job

When the product changes in GitHub, the owner should not need to remember every customer answer, article, workflow, page, and Answer Test that may need review. Answerlattice should collect a compact change receipt and place it in the same governed intake workflow the owner already understands.

GitHub is the only provider-specific connector admitted by this feature. The implementation does not create a generic connector framework or imply additional providers.

## Primary Flow

1. An owner with `canManageIntegrations` starts GitHub setup from Teach Answerlattice.
2. The owner installs the Answerlattice GitHub App on selected repositories.
3. Answerlattice verifies the installation through a short-lived GitHub user authorization instead of trusting the setup query parameter.
4. The owner selects up to ten visible repositories and chooses whether merged pull requests should also be collected.
5. GitHub sends signed events.
6. Answerlattice accepts only selected repositories and allowed event types.
7. It stores a bounded evidence summary in an existing Knowledge Intake job.
8. The owner runs the existing analysis when ready, reviews evidence, and approves any resulting proposal.

## Accepted Evidence

### Published Release

Store only:

- repository id and full name;
- release id, tag, title, publication time, and public GitHub URL;
- bounded release notes;
- target/default branch metadata;
- provider delivery id hash and event timestamps.

### Merged Pull Request

Store only:

- repository id and full name;
- pull-request id/number, title, bounded body, merged time, author login, and public GitHub URL;
- base branch and merge commit SHA;
- labels;
- at most 100 changed file paths plus the total changed-file count.

Never store file contents, patch text, diffs, blobs, repository archives, access tokens, user OAuth tokens, installation tokens, or GitHub App private keys.

## Admission Rules

- The app flag and Knowledge Intake flag must both be enabled.
- The workspace must have an active server-verified Answerlattice subscription.
- The workspace must be connected and the repository explicitly selected.
- Releases require `action=published`.
- Pull requests require `action=closed`, `merged=true`, and the selected repository default branch.
- When required labels are configured, the pull request must contain at least one configured label.
- One workspace accepts at most 100 GitHub change events per UTC day.
- One installation may expose at most 100 repositories during setup; owners with broader access must narrow the GitHub App installation first.
- A workspace may select at most ten repositories.

## Security Contract

- Server-only GitHub App credentials use full `ANSWERLATTICE_*` environment names.
- Setup state is HMAC-signed, expires after ten minutes, and binds purpose, user, tenant, and workspace.
- OAuth callback and dashboard-return URLs come from the canonical deployment target for the active stage, never from a request host header.
- The callback verifies the installation through GitHub's user-installation API before saving repository access.
- User and installation access tokens are memory-only and discarded after setup/provider reads.
- Provider JSON bodies are byte-bounded before parsing.
- Pull-request changed paths use a GraphQL selection for `path` only; the REST files payload that includes patch text is never requested.
- Setup-state and webhook HMAC secrets must be separate values of at least 32 characters.
- Webhooks verify `X-Hub-Signature-256` against the raw bounded request body before JSON parsing or database work.
- `X-GitHub-Delivery` is validated, hashed before persistence, and used for bounded replay control.
- Provider errors are generic in owner responses and bounded in logs.
- Browser clients cannot read or write repository binding documents.

## GitHub App Permission Contract

- Repository metadata: read-only, required by GitHub.
- Repository contents: read-only, required for Release events; Answerlattice does not call the contents API.
- Pull requests: read-only, required for merged-PR events and the path-only GraphQL lookup.
- Webhook events: Release, Pull request, Installation, and Installation repositories.
- Account permissions: none.
- Write permissions: none.

## Governance Contract

- Imported sources start unreviewed and workspace-private.
- A GitHub event never activates product truth.
- Analysis is explicit, owner-triggered, credit-accounted, and handled by the existing intake path.
- Existing source governance, canonical proposal, release impact, Answer Test, and publication rules remain authoritative.
- Installation removal or permission loss stops future intake; it does not silently delete historical evidence or active answers.
- Starting a reconnect does not replace or pause a healthy active connection; the new installation becomes active only after repository confirmation.
- A suspended or access-changed connection cannot be restored by saving its old settings. A newly verified GitHub handoff and repository confirmation are required.
- Pending repository selection can be cancelled without waiting for the setup window to expire.
- An expired first-time repository-selection window projects as disconnected so the owner can restart immediately without an extra cleanup write.

## Success Criteria

- An accepted event appears once in Teach Answerlattice without copying source code.
- Duplicate delivery does not create a second source.
- Unselected repositories and unsupported events produce no source.
- Webhook arrival makes no model call.
- The owner can disconnect without affecting the outbound GitHub issue adapter.
- The owner can continue from imported evidence into the current review and Release-to-Truth paths.
