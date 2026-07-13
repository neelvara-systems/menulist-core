# Test And Protect Your Support Layer

Answerlattice gives workspace owners a small set of controls for checking support quality and handling product changes safely.

## Create Answer Tests

1. Open **Answer Tests** under Knowledge Governance.
2. Add a question users regularly ask.
3. Select the page, plan, or role when the answer depends on context.
4. Choose what should happen: approved answer, FAQ/owner answer, provider fallback, escalation, or no answer.
5. Select the expected approved answer when required, or define required/forbidden answer text.
6. Save and run the test.

Use **Canonical only** for a fast deterministic check. Use **Full runtime** only when you need to verify fallback behavior; support-credit rules apply.

## Check A Release

Open a release and run its support check. Answerlattice selects tests linked to the release's affected product areas. A failed check does not change support content. Open the result and create a review proposal when a fix is required.

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
