# Firebase Scale And Cost Closeout - Test Cases

**Command:** `npm run verify:firebase-scale-cost-closeout`
**Last verified:** July 17, 2026

| Case | Expected |
| --- | --- |
| two concurrent first attempts | exactly one lease owner |
| second attempt before ten-minute expiry | refused |
| second attempt after ten-minute expiry | admitted for recovery |
| completed day | later same-day attempt is refused |
| next UTC day | new lease is admitted |
| failed attempt within 55 minutes | retry is refused |
| failed attempt after delay | retry is admitted |
| no store due, daily owner exists | platform suite runs |
| stores due, daily complete | store-local work runs; platform tasks skip |
| stores due, daily complete | Special Menu marker recovery still checks that cohort |
| no stores due, daily owner exists | Special Menu marker recovery says `no_due_stores` |
| task disabled | run log says `feature_disabled` |
| task not daily owner | run log says `daily_cadence` |
| exact duplicate composite/override | verifier fails |
| indexed TTL field | verifier fails |
| loss of high-cardinality exemption | verifier fails |
| scanner listener/public/query risk growth | verifier fails pending review |
| product index manifests | parse and retain product separation |
| Functions/root compile | no type error |
