# Check Approved-Answer Coverage By Customer Context

## Quick Summary

The Scope Coverage Matrix shows whether your important support questions have a currently verified approved answer for the plan, user role, product state, and product version you selected.

It is based on active Answer Tests. It does not create or publish answers for you.

## Before You Start

- You need permission to manage governance.
- Add the questions that must keep working as Answer Tests.
- Set `Expected route` to `Trusted answer` when the question must use an approved answer.

## Add Customer Context

1. Open **Answer Tests**.
2. Add a test or edit an existing test.
3. In **Page context**, enter a plan only when the answer differs by plan.
4. Enter a user role only when permissions change the answer.
5. Enter a product state only when the workflow state changes the answer.
6. Enter a numeric product version, such as `2.4.1`, only when version-specific behavior matters.
7. Save the test.

Leave a field empty when you have not scoped that question to a specific value. The matrix will show `Not specified`; it will not claim that every possible value was tested.

## Read The Matrix

| Status | What to do |
| --- | --- |
| Covered | No action is required for this current proof |
| Needs review | Open the identified approved answer or edit the test requirement |
| Missing | Review approved answers and confirm that their plan, role, state, and version scope includes this case |
| Not verified | Run this test to create current proof |
| Different expected route | The test intentionally expects a route other than an approved answer |

## Run One Check

1. Find the row you want to verify.
2. Choose **Run check**.
3. Wait for the current result.
4. Review the updated coverage state.

Canonical-only checks do not call a generative provider. They verify the existing governed retrieval path.

## Troubleshooting

### A covered row changed to Not verified

The test definition or a governed support source changed after the retained result. Run the test again.

### A row says Missing even though an answer exists

Check the answer's plan, role, product state, version, active status, and approval status. The answer may not apply to the exact test context.

### My version will not save

Use a numeric version such as `2`, `2.4`, or `2.4.1`.

### I do not see every possible combination

The matrix intentionally shows only active questions and contexts you defined. Add a separate Answer Test only when a combination represents an important, different support contract.

## Important Boundary

The matrix is evidence from retained Answer Test runs. It does not guarantee every customer question is covered, and it does not approve or publish support content.
