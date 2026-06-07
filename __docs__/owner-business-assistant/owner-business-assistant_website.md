# Owner Business Assistant Website Copy

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Planning complete, implementation not started
**Last Updated:** June 7, 2026

---

## Website Decision

Do not update the public website during planning.

Reason: no route, API, scheduler read model, mobile screen, action guard, or QA proof exists yet. Public copy should change only after implementation verifies runtime behavior and Firebase cost.

## Future Website Placement

After implementation and verification, Business Health may appear as a small owner dashboard capability in existing MenuList website sections. It should not get a separate hype landing page.

Potential placement:

- Owner dashboard capability list.
- "Keeps working" infrastructure section.
- FAQ/help-adjacent owner workflow mention.

## Approved Public Copy Draft

Use only after implementation proof:

> Business Health shows the latest MenuList check for your menu, public page, customer attention, and important owner tasks. When everything is stable, it says no action is needed. When something needs review, it points you to the right place.

## Short Website Bullets

- Latest MenuList check in the owner dashboard.
- Clear "No action needed" state when things are stable.
- Priority checks when something needs review.
- Public changes stay behind owner confirmation.
- Works on desktop and mobile.

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

- Mention "business health" as a dashboard check, not a standalone AI product.
- Keep MenuList as public business truth infrastructure.
- Do not target broad chatbot keywords that invite unsupported expectations.
- Do not cite Stanford/IBM/Meta market stats in customer copy.

## Public Claim Checklist

Before website copy goes live:

1. Dashboard card exists.
2. Full page exists.
3. Mobile route works inside `MobileShell`.
4. Scheduler writes current summary.
5. Suggested questions work.
6. Public-truth writes are confirmed or routed to existing publish screen.
7. Firebase cost model matches implementation.
8. Help doc is ready.
9. Changelog entry exists.
