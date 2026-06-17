# Owner Business Assistant Website Copy

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Read-only runtime implemented; main website homepage section, Features card, and campaign page published
**Last Updated:** June 17, 2026

---

## Website Decision

Update the public website after implementation proof, but keep the placement narrow and product-truth based.

Reason: the owner dashboard card, `/business-health` route, mobile shell screen, protected APIs, scheduler-built read models, cache-first answer flow, multi-location summary, monitoring surface, and cost hardening have now been implemented and validated. Public copy can mention Business Health as an AI health check, but must not reposition MenuList as a generic AI assistant or autonomous restaurant agent.

## Website Placement

Business Health appears as a dedicated homepage section after `PreparedForYouSection` and before `ResourcesSection`.

Business Health also appears as the first compact Operations card on `/features`. This keeps the feature inventory aligned with the homepage USP without creating a second full website section, separate landing page, or analytics proof block.

Business Health has a dedicated public campaign page at `/features/business-health`. Do not use `/business-health` for public marketing because that route is the logged-in owner app screen.

The campaign page uses the same stacked sticky layout pattern as Answerlattice's "From inputs to support surfaces" section, adapted to MenuList styling. Its left rail contains three owner-readable tabs: What it checks, Owner outcome, and Why owners can trust it. The matching right-side sticky cards explain checks, outcomes, and trust boundaries without repositioning Business Health as a chatbot or autonomous agent.

Rationale:

- It is now a real owner-facing capability, not a planning concept.
- It is strong enough to act as the homepage owner-dashboard USP proof.
- It fits the main website buyer journey after MenuList explains what it prepares for the owner.
- It belongs in the Features page Operations group because buyers who inspect the feature inventory should see the same owner-dashboard capability.
- It deserves a dedicated campaign page because Business Health is now a primary MenuList USP and paid/founder-led campaigns need a public URL.
- The campaign page may use AI diagnostic language, but it must remain a Business Health explanation, not a generic assistant, chatbot, or autonomous action page.

## Approved Public Copy Draft

Live homepage framing:

> Business Health is your AI health check.

> After publishing, MenuList checks the latest menu state, public surfaces, customer attention, and locations. It shows what needs attention, and stable checks say No action needed.

## Short Website Bullets

- Latest MenuList check in the owner dashboard
- AI health check for menu and public presence
- Source freshness shown with answers and cards
- Recent customer attention in plain language
- Standard cached analytics periods without raw tables
- Clear "No action needed" state when things are stable
- Priority checks when something needs review
- Fixes hand off to AI Menu Manager or existing owner/publish flows
- Works on desktop and mobile

## Do Not Publish

- "AI-powered assistant"
- "Smart chatbot"
- "Ask anything"
- "Increase sales automatically"
- "Predicts customer demand"
- "Optimizes revenue"
- "Runs your restaurant"

## SEO/AEO Guidance

If website copy is indexed after implementation:

- Mention "business health" as an AI health check, not a standalone action agent.
- Keep MenuList as public business truth infrastructure.
- Do not target broad chatbot keywords that invite unsupported expectations.
- Do not cite Stanford/IBM/Meta market stats in customer copy.

## Public Claim Checklist

Website copy went live only after these proof points existed or were explicitly constrained:

1. Dashboard card exists.
2. Full page exists.
3. Mobile route works inside `MobileShell`.
4. Scheduler writes current summary.
5. Context-packet cache serves repeated answer/page opens without Firebase reads on cache hit.
6. Analytics index answers standard period questions without runtime range scans.
7. Suggested questions are packet-ranked without a separate provider call.
8. Provider-backed AI answers remain disabled by default, so public copy does not claim AI reasoning.
9. Public-truth writes are routed to existing owner/publish screens or guarded behind disabled flags.
10. Firebase cost model matches implementation.
11. Monitoring surface exists for internal review.
12. Help/doc/changelog records are ready.

## Website Runtime Impact

This website update changes only:

- `src/components/website/home/BusinessHealthSection.tsx`
- `src/components/website/home/HomePage.tsx`
- `src/styles/website.css`
- `public/locales/menulist.ai/en-US.json`
- `public/locales/menulist.ai/hi-IN.json`
- website and Business Health docs/changelog

It does not change owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, or Vercel deployment.
