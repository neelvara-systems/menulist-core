# MenuList Activation Concierge - Implementation Plan

**Status:** Runtime foundation implemented on existing MenuList surfaces
**Created:** June 24, 2026

## Current Evidence

| Area | Evidence |
| --- | --- |
| Shared extraction | `__docs__/menu-extraction-pipeline/README.md:6` says public create-menu, owner upload, mobile upload, menu-link import, and messaging onboarding share one durable job contract. |
| Public draft creation | `src/app/api/public/create-menu/route.ts:6` documents authenticated upload/link import plus queue extraction. |
| Durable draft job | `src/app/api/public/create-menu/route.ts:226` writes the `menuImageProcessingJobs` document for public drafts. |
| Claim route | `src/app/api/public/create-menu/claim/route.ts:134` uses `withAuth()` for the claim/publish operation. |
| Claim validation | `src/app/api/public/create-menu/claim/route.ts:164` parses and validates request input. |
| Draft ownership and readiness | `src/app/api/public/create-menu/claim/route.ts:211` checks draft existence, ownership, expiry, and extraction completion inside the transaction. |
| Truth writes | `src/app/api/public/create-menu/claim/route.ts:315` creates tenant/store when needed, and `src/app/api/public/create-menu/claim/route.ts:422` writes the project. |
| Cache invalidation | `src/app/api/public/create-menu/claim/route.ts:458` revalidates public menu/store tags after publish. |
| Starter contract | `src/lib/onboarding/starterActivation.ts:3` defines the 7-day activation window and `src/lib/onboarding/starterActivation.ts:20` defines the two-action target. |
| Existing signals | `src/lib/onboarding/starterActivation.ts:22` defines link, QR, Menu Kit, share, Google, Instagram, and WhatsApp profile signals. |
| Success page actions | `src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx:57` copies the link and records a starter signal; `src/app/(website)/create-menu/success/CreateMenuSuccessClient.tsx:76` starts WhatsApp share and records a starter signal. |

## Architecture

```txt
SignalDesk target/reply/partner/content route
  -> MenuList current-list route token or existing /create-menu path
  -> publicMenuDrafts + menuImageProcessingJobs
  -> owner preview
  -> claim/publish transaction
  -> starter activation checklist
  -> starterActivationSignals + menuPresence
  -> activation summary
  -> SignalDesk outcome watcher reads summary only
```

## Decision Implemented

On June 24, 2026, the founder decision was resolved in favor of the existing MenuList path:

Decision implemented: existing screens first, no new route, and SignalDesk remains observer-only.

- no new owner-facing route;
- no new public Activation Concierge page;
- no new activation collection;
- no SignalDesk write to MenuList truth;
- extend existing starter activation, Search & Discovery, Presence Monitor, Use MenuList, and mobile Share surfaces first.

The runtime foundation now uses `buildStarterActivationSummary()` in `src/lib/onboarding/starterActivation.ts` to compute:

| Output | Source |
| --- | --- |
| `signalCount` | Existing `starterActivationSignals.actions` plus owner-confirmed `menuPresence` signals. |
| `activated` | Existing two-action threshold from `STARTER_DISTRIBUTION_ACTIVATION_TARGET`. |
| `systemRecordedCount` | Copy/share/QR/Menu Kit/native share actions recorded by MenuList. |
| `ownerConfirmedCount` | Google Business, Instagram Bio, and WhatsApp Profile placements marked by the owner. |
| `recordedSignals` | Evidence labels and "how we know" text for UI and future SignalDesk summaries. |

## Product Boundary

SignalDesk:

- can create tracked route/outcome references;
- can read activation summaries through a bridge;
- can recommend follow-up;
- cannot write stores, projects, menus, billing, public URLs, or public output.

MenuList:

- owns upload, extraction, preview, claim, publish, share, QR, presence, and activation truth;
- owns any owner-facing route or checklist;
- owns cache invalidation after public truth writes.

## Runtime File Changes

| File | Action |
| --- | --- |
| `src/lib/onboarding/starterActivation.ts` | Added shared activation evidence details and `buildStarterActivationSummary()`. |
| `src/components/onboarding/StarterActivationBanner.tsx` | Shows action-done proof counts in the existing starter banner. |
| `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx` | Shows Activation proof inside the existing desktop discovery setup and labels external placement as owner-confirmed. |
| `src/components/mobile/components/PresenceMonitor.tsx` | Shows the same activation proof on mobile using existing antd-mobile surfaces. |
| `public/locales/menulist.ai/en-US.json` | Added mobile activation proof copy. |
| `public/locales/menulist.ai/hi-IN.json` | Added required mobile activation proof keys. |
| `scripts/verification/verify-menulist-activation-concierge.js` | Added static/code-contract verifier for route boundaries, signals, and no SignalDesk truth writes. |
| `package.json` | Added `verify:menulist-activation-concierge`. |

## Data Contract

Prefer existing store fields:

```ts
stores/{storeId}: {
  onboardingSource: "PUBLIC_MENU_ENTRY" | "MESSAGING_ONBOARDING";
  starterActivationStatus: "starter_active" | "active_paid" | "starter_expired" | "archived";
  activationDeadline: Timestamp;
  starterActivationSignals?: {
    actions: Record<string, string>;
    lastSignalAt: string;
  };
  menuPresence?: {
    googleBusiness?: string;
    instagramBio?: string;
    whatsappProfile?: string;
  };
}
```

Do not create a new activation collection unless the UI needs a capped summary for platform/admin reporting. If needed, the first new document should be a bounded daily summary, not per-event raw logs.

## Checklist Logic

Activation Concierge should compute:

| Output | Rule |
| --- | --- |
| `remainingDays` | From `activationDeadline`. |
| `signalCount` | Existing `getStarterActivationSignalCount()`. |
| `activated` | Existing `hasStarterDistributionActivation()`. |
| `nextActions` | Prefer missing high-impact actions: copy link, WhatsApp share, QR/Menu Kit, Google/Profile, Instagram, staff use. |
| `proofEligible` | True only when published, activated, and proof permission is granted. |
| `stalled` | True when published but no signal after expected interval, or one signal without second signal near deadline. |

## Surface Actions

| Action | Runtime behavior |
| --- | --- |
| Copy link | Copy official menu/customer link and record `MENU_LINK_COPIED`. |
| WhatsApp share | Open owner-initiated WhatsApp share and record `WHATSAPP_SHARE_STARTED`. |
| QR download | Use existing share/QR path and record `QR_DOWNLOADED`. |
| Menu Kit download | Use existing Menu Kit path and record `MENU_KIT_DOWNLOADED`. |
| Google/Profile marked | Owner manually marks placement in Presence Monitor; no Google API publish. |
| Instagram marked | Owner manually marks placement in Presence Monitor; no Meta publish. |
| WhatsApp profile marked | Owner manually marks placement; no WhatsApp provider send. |
| Staff replies | Copy staff-ready message; record only if a supported starter signal exists or keep as local UI until a signal is approved. |

## Action-Done Confidence Model

| Class | Meaning | Runtime evidence |
| --- | --- | --- |
| MenuList recorded | MenuList observed the owner action inside the product. | `MENU_LINK_COPIED`, `WHATSAPP_SHARE_STARTED`, `QR_DOWNLOADED`, `MENU_KIT_DOWNLOADED`, `NATIVE_SHARE_COMPLETED`. |
| Owner confirmed external | The owner told MenuList that an external placement is done. | `menuPresence.googleBusiness`, `menuPresence.instagramBio`, `menuPresence.whatsappProfile` plus matching starter signals. |
| Customer usage observed | Future stronger proof from scans/visits/referrer/source attribution. | Not implemented in this pass; do not imply platform placement verification. |

## API Rules

No new API is required for P0 if existing `recordStarterActivationSignal()` and Presence Monitor writes are reused.

If a new API is added:

- protect it with auth;
- validate with Zod;
- rate-limit mutation;
- verify tenant/store access;
- allow writes only to allowed starter activation fields;
- reject SignalDesk service calls that try to mutate MenuList truth;
- use generic errors;
- avoid raw PII in logs.

## SignalDesk Bridge

SignalDesk can observe:

```ts
{
  routeTokenId: string;
  targetId?: string;
  menuListStoreId?: number;
  menuListProjectId?: string;
  state: "upload_started" | "preview_ready" | "published" | "one_surface_active" | "activated" | "stalled";
  signalCount: number;
  activatedAt?: string;
  proofPermissionStatus: "none" | "pending" | "approved" | "denied";
}
```

Bridge writes must live in SignalDesk-owned outcome collections or summary docs. They must not mutate MenuList store/project truth.

## Verification

Add or extend focused checks:

```bash
npm run verify:menulist-activation-concierge
npm run verify:menu-extraction-pipeline
npm run verify:menu-extraction-pipeline:dry-run
npm run verify:signaldesk
git diff --check
```

Runtime implementation should also run TypeScript:

```bash
npx tsc --noEmit --incremental false --pretty false
```

## Implementation Stop Rules

Stop and ask before runtime work if:

- founder wants a new public route instead of extending existing success/starter workspace;
- new collection or index is required;
- SignalDesk needs more than read-only outcome observation;
- any external provider publish/send is requested;
- any paid plan or billing-gate behavior changes.
