# AI QnA Chatbot — Website Content Boundary

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** Public website content maintainers
> **Status:** Claim guidance; not a website implementation

---

## Suggested Metadata

```text
Title: Source-Backed SaaS Support Answers | Answerlattice
Description: Serve approved answers first, use published support knowledge when needed, and fall back safely when the evidence is not enough.
```

## Feature Block

### Headline

**Support answers grounded in the product truth you control.**

### Supporting Copy

Answerlattice checks approved answers and FAQs before generating from published workspace knowledge. When the evidence is not sufficient, it can ask for clarification or use the configured support fallback instead of guessing.

### How It Works

1. **Ask in context.** The help center or widget sends the question with only the allowed product context.
2. **Check governed truth.** Approved canonical answers and FAQs are evaluated before knowledge-base generation.
3. **Show evidence when used.** Generated knowledge-base answers resolve their cited article IDs to valid workspace sources.
4. **Handle uncertainty.** Unsupported generated answers are blocked and unknown questions remain visible for support follow-up.

## Public Trust Statements

- Approved answers first.
- Active published workspace sources only.
- Valid source references required for generated non-refusal answers.
- Screenshots treated as untrusted context.
- Human review remains required for changes to approved product truth.

Do not claim that every answer includes an article citation, that similarity means correctness, or that Answerlattice guarantees resolution.
