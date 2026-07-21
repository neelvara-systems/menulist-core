# Help Chat System - Source-Gated UI Slice

The current Help Chat UI slice is implemented and source-gated for the reviewed owner help interface.

## Implemented runtime

- QnA and Assistant modes
- bounded authenticated search client
- canonical/FAQ/RAG source labels and references
- normalized related-content display with internal article routing
- acknowledged chat create/update/delete/feedback flows
- bounded image-question admission and failed-persistence cleanup
- fixed error copy, copy acknowledgement and bounded diagnostics
- responsive modal behavior inside desktop and MobileShell Help Center
- no browser-owned ticket escalation; any future Help Chat handoff requires a server-authoritative, explicitly confirmed contract

## Not certified by source alone

Backend integration, provider behavior, browser/device QA, and launch certification remain gated by matching Firebase rules, Answerlattice account and Auth claims, runtime secrets, target deploy evidence, the active Help Center verifier, production-readiness audit, External Certification Runbook evidence, approved Vercel release, and production-host smoke.

This summary is runtime documentation, not a feature backlog. Message editing, export, voice, sharing or additional attachment workflows must pass doctrine and owner-value review before implementation.
