# Conversation Monitoring Specification

## Job

Help a SaaS founder or support lead see where Answerlattice conversations succeed, fail, or require follow-up without turning raw conversations into approved knowledge automatically.

## Session model

- Modes: `qna` and `assistant`.
- Maximum persisted messages: 50. Compaction preserves the first message and the latest 49.
- Admin status: `new`, `in_progress`, `resolved`, `follow_up`, or `closed`.
- Priority: `high`, `normal`, or `low`.
- Up to 20 bounded admin tags.
- One current internal note with immutable creator and updated modifier metadata.
- Message feedback is immutable after submission unless the exact same payload is replayed.

## Required behavior

- All reads and writes use exact Answerlattice workspace scope.
- New sessions bind `uId` to the active actor and use the first message ID as the idempotent session ID.
- Message append accepts one to four normalized messages and rejects conflicting IDs.
- Assistant mode cannot be silently changed back to Q&A after assistant history exists.
- Branch replacement removes later messages atomically.
- Admin metadata updates revalidate every selected session before one batch commit.
- Internal notes are not shown in customer-facing chat surfaces.
- Negative feedback is a knowledge-gap signal, not proof of the correct answer.

## Non-goals

- General live chat, social messaging, call-center routing, agent scheduling, or workforce management.
- Automatic support reply sending from the monitoring screen.
- Automatic publication of answers from conversations.
- Unsafe deletion of persisted images without scope-wide reference proof.
