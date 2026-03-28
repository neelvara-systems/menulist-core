# Digital Screens - Testing & Code Review Guide

**Created:** January 4, 2026  
**Purpose:** Guide for code review and manual testing of Digital Screens feature

---

## 📋 Code Review Checklist

### Review Order (Sequential)

Follow this exact order for efficient review:

---

### 1️⃣ Types & Interfaces

**File:** `src/types/campaigns.ts`  
**Lines to check:** Search for "Digital Screen" section (around line 240+)

| Check                             | What to Look For                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| ✅ `SCREEN_CONFIDENCE_THRESHOLD`  | Should be `0.7` (higher than campaigns at 0.6)                                                                  |
| ✅ `AvailabilityReliability`      | Type: `"high" \| "medium" \| "low"`                                                                             |
| ✅ `ScreenSlide` interface        | Has: `id`, `source`, `type`, `imageUrl`, `confidenceScore`, `availabilityReliability`, `validUntil`             |
| ✅ `DigitalScreenState` interface | Has: `enabled`, `screenToken`, `ownerOverrideEnabled`, `pinnedSlides`, `contentVersion`, `currentMinConfidence` |
| ✅ `ScreenAPIResponse` interface  | Has: `slides`, `storeName`, `storeId`, `contentVersion`, `refreshInterval`                                      |

**🚫 Don't worry about:** Other campaign types in this file - they're existing code.

---

### 2️⃣ Feature Flags

**File:** `src/config/features.ts`  
**Search for:** `DIGITAL_SCREENS`

| Check                                   | Expected Value   |
| --------------------------------------- | ---------------- |
| ✅ `DIGITAL_SCREENS_ENABLED`            | `true`           |
| ✅ `DIGITAL_SCREENS_MAX_UPLOADS`        | `3`              |
| ✅ `DIGITAL_SCREENS_UPLOAD_EXPIRY_DAYS` | `14`             |
| ✅ `DIGITAL_SCREENS_REFRESH_INTERVAL`   | `300000` (5 min) |
| ✅ `DIGITAL_SCREENS_SLIDE_DURATION`     | `8000` (8 sec)   |

---

### 3️⃣ Database Layer (DAL)

**File:** `src/database/campaigns/index.ts`  
**Search for:** "Digital Screen State Functions"

| Function                     | Purpose              | Key Points                           |
| ---------------------------- | -------------------- | ------------------------------------ |
| `getScreenState()`           | Fetch screen state   | Returns `DigitalScreenState \| null` |
| `initializeScreenState()`    | Create initial state | Generates 8-char token               |
| `updateScreenSettings()`     | Update settings      | Uses merge strategy                  |
| `addPinnedSlide()`           | Add owner upload     | Max 3 check should be in caller      |
| `removePinnedSlide()`        | Delete slide         | Filters by slideId                   |
| `bumpScreenContentVersion()` | Invalidation         | Increments version number            |
| `uploadScreenSlide()`        | Upload image         | Uses `uploadBase64ToStorage` pattern |

**🔍 Pattern check:** Verify `uploadScreenSlide` uses `uploadBase64ToStorage` like `tickets/index.ts` does.

---

### 4️⃣ Screen Utilities

**File:** `src/lib/screen/utils.ts`

| Function                     | Purpose                 | Check                                          |
| ---------------------------- | ----------------------- | ---------------------------------------------- |
| `generateScreenToken()`      | Create 8-char token     | Uses `crypto.randomUUID()`                     |
| `createInitialScreenState()` | Default state object    | `enabled: true`, `ownerOverrideEnabled: false` |
| `isSlideExpired()`           | Check expiry            | Handles both Timestamp and Date                |
| `getSlideExpiryDate()`       | Calculate 14-day expiry | Returns Date object                            |
| `buildScreenUrl()`           | Build public URL        | Uses `NEXT_PUBLIC_APP_URL`                     |

---

### 5️⃣ Slide Generation Logic

**File:** `src/lib/screen/slideGenerator.ts`

| Constant/Function      | Expected         | Check                                         |
| ---------------------- | ---------------- | --------------------------------------------- |
| `MINIMUM_SLIDES`       | `3`              | Per spec FR-11                                |
| `MAXIMUM_SLIDES`       | `8`              | Per spec NFR-5                                |
| `generateSlideStack()` | Main function    | 4-layer: Owner → Campaign → Evergreen → Brand |
| `filterValidSlides()`  | Remove expired   | Checks `validUntil` and `availabilityLinked`  |
| `applyMonotonicity()`  | Confidence check | Never downgrade mid-day                       |

**🔍 Key logic check:**

```
1. Owner pinned slides first (if override enabled)
2. Campaign slides (confidence >= 0.7)
3. Evergreen slides (trust anchors)
4. Brand fallback (always last, always present)
5. Total: min 3, max 8
```

---

### 6️⃣ Evergreen Slides

**File:** `src/lib/screen/evergreenSlides.ts`

| Function                     | Purpose                        |
| ---------------------------- | ------------------------------ |
| `generateEvergreenSlides()`  | Create from best-selling items |
| `createBrandFallbackSlide()` | Always-available fallback      |

**Check:** Brand fallback should NEVER be null - it's the safety net.

---

### 7️⃣ Screen Display Page (Server Component)

**File:** `src/app/screen/[token]/page.tsx`

| Check                    | What to Verify                                |
| ------------------------ | --------------------------------------------- |
| ✅ Server component      | NO `"use client"` directive                   |
| ✅ Uses DAL directly     | Calls `getScreenDataByToken()`                |
| ✅ Token validation      | 6-12 char check                               |
| ✅ Error handling        | Uses `notFound()` for invalid token           |
| ✅ Passes data to client | Returns `<ScreenDisplay initialData={...} />` |

**🔍 Pattern check:** No API route - data fetched server-side via DAL.

---

### 8️⃣ Screen Display Client Component

**File:** `src/app/screen/[token]/ScreenDisplay.tsx`

| Check                    | What to Verify                             |
| ------------------------ | ------------------------------------------ |
| ✅ Client component      | Has `"use client"` directive               |
| ✅ Receives initial data | Props from server component                |
| ✅ Slide rotation        | Timer at `slideDurationMs` (8 sec)         |
| ✅ Auto-refresh          | Page reload at `refreshIntervalMs` (5 min) |
| ✅ Offline caching       | Saves to localStorage                      |
| ✅ Fullscreen CSS        | No scrollbars, 100vh/100vw                 |

**🔍 Pattern check:** Server fetches data → Client handles timers/animation.

---

### 9️⃣ Service Worker

**File:** `public/screen-sw.js`

| Check                   | Expected                         |
| ----------------------- | -------------------------------- |
| ✅ Cache name           | `menulist-screen-cache-v1`       |
| ✅ Cache duration       | 24 hours                         |
| ✅ Caches static assets | Screen page assets               |
| ✅ Offline fallback     | Returns cached page when offline |

---

### 1️⃣1️⃣ Settings Components

**Directory:** `src/components/templates/main-app/settings/DigitalScreenSettings/`

| File                | Purpose           | Check                             |
| ------------------- | ----------------- | --------------------------------- |
| `index.tsx`         | Main settings     | Uses DAL directly, not API routes |
| `CurrentSlides.tsx` | Read-only list    | Shows source labels               |
| `OwnerUploads.tsx`  | Upload management | Max 3, 14-day expiry message      |
| `ScreenLink.tsx`    | Copy URL          | Clipboard API                     |

**🔍 Pattern check:** All should use DAL functions directly (`getScreenState`, `uploadScreenSlide`, `removePinnedSlide`), NOT API routes.

---

## 🧪 Manual Testing Checklist

### Pre-requisites

```bash
npm run dev
# App running at http://localhost:3000
```

### Test 1: Screen Page Load

| Step | Action                         | Expected                      |
| ---- | ------------------------------ | ----------------------------- |
| 1.1  | Open Settings > Digital Screen | Settings page loads           |
| 1.2  | Copy the screen URL            | URL copied to clipboard       |
| 1.3  | Open URL in new tab            | Screen page loads with slides |
| 1.4  | Wait 8+ seconds                | Slide rotates automatically   |

### Test 2: Offline Mode

| Step | Action                            | Expected                       |
| ---- | --------------------------------- | ------------------------------ |
| 2.1  | Load screen page normally         | Slides display                 |
| 2.2  | Open DevTools > Network > Offline | Enable offline mode            |
| 2.3  | Refresh page                      | Page still shows cached slides |
| 2.4  | Disable offline mode              | Page refreshes with new data   |

### Test 3: Owner Uploads

| Step | Action                          | Expected                         |
| ---- | ------------------------------- | -------------------------------- |
| 3.1  | Go to Settings > Digital Screen | See upload section               |
| 3.2  | Upload an image                 | Success message with expiry info |
| 3.3  | Verify slide appears in list    | Shows with "14 days remaining"   |
| 3.4  | Upload 2 more images            | All 3 show in list               |
| 3.5  | Try uploading 4th image         | Error: "Maximum 3 custom slides" |
| 3.6  | Delete one slide                | Removed from list                |

### Test 4: Screen Link

| Step | Action            | Expected                    |
| ---- | ----------------- | --------------------------- |
| 4.1  | Copy screen link  | "Link copied" message       |
| 4.2  | Paste in notepad  | URL like `/screen/abc12345` |
| 4.3  | Open in incognito | Works without login         |

### Test 5: Invalid Token

| Step | Action                      | Expected               |
| ---- | --------------------------- | ---------------------- |
| 5.1  | Go to `/screen/invalid`     | Error page (not blank) |
| 5.2  | Go to `/screen/` (no token) | 404 or redirect        |

### Test 6: Auto-Refresh

| Step | Action                        | Expected            |
| ---- | ----------------------------- | ------------------- |
| 6.1  | Open screen page              | Note current slides |
| 6.2  | Upload new slide in settings  | -                   |
| 6.3  | Wait 5 minutes on screen page | New slide appears   |

---

## ⚠️ Common Issues to Watch

### Issue 1: Blank Screen

**Cause:** No slides generated  
**Check:** `generateSlideStack()` always returns brand fallback  
**Fix:** Ensure `createBrandFallbackSlide()` never returns null

### Issue 2: Auth Errors on Screen Page

**Cause:** Accidentally added `withAuth()` to public API  
**Check:** `/api/screen/[token]/route.ts` should NOT have auth  
**Fix:** Remove auth wrapper from public route

### Issue 3: Uploads Not Working

**Cause:** Missing DAL import or wrong pattern  
**Check:** `OwnerUploads.tsx` uses `uploadScreenSlide()` from DAL  
**Fix:** Verify import and function call

### Issue 4: Offline Not Working

**Cause:** Service worker not registered  
**Check:** Browser DevTools > Application > Service Workers  
**Fix:** Ensure `screen-sw.js` is in `public/` folder

### Issue 5: Slides Not Rotating

**Cause:** Missing timer in page component  
**Check:** `page.tsx` has `setInterval` for slide rotation  
**Fix:** Add rotation timer with `SLIDE_DURATION`

---

## 🚫 What NOT to Test/Review

| Skip This                         | Reason                                  |
| --------------------------------- | --------------------------------------- |
| Campaign engine logic             | Existing code, not part of this feature |
| Auth middleware implementation    | Existing pattern                        |
| Firebase Storage upload internals | Uses existing `uploadBase64ToStorage`   |
| Other settings sections           | Not related to Digital Screens          |

---

## 📁 Quick File Reference

```
src/
├── types/campaigns.ts              # Types (line ~240+)
├── config/features.ts              # Feature flags
├── database/campaigns/index.ts     # DAL functions + getScreenDataByToken()
├── lib/screen/
│   ├── utils.ts                    # Token, URL helpers
│   ├── slideGenerator.ts           # 4-layer stack logic
│   ├── evergreenSlides.ts          # Trust anchors
│   └── screenRenderer.ts           # Client rotation config
├── app/screen/[token]/
│   ├── page.tsx                    # Server component (data fetch)
│   └── ScreenDisplay.tsx           # Client component (rotation/timers)
├── components/.../DigitalScreenSettings/
│   ├── index.tsx                   # Main settings (uses DAL)
│   ├── CurrentSlides.tsx           # Read-only list
│   ├── OwnerUploads.tsx            # Upload manager (uses DAL)
│   └── ScreenLink.tsx              # URL copy
public/
└── screen-sw.js                    # Offline service worker
```

**Architecture Pattern:**

```
Server Component (page.tsx)
    ↓ fetches via DAL
getScreenDataByToken(token)
    ↓ generates slides
generateSlidesFromData()
    ↓ passes to
Client Component (ScreenDisplay.tsx)
    ↓ handles
Rotation, Timers, Offline Cache
```

---

## ✅ Review Complete Checklist

Before marking review complete:

- [ ] All types defined correctly
- [ ] Feature flags set
- [ ] DAL functions follow existing patterns (client-side uploads)
- [ ] NO API routes for screen (uses DAL directly)
- [ ] Screen page has offline support
- [ ] Slide rotation works
- [ ] Owner uploads use DAL (not API route)
- [ ] Service worker in public folder
- [ ] No blank screen scenarios
- [ ] Error pages show content (not blank)

---

_End of Testing & Code Review Guide_
