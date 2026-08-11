# Campaign Experiment Coach - Spec

## Owner Job

After a campaign is prepared or used, the owner should know one small change worth trying without receiving a statistics dashboard or a vague AI growth recommendation.

## Suggestion Contract

Each Campaign Pack can contain one suggestion with:

- variable and plain instruction;
- reason and bounded evidence;
- latest matching baseline campaign when one exists;
- fields that should stay unchanged;
- result question and allowed result signals from the selected recipe;
- evidence confidence of `guidance_only` or `owner_history`;
- lifecycle state `suggested`, `accepted`, or `completed`; and
- the permanent `no_performance_prediction` boundary.

The deterministic priority is:

1. add a confirmed customer next step when none exists;
2. add one rights-confirmed real visual when none exists;
3. try a different owner-used channel after a similar pack was marked not useful;
4. try different timing after a similar pack had a positive owner-reported result; or
5. establish a first result with one primary format.

The latest matching non-archived campaign is the baseline. Matching uses recipe first and owner goal as the compatible fallback.

## Lifecycle

```text
deterministic suggestion
  -> authorized owner selects Use this test
  -> accepted test remains in the Campaign Pack
  -> owner uses the campaign manually
  -> owner records result and explicitly selects the variable actually changed
  -> matching accepted variable becomes completed
```

Agency workspaces require pack approval before test acceptance. `owner`, `admin`, `marketer`, and `local_manager` roles can accept a test. Reviewers can review or approve packs but do not choose business experiments.

## Non-Goals

- No automatic A/B delivery or audience splitting.
- No statistical significance or causal claim.
- No engagement, revenue, booking, or reach prediction.
- No provider experiment mutation.
- No social posting, scheduling, ad spend, or customer-contact mutation.
- No standalone experiment collection or real-time listener.
