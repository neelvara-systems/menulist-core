# Social Content AI - Manual Testing Guide

## Prerequisites

1. **Feature Flag**: Ensure `SOCIAL_CONTENT_ENABLED = true` in `src/config/features.ts`
2. **Test Project**: Have at least one project with menu items
3. **Database**: Firebase connected and accessible

---

## Test Flow

### 1. Start Dev Server

```bash
npm run dev
```

Navigate to: `http://localhost:3000`

---

### 2. Test: Today Screen States

#### 2.1 Feature Disabled State

- [ ] Set `SOCIAL_CONTENT_ENABLED = false`
- [ ] Navigate to Today tab
- [ ] **Expected**: "This feature is coming soon." message
- [ ] Reset to `true` after testing

#### 2.2 Loading State

- [ ] Navigate to Today tab
- [ ] **Expected**: Brief loading spinner with "Preparing..." text

#### 2.3 Empty State (No Campaigns)

- [ ] If no campaigns qualify today
- [ ] **Expected**: "Nothing to do right now." message
- [ ] **Verify**: No illustrations, no CTAs, calm tone

#### 2.4 Action State (Campaign Available)

- [ ] When campaigns exist
- [ ] **Expected**: Primary card displayed with:
  - Action title (e.g., "Highlight {itemName}")
  - Item name (largest text)
  - Context line (quiet, no numbers)
  - Primary button (e.g., "Share to WhatsApp Status")
  - Skip button

---

### 3. Test: Primary Campaign Actions

#### 3.1 Complete Campaign (Share)

- [ ] Click primary action button
- [ ] **Expected**:
  - Button shows loading state
  - After completion: "Shared" confirmation
  - Auto-transitions back after 2 seconds
  - Campaign removed from Today

#### 3.2 Skip Campaign

- [ ] Click "Skip" button
- [ ] **Expected**:
  - Campaign immediately removed
  - No guilt messaging
  - Data refreshes

---

### 4. Test: Operational Campaigns (Passive)

- [ ] If operational campaigns exist, check below primary card
- [ ] **Expected**:
  - Max 2 operational cards shown
  - Smaller visual weight than primary
  - Simple "Share" or "Download" buttons
  - No urgency language

---

### 5. Test: Past Activity Screen

Navigate to: Today → "View past activity →"

- [ ] **Expected**:
  - Shows last 7 days only (max)
  - Date-grouped list
  - Simple status icons (completed/skipped)
  - NO filters, NO sorting, NO counts
  - NO "Completed X times" labels

---

### 6. Test: Sidebar Dot Indicator

- [ ] When campaign exists: small dot on Today tab
- [ ] After completion/skip: dot disappears
- [ ] **Verify**: DOT only, never a number/badge

---

### 7. Test: Desktop WhatsApp Hint

- [ ] On desktop (>768px width)
- [ ] When primary surface is WhatsApp
- [ ] **Expected**: "WhatsApp opens on your phone." hint below button

---

### 8. Test: Silence Governor (Hard to Test)

For active users (4+ actions in 7 days):

- Tuesday and Thursday should show empty state intentionally
- This prevents "always something" fatigue

---

## API Testing (Optional)

### Caption Generation API

```bash
curl -X POST http://localhost:3000/api/campaigns/caption \
  -H "Content-Type: application/json" \
  -d '{
    "campaignType": "highlight_item",
    "itemName": "Butter Chicken",
    "executionSurface": "whatsapp_status"
  }'
```

---

## Checklist Summary

| Test Area                       | Status |
| ------------------------------- | ------ |
| Feature disabled state          | ⬜     |
| Loading state                   | ⬜     |
| Empty state                     | ⬜     |
| Action state (primary card)     | ⬜     |
| Complete campaign flow          | ⬜     |
| Skip campaign flow              | ⬜     |
| Operational campaigns           | ⬜     |
| Past activity screen            | ⬜     |
| Sidebar dot indicator           | ⬜     |
| Desktop WhatsApp hint           | ⬜     |
| No refetch optimization working | ⬜     |

---

## Things to Watch For

### ✅ Good Signs

- Calm, non-judgmental UI
- No numbers or counts anywhere
- Skip feels safe
- Silence is acceptable

### ❌ Red Flags

- Any counts/badges on Today tab
- "Great job!" or celebration language
- Comparative language ("more than usual")
- Marketing jargon in captions
- Guilt-inducing copy

---

## Browser Console Check

No success logs are required. The browser console should stay free of errors while completing or skipping a prepared Today action.

---

## Database Verification (Firebase Console)

After testing, verify in Firebase:

1. `campaigns/{tId}/{sId}/{campaignId}` - Campaign status updated
2. `campaignExports/{tId}/{sId}/{exportId}` - Export recorded by `completeCampaign`
3. `platformSummary/campaigns_{sId}` - Summary updated
