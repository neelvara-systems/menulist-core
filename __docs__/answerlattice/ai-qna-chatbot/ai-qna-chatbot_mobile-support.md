# AI QnA Chatbot — Mobile Support Assessment

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** Mobile and product teams
> **Status:** Existing-surface assessment

---

## Current Boundary

`MobileHelpScreen` renders the existing Help Center inside `MobileShell` and supports routed Help Center tabs with 44 px minimum action targets. A separate full-screen AI chat implementation is not verified by this document.

The bounded hybrid evidence lane is server-side. When it is enabled, mobile, desktop, and widget callers that use `coreSearch()` receive the same canonical-first retrieval, tenant scope, source-reference, and fallback behavior. No separate mobile retrieval implementation is required.

## Mobile Requirements

- Keep Help Center navigation inside `MobileShell`.
- Reuse the shared Answerlattice search API and response validation.
- Keep question input, references, feedback, clarification, and fallback usable with touch.
- Preserve the 5 MB image policy and warn users not to upload secrets or private customer data.
- Keep long technical literals, source titles, and error messages from overflowing narrow screens.
- Do not present similarity as answer confidence.
- Do not hide an unsupported or unresolved result to improve containment.

## Implementation Rules

- Use the current Tailwind-driven mobile shell and shared components; do not add `antd-mobile` without an explicit dependency decision.
- Use `react-icons/lu` for icons.
- Keep touch targets at least 44 px.
- Reuse shared DAL, auth, response guards, and Answerlattice tenant scope.
- Do not add a mobile-only answer model, cache, or Firestore collection.

## Validation

Before claiming mobile parity, verify:

- question submission and rate-limit errors;
- approved answer, FAQ, RAG, and empty-result states;
- source-link wrapping and tap behavior;
- screenshot upload and sensitive-data warning;
- keyboard and narrow-viewport behavior;
- feedback acknowledgement;
- direct route and hardware-back behavior inside `MobileShell`.

No latency or completion-time target should be published until measured on representative devices and real customer workspaces.
