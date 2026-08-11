# Campaign Experiment Coach

**Status:** Implemented and locally verified; authenticated action evidence remains environment-dependent
**Owner surface:** Campaign Pack review and Result Memory
**Authority:** Deterministic rules, current Campaign Pack, explicit owner acceptance, and owner-reported results

Campaign Experiment Coach helps an SMB owner learn from one controlled change at a time. It does not predict reach, revenue, bookings, or growth. It proposes one bounded variable, explains the evidence, keeps the other variables stable, waits for an authorized owner action, and marks the test complete only when the owner explicitly records the same variable with a real result.

## Documents

- [Specification](./campaign-experiment-coach_spec.md)
- [Implementation](./campaign-experiment-coach_impl.md)
- [Firebase and cost](./campaign-experiment-coach_firebase.md)
- [Mobile support](./campaign-experiment-coach_mobile-support.md)
- [Test cases](./campaign-experiment-coach_test-cases.md)
- [Owner help](./campaign-experiment-coach_helpdoc.md)
- [Marketing boundary](./campaign-experiment-coach_marketing.md)
- [Website boundary](./campaign-experiment-coach_website.md)
- [Validation](./campaign-experiment-coach_validation.md)

## Invariants

1. A deterministic rule selects the variable; a model does not choose strategy.
2. Exactly one of channel, timing, offer, photo, customer next step, or format changes.
3. The owner explicitly accepts the suggestion before CampaignCue calls it a test in use.
4. A result never inherits a suggested variable when the owner leaves the tested-variable field blank.
5. Only a matching explicit variable and a non-`not_used` result complete an accepted test.
6. Guidance never claims predicted performance or causality.
7. The existing campaign, event, idempotency, and compact result-memory records are reused.
