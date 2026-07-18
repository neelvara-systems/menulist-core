# MenuList Help Center — Approved Positioning

> **Version:** 1.1.0
> **Last Updated:** 2026-07-16
> **Audience:** Product, Sales, Marketing, Support
> **Source:** Current codebase and active release gates

## Plain-Language Description

MenuList owners can open one Help Center inside the dashboard to browse published guidance, read FAQs and release notes, ask a source-backed support question, submit a trackable request, reply to that request and share product feedback.

Answerlattice supplies the scoped support knowledge and ticket infrastructure. That product name does not need to appear in ordinary owner copy.

## Safe Claims

- Help is available inside the signed-in MenuList dashboard.
- Published guidance and cited source articles can be browsed from the same surface.
- Owners can submit and track support requests with up to four supported attachments of 10 MB each.
- Ticket history and replies update through a bounded store-scoped listener.
- Search failure leaves documentation, tickets, feedback, contact email and release notes as separate fallback paths.

## Claims Requiring Release Evidence

Do not claim any of these from source code alone:

- a response-time or resolution-time guarantee;
- that every question receives an answer;
- that generated output cannot be wrong;
- that email notifications, AI providers or all systems are always available;
- that a current app/rules version is deployed;
- a measured cache-hit, deflection, accuracy or SLA percentage without current production evidence.

Avoid public copy such as "AI-powered", "instant answers", "no hallucination", "all systems operational" or "zero external tools". Owner copy should describe the useful action, not internal RAG, vectors, model names, product-account bridges or Firebase architecture.

## Product Boundary

This surface is not a helpdesk replacement, documentation CMS or autonomous support agent. Ticket operations remain a fallback and signal source; governed knowledge remains authoritative under Answerlattice doctrine.
