# SignalDesk Draft Control - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskTemplateSummaries` | Template list | Small list |
| `signaldeskTemplates` | Template detail/version | Template detail |
| `signaldeskDraftSummaries` | Draft list for target/queue | Target/approval queue |
| `signaldeskDrafts` | Draft body and guardrail result | Draft detail |
| `signaldeskDraftGuardrailEvents` | Guardrail runs | Debug/audit only |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Template list | 1 query | 0 | Small list. |
| Create draft | 5-10 | 2-5 | Target, evidence, template, policy; draft, summary, event. |
| Edit draft | 2-5 | 2-4 | Draft + guardrail result. |
| Guardrail run | 3-8 | 1-3 | No raw dashboard scan. |

## Indexes

- `signaldeskTemplateSummaries`: `channel + status`
- `signaldeskDraftSummaries`: `targetId + updatedAt`
- `signaldeskDraftSummaries`: `status + updatedAt`
- `signaldeskDraftGuardrailEvents`: `draftId + createdAt`

## Cost Controls

- Template bodies are small.
- Draft bodies are read only on detail/review.
- List views use summaries.
- Guardrail events are not dashboard source.
- AI draft generation caches evidence/template hash.
