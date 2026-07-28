# GrowthOS Add-on - Mobile Support

**Status:** Implemented behind Pro/Premium entitlement gate; required for rollout verification
**Mobile owner label:** Growth Kits
**Today card label:** Today's Sales Pack
**Primary mobile rule:** Owners must be able to use a kit from a phone without desktop setup.

---

## 1. Mobile Admission Result

GrowthOS passes the mobile admission gate only if it remains action-first.

Good mobile fit:

- copy a WhatsApp message
- share a caption
- read a staff line
- share a short Staff Brief
- mark a kit as used
- regenerate a stale kit
- download or share a simple poster
- keep latest loaded kit visible when refresh fails

Poor mobile fit:

- editing a long campaign
- managing a calendar
- comparing analytics
- configuring channels
- writing prompts
- browsing design variants
- creating complex offers
- managing multi-outlet campaigns
- replying from an inbox

Therefore mobile launch scope is view, copy, share, download, print handoff, and mark used.

The Staff Brief Pack is launch scope. Offer creation, image adaptation, customer reply snippets, multi-outlet localization, used-history UI, and advanced offline behavior are not launch scope unless a pilot explicitly unlocks them.

## 2. Existing Mobile Surface

The real owner mobile Today tab is currently rendered by:

```txt
src/components/mobile/screens/MobileHoursScreen.tsx
```

That screen already uses:

- `useTodayCampaigns`
- Today action generation
- primary campaign completion
- staff prompt and physical surface context
- paused Weekly Growth Pack card when its flag is on

GrowthOS mobile should reuse the same data inheritance model and not fork campaign logic.

Implemented V1 mobile surface:

```txt
src/components/mobile/components/GrowthKitsMobileCard.tsx
src/components/mobile/screens/MobileHoursScreen.tsx
```

The card is shown only when `shouldShowGrowthOSNavigation()` passes for the active store and the GrowthOS summary has a real Today reason. It now appears to owners as `Today's Sales Pack`, keeps the latest loaded kit visible when refresh fails, blocks stale copy/share use, and exposes copy/share/mark-used controls with 44px targets.

Today trigger rule:

- show when a fresh prepared pack exists
- show when a previously used/copied/shared stale pack needs an update
- show when the current menu action is strong, such as a new item, a customer favorite, or a high-confidence action
- do not show for weak generic `share this item` actions
- do not render the older `No today action yet` generation card for Pro/Premium stores while GrowthOS owns this surface
- do not reintroduce the legacy `Generate Today Action` owner prompt on mobile; existing Today campaigns remain usable, but GrowthOS owns new generated action creation

The mobile card must not feel like another module. It should feel like today's finished handoff:

```txt
customer message + staff line + counter line
```

When this card is visible, the older mobile Today empty prompt (`No today action yet` / `Generate Today Action`) should not render underneath it. The owner should see one primary daily action surface, not two competing prompts.

## 3. Mobile UX Requirements

| Requirement | Rule |
| --- | --- |
| Touch target size | Minimum 44px for copy/share/mark-used actions. |
| Component system | Use the existing mobile `../antd` wrapper components and current Tailwind-driven mobile shell styling; do not add `antd-mobile` without a separate dependency/freeze decision. |
| Copy | Plain owner language. Avoid marketing jargon and internal terms. |
| Loading | Show immediate feedback after copy/share/generate. |
| Editing | No long rich editor on mobile. Short optional tweak only if unavoidable. |
| Navigation | Owner should reach latest kit in one or two taps from Today or mobile module list. |
| Offline/error | If generation fails, keep existing kit visible and show a short retry state. |

## 4. Mobile Views

### Latest Kit Card

Shows:

- kit title
- source item or store fact
- freshness state
- main output preview
- copy/share action
- staff line
- counter line
- fallback state when refresh or generation fails

If refresh fails:

```txt
Could not refresh right now.
Your latest kit is still available.
```

If stale:

```txt
Menu details changed.
Update this pack before copying or sharing.
```

When stale, copy/share/download actions must not be usable from mobile Today. The primary action becomes `Update pack`.

### Staff Brief Card

Shows:

- main staff line
- avoid list when needed
- full menu link fallback
- copy action
- share action
- mark-used action

No editing beyond a future small "make shorter" action if approved.

### Kit Detail Sheet

Shows:

- all destinations
- copy buttons
- stale warning if source facts changed
- mark-used action
- regenerate action when allowed

### Entitlement Empty State

Only for ineligible stores:

- short owner-safe message
- no pricing complexity in the mobile surface
- route to billing/upgrade only if existing billing UX supports it

### Review Reply Sheet

Only when review mode is enabled:

- text input for owner-pasted review
- generate reply
- copy reply
- warning state when a public reply is not recommended

Do not ingest reviews automatically from Google in the approved scope.

### Pilot-Only Mobile Views

These are not launch scope:

| View | Gate |
| --- | --- |
| Existing image asset preview/share | Image adaptation pilot after text/staff loop proves use. |
| Offer creation | Owner-Confirmed Offer Builder governance approval. |
| Customer Replies | Pilot evidence that owners/staff copy snippets often. |
| Photo Capture Prompt | Pilot evidence that missing photos block kit value. |
| Multi-outlet localized kit list | Multi-outlet pilot with store-specific source facts. |
| Used History | Owners use enough kits to need memory/repetition control. |

## 5. Desktop/Mobile Parity

| Capability | Desktop | Mobile |
| --- | --- | --- |
| View eligible actions | Yes | Yes, compact |
| Generate kit | Yes | Yes, if Pro/Premium entitlement and capacity pass |
| Copy/share text | Yes | Yes |
| Download/print | Yes | Download/share handoff |
| Review reply from pasted text | Yes | Yes |
| Staff Brief Pack | Yes | Yes |
| Latest kit fallback after refresh failure | Yes | Yes |
| Long editing | Minimal | Avoid |
| Add-on settings | No owner settings | No owner settings |
| Direct posting | No | No |

Mobile does not need every desktop layout control, but it must support the core paid job.

Copy behavior must not depend only on the browser Clipboard API. Mobile copy uses a textarea fallback when the Clipboard API is blocked, slow, or unavailable. Copied feedback and GrowthOS export recording must wait for Clipboard API success or acknowledged textarea fallback success; failed handoff diagnostics include only clipboard/fallback support booleans and bounded output metadata.

Mobile keeps a synchronous pending-operation set for refresh, generation, and
per-kit/output export recording. This closes the gap before React loading state
renders, so a fast double tap cannot start two owner mutations.

## 6. Mobile Copy Rules

Use:

- "Ready to share"
- "Today's Sales Pack"
- "Menu checked"
- "Update pack"
- "Copy message"
- "Copy WhatsApp"
- "Copy caption"
- "Use staff line"
- "Copy counter line"
- "Brief staff"
- "This may use old menu details"
- "Create again"
- "Latest kit still available"

Avoid:

- campaign
- workflow
- automation
- AI
- optimization
- engagement
- performance
- ROI

## 7. Mobile Tests

Required before activation:

- latest kit visible on iPhone-width viewport
- copy/share buttons remain at least 44px high
- long item names wrap without overlapping controls
- stale warning does not cover actions
- stale warning blocks visible copy/share actions until updated
- Today card shows the paid outcome as customer/staff/counter handoffs, not a generic add-on entry
- empty state has a clear next step
- entitlement denial cannot be bypassed through mobile route
- direct posting controls do not appear
- review text input does not log raw review text
- mobile and desktop generate from the same API/schema
- Staff Brief copy/share/mark-used works in one or two taps
- refresh failure keeps latest loaded kit visible
- stale price/availability-sensitive output cannot be silently reused
- fast repeated taps settle one refresh/generate/export operation while the first is pending
- switching tenant/store never reuses another scope's summary cache entry

## 8. Mobile Cost

Mobile should not add extra read paths beyond the shared summary pattern.

Target:

- one shared summary read for latest GrowthOS state on eligible Pro/Premium mobile Today
- no realtime listener by default
- no refresh, generation, export, or write from the trigger check
- no extra write unless the owner generates, copies, shares, downloads, prints, or marks used

Local latest-kit fallback should reduce server reads. It must not cache raw pasted review text unless a separate privacy decision approves it.
