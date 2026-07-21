# Help Chat — Runtime Notes

A source-gated help interface designed for non-technical owners.

## Current behavior

- Opens from the MenuList Help Center search box.
- Supports one-question QnA and short Assistant conversations.
- Sends the last five bounded text turns to the protected Help Center search route.
- Uses canonical Answerlattice answers first, then published FAQ/custom answers, then bounded knowledge-base RAG.
- Persists acknowledged chat sessions and feedback in the active Answerlattice workspace.
- Shows references and normalized related content; related article actions build internal Help Center routes from validated document IDs.
- Supports one validated screenshot for the current question. Prior image URLs are not replayed in conversation context.
- Does not create support tickets. Automatic AI-failure evaluation is rollout-gated, and any future Help Chat handoff must use a server-authoritative, explicitly confirmed flow.
- Uses fixed owner-safe error copy and bounded diagnostics.

## Product and trust boundary

The UI does not administer Answerlattice governance or promise that generated wording is authoritative. Owners should check cited source material for important account, billing or workflow decisions. Search failure must leave the rest of Help Center usable.

## Main files

- `index.tsx` — modal and responsive layout
- `ChatPanel.tsx` — active conversation surface
- `ChatHistory.tsx` — acknowledged session selection/deletion
- `ChatInput.tsx` — text, draft and image admission
- `MessageBubble.tsx` — sanitized Markdown, references and related-content actions
- `api.ts` — bounded same-origin search client
- `hooks/useChatData.ts` — session/category reads
- `hooks/useChatHandlers.ts` — send, retry, feedback and copy
- `helpChatDiagnostics.ts` — bounded client diagnostics

## Verification

```bash
npm run verify:help-center-boundary
```

Launch certification still requires the active Help Center verifier, matching Firestore rule deployment, valid Answerlattice account/Auth sync, provider and SMTP readiness, browser/device QA, the External Certification Runbook, approved Vercel release, and production-host smoke.
