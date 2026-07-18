# MenuList Activation Concierge - Test Cases

**Status:** Test matrix with runtime verifier
**Created:** June 24, 2026

## Product Boundary

| ID | Case | Expected |
| --- | --- | --- |
| AC-PB-001 | SignalDesk routes a target into MenuList activation | SignalDesk creates/links outcome reference only; no store/project/menu truth write. |
| AC-PB-002 | SignalDesk attempts to mark a surface active directly | Blocked; only MenuList owner-confirmed paths update activation truth. |
| AC-PB-003 | Public SignalDesk URL requested | No public SignalDesk page is exposed. |

## Create And Publish

| ID | Case | Expected |
| --- | --- | --- |
| AC-CP-001 | Owner uploads valid image through `/create-menu` | Public draft and extraction job are created through existing route. |
| AC-CP-002 | Owner submits readable menu link with permission confirmed | Public draft and extraction job are created. |
| AC-CP-003 | Draft extraction completes | Preview can fetch completed extracted data. |
| AC-CP-004 | Owner claims completed draft | Tenant/store/project/summary are written through the authenticated claim transaction. |
| AC-CP-005 | Claim route returns URLs | Success response includes official page URL and menu URL. |
| AC-CP-006 | Draft belongs to another user | Claim is blocked. |
| AC-CP-007 | Draft expired | Claim is blocked. |
| AC-CP-008 | Draft extraction incomplete | Claim is blocked. |

## Activation Signals

| ID | Case | Expected |
| --- | --- | --- |
| AC-AS-001 | Owner copies live link | `MENU_LINK_COPIED` is recorded once. |
| AC-AS-002 | Owner starts WhatsApp share | `WHATSAPP_SHARE_STARTED` is recorded once. |
| AC-AS-003 | Owner downloads QR | `QR_DOWNLOADED` is recorded through existing share path. |
| AC-AS-004 | Owner downloads Menu Kit | `MENU_KIT_DOWNLOADED` is recorded through existing Menu Kit path. |
| AC-AS-005 | Owner marks Google/Profile done | `menuPresence.googleBusiness` and matching starter signal are written. |
| AC-AS-006 | Owner marks Instagram done | `menuPresence.instagramBio` and matching starter signal are written. |
| AC-AS-007 | Owner marks WhatsApp profile done | `menuPresence.whatsappProfile` and matching starter signal are written. |
| AC-AS-008 | Two unique actions exist | Activation Concierge shows activated state. |
| AC-AS-009 | One action exists | Activation Concierge asks for one more surface. |
| AC-AS-010 | No actions near deadline | Activation Concierge shows stuck/urgent next action without fake urgency. |
| AC-AS-011 | UI explains how action was completed | MenuList-recorded actions and owner-confirmed external placements are counted separately. |

## Safety

| ID | Case | Expected |
| --- | --- | --- |
| AC-SF-001 | Owner has not approved preview | No published proof or activation state is created. |
| AC-SF-002 | Owner has not placed Google/Profile link | Google/Profile is not counted. |
| AC-SF-003 | Owner has not granted proof permission | Proof asset remains held. |
| AC-SF-004 | External provider send attempted | Blocked; no WhatsApp/Instagram/Google API publish occurs. |
| AC-SF-005 | Unsupported claim appears in proof draft | Held for review. |

## Firebase Cost

| ID | Case | Expected |
| --- | --- | --- |
| AC-FB-001 | Checklist renders | No extra collection scan. |
| AC-FB-002 | Activation signal repeats in same session | Duplicate writes are avoided where possible. |
| AC-FB-003 | SignalDesk dashboard lists outcomes | Reads compact outcome summary, not raw store/project trees. |
| AC-FB-004 | Proof screenshot stored | Stored in approved artifact path only; raw image is not written into Firestore. |

## Mobile

| ID | Case | Expected |
| --- | --- | --- |
| AC-MO-001 | Mobile success page opens | Text fits and actions are tappable. |
| AC-MO-002 | Mobile WhatsApp share starts | Owner-initiated share opens; no provider send. |
| AC-MO-003 | Mobile QR/Menu Kit action used | Existing starter signal path records action. |
| AC-MO-004 | Mobile activation complete | Two-surface state is visible without desktop dashboard. |

## Verification Commands

```bash
npm run verify:menulist-activation-concierge
npm run verify:menu-extraction-pipeline
npm run verify:menu-extraction-pipeline:dry-run
npm run verify:signaldesk
git diff --check
```
