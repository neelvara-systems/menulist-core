# Repeated Reply Import — Owner Helpdoc

> **Status:** IMPLEMENTED  
> **Created:** 2026-06-06  
> **Audience:** Answerlattice workspace owners

---

## What It Does

Use Repeated Reply when you already answer the same user question manually.

Paste:

- the question users ask
- the answer you usually send
- optional tags, page/context keys, and related product entities

Answerlattice prepares review drafts. You decide what to keep.

---

## Best Inputs

Good repeated replies are:

- short enough to review
- reusable for many users
- not tied to one customer's private account
- connected to a product feature, plan, workflow, integration, error, or policy

Avoid pasting:

- customer emails
- phone numbers
- payment data
- access tokens
- private customer account details
- one-off troubleshooting transcripts

Answerlattice redacts common sensitive patterns, but owners should still remove private customer-specific details before importing.

---

## What Happens Next

1. Add the repeated reply.
2. Click Generate review drafts.
3. Review the FAQ and answer proposal drafts.
4. Search and select a related entity before accepting the canonical answer proposal.
5. Publish accepted drafts.
6. Review the canonical proposal in Governance before making it authoritative.

---

## Why Product Entities Matter

A canonical answer should be tied to the product concept it explains. That keeps answers scoped and prevents a billing answer, integration answer, or workflow answer from appearing in the wrong place.

The repeated-reply form lets you search existing product entities by feature, plan, workflow, integration, or error. If the right entity is not available yet, save the source first and add the entity later in the review item before accepting.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Updated entity guidance for bounded entity search in the repeated-reply form. |
| 2026-06-06 | Added owner guidance for importing repeated replies through Knowledge Intake. |
