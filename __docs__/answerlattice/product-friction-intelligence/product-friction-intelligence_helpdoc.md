# Understanding Product Friction Evidence

Product Friction Evidence shows which mapped product areas produced the largest support-evidence load during the latest completed seven-day window.

- **Evidence** includes recorded support events and canonical-answer fallbacks linked to an active product entity.
- **Weighted load** gives more review priority when evidence also contains escalations or canonical misses. It is not an answer-quality score.
- **Rising, stable, improving, or new** compares the completed seven-day window with the previous completed seven days.
- **Friction level** summarizes total weighted load across all mapped entities. It does not mean the product is healthy or unhealthy.
- **Emerging topics** are mapped areas with a material new rise in evidence.
- **Needs entity mapping** means valid evidence could not be safely assigned to an active product entity.

Use this view to decide what to inspect next. Review the linked support evidence, approved answers, current product behavior, releases, and source truth before making a product or knowledge change.

The AI-assisted review summary is advisory. It can organize already admitted evidence, but it does not approve answers, prove a defect, or change product truth.

If the view is stale or unavailable, check the latest nightly scheduler result. A source cap or invalid scope causes the task to fail instead of publishing partial metrics.
