# Customer Question Coverage Check - Specification

**Status:** V0 source-gated evidence; not current launch certification
**Last Updated:** July 4, 2026
**Local Source Gate:** `npm run verify:customer-question-coverage-check`

---

## Product Boundary

Customer Question Coverage Check helps an SMB owner see whether common customer questions are answered by their current public information. The tool uses owner-entered self-report inputs and deterministic checks.

V0 does not open links, read chats, call AI providers, or generate chatbot answers. It also does not promise ranking, citation, AI visibility, or search placement.

## Report Contract

Every row includes `evidenceText` so the owner can see what the tool actually checked.

Each report row records:

- check id
- status
- owner-facing label
- `evidenceText`
- fix target
- boundary flags showing what was not checked

## Inputs

V0 accepts self-report fields such as business name, public URL, answer coverage selections, and optional contact handoff details. The public URL is only format-checked locally.

## Outputs

- overall status
- question coverage rows
- explicit evidence text
- copy/download report actions
- one MenuList next action
- optional consented contact handoff

## Non-Goals

- No chatbot answer generation.
- No external crawling.
- No AI/search provider calls.
- No customer conversation log reads.
- No external platform updates.
- No report storage.
- No ranking or citation promise.
