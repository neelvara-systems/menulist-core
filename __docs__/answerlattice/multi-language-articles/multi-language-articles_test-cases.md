# Multi-Language Articles Test Cases

## Automated

1. Equivalent source content produces a stable SHA-256 source fingerprint.
2. Source edits change the fingerprint.
3. Valid JSON and fenced JSON parse to the strict two-field output.
4. Malformed, partial, extra-field, empty, and oversized output fails closed.
5. Paragraph draft content is deterministic.
6. Source mismatch blocks the write.
7. Existing locale state blocks overwrite.
8. Draft and incomplete approval states are not approved.
9. Initial and transaction-current article reads require exact `pId: AL` plus workspace scope.
10. The route uses fail-closed rate enforcement and a post-provider transaction.
11. Safe-mode rejection preserves private/no-store route handling.
12. The route writes `draft`, source locale, and source hash.
13. The route does not bump public cache/context versions.
14. Public content excludes translations.
15. Support Truth Export excludes draft translations.

Run:

```bash
npm run test:answerlattice-multi-language-contracts
npm run test:answerlattice-support-truth-export-contracts
```

## Required Before Any Customer Rollout

- dedicated/shared permission tests for the future approve/publish action;
- real Gemini malformed/truncated output behavior;
- concurrent source-edit and duplicate-generation emulator proof;
- fluent human review across chosen locales;
- source-change-to-stale-state regression;
- locale-aware search/widget/hosted-help fallback;
- RTL, accessibility, mobile, and long-copy browser QA;
- deployed QA and real workspace evidence.
