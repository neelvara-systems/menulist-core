# Menu Setup Progress — Specification

> **Feature Flag:** `ENABLE_MENU_SETUP_PROGRESS`
> **Owner-facing name:** Menu setup

## 1. Problem

Owners can create/import a menu, improve it, publish it, and place the link through several existing MenuList surfaces. The pieces are implemented, but first-time owners do not always know which step is done and which step matters next.

## 2. Product Decision

Create a MenuList-specific setup progress layer. It tracks the menu lifecycle, not business/profile completion.

## 3. Required Outcomes

1. Show required menu setup progress without duplicating Public Presence.
2. Treat descriptions, images, OBP photos, and social links as optional polish.
3. Reuse existing Menu Check and Presence Monitor data.
4. Avoid new collections, backend jobs, or owner-facing settings.
5. Work on desktop and mobile through shared computation.

## 4. Required Steps

| Step | Done When | Owner Copy |
| --- | --- | --- |
| Source added | a project exists or setup source is known | "Source added" |
| Menu imported | active extracted items exist | "Menu imported" |
| Key details checked | no critical Menu Check price/review warnings | "Key details checked" |
| Menu published | selected project has `lastPublishedAt` | "Menu published" |
| Link placed | starter activation target is met | "Link placed" |

## 5. Optional Steps

| Step | Done When | Owner Copy |
| --- | --- | --- |
| Descriptions | description signal is clear | "Descriptions ready" |
| Images | image signal is clear | "Images ready" |
| Translations | selected menu language signals are clear | "Translations ready" |
| OBP links | social/public action fields exist | "Public links added" |
| OBP photo | cover/gallery/logo/project image exists | "Public photo added" |

## 6. Non-Goals

- Profile completion percentage
- Business setup wizard
- Public Presence replacement
- New onboarding collection
- New analytics panel
- Required AI descriptions before publish
- Required item images before publish
- Required translations before publish
- Expanding Menu Presence Monitor beyond its fixed surfaces

## 7. Owner Language

Use calm copy:

- "Menu setup"
- "Next step"
- "Required setup"
- "Optional improvements"
- "No action needed"

Avoid:

- "You're doing great"
- "Profile complete"
- "Business setup"
- score-like or celebratory language

## 8. Acceptance Criteria

1. Dashboard shows a setup card when setup is not fully running.
2. Mobile Menu shows the setup card before/near Menu Check.
3. Mobile Share shows placement progress after publish.
4. Menu Check still owns content quality actions.
5. Presence Monitor still owns external placement confirmation.
6. No new Firestore collection, route, Cloud Function, or API route is added.

---

**Created:** July 7, 2026
