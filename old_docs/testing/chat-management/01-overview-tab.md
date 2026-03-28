# 🧪 Testing Guide: Overview Tab

**Feature:** Chat Management Dashboard - Overview Tab  
**Location:** `/platform/chat-management` → Overview Tab  
**Last Updated:** January 24, 2025

---

## 📋 Quick Start

### Prerequisites
- ✅ Dev server running: `npm run dev`
- ✅ Firebase Functions deployed
- ✅ Logged in as owner/admin
- ✅ At least 1 store configured

### Expected Duration
- Full testing: 15-20 minutes
- Quick smoke test: 3 minutes

---

## 📍 Step 1: Navigate to Overview

### URL
```
http://localhost:3000/platform/chat-management
```

### What You'll See
```
┌─────────────────────────────────────────┐
│ Chat Management                          │
├─────────────────────────────────────────┤
│ [Overview] [Conversations] [Analytics]  │
├─────────────────────────────────────────┤
│ ⚠️ Data Freshness Banner                │
├─────────────────────────────────────────┤
│ [4 Metric Cards in a Row]              │
├─────────────────────────────────────────┤
│ 📊 Chat Volume Chart                   │
├─────────────────────────────────────────┤
│ [Questions] [Knowledge Gaps]            │
└─────────────────────────────────────────┘
```

### Initial Checks
- [ ] Page loads without errors
- [ ] No console errors (F12)
- [ ] Loading spinner appears briefly
- [ ] Overview tab is active

---

## 🎯 Step 2: Data Freshness Banner

You'll see ONE of these states:

### ✅ State A: Fresh Data (Green)
```
✅ Historical data: Updated 2h ago
   Today's stats are always live and up-to-date.
```
- **Means:** Last aggregation < 26 hours ago
- **Action:** Nothing needed, system healthy

### ⚠️ State B: Stale Data (Yellow)
```
⚠️ Historical data may be outdated
   Last update: 28h ago. [Refresh Button]
```
- **Means:** Data > 26 hours old
- **Action:** Click Refresh button

### 🔵 State C: In Progress (Blue Spinner)
```
ℹ️ Updating analytics data...
   This will take 1-2 minutes.
```
- **Means:** Aggregation running now
- **Action:** Wait 1-2 minutes

### 🔴 State D: Failed (Red)
```
❌ Data update failed
   Error message here [Retry Button]
```
- **Means:** Last aggregation failed
- **Action:** Click Retry, report if persists

---

## 📊 Step 3: Key Metrics (4 Cards)

### Card 1: Total Conversations 💬
- **Shows:** Last 30 days total
- **Source:** Aggregated historical + today live
- **Test:** Should be > 0 if you have chats

### Card 2: Today's Chats 📈 (LIVE)
- **Shows:** Today only
- **Source:** Real-time query
- **Test:** Create new chat → refresh page → number increases ✓

### Card 3: Satisfaction Rate 👍
- **Shows:** % positive feedback
- **Color:** Green if ≥80%, Yellow if <80%
- **Test:** Give feedback → refresh data → rate updates

### Card 4: Avg Messages per Chat 📊
- **Shows:** Average conversation length
- **Typical:** 3-6 messages
- **Test:** Number is reasonable

---

## 📈 Step 4: Chat Volume Chart

### What to Observe
- **Title:** "Chat Volume (Last 7 Days)"
- **Bars:** 7 blue bars (one per day)
- **Hover:** Shows date + count

### Test Actions
1. Hover over bars → tooltip appears
2. Resize window → chart adjusts
3. Check today's bar (might be lower - partial day)

---

## ❓ Step 5: Most Asked Questions

### Visual
```
1. how do i reset password          25×
2. what are your hours              18×
3. can i change my order            15×
```

### Test Checks
- [ ] Questions are relevant
- [ ] Counts are accurate
- [ ] Top question has highest count
- [ ] Empty state if no data

---

## ⚠️ Step 6: Knowledge Gaps

### Visual
```
1. how do i cancel subscription      3× 👎
   "Not helpful, unclear steps"
```

### Test Checks
- [ ] Orange/yellow background
- [ ] Shows negative feedback questions
- [ ] Example comments displayed
- [ ] Suggestion text at bottom

---

## 🔄 Step 7: Manual Refresh Test

### Steps
1. Click "Refresh" button in banner
2. Observe immediate changes
3. Wait 1-2 minutes
4. Check final state

### Expected Flow

**Immediate (0-2s):**
- Button shows spinner
- Banner turns blue
- Toast: "Refresh Started"

**During (1-2 min):**
- Blue banner remains
- Button disabled
- Page still usable

**After (2 min):**
- Banner turns green
- Metrics update
- Toast: "Data Refreshed"

### Behind the Scenes

**Terminal logs (Dev mode):**
```
[Analytics] Using Next.js API route
[Manual Trigger API] Request received
[Manual Trigger API] Processing 1 day(s)...
[Manual Trigger API] ✓ 2025-01-24: 15 chats
```

**Firestore changes:**
```
1. stores/{storeId}/chatAnalytics.lastStatus = 'IN_PROGRESS'
2. chatAnalytics/{tId}_{storeId}_2025-01-24 created
3. stores/{storeId}/chatAnalytics.lastStatus = 'SUCCESS'
```

---

## 🧪 Step 8: Data Accuracy Tests

### Test A: Today's Chats (Live)
```
1. Note current number: 12
2. Create new chat in chat interface
3. Return to Overview
4. Press F5
5. Number should be: 13 ✓
```

### Test B: Satisfaction Rate
```
1. Note current rate: 85%
2. Give positive feedback in conversation
3. Click "Refresh" button
4. Wait 2 minutes
5. Rate should increase ✓
```

### Test C: Store Isolation
```
Store A: 50 chats
Store B: 30 chats
Should NEVER show: 80 chats (mixed data)
```

---

## 🎨 Step 9: Responsive Design

### Desktop (1920px)
- 4 cards in one row
- Chart full width
- Questions + Gaps side-by-side

### Tablet (768px)
- 2 cards per row
- Chart stacks
- Questions + Gaps stack

### Mobile (375px)
- 1 card per row
- Everything vertical
- Scrollable

**Test:** DevTools (F12) → Device Toolbar (Ctrl+Shift+M)

---

## 🐛 Step 10: Error Scenarios

### Scenario A: No Historical Data
- **Banner:** Yellow
- **Metrics:** Only today's data
- **Action:** Click Refresh → creates first aggregation

### Scenario B: Aggregation Failed
- **Banner:** Red with error
- **Action:** Click Retry → check terminal logs

### Scenario C: Already Running
- **Action:** Click Refresh twice quickly
- **Expected:** "Already in progress" message

---

## ✅ Success Checklist

### Core
- [ ] Page loads without errors
- [ ] All sections render
- [ ] Loading states work
- [ ] No console errors

### Banner
- [ ] Shows correct status color
- [ ] Hours accurate
- [ ] Refresh button works
- [ ] Transitions smooth

### Metrics
- [ ] All 4 cards show data
- [ ] Today's Chats is live
- [ ] Satisfaction Rate correct
- [ ] Numbers are reasonable

### Chart & Lists
- [ ] Chart renders
- [ ] Questions show
- [ ] Gaps show
- [ ] Hover works

### Refresh
- [ ] Button clickable
- [ ] Spinner shows
- [ ] Banner updates
- [ ] Data refreshes

### Console Logs
- [ ] `[Analytics] Using Next.js API route` visible
- [ ] No errors
- [ ] Network 200 OK

### Terminal (Dev)
- [ ] API logs show
- [ ] Processing progress
- [ ] Success message

---

## 🆘 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| All metrics 0 | No chat data | Create test chats |
| Today's Chats 0 | Created yesterday | Create new chat today |
| Banner yellow | No aggregation | Click Refresh |
| Refresh fails | Wrong feature flag | Check `src/config/features.ts` |
| Network error | Firebase issue | Check auth session |
| Mixed store data | Missing sId filter | Check database queries |

---

## 📝 What to Report

If you find issues, report:

1. **Which step** failed
2. **Expected** behavior
3. **Actual** behavior
4. **Console errors** (F12)
5. **Terminal logs** (if dev mode)
6. **Screenshot** (if visual issue)

---

**Next:** [02-conversations-tab.md](./02-conversations-tab.md)
