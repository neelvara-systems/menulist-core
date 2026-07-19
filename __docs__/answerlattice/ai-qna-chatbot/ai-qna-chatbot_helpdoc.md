# AI QnA Chatbot — Customer Help Documentation

> **Version:** 1.1.0
> **Last Updated:** 2026-07-18
> **Audience:** SaaS customers and support users
> **Tone:** Direct, calm, and evidence-aware

---

## Getting a Support Answer

Ask a product question in the Answerlattice help surface available to you. Answerlattice checks governed answers first, then approved FAQs, then the workspace knowledge base.

The result may include:

- an approved answer;
- links to supporting knowledge-base articles;
- suggested follow-up questions;
- a clarification or safe fallback when the available evidence is insufficient.

An answer without a source link is not automatically wrong: an approved canonical answer may be returned directly. A generated knowledge-base answer must either include a valid supporting reference or clearly state that the current knowledge base does not contain the answer.

## Asking a Useful Question

1. Describe the task or problem in one sentence.
2. Include the exact error code, API path, version, command option, or setting name when relevant.
3. Add the product area or workflow if the same term can mean different things.
4. Review the answer scope and source before applying it.

Examples:

- `Why does /v1/webhooks return 403?`
- `How do I connect Slack on the Pro plan?`
- `What changed in v2.4.1 for webhook retries?`

## Using a Screenshot

The supported help surfaces may accept JPEG, PNG, WebP, or GIF images up to 5 MB. A screenshot is treated as untrusted context that can help interpret the question; it is not treated as product truth.

Do not upload passwords, credentials, payment data, access tokens, recovery codes, or private customer information. Remove or obscure sensitive content before submitting the image.

## Follow-Up Questions

QnA mode handles an independent question. Assistant mode can use up to the last five validated messages to maintain the current conversation. A follow-up still uses the same governed retrieval order and cannot override approved product knowledge.

## When No Confirmed Answer Is Available

Answerlattice may:

- say that the current knowledge base does not contain a confirmed answer;
- request clarification;
- present relevant documented material;
- recommend the configured support fallback.

This is intentional. The system should not invent product behavior, pricing, permissions, or policy.

## Feedback

Use positive feedback when the answer resolved the question. Use negative feedback when the answer was incorrect, incomplete, stale, or not useful, and add a short reason when the surface requests it. Feedback is a quality signal; it does not automatically rewrite approved knowledge.

## Request Support From The Widget

If the embedded widget answer did not resolve the question, select **Still need help**. Enter a reply email and optionally add your name or more detail. The server attaches the original question and bounded stored product context to one asynchronous support ticket.

The widget confirms that the request was created. It does not promise that a support person is online, a response time, or automatic notification. Automatic low-confidence suggestions may remain disabled even though the explicit support-request option is available.

If the widget says a screenshot could not be used, the answer was based on the text question only.
