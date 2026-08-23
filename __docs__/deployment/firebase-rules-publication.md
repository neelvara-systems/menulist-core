# Firebase Rules Publication

> **Status:** Default repository publication contract
> **Last updated:** August 22, 2026
> **Scope:** Firestore Security Rules for MenuList, Answerlattice, CampaignCue, and SignalDesk

## Decision

Publish Firestore Security Rules through the Firebase CLI with the exact
product configuration. Do not use the Firebase Console editor as the routine
publication path. The Console remains useful for read-only inspection and
release history, but browser timeouts and generic save errors are not adequate
deployment evidence for a large ruleset.

The default rules-only command shape is:

```bash
firebase deploy \
  --only firestore:rules \
  --project <firebase-project-id> \
  --config <product-firebase-config> \
  --non-interactive
```

This command must stay scoped to rules. It does not authorize indexes,
Storage, Functions, Hosting, Vercel, provider activation, or data changes.

## Source And Artifact Contract

The reviewed canonical source and the cloud deployment artifact may be
different files, but they must never be independent policies.

- The canonical source retains the complete reviewed authorization policy,
  explicit default deny, and any shared-emulator compatibility required by the
  repository.
- The product deployment artifact is generated deterministically from that
  canonical source. It may remove only unrelated or unreachable product
  namespaces and helper functions.
- Generated artifacts are never edited manually. A stale artifact is a failed
  predeploy gate.
- Size reduction must not remove an admitted path, weaken tenant/store/project
  isolation, change role authority, or bypass default deny.

For MenuList, `firestore.rules` is canonical and
`firestore-menulist.rules` is the cloud artifact. Generate it with:

```bash
npm run generate:menulist-firestore-rules
```

Verify that it is current with:

```bash
npm run verify:menulist-firestore-rules
```

`firebase.json` must continue to target `firestore-menulist.rules`.
Answerlattice, CampaignCue, and SignalDesk continue to use their dedicated
Firebase configurations and product-specific rules files.

## Required Publication Sequence

1. Confirm the intended project, configuration file, and deployment artifact.
2. Generate the product artifact and fail if it differs from the committed or
   reviewed output.
3. Run the product-specific Firestore emulator/predeploy behavior suite. A
   parser-only or size-only check is not authorization proof.
4. Record the deployment artifact's byte count and SHA-256.
5. Publish only `firestore:rules` through the Firebase CLI.
6. Confirm that Firebase compilation and release both succeeded.
7. Read back the active release from the Firebase Rules API or an equivalent
   authenticated source.
8. Compare the active source byte-for-byte, or at minimum compare its exact
   SHA-256 and byte count, with the intended artifact.
9. Record the project, active ruleset/release identifier, artifact hash, byte
   count, command, and result in the applicable setup ledger.

For a shared MenuList runtime change, publish the same locally validated source
to `menulist-qa` first and then `menulist-prod`, unless an explicit production
hold, failed QA gate, missing real secret, or destructive migration risk stops
promotion.

## HTTP 503 And Unknown Save Error Recovery

After the same HTTP 503 or generic Console save error occurs twice, stop blind
retries and preserve the currently active rules release. Investigate:

- raw source and compiled/AST size;
- unrelated product namespaces in a shared source;
- unreachable helper functions;
- deep helper-function chains;
- deeply nested `match` blocks;
- repeated complex boolean expressions;
- Rules API and Cloud Audit Logs evidence for create, test, release, or delete
  operations.

Do not respond by granting broader IAM when the authenticated caller already
has the required Rules permissions. Do not repeatedly paste the same large
policy into the Console. Do not delete comments or helpers ad hoc without a
deterministic transformation and behavior tests.

The safe recovery is: derive the smallest product-specific artifact from the
canonical policy, verify that removed branches are unreachable for that
product, rerun the complete local behavior gate, run authenticated Rules API
validation when available, publish through the scoped CLI command, and perform
an exact active readback.

## MenuList Production Incident Record

Firebase Support case `10420179` identified large-policy compiler branching as
the relevant failure mode after the full MenuList production policy repeatedly
returned HTTP 503 while the same authorization behavior worked in QA. The
resolution preserved canonical `firestore.rules` and generated a MenuList-only
cloud artifact that removed explicit Answerlattice shared-emulator namespaces
and unreachable helpers.

On August 22, 2026, authenticated Rules API validation returned HTTP 200 with
zero issues. The scoped Firebase CLI deployment compiled and released
`firestore-menulist.rules`. Active ruleset
`d932770a-eebf-4875-9bab-d9382badf875` read back at 130,680 bytes with exact
SHA-256 `54f4f2eaf63ba0ddda737742f405072b9cb6f6261450e0591ef9bef9a97a98ec`.
No index, Storage, Function, Hosting, Vercel, or data target changed.

This incident is the reason the CLI plus exact-readback sequence is now the
repository default rather than an exception for production.

## Content Credit Rules Publication Evidence

On August 22, 2026, the Content Credit contract added the server-only
`menulistPurchasedCreditRecoveries` cancellation ledger. The generated
`firestore-menulist.rules` artifact passed all 42 rule suites discovered by
`npm run verify:menulist-firebase-rules-predeploy`, then the same artifact was
released to QA and production with rules-only Firebase CLI deployments.

Exact authenticated Rules API readback matched the local artifact in both
projects:

| Project | Active ruleset | Bytes | SHA-256 |
|---|---|---:|---|
| `menulist-qa` | `2a2c3299-e81f-4ee4-ba57-cb101f6964f6` | 130,782 | `15d2fcd06346d1289ae85da0f4da3dfa2fe8a12a9a4ee2b0f934731e9d34afb6` |
| `menulist-prod` | `dd9a7e93-8339-4bcb-97ae-bd545f20a78b` | 130,782 | `15d2fcd06346d1289ae85da0f4da3dfa2fe8a12a9a4ee2b0f934731e9d34afb6` |

No index, Storage, Function, Hosting, Vercel, or data target changed.

## Billing Document Rules And Index Evidence

On August 22, 2026, the immutable billing-document ledger added server-only
`billingDocuments` and `billingDocumentCounters` collections. The generated
MenuList artifact passed all 42 rule suites before the same rules source was
released to QA and production.

| Project | Active ruleset | Bytes | SHA-256 |
|---|---|---:|---|
| `menulist-qa` | `f8a29b19-6545-4c47-aeac-82e4c6bf1025` | 130,958 | `1dcc0117f027ce5ae3b2b802181a89e4a0f3894bb16482d8dbb2361863a4eb7c` |
| `menulist-prod` | `659da3c0-a8e3-4fcf-ae38-d2c05b3fb9d1` | 130,958 | `1dcc0117f027ce5ae3b2b802181a89e4a0f3894bb16482d8dbb2361863a4eb7c` |

Three billing indexes were also created in each project. Direct Firestore API
readback confirmed the history, payment lookup, and related-credit indexes were
all `READY`. The repository-wide index command returned HTTP 409 for an
unrelated pre-existing `users` index after creating the new indexes. The
existing index was preserved; no `--force` deletion or broad index cleanup was
performed.
