# Campaign Experiment Coach - Test Cases

1. The latest matching campaign, not array order, becomes the baseline.
2. Missing CTA outranks other suggestions.
3. Missing rights-confirmed visual produces a photo suggestion.
4. A not-useful baseline suggests channel; a positive baseline suggests timing.
5. First-use guidance suggests one primary format.
6. Every suggestion changes exactly one variable and labels the others as constant.
7. Suggestions use recipe-bound result questions and allowed signals.
8. Legacy three-field suggestions still parse as suggested.
9. Acceptance requires the existing idempotent campaign-action envelope.
10. Unauthorized roles and unapproved agency packs fail closed.
11. A blank result variable is persisted as blank and cannot complete a test.
12. A different variable cannot complete the accepted test.
13. `not_used` cannot complete the accepted test.
14. A matching explicit variable plus a real result completes the accepted test.
15. Accepting a test writes no unrelated dashboard summary.
16. No provider call, Storage object, experiment collection, or listener is introduced.
