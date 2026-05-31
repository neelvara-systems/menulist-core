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
- `source`: `import | manual | ticket_signal | article`
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

Article mirror:

- `kb_articles/{articleId}.faqIds[]`

The FAQ document owns the relationship. `faqIds` is only a bounded mirror for cheap article-side lookup.
