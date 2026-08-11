# Feature Launch - Customer Feedback Loop

**Status:** Script-ready; proof asset exists and current owner-review flow requires capture QA
**Primary runtime row:** `guest_feedback`
**Campaign authority:** [Feature Launch Inventory](./feature-launch-inventory.md)
**Mandatory standards:** [Founder-Approved Production Standard](../videos_founder-approved-production-standard.md), [HyperFrames Operating Guide](../videos_hyperframes-operating-guide.md), and [Asset Intake And Readiness](../videos_asset-intake-and-readiness.md)

## A. Purpose

Show how a customer can privately report a possible menu problem while the owner retains authority over what is correct and what changes publicly.

## B. Audience

Owners concerned about wrong prices, missing items, sold-out states, or outdated public details.

## C. Placement

- Customer feedback feature page.
- Instagram Reel and YouTube Short.
- LinkedIn.
- WhatsApp sales.
- Retargeting.
- Onboarding and product demo.

## D. Recommended Duration

- Master: 35 seconds.
- Vertical cut: 25 seconds.
- Paid cut: 15 seconds.
- Silent feedback-flow loop: 8 seconds.

## E. Core Message

MenuList lets customers privately report a possible public-list issue and gives the owner the context to review it before any public change.

## F. Emotional Job

`Customers can flag a problem without gaining control over my public menu.`

## G. Narrative Arc

1. **Hook:** Customers often notice a wrong detail first.
2. **Problem:** Their report usually arrives without the exact menu context.
3. **Product entry:** MenuList provides a private report from the customer view.
4. **Proof:** The owner receives the affected item/detail and reviews the approved source.
5. **Outcome:** Public accuracy can improve without turning feedback into public editing.
6. **CTA:** Private feedback. Owner control.

## H. Second-By-Second Frame Plan

| Timecode | Duration | Frame / Visual | Camera / UI direction | Voiceover | On-screen text | Motion / Transition | Design notes | Assets needed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0:00-0:04 | 4s | Customer sees `Cold coffee - 110` but a controlled fixture indicates the detail may be wrong | Start in the real customer menu | Customers notice wrong prices and missing items before reports do. | `Something looks wrong.` | One item receives a restrained focus outline | Use fictional demo data | Customer menu issue fixture |
| 0:04-0:11 | 7s | Private report form opens from the customer page | Keep issue type and privacy wording readable | MenuList gives them a private way to report what looks wrong. | `Report privately` | Form rises from the current item context | Do not style it like a public review form | Current public feedback form capture |
| 0:11-0:18 | 7s | Report carries item, price, page, and issue context | Crop to the retained context fields | The report keeps the public context: the item, price, or detail they saw. | `Keep the exact context` | Context tokens move into the owner report | Only show fields actually retained | Current report payload/owner view fixture |
| 0:18-0:25 | 7s | Owner opens feedback and compares it with the approved item | Use a clear owner/customer comparison | The owner reviews the feedback privately and checks the approved list. | `Owner reviews what is correct` | Customer context aligns with approved item row | Avoid implying the customer report is automatically true | Current owner feedback review capture |
| 0:25-0:31 | 6s | Owner chooses a supported next action; public page remains unchanged until approval | Keep public page visible and stable | Nothing changes publicly until the owner decides what is correct. | `No public change without owner decision` | Owner action starts; public state changes only after visible approval if shown | Owner authority is the hero | Owner action/approval and public page fixture |
| 0:31-0:35 | 4s | MenuList identity close | Center symbol, name, tagline, URL | Private feedback. Owner control. Better public accuracy. | `MenuList` / `One approved customer link` / `menulist.ai` | Frozen identity cycle and held last frame | No rating stars or testimonial treatment | Canonical logo assets |

## I. Full Voiceover Script

> Customers notice wrong prices and missing items before reports do. MenuList gives them a private way to report what looks wrong. The report keeps the public context: the item, price, or detail they saw. The owner reviews the feedback privately and checks the approved list. Nothing changes publicly until the owner decides what is correct. Private feedback. Owner control. Better public accuracy.

## J. On-Screen Text List

1. `Something looks wrong.`
2. `Report privately`
3. `Keep the exact context`
4. `Owner reviews what is correct`
5. `No public change without owner decision`
6. `MenuList`
7. `One approved customer link`
8. `menulist.ai`

## K. UI Screens Required

- Current public customer menu.
- Current customer feedback/report entry point.
- Public feedback form and available issue types.
- Submitted/acknowledged state.
- Current owner feedback list/detail.
- Approved item/list comparison.
- Supported owner next action and approval state.
- Customer page before and, only if approved, after correction.

Existing proof starting point: `public/images/website/features/customer-feedback-loop/public-feedback-form.webp`.

## L. Motion Design Direction

- Keep the customer issue anchored to one exact item or detail.
- Move retained context from customer view into owner review to explain continuity.
- Use one comparison state, not multiple floating screenshots.
- Keep public state visibly unchanged until owner action.
- Do not add star ratings, review cards, public comments, or reputation widgets.
- Use restrained tap/cursor cues.
- Keep no-pill captions above mobile platform controls.

## M. Sound Direction

- Use `One Link Motion v2` at restrained volume.
- Add one soft form-open cue, one submit confirmation, and one owner-review click.
- Use a muted approval tone only if the owner approves a correction.
- Avoid notification spam, public-review sounds, or celebratory feedback cues.
- Leave a short pause before `Owner control.`

## N. Design Checklist

- [ ] The feedback entry point and issue types match current runtime.
- [ ] The report is clearly private.
- [ ] Only context actually retained by the product is shown.
- [ ] Customer feedback is not treated as verified truth.
- [ ] Owner review precedes any public change.
- [ ] No public review, rating, reputation-management, or external-posting claim appears.
- [ ] Demo content contains no real customer information.
- [ ] Customer and owner roles are visually distinct.
- [ ] Final identity is clean and held.
- [ ] Encoded output passes privacy, claim, and mobile QA.

## O. Versioning Requirements

- 16:9 master, 1920 x 1080, captioned and clean.
- Native 9:16, 1080 x 1920, captioned and clean.
- With VO and music; music-only; clean picture master.
- 15-second cut centered on report context to owner review.
- 8-second silent flow loop.
- Thumbnail with `Report privately` and one menu item.
- First rendered review ID: `ml-fl-customer-feedback-loop-v1.0`.

## P. CTA

`Private feedback. Owner control.`

## Q. Conversion And Claim Contract

- **Conversion job:** Demonstrate a controlled correction loop without becoming review-management software.
- **Primary proof:** One private report retains useful context and reaches an owner review state.
- **Allowed:** Current private-report fields, acknowledgement, owner review, and supported next action.
- **Required:** Private handling and owner-decision boundary.
- **Blocked:** Public reviews, reputation growth, automatic correction, automatic external replies, or treating every report as accurate.
- **Release gate:** Revalidate the guest form, retained context, owner view, privacy copy, and correction path in current runtime.
