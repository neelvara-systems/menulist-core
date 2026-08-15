# Proof & State Post Bank

**Status:** Draft bank; nothing here is approved for automatic publication
**Last Updated:** August 15, 2026

## Use

Every entry references a content-ledger ID. Founder voice, evidence, privacy,
timing, media, platform rules, and disclosure must be reviewed immediately
before publication.

## Profile Drafts

### Bio

```text
Pseudonymous solo builder. Productionizing AI-assisted software: architecture, audits, product judgment, failures, and fixes.
```

### Banner

```text
Build fast. Verify everything.
```

### Pinned post

```text
I build software with AI assistance, then do the work that makes it dependable.

This account is pseudonymous by design—not a fake persona.

I share architecture, audits, product boundaries, failures, fixes, and trade-offs.

No growth theatre. Evidence over performance.
```

## First Twelve X Drafts

### FPP-C001 — Entitlement truth

**Status:** Founder-review for the first X post on August 16, 2026

**Publication packet:** Text only; 276 characters; no link, media, hashtag,
product name, or invitation. The lesson is generalized from a current verified
interface/server/data-access implementation. Do not add endpoint, collection,
tenant, customer, or bypass details. Publish manually from the dedicated Proof
Chrome profile after one final preview.

```text
A paywall is not a disabled button.

If the interface hides an action but the server accepts it, the feature is not gated.

The UI explains access.
The server authorizes the operation.
The data layer protects the boundary.

Interface state is clarity. Backend policy is truth.
```

### FPP-C003 — Complete audit paths

```text
An AI code audit that stops at the component is not a system audit.

For a write path, trace:

request -> validation -> authorization -> business rule -> write -> derived state -> read path -> visible result

Serious defects often live between correct-looking functions.
```

### FPP-C002 — Retrieval and authority

```text
RAG retrieves. It does not establish authority.

If three sources conflict, better retrieval returns the conflict more efficiently. It cannot decide which answer the product will stand behind.

Support needs approved answers, provenance, review state, and a deferral rule.
```

### FPP-C007 — Invalidation is part of the write

```text
A public write path is not complete when the database is correct but the customer still sees stale data.

The write and its invalidation contract belong to the same design review.

“We clear the cache elsewhere” is not a contract. It is a future incident.
```

### FPP-C006 — Mature automation

```text
Automation is not complete when the happy path runs without a person.

It is complete when authority, failure, recovery, and review are clear too.

Until then, one explicit human approval step can be the more mature product decision.
```

### FPP-C008 — Agent output contracts

```text
An agent response is not a system boundary because it is JSON.

It becomes one when the output has:

1. an explicit schema,
2. runtime validation,
3. a defined failure state.

Without all three, “structured output” is still an optimistic suggestion.
```

### FPP-C009 — State, not timestamp

```text
A trial is not just an expiry timestamp.

It may reserve public identity, allow compute, expose data, affect billing, and require cleanup.

Model the lifecycle as explicit states and transitions. Time can trigger a transition; it should not be the whole model.
```

### FPP-C010 — Wrong-scope proof

```text
A passing test can still create false confidence.

Local source checks prove local source behavior.
They do not prove deployed configuration, provider permissions, DNS, billing, or a real-device path.

Reliable handoffs label what was tested—and what remains unproven.
```

### FPP-C004 — Copies and authority

```text
Every customer-facing surface creates another copy of the business.

A website, PDF, QR page, social profile, and message thread can all be correct on day one—and disagree a month later.

Distribution compounds only after one version is authoritative.
```

### FPP-C011 — Public snapshots

```text
For a read-heavy public surface, an immutable snapshot can be cheaper and faster than rebuilding the view from live records on every request.

The trade-off is not free.

You must make freshness, invalidation, failure recovery, and the source of truth explicit.
```

### FPP-C005 — Correct answers become stale

```text
The dangerous support answer is not always invented.

It may have been completely correct last week.

Then a billing rule, permission, route, or workflow changed while the help article did not.

Support reliability needs change detection, not only better generation.
```

### FPP-C012 — Documentation is runtime dependency

```text
Documentation drift is a runtime reliability problem when customers and support systems depend on it.

The code can work exactly as designed while the business still gives the wrong answer.

Product change and answer review need one operational path.
```

## Reddit Draft Rule

Do not expand these drafts mechanically. A Reddit contribution begins with the
community's actual question and includes direct context, implementation or
decision, evidence, limitations, and disclosure when relevant. No product name
or link is used in the first month.
