# Understanding Product Friction Evidence

Product Friction Evidence shows which mapped product areas produced the largest support-evidence load during the latest completed seven-day window.

- **Evidence** includes recorded ticket, negative-feedback, escalation, and canonical-answer fallback events linked to an active product entity.
- **Weighted load** gives more review priority when evidence also contains escalations or canonical misses. It is not an answer-quality score.
- **Rising, stable, improving, or new** compares the completed seven-day window with the previous completed seven days.
- **Friction level** summarizes total weighted load across all mapped entities. It does not mean the product is healthy or unhealthy.
- **Emerging topics** are mapped areas with a material new rise in evidence.
- **Needs entity mapping** means valid evidence could not be safely assigned to an active product entity.

Use this view to decide what to inspect next. Review the linked support evidence, approved answers, current product behavior, releases, and source truth before making a product or knowledge change.

The AI-assisted review summary is advisory. It can organize already admitted evidence, but it does not approve answers, prove a defect, or change product truth.

Use **Open in Knowledge Map** or **Review evidence** to inspect the selected
governed product concept and its answer coverage. The link preserves only the
entity identity. The map does not copy the friction metric and does not change
product or support truth.

Use **Prepare evidence brief** when the same factual summary needs to move into
a product, engineering, or knowledge review:

1. Open the ranked product area.
2. Choose the owner review path: investigate, support knowledge, product
   behavior, known limitation, plan or permission explanation, watch, or no
   action.
3. Read the completed windows, evidence mix, trend, and limitation statement.
4. Read the next-action explanation below the selector.
5. Continue into the focused Knowledge Map or trusted answers, copy the brief
   for product review, close the review, or select **Download Markdown**.

The review path is included only in the copied or downloaded packet. It is not
saved in Answerlattice, sent to an issue tracker, or treated as a confirmed
root cause. Choosing **Review known limitation** still requires the owner to
verify that the constraint is intentional and approved. The brief does not
include raw conversations, ticket bodies, customer identities, or unsupported
affected-user counts.

Knowledge-review actions preserve the selected product topic. Product-behavior
review copies the packet for the product or engineering system you already use.
**Watch the next completed window** does not schedule a reminder, and **No
action now** does not save a decision or change product truth.

## Review Support Evidence After A Change

Use **Review recent changes** only when you need to inspect an activated release
or implemented knowledge correction:

1. Load the bounded recent-change list.
2. Choose the exact completed change.
3. Select **Compare evidence**.
4. Read the complete before/after windows, event mix, and limitation statement.

The change day is excluded. A comparison waits until 14 complete UTC days are
available after the change. Answerlattice may instead report insufficient
baseline evidence, expired history, or a saturated bounded source window. A
lower event count is an observed association; it is not proof that the change
fixed the underlying problem.

Answerlattice does not automatically know that a high-evidence area is a
product bug, confusing interface, policy problem, or missing document. Confirm
the cause from the product, release, approved knowledge, and customer evidence
before changing anything.

If the view is stale or unavailable, check the latest nightly scheduler result. A source cap or invalid scope causes the task to fail instead of publishing partial metrics.
