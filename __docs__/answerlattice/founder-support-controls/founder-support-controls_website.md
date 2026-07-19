# Founder Support Controls - Website Content

> **Publication gate:** Use only after runtime, mobile, and Firebase verification passes.

## Product Page Section

### Test support before users depend on it

Save the questions your users ask most. Answerlattice shows which approved answer, FAQ/owner answer, provider fallback, escalation, or no-answer path would run for each page and customer context, then checks required claims and supporting article references.

These deterministic checks validate the rules you configured. They are regression evidence, not an automatic guarantee of factual correctness, completeness, or customer resolution.

- Reusable question sets.
- Exact source and answer version.
- Required/forbidden claims and bounded evidence-reference checks.
- Canonical-only checks without an AI call.
- Release checks for affected product areas with advisory ready, review, or blocked proof status.
- Read-only proposal impact previews for explicitly linked priority questions before owner approval.

### Keep temporary problems separate from permanent truth

Publish a short, expiring known-issue notice for the affected page while your team investigates. Normal approved answers stay unchanged.

### Trusted context when you need it

For plan- or role-sensitive support, your server can sign a short-lived context token. Answerlattice verifies it without accepting tenant scope from the browser.

## FAQ

**Do answer tests affect analytics?**
No. Test runs are excluded from production search history, support signals, friction, and coverage.

**Do passing answer tests guarantee that every answer is correct?**
No. They verify configured source, ID, phrase, confidence, abstention, and evidence rules. Representative questions still require human review for factual correctness, completeness, and usefulness.

**Can Answerlattice roll back an answer automatically?**
No. It prepares a rollback proposal for owner review through the existing governance flow.

**Is Known Issue Mode a status page?**
No. It is a contextual temporary notice for the in-app widget. You can link to your existing public status page.

**Does Answerlattice record user sessions?**
No. Owners may attach a bounded link from an existing diagnostics provider, but Answerlattice does not capture session replay.

**What is included in an export?**
Approved support truth such as surfaces, articles, FAQs, releases, entities, and canonical answers. Secrets and private support conversations are excluded.
