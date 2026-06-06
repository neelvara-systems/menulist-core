# Repeated Reply Import — Test Cases

> **Status:** IMPLEMENTED  
> **Created:** 2026-06-06

---

## Static Verification

- `npx tsc --noEmit --incremental false --pretty false`
- `git diff --check`

---

## Functional Cases

| Case | Expected Result |
| --- | --- |
| Feature flag enabled | Knowledge Intake shows Repeated reply form. |
| Feature flag disabled | Repeated reply form is hidden and API rejects `type: repeated_reply`. |
| Submit question + answer | Source is created with type `repeated_reply`, existing redaction and dedupe apply. |
| Submit malformed repeated reply through API | API rejects before source write. |
| Generate drafts | Exactly FAQ and canonical proposal drafts are created for the repeated reply source. |
| Generate drafts with no entity IDs | Canonical proposal draft appears but cannot be accepted until entity ID is added. |
| Generate drafts with entity IDs | Canonical proposal can be accepted and published as a mutation proposal. |
| Open Knowledge Intake screen | Repeated-reply entity selector performs no entity/index search until typing. |
| Search entity from repeated-reply selector | API returns tenant-scoped active/beta entity options only. |
| Search deprecated entity | Deprecated entity is not returned even if the search index still matches. |
| Search older workspace without `prefixTokens` rows | API uses capped legacy fallback instead of full entity list. |
| Duplicate repeated reply | Existing dedupe path returns duplicate source without extra source/job/summary writes. |
| Publish FAQ only | FAQ uses existing FAQ publish/cache behavior. |
| Publish canonical proposal only | Existing mutation proposal is created; no canonical answer is auto-published. |

---

## Cost Cases

| Case | Expected Cost Behavior |
| --- | --- |
| Add repeated reply | Existing source transaction only. |
| Analyze repeated reply | At most two review item writes for that source. |
| Publish canonical proposal | One mutation proposal write plus review item update. |
| No media upload | No Storage and no provider usage ledger. |
| No AI extraction | No AI operation row for repeated reply import. |
| Entity selector idle | 0 additional Firestore reads. |
| Entity selector search | Capped search-index reads plus capped matched entity reads only. |
| Repeated same search | Client returns cached options during the session. |

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-06 | Added entity autocomplete functional and cost cases. |
| 2026-06-06 | Added verification cases for implemented repeated reply source path. |
