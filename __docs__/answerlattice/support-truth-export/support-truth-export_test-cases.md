# Support Truth Export - Test Cases

## Admission And Security

1. Disabled flag returns `403 FEATURE_DISABLED`.
2. Missing workspace returns `400 NOT_ONBOARDED`.
3. A role without `canExportData` receives `403 FORBIDDEN`.
4. More than two attempts per user/workspace/hour receives `429`.
5. Limiter-provider failure receives `503` and performs no bulk read.
6. GET receives `405`; POST is the only generation method.
7. Same tenant/store rows with a non-`AL` product ID are excluded.

## Truth Selection

8. Draft entities, review-required canonical answers, inactive surfaces/articles/FAQs, draft changelog entries, and inactive releases are absent.
9. Approved canonical source IDs and explicit citation fields survive projection.
10. Arbitrary citation metadata and invalid/sensitive URLs are absent.
11. AI translations without `reviewedAt` are absent.
12. Included translations omit `reviewedBy` and other actor identity.
13. Changelog `entityChanges` and `releaseId` survive export.
14. A nested changelog page with wrong product/tenant/workspace identity fails the complete export.
15. Missing `published: true` and versioned entries without a valid release link are absent.

## Privacy And Completeness

16. Nested embeddings, `pId`, `tId`, `sId`, `uId`, actor fields, trace IDs, request IDs, source context, and raw source containers are absent.
17. Tickets, chats, feedback, audit rows, and unrestricted source records are never queried.
18. Exactly-at-cap input succeeds.
19. Cap-plus-one input fails with the exact section.
20. Serialized output above 8 MiB fails without a partial package.
21. Section ordering is stable.
22. Hostile/invalid timestamp values become unavailable without failing the package.
23. Numeric strings/booleans do not become portable numeric truth.

## Audit And Delivery

24. One successful package creates exactly one metadata-only audit row.
25. Exported answer/article text is not duplicated in audit state.
26. Clients cannot forge `support_truth_export_generated` in dedicated or shared rules.
27. Audit failure prevents file delivery.
28. Browser body reading is bounded and does not use `response.blob()`.
29. Rapid duplicate clicks start one request; workspace transition/unmount aborts it and suppresses former-workspace settlement.

## Commands

- `npm run test:answerlattice-support-truth-export-contracts`
- `npm run test:answerlattice-governance:rules`
- `npm run test:answerlattice-governance:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
