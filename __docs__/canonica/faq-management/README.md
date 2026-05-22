# Canonica FAQ Management

FAQ Management is Canonica's short-answer layer for repeated customer questions.

It is intentionally connected to existing knowledge infrastructure instead of becoming a separate knowledge store:

- Articles remain the detailed source of truth.
- FAQs provide short owner-reviewed answers.
- Each FAQ can link to one article through `articleId`.
- Articles keep a bounded mirror through `faqIds`.
- Product Surfaces can attach FAQs through `contextKeys`, tags, and entity bindings.
- Public Help Center `Read FAQ` loads published FAQs directly.
- Widget and chat contextual suggestions use the compact product-surface summary.

Primary files:

- Owner UI: `src/components/templates/canonica/faqManagement/CanonicaFaqManagement.tsx`
- Public UI: `src/components/templates/main-app/helpCenter/FaqView.tsx`
- DAL: `src/database/canonica/faqs.ts`
- Validation: `src/lib/canonica/faqContent.ts`
- Publish pipeline: `functions-canonica/src/logic/publishApprovedJob.ts`
- Context summary: `src/lib/canonica/productSurfaceContentServer.ts`
