# FAQ Management Spec

## Goal

Help SaaS owners answer repeated questions quickly without forcing every answer into a long article.

## Owner Jobs

- Review FAQs generated during initial knowledge import.
- Create manual FAQs when customers repeat the same question.
- Link a FAQ to the detailed article that proves the answer.
- Bind FAQs to product surfaces such as billing, settings, onboarding, or integrations.
- Publish, review, or archive FAQs without deleting history.

## Customer Jobs

- Open `Read FAQ` and see short published answers.
- Jump from a FAQ to the full article when more detail is needed.
- Give helpful/not-helpful feedback on an answer.

## Data Contract

Collection: `answerlattice_faqs`

Required tenant fields:

- `pId: 'AL'`
- `tId`
- `sId`

Core fields:

- `question`
- `answer`
- `status`: `draft | needs_review | published | archived`
- `source`: `import | manual | ticket_signal | article | knowledge_intake`
- `active`
- `articleId`
- `articleTitle`
- `contextKeys`
- `entityIds`
- `tags`
- `likes`
- `dislikes`
- `sortOrder`
- `publishedOn`
- `lastReviewedOn`
- `reviewRequestedOn`

System-owned fields:

- `source`
- `canonicalAnswerId`
- `jobId`
- `generatedFromArticleId`
- `intakeJobId`
- `intakeReviewItemId`
- `intakeSourceIds`
- `likes`, `dislikes`, and `recentFeedbackOperations`

Owners can author the question, answer, status, article link, entity/surface/tag applicability, and display order. The DAL and Firestore rules derive or preserve origin, article title, active state, review timestamps, counters, and lineage.

Article mirror:

- `kb_articles/{articleId}.faqIds[]`

The FAQ document owns the relationship. `faqIds` is only a bounded mirror for cheap article-side lookup.

If a FAQ links an article, the title and workspace must match the current article. A linked FAQ cannot publish until the article is active and published. Manual FAQs without an article remain allowed when the answer can be approved independently.

Customer feedback audit collection: `faq_feedback/{tId}/{sId}/doc1_{faqId}`. It is server-owned, bounded, retained for 365 days, and is evidence for review rather than approved truth.

Customer-facing FAQ output is a separate exact DTO containing only `id`, `question`, `answer`, `articleId`, `tags`, `likes`, and `dislikes`. Persisted tenant, actor, source-context, trace, request, lifecycle, job, governance, and writer metadata is not public output.
