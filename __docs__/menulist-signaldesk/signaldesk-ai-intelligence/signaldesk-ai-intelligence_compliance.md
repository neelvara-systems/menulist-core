# SignalDesk AI Intelligence - Compliance Policy

**Status:** Initial planning doc
**Created:** June 23, 2026
**Last Updated:** July 11, 2026

## Core Rule

AI is an assistant, not an authority.

## AI Must Not

- infer consent;
- decide source-rights eligibility;
- use blocked source fields;
- invent target facts;
- claim MenuList verified a business without proof;
- claim Google, WhatsApp, Instagram, or Meta integration/partnership;
- approve sends;
- decide legal compliance;
- bypass suppression;
- recommend cold WhatsApp blasts;
- recommend cold Instagram/Messenger DMs.

## Required Output Controls

Every AI result must include:

- schema validation status;
- evidence refs;
- rejected facts;
- confidence;
- blocked actions;
- worker version;
- prompt/rule version;
- cost metadata.

## Prompt Data Minimization

Use minimum necessary data:

- summarize evidence before prompt;
- exclude raw contact values where not needed;
- exclude blocked fields;
- exclude raw source payloads;
- exclude secrets;
- exclude suppressed identities where not needed.

## Human Review

Human review is required when:

- confidence is low;
- source policy is unclear;
- channel eligibility is unclear;
- AI suggests a risky claim;
- target has suppression ambiguity;
- output schema fails;
- evidence refs are missing.
- a critic returns `revise` or `hold`;
- stronger-model escalation is unavailable or still low confidence;
- a workflow has not met its own measured graduation threshold.

## Volume Boundary

Higher AI volume does not grant higher authority. Generation, critique, and escalation may execute automatically inside the founder's AI cost envelope. Source rights, consent, suppression, send, publish, spend outside AI inference, commercial terms, and MenuList truth remain deterministic blocks or founder decisions.

## Open Questions

| Question | Owner |
| --- | --- |
| Model provider and data-use terms | Founder + Codex before implementation |
| Prompt retention policy | Founder + compliance review |
| Eval pass thresholds | Measured per workflow in shadow review; no silent graduation |
