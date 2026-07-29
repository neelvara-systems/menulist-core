# Test And Protect Your Support Layer

Answerlattice gives workspace owners a small set of controls for checking support quality and handling product changes safely.

## Create Answer Tests

1. Open **Answer Tests** under Knowledge Governance.
2. Add a question users regularly ask.
3. Select the page, plan, or role when the answer depends on context.
4. Choose what should happen: approved answer, FAQ/owner answer, provider fallback, escalation, or no answer.
5. Select the expected approved answer when required, or define required/forbidden answer text.
6. Choose an evidence requirement. Use a specific-reference check for FAQ or knowledge fallback answers that must cite known articles. Approved canonical answers can be checked by their answer ID.
7. Mark only business-critical questions as **Critical**. A failed critical test marks release proof blocked; ordinary failures require review.
8. Save and run the test.

Use **Canonical only** for a fast deterministic check. Use **Full runtime** only when you need to verify fallback behavior; support-credit rules apply.

Critical support should be backed by an approved canonical answer, a published FAQ, or an explicitly expected safe escalation/no-answer path. Provider fallback is useful for ordinary regression testing, but it cannot count as verified critical proof. Existing critical tests that used **Knowledge fallback** remain visible for review and can be deactivated safely; rerun them after selecting an approved or safe route.

`Ready`, `Review`, and `Blocked` describe the retained proof result. They do not deploy code, publish content, or change a release automatically.

These checks confirm the source route, expected IDs, phrases, confidence, abstention, and evidence rules you configured. They do not independently prove that an answer is factually correct, complete, or that a customer was resolved. Review representative cases with product/support judgment.

If a test definition changes, the previous run is labelled **Stale** and remains available only as historical evidence. Rerun the current suite before relying on its proof status.

For a failed result tied to an approved answer, use **Review approved answer**
first to inspect the current governed truth. **Adopt current route and
evidence** updates the expected source, answer IDs, confidence, and references
only after owner confirmation. Required and blocked phrase checks remain
unchanged and must still be reviewed explicitly.

## Check A Proposed Answer

1. Open **Governance > Signal Queue**.
2. Open a generated answer draft, or find a complete answer-change proposal.
3. Choose **Check impact**.
4. Review the current and proposed outcomes for linked active Answer Tests.
5. Treat `Regression` or a projected `Blocked` result as review evidence, not an automated decision.
6. Edit, reject, or publish through the normal governance action.

The check uses no fallback model and saves no test run. If no active tests are linked to the answer or its product entities, Answerlattice says proof is missing. Add a representative Answer Test instead of treating the absence of failures as approval.

## Check A Release

Open a release and choose **Review linked Answer Tests**. Answerlattice opens
the existing release-check flow with that release selected, then runs only
tests linked to its affected product areas after you confirm. A failed check
does not change support content. Review the approved answer or create a review
proposal when a governed fix is required.

## Propose A Rollback

1. Open a failed Answer Test result that references an approved answer.
2. Choose the prior audited answer version you want to propose.
3. Choose **Propose rollback**.
4. Review the generated version-update proposal in Governance.
5. Record the governance decision and apply any accepted content change through the normal answer-editing workflow.

The current answer is never overwritten by the rollback action. Proposal approval records the decision; applying the prior content remains a separate governed edit.

## Publish A Known Issue

1. Open **Known Issues** under Support Control.
2. Add a short title and approved customer message.
3. Choose the affected page, feature, or workflow.
4. Set the current status and expiry.
5. Add an HTTPS status or help link when useful.
6. Activate the notice.

Resolve the issue when the problem is fixed. Resolved and expired notices stop appearing automatically.

## Turn On Verified Context

1. Open **Widget & Hosted Help > Access & Security**.
2. Create a signing key.
3. Copy the private key once and store it only in your server environment.
4. Use the provided server example to sign a short-lived visitor token.
5. Pass the token with `AnswerlatticeWidget.identifySigned(token)`.

Never put the private key in browser code. The normal unsigned `identify()` method remains available for non-authoritative requester details.

## Attach Evidence Links

Add trusted evidence hosts in Access & Security. Your product may then pass up to three HTTPS links with `AnswerlatticeWidget.setEvidenceLinks()`. Use support-safe links from your own diagnostics system. Answerlattice does not open or inspect those links automatically.

## Export Approved Support Truth

Open workspace settings and choose **Export support truth**. The JSON package includes approved knowledge and product structure. It excludes tickets, chat transcripts, visitor details, raw keys, and integration credentials.

If the workspace exceeds the safe export limit, Answerlattice stops and shows an error instead of downloading an incomplete package.

Answerlattice records that the export was generated, who requested it, its counts, and its size. The audit record does not copy the exported answers or source content.
