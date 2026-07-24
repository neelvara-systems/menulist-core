# Answer Retrieval Quality Help Guide

## Add approved sources to an answer

1. Open Answerlattice Governance and select a canonical answer or pending proposal.
2. Review the private evidence count and the answer text.
3. Add only customer-safe public documentation links under public sources.
4. Confirm that each link contains no login credential, signed token, private host, or internal-only path.
5. Submit the proposal and complete governance approval.

Private source IDs help reviewers trace the answer. They are not shown to customers. A public source is shown only after a reviewer adds and approves it.

## Read an answer result

- `Approved sources` are reviewer-approved canonical links.
- KB references are retrieval context and are shown separately.
- `high`, `medium`, or `low` confidence reflects approved-answer validation and entity-match strength.
- `Context needed` means the answer depends on plan, role, or product state that the current support session did not provide.
- A fallback response means Answerlattice deliberately did not claim an unverified answer.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Source link is not shown | Confirm it was added to the canonical proposal and approved, not only connected as a private source. |
| Answer asks for context | Ensure the client sends the allowlisted plan, role, or state value required by the canonical scope. |
| Cached confidence looks outdated | Confirm the runtime uses the `canon:v5` namespace and current source-version manifest. Graph-aware retrieval intentionally uses the live path. |
| Answer abstains after a source change | Review drift/review-required state before republishing. |
| Citation is rejected | Use a public HTTP/HTTPS URL without credentials, secret query keys, or private/reserved hosts. |

Do not treat a citation as proof that every claim is correct. Use Answer Tests and human review for correctness and completeness.
