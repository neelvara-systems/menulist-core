# Multi-Language Articles Specification

## Customer Problem

A SaaS team may eventually need reviewed support content in more than one language. Automatic translation alone does not solve that job: the translated answer must remain current, approved, scoped, searchable, and delivered with an explicit fallback.

## Current Product Contract

The current code is a private draft-preparation prototype:

1. An authorized knowledge manager chooses an existing article and target locale.
2. The server verifies exact Answerlattice workspace scope, safe mode, rate admission, permission, article identity, source locale, content size, and absence of an existing locale record.
3. Gemini returns strict title/content JSON.
4. Answerlattice re-reads the article transactionally.
5. A source change or existing translation rejects the result.
6. A successful result is stored as a source-fingerprinted AI draft.

The draft is not approved, published, indexed, bundled, or served to customers.

## Required Future Publication Contract

Do not enable customer delivery until all of these exist:

- tenant-owned source and target locale configuration;
- edit, approve, reject, unpublish, and reviewer audit actions;
- explicit source-to-translation freshness and stale-state handling;
- locale-aware public content, search, widget, hosted help, and bundle behavior;
- deterministic exact-locale then source-locale fallback;
- plan/role/version applicability parity with the source;
- permission-aware private/public source handling;
- regression evaluation by fluent reviewers;
- measured customer demand that justifies maintenance cost.

## Non-Goals

- automatic publication;
- translating canonical answers independently of their authority lifecycle;
- detecting language from sensitive user data;
- claiming translation correctness from model output;
- using `next-intl` UI localization as evidence of translated support delivery;
- overwriting an existing draft or approval;
- broad locale expansion before a real client workflow is validated.

## Stop Rule

Reject further implementation if design partners do not provide repeated non-English support questions, fluent reviewers, and a maintained publication owner.

