# Answerlattice FAQ Management

FAQ Management is Answerlattice's short-answer layer for repeated customer questions.

It is intentionally connected to existing knowledge infrastructure instead of becoming a separate knowledge store:

- Articles remain the detailed source of truth.
- FAQs provide short owner-reviewed answers.
- Each FAQ can link to one article through `articleId`.
- Articles keep a bounded mirror through `faqIds`.
- Product Surfaces can attach FAQs through `contextKeys`, tags, and entity bindings.
- Public Help Center `Read FAQ` loads published FAQs directly.
- Widget and chat contextual suggestions can use the compact product-surface summary, but a matched summary FAQ is re-read and rescored before it can answer.
- FAQ origin and generation lineage are system-owned; the owner editor can change answer content and applicability, not provenance.
- Helpful/not-helpful reactions update published FAQ counters and a bounded 365-day audit record through the authenticated content-feedback route.

Primary files:

- Owner UI: `src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx`
- Public UI: `src/components/templates/main-app/helpCenter/FaqView.tsx`
- DAL: `src/database/answerlattice/faqs.ts`
- Validation: `src/lib/answerlattice/faqContent.ts`
- Article refresh route: `src/app/api/answerlattice/faqs/generate-from-article/route.ts`
- Feedback transaction: `src/lib/answerlattice/contentFeedbackServer.ts`
- Publish pipeline: `functions-answerlattice/src/logic/publishApprovedJob.ts`
- Context summary: `src/lib/answerlattice/productSurfaceContentServer.ts`

The article FAQ refresh route is owner-triggered, safe-mode guarded, rate-limited before permission/body/provider work, and logs failures with bounded tenant/store/article metadata only.

Maintained companion docs: `faq-management_spec.md`, `faq-management_impl.md`, `faq-management_firebase.md`, `faq-management_mobile-support.md`, `faq-management_helpdoc.md`, `faq-management_marketing.md`, `faq-management_website.md`, and `faq-management_test-cases.md`.

Answerlattice App FAQ ID Boundary: FAQ save, archive, article-link maintenance, retrieval, and content-feedback admission validate FAQ document IDs through `src/lib/answerlattice/faqIdBoundary.ts` and linked article IDs through `src/lib/answerlattice/kbArticleIdBoundary.ts` before document refs, article mirror refs, linked-FAQ queries, cache-version source IDs, or local success envelopes are built. Malformed FAQ or article IDs fail before Firestore document access.

## Knowledge Intake Alignment

Knowledge Intake must use this FAQ layer for approved short answers and custom Q&A. It should not create a separate intake FAQ collection. Intake-published FAQs use `source: knowledge_intake`, `status: published`, `active: true`, tags, `contextKeys`, `entityIds`, and private intake lineage; an article link is optional. Cache/public-content invalidation and product-surface summary refresh follow the existing FAQ behavior so widget/help search reuses the same retrieval path. FAQ save/archive serializes its `faqIds` mirror with a linked article. Article truth updates move active linked FAQs to review in the same transaction, and article deletion archives linked FAQs in the same transaction before acknowledging success.
