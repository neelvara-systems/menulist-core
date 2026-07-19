# Answer Retrieval Quality Test Cases

## Contract coverage

| Case | Expected result |
| --- | --- |
| Valid canonical evidence | Private source IDs parse and public citation projection removes `sourceId`. |
| Credential or token URL | Governance/retrieval rejects the citation. |
| Local/private/reserved host | Public citation is rejected. |
| Normal host beginning with `fd` | Citation remains valid; it is not confused with private IPv6. |
| IPv4-mapped IPv6 loopback | Citation is rejected after URL normalization. |
| Duplicate citation URL | Public projection keeps one link. |
| Missing plan/role/state | Governed fallback includes deduplicated structured clarification. |
| Validation score below 0.5 | Canonical confidence is `low`. |
| Cached canonical hit | `canon:v4` returns the evaluated confidence and approved citations only after key/payload/freshness validation. |
| Knowledge Intake canonical publish | Mutation proposal retains private `proposedEvidence.sourceIds`. |
| Help response with `sourceId` | Browser response guard rejects it. |
| Chat persistence | Public citations and clarification survive without private evidence. |
| Answer Test canonical run | Reference IDs come from canonical evidence. |

## Focused commands

- `npm run test:answerlattice-retrieval-contracts`
- `npm run test:answerlattice-chat-session-contracts`
- `npm run test:answerlattice-canonical-scope`
- `npm run test:answerlattice-governance-contracts`
- `npm run test:answerlattice-governance-client`
- `npm run test:answerlattice-governance:emulator`
- `npm run test:answerlattice-knowledge-intake:emulator`
- `npm run test:answerlattice-search-cache:emulator`
- `npm run verify:answerlattice-founder-support-controls`
- `npm run typecheck:answerlattice`
- `npm run verify:answerlattice-runtime-truth`
- focused ESLint on changed Feature 2 runtime and verifier files
- `npm run verify:dependency-freeze`
- `git diff --check`

## External proof not included in local completion

- configured Upstash Redis write/read using `canon:v4`;
- authenticated hosted desktop and narrow-width governance review;
- deployed widget, Help Center, Help Chat, and public API answer with a real approved citation;
- deployed scope-missing request that shows clarification and creates the expected support signal/handoff;
- representative first-client Answer Test set proving correctness, citation completeness, abstention, and resolution behavior.
