# Menu Setup Progress

> **Status:** IMPLEMENTED
> **Feature Flag:** `ENABLE_MENU_SETUP_PROGRESS`
> **Route:** Owner dashboard setup card
> **Mobile:** Compact card on MobileMenuScreen and MobileShareScreen
> **Owner-facing name:** Menu setup

## What It Is

Menu Setup Progress is a calm onboarding progress layer for MenuList-specific setup. It answers one owner question: **"Is my menu ready, and what is the next useful step?"**

It tracks menu creation/import, key menu details, publish status, optional content polish, and placement of the official link.

## What It Is Not

- Not business setup progress
- Not account/profile completion
- Not a Public Presence duplicate
- Not a score or gamified badge
- Not a blocker for optional descriptions, images, photos, or social links

## Setup Model

| Group | Step | Source |
| --- | --- | --- |
| Required | Source added | selected project or onboarding source |
| Required | Menu imported | active extracted menu items |
| Required | Key details checked | existing Menu Check critical signals |
| Required | Menu published | project `lastPublishedAt` |
| Required | Link placed | existing starter activation and presence signals |
| Optional | Descriptions | existing Menu Check description signal |
| Optional | Images | existing Menu Check image signal |
| Optional | Translations | existing Menu Check language signals when multiple menu languages are selected |
| Optional | OBP links | existing `socialMedia` and `publicPresence` fields |
| Optional | OBP photo | existing `publicPresence.businessCover`, `photos`, logo, or project image |

## Key Files

| File | Purpose |
| --- | --- |
| `src/lib/menuSetupProgress/buildMenuSetupProgress.ts` | Pure progress computation |
| `src/components/templates/main-app/dashboard/MenuSetupProgress.tsx` | Desktop dashboard card |
| `src/components/mobile/components/MenuSetupProgress.tsx` | Mobile compact card |
| `src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx` | Dashboard mount and shared project read |
| `src/components/templates/main-app/dashboard/MenuQualitySignals.tsx` | Reuses shared dashboard project data |
| `src/components/mobile/screens/MobileMoreScreen.tsx` | Conditional More shortcut while setup is incomplete |
| `src/components/mobile/MobileShell.tsx` | Keeps More shortcut inside shell navigation and selected-project provider cache |
| `src/components/mobile/screens/MobileMenuScreen.tsx` | Mobile menu setup mount |
| `src/components/mobile/screens/MobileShareScreen.tsx` | Mobile placement setup mount |

## Related Features

- [Public Menu Entry](../public-menu-entry/README.md)
- [Messaging Onboarding](../messaging-onboarding/README.md)
- [Menu Quality Signals](../menu-quality-signals/README.md)
- [Menu Presence Monitor](../menu-presence-monitor/README.md)
- [Official Business Page](../official-business-page/README.md)

## Documents

| Doc | Audience |
| --- | --- |
| [menu-setup-progress_spec.md](./menu-setup-progress_spec.md) | Product/Business |
| [menu-setup-progress_impl.md](./menu-setup-progress_impl.md) | Engineering |
| [menu-setup-progress_firebase.md](./menu-setup-progress_firebase.md) | Firebase/Cost |
| [menu-setup-progress_mobile-support.md](./menu-setup-progress_mobile-support.md) | Mobile |
| [menu-setup-progress_marketing.md](./menu-setup-progress_marketing.md) | Marketing |
| [menu-setup-progress_website.md](./menu-setup-progress_website.md) | Website |
| [menu-setup-progress_helpdoc.md](./menu-setup-progress_helpdoc.md) | Help Center |
| [menu-setup-progress_test-cases.md](./menu-setup-progress_test-cases.md) | QA |

---

**Created:** July 7, 2026
**Last Updated:** July 7, 2026
