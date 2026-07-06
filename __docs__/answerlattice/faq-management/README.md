# Answerlattice FAQ Management

FAQ Management is Answerlattice's short-answer layer for repeated customer questions.

It is intentionally connected to existing knowledge infrastructure instead of becoming a separate knowledge store:

- Articles remain the detailed source of truth.
- FAQs provide short owner-reviewed answers.
- Each FAQ can link to one article through `articleId`.
- Articles keep a bounded mirror through `faqIds`.
- Product Surfaces can attach FAQs through `contextKeys`, tags, and entity bindings.
- Public Help Center `Read FAQ` loads published FAQs directly.
- Widget and chat contextual suggestions use the compact product-surface summary.

Primary files:

- Owner UI: `src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx`
- Public UI: `src/components/templates/main-app/helpCenter/FaqView.tsx`
- DAL: `src/database/answerlattice/faqs.ts`
- Validation: `src/lib/answerlattice/faqContent.ts`
- Publish pipeline: `functions-answerlattice/src/logic/publishApprovedJob.ts`
- Context summary: `src/lib/answerlattice/productSurfaceContentServer.ts`

The article FAQ refresh route is owner-triggered, safe-mode guarded, rate-limited before permission/body/provider work, and logs failures with bounded tenant/store/article metadata only.

Answerlattice App FAQ ID Boundary: FAQ save, archive, article-link maintenance, and feedback actions validate FAQ document IDs through `src/lib/answerlattice/faqIdBoundary.ts` and validate linked article IDs through `src/lib/answerlattice/kbArticleIdBoundary.ts` before FAQ refs, article mirror refs, linked-FAQ queries, cache-version source IDs, or local success envelopes are built. Malformed FAQ or article IDs fail or return zero updates before Firestore document access.

## Knowledge Intake Alignment

Knowledge Intake must use this FAQ layer for approved short answers and custom Q&A. It should not create a separate intake FAQ collection. Intake-published FAQs must keep the same runtime fields used here: `status: published`, `active: true`, article links, tags, `contextKeys`, and `entityIds`. Cache/public-content invalidation and product-surface summary refresh must follow the existing FAQ DAL/publish behavior so widget/help search can reuse the same retrieval path. Article update/delete FAQ maintenance remains non-blocking, with fixed bounded diagnostics if linked FAQ review/archive maintenance fails or if legacy callers omit article scope and session-scope fallback cannot resolve tenant/store.
