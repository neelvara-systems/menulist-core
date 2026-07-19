# Answerlattice Pre-Onboarding Input Kit — Firebase And Cost Notes

## Runtime Cost

This feature adds no Firebase reads, writes, deletes, Cloud Functions, Storage usage, scheduler work, or provider calls by itself.

It is a public static website resource plus a prompt.

## Cost Impact

| Area | Impact |
| --- | --- |
| Firestore reads | None. |
| Firestore writes | None. |
| Storage | None. |
| Cloud Functions | None. |
| AI/provider calls | None. |
| Scheduler | None. |
| Public website bandwidth | Normal static page and markdown response. The prompt modal caps the Markdown preview response at 128 KB before decoding. Copy and download actions stay browser-local, including the acknowledged textarea fallback. |

## When Costs Start

Costs begin only after the customer creates an Answerlattice workspace and uploads selected sources through existing Knowledge Intake flows.

Those costs remain governed by the existing Knowledge Intake implementation:

- active license checks;
- source count and text caps;
- paid media extraction;
- support-credit ledger;
- owner-triggered processing;
- review before publish.

## Data Safety

The prompt tells customers not to include secrets, tokens, private customer data, raw logs, payment details, or unapproved screenshots.

This reduces intake cleanup cost and prevents avoidable sensitive-data review.

The prompt also tells agents to mark inaccessible private repos, login-only apps, restricted websites, recordings, screenshots, and local files as pending. That prevents Answerlattice from treating unverified or inaccessible source areas as covered support truth.

Private source material requires owner permission for the selected AI tool. Generated package metadata records source authority, access scope, citation eligibility, applicability, and conflicts; those fields are review context and do not grant runtime access or approval.

The package standard stays within one existing Knowledge Intake job: at most 50 upload sources and 40,000 characters per source. Review-only JSONL skeletons do not create Firebase cost until an authenticated owner submits reviewed source content through Knowledge Intake.
