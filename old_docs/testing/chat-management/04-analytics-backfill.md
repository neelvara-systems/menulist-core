# 🧪 Testing Guide: Analytics Backfill (Admin Only)

**Feature:** Analytics Backfill
**Location:** `/platform/admin/analytics-backfill`
**Last Updated:** 2025-01-25
**Test Type:** Feature Flow Testing (Screen-by-Screen)
**Access Level:** Owner Only

---

## 📋 Quick Start

### Prerequisites
- ✅ Logged in as **Owner** role (admin and below will be blocked)
- ✅ Valid tenant and store session
- ✅ Existing chat data in Firestore for the store
- ✅ Firebase Functions deployed
- ✅ Development: Server running (`npm run dev`)

### Expected Duration
- Full testing: 10-15 minutes
- Quick smoke test: 3-5 minutes

### When to Use This Feature
- **Initial Setup**: First-time analytics setup for a store with existing chat history
- **Data Recovery**: Multiple days of failed aggregations need re-processing
- **Store Migration**: Adding a new store with historical chat data

---

## 📍 Step 1: Access Control Verification

### 1.1 Test Owner Access

**Test action:**
1. Log in as **Owner** role
2. Navigate to `/platform/admin/analytics-backfill`

**Expected result:**
- ✅ Page loads successfully
- ✅ Shows "Analytics Backfill" heading with database icon
- ✅ All UI elements visible (store info, configuration, warnings)

**Behind the scenes:**
```typescript
// File: src/components/templates/platform/admin/AnalyticsBackfill.tsx
const isOwner = loggedInSession?.role?.toLowerCase() === 'owner';

if (!isOwner) {
    // Show access denied alert
}
```

### 1.2 Test Non-Owner Access

**Test action:**
1. Log in as **Admin** or **User** role
2. Navigate to `/platform/admin/analytics-backfill`

**Expected result:**
- ✅ Shows red "Access Denied" alert
- ✅ Message: "Only owners can access this page"
- ✅ "Go Back" button visible
- ✅ No sensitive UI elements shown (configuration, backfill button hidden)

**Test checks:**
- [ ] Owner can access the page
- [ ] Admin gets access denied
- [ ] User gets access denied
- [ ] "Go Back" button works

---

## 📍 Step 2: Store Information Display

### 2.1 Verify Store Details

**Visual:**
```
┌─────────────────────────────────┐
│ Store Information               │
├─────────────────────────────────┤
│ Tenant ID:    [123]             │
│ Store ID:     [456]             │
│ Store Name:   My Restaurant     │
│ User Role:    [Owner]           │
└─────────────────────────────────┘
```

**What to observe:**
- Card titled "Store Information"
- Four fields in 2-column layout
- Tenant ID and Store ID displayed as `code` style
- Store Name from context (not session)
- User Role shown as gold tag

**Behind the scenes:**
```typescript
// Gets session data
const loggedInSession = useClientAuthSession();
const { storeDetails } = useContext(PlatformGlobalDataContext);

// Display
<Descriptions.Item label="Tenant ID">
    <Text code>{loggedInSession?.tId}</Text>
</Descriptions.Item>
<Descriptions.Item label="Store Name">
    {storeDetails?.name || 'N/A'}
</Descriptions.Item>
```

**Test checks:**
- [ ] Tenant ID matches current session
- [ ] Store ID matches current session
- [ ] Store Name displays correctly
- [ ] Owner role badge shows with gold color

---

## 📍 Step 3: Warning Alerts Review

### 3.1 Important Information Alert

**Visual:**
```
⚠️ Important Information
├─ This operation is expensive - reads all chat sessions
├─ Processing time: ~1-2 seconds per day
├─ Idempotent - existing days skipped automatically
├─ Only use for initial setup or data recovery
└─ For daily updates, use Refresh button in dashboard
```

**What to observe:**
- Yellow warning alert with triangle icon
- Bulleted list with 5 key points
- Mentions cost, time, idempotency, use cases
- References alternative (Refresh button)

**Test action:**
Read and understand the warnings before proceeding

**Test checks:**
- [ ] Warning alert visible
- [ ] All 5 bullet points present
- [ ] Clear messaging about cost and time
- [ ] Mentions idempotent behavior

---

## 📍 Step 4: Configuration Section

### 4.1 Days Input Configuration

**Visual:**
```
┌─────────────────────────────────┐
│ Backfill Configuration          │
├─────────────────────────────────┤
│ Number of Days to Backfill      │
│ [30] days                       │
│ Recommended: 30 days for setup  │
│                                 │
│ ⏱ Estimated time: 45 seconds    │
│ 💾 Will process: 30 days        │
│                                 │
│ [Start Backfill] ← Large button │
└─────────────────────────────────┘
```

**What to observe:**
- Input field for days (default: 30)
- Min: 1, Max: 90
- Displays as "X days" with unit suffix
- Helper text recommends 30 days
- Estimated time calculation (days × 1.5 seconds)
- Large primary button "Start Backfill"

**Behind the scenes:**
```typescript
// State
const [days, setDays] = useState<number>(30);

// Calculation
<Text type="secondary">
    Estimated time: {Math.ceil(days * 1.5)} seconds
</Text>

// Input
<InputNumber
    min={1}
    max={90}
    value={days}
    onChange={(value) => setDays(value || 30)}
    disabled={isProcessing}
    addonAfter="days"
/>
```

**Test action:**
1. Try changing days to 1
2. Try changing to 90
3. Try entering 100 (should clamp to 90)
4. Try entering 0 (should default to 30)
5. Set back to 30

**Expected result:**
- ✅ Input accepts 1-90 range
- ✅ Values outside range are clamped/defaulted
- ✅ Estimated time updates dynamically
- ✅ "Will process: X days" updates
- ✅ Button disabled when processing

**Test checks:**
- [ ] Default value is 30
- [ ] Min value enforced (1)
- [ ] Max value enforced (90)
- [ ] Estimated time calculation correct
- [ ] Input disabled during processing

---

## 📍 Step 5: Start Backfill Process

### 5.1 Click Start Backfill Button

**Test action:**
1. Set days to a small number (e.g., 3)
2. Click "Start Backfill" button

**Expected result:**
- ✅ Confirmation modal appears
- ✅ Modal title: "Confirm Analytics Backfill"
- ✅ Warning icon (triangle) displayed
- ✅ Shows number of days to process
- ✅ Lists 4 bullet points explaining what will happen
- ✅ Shows Tenant ID and Store ID
- ✅ Warning message at bottom: "⚠️ This is an expensive operation"
- ✅ Two buttons: "Start Backfill" (primary) and "Cancel"

**Visual:**
```
┌─────────────────────────────────────────┐
│ ⚠️  Confirm Analytics Backfill          │
├─────────────────────────────────────────┤
│ You are about to backfill 3 days of    │
│ analytics data.                         │
│                                         │
│ This operation will:                    │
│ • Read all chat sessions for 3 days    │
│ • Take approximately 5 seconds          │
│ • Skip days with existing data         │
│ • Process Tenant: 123, Store: 456      │
│                                         │
│ ⚠️ Expensive operation. Continue only   │
│    if necessary.                        │
│                                         │
│        [Cancel]  [Start Backfill]       │
└─────────────────────────────────────────┘
```

**Behind the scenes:**
```typescript
// Confirmation function
const handleBackfillConfirmation = () => {
    Modal.confirm({
        title: 'Confirm Analytics Backfill',
        icon: <LuAlertTriangle />,
        content: (/* Details about operation */),
        onOk: handleBackfill,
    });
};
```

**Test checks:**
- [ ] Confirmation modal appears when button clicked
- [ ] Days count shown correctly in modal
- [ ] Estimated time calculated correctly
- [ ] Tenant ID and Store ID displayed
- [ ] Warning message present
- [ ] Cancel button works (closes modal, no action)
- [ ] Start Backfill button starts the process

### 5.2 Confirm and Start Processing

**Test action:**
1. In confirmation modal, click "Start Backfill" button

**Expected result:**
- ✅ Modal closes
- ✅ Main button shows "Processing..." with loading spinner
- ✅ Button becomes disabled
- ✅ Input field becomes disabled
- ✅ Progress bar appears below configuration
- ✅ Progress bar shows 0% initially

**Behind the scenes:**
```typescript
// After confirmation accepted
const handleBackfill = async () => {
    setIsProcessing(true);
    setResults([]);
    setSummary(null);
    setProgress(0);
    dispatch(startLoader('Processing backfill...'));
    
    const result = await backfillAggregates(
        String(loggedInSession.tId),
        String(loggedInSession.sId),
        days
    );
    
    // Process results...
};

// Service layer
// File: src/services/chatAnalytics/index.ts
export const backfillAggregates = async (
    tenantId: string,
    storeId: string,
    days: number = 30
)
```

**API Route (Development):**
```
POST /api/analytics/backfill
Body: { tenantId, storeId, days }

// File: src/app/api/analytics/backfill/route.ts
```

**Console logs to expect:**
```
[Analytics] Using Next.js API route for backfill
[Backfill API] Request received
[Backfill API] Starting backfill for tenant 123, store 456, 3 days
[Backfill API] Processing 2025-01-24...
[Backfill API] ✓ 2025-01-24: 15 chats aggregated
[Backfill API] Processing 2025-01-23...
[Backfill API] - 2025-01-23: No chats
[Backfill API] Processing 2025-01-22...
[Backfill API] ✓ 2025-01-22: Already exists. Skipping.
[Backfill API] Completed: 3 days processed
```

**Test checks:**
- [ ] Confirmation modal appears first
- [ ] Cancel button closes modal without action
- [ ] Confirm button starts processing
- [ ] Button changes to "Processing..."
- [ ] All inputs disabled during processing
- [ ] Progress bar appears
- [ ] Console shows API route logs
- [ ] No errors in console

### 5.3 Test Cancel Action

**Test action:**
1. Set days to any value
2. Click "Start Backfill" button
3. In confirmation modal, click "Cancel"

**Expected result:**
- ✅ Modal closes
- ✅ No processing starts
- ✅ Button remains enabled with "Start Backfill" text
- ✅ Input fields remain enabled
- ✅ No API calls made
- ✅ No loader dispatched

**Test checks:**
- [ ] Cancel button stops the action
- [ ] UI state unchanged after cancel
- [ ] Can click button again after canceling

---

## 📍 Step 6: Progress Monitoring

### 6.1 Watch Progress Bar

**Visual:**
```
┌─────────────────────────────────┐
│ [████████████░░░░░░░] 66%       │
│ Processing historical data...   │
│ This may take a few minutes.    │
└─────────────────────────────────┘
```

**What to observe:**
- Animated progress bar (blue to green gradient)
- Progress updates as days are processed
- Status text below bar
- Bar reaches 100% when complete

**Behind the scenes:**
```typescript
// Progress tracked internally
setProgress(100); // Set after API completes

// Display
<Progress 
    percent={progress} 
    status={progress === 100 ? 'success' : 'active'}
    strokeColor={{
        '0%': '#108ee9',
        '100%': '#87d068',
    }}
/>
```

**Expected behavior:**
- Progress bar animates smoothly
- Completes when API returns
- Turns green on success

**Test checks:**
- [ ] Progress bar visible during processing
- [ ] Bar reaches 100% on completion
- [ ] Status text updates appropriately
- [ ] Green color on success

---

## 📍 Step 7: Results Summary Display

### 7.1 Summary Statistics

**Visual:**
```
┌─────────────────────────────────┐
│ Backfill Summary                │
├─────────────────────────────────┤
│ 💾 Total Days:     3            │
│ ✅ Success:        2 (green)    │
│ ⏭️  Skipped:       1 (gray)     │
│ ❌ Errors:         0 (gray)     │
└─────────────────────────────────┘
```

**What to observe:**
- Card with "Backfill Summary" title
- 4 statistic cards in a row
- Icons for each metric
- Color-coded values:
  - Success: Green (#3f8600)
  - Skipped: Gray
  - Errors: Red (if > 0)

**Behind the scenes:**
```typescript
// Calculate summary
const successCount = result.results.filter(r => r.status === 'success').length;
const skippedCount = result.results.filter(r => r.status === 'skipped').length;
const errorCount = result.results.filter(r => r.status === 'error').length;

setSummary({
    total: result.results.length,
    success: successCount,
    skipped: skippedCount,
    errors: errorCount,
});
```

**Expected result:**
- ✅ Total matches days configured
- ✅ Success + Skipped + Errors = Total
- ✅ Each statistic has appropriate icon
- ✅ Colors match status severity

**Test checks:**
- [ ] Summary card appears after completion
- [ ] Total days correct
- [ ] Success count accurate
- [ ] Skipped count accurate
- [ ] Error count accurate (should be 0 in happy path)

---

## 📍 Step 8: Detailed Results Table

### 8.1 Results Table Display

**Visual:**
```
┌─────────────────────────────────────────────────┐
│ Detailed Results                                │
├──────────────┬──────────┬────────┬──────────────┤
│ Date         │ Status   │ Chats  │ Details      │
├──────────────┼──────────┼────────┼──────────────┤
│ 2025-01-24   │ ✅Success│  15    │ Aggregated   │
│ 2025-01-23   │ ⏭️Skipped│   -    │ Already ex.  │
│ 2025-01-22   │ ✅Success│   8    │ Aggregated   │
└──────────────┴──────────┴────────┴──────────────┘
```

**What to observe:**
- Table with 4 columns
- Sortable date column
- Status with color-coded tags:
  - Success: Green tag with checkmark
  - Skipped: Gray tag with skip icon
  - Error: Red tag with X icon
- Chats column shows count or "-"
- Details column explains outcome
- Pagination at bottom (10 per page)
- Filter dropdown for status

**Behind the scenes:**
```typescript
// Results array from API
const results = [
    { date: '2025-01-24', status: 'success', chats: 15 },
    { date: '2025-01-23', status: 'skipped', chats: 0 },
    { date: '2025-01-22', status: 'success', chats: 8 }
];

// Table columns
const columns = [
    { title: 'Date', dataIndex: 'date', sorter: true },
    { title: 'Status', dataIndex: 'status', render: renderStatusTag, filters: [...] },
    { title: 'Chats', dataIndex: 'chats' },
    { title: 'Details', dataIndex: 'error', render: renderDetails }
];
```

**Test action:**
1. Click "Date" header to sort
2. Use "Status" filter dropdown
3. Check pagination (if > 10 results)

**Expected result:**
- ✅ Table shows all processed days
- ✅ Sorting works on date column
- ✅ Filtering works on status
- ✅ Pagination appears if needed
- ✅ Each row shows accurate data

**Test checks:**
- [ ] All days appear in table
- [ ] Status tags color-coded correctly
- [ ] Chat counts accurate
- [ ] Details messages appropriate
- [ ] Sorting works
- [ ] Filtering works
- [ ] Pagination functional (if > 10 rows)

---

## 📍 Step 9: Success Notifications

### 9.1 Success Case (No Errors)

**Expected notification:**
```
✅ Backfill Complete
Successfully processed 2 days, skipped 1 days (already existed).
```

**Behind the scenes:**
```typescript
if (errorCount === 0) {
    notification.success({
        message: 'Backfill Complete',
        description: `Successfully processed ${successCount} days, skipped ${skippedCount} days.`,
        duration: 8,
    });
}
```

### 9.2 Partial Success Case (With Errors)

**Expected notification:**
```
⚠️ Backfill Completed with Errors
2 succeeded, 0 skipped, 1 failed.
```

**Behind the scenes:**
```typescript
if (errorCount > 0) {
    notification.warning({
        message: 'Backfill Completed with Errors',
        description: `${successCount} succeeded, ${skippedCount} skipped, ${errorCount} failed.`,
        duration: 8,
    });
}
```

**Test checks:**
- [ ] Success notification shows when no errors
- [ ] Warning notification shows when errors exist
- [ ] Notification includes accurate counts
- [ ] Notification auto-dismisses after 8 seconds

---

## 📍 Step 10: Error Handling

### 10.1 Test Network Failure

**Test action:**
1. Disconnect network
2. Click "Start Backfill"

**Expected result:**
- ✅ Error notification appears
- ✅ Message: "Backfill Failed"
- ✅ Description shows error message
- ✅ Button re-enables
- ✅ Progress resets to 0

**Behind the scenes:**
```typescript
catch (error: any) {
    notification.error({
        message: 'Backfill Failed',
        description: error.message || 'An error occurred...',
        duration: 10,
    });
    setProgress(0);
} finally {
    setIsProcessing(false);
    dispatch(stopLoader('Processing backfill...'));
}
```

### 10.2 Test Invalid Session

**Test action:**
1. Clear session/cookies
2. Reload page
3. Try to start backfill

**Expected result:**
- ✅ 401 Unauthorized error
- ✅ Error notification appears
- ✅ Message explains session issue

**Test checks:**
- [ ] Network errors handled gracefully
- [ ] UI resets after error
- [ ] Error message displayed to user
- [ ] Button re-enables after error
- [ ] Can retry after fixing issue

---

## 📍 Step 11: Data Verification

### 11.1 Verify Firestore Documents

**Test action:**
1. After successful backfill
2. Open Firestore console
3. Navigate to `chatAnalytics` collection
4. Check for documents with format: `{tId}_{sId}_{YYYY-MM-DD}`

**Expected result:**
- ✅ New documents exist for processed days
- ✅ Document IDs follow format: `123_456_2025-01-24`
- ✅ Documents contain:
  - `tId`, `sId`, `date`
  - `totalChats`, `satisfactionRate`, etc.
  - `createdOn`, `modifiedOn` timestamps

**Firestore structure:**
```
chatAnalytics/
  └─ 123_456_2025-01-24/
      ├─ tId: "123"
      ├─ sId: "456"
      ├─ date: "2025-01-24"
      ├─ totalChats: 15
      ├─ satisfactionRate: 0.87
      ├─ createdOn: Timestamp
      └─ modifiedOn: Timestamp
```

### 11.2 Verify Store Metadata (Not Updated)

**Important:** `backfillAggregates` does NOT update store metadata. Only `triggerManualAggregation` updates:
- `stores/{storeId}/chatAnalytics.lastSuccessfulRun`
- `stores/{storeId}/chatAnalytics.lastStatus`

**Test checks:**
- [ ] chatAnalytics documents created
- [ ] Document IDs correct format
- [ ] All statistics present in documents
- [ ] Store metadata NOT modified (expected behavior)

---

## 📍 Step 12: Idempotency Test

### 12.1 Test Re-running Same Days

**Test action:**
1. Complete a backfill for 3 days
2. Immediately run backfill again for same 3 days

**Expected result:**
- ✅ All 3 days show "Skipped" status
- ✅ Details: "Already exists"
- ✅ Chats count shows as "-"
- ✅ No errors occur
- ✅ Existing documents unchanged in Firestore

**Behind the scenes:**
```typescript
// API checks for existing documents
const docId = `${tId}_${storeId}_${dateStr}`;
const existingDoc = await db.collection('chatAnalytics').doc(docId).get();

if (existingDoc.exists) {
    console.log(`Already exists. Skipping.`);
    results.daysSkipped++;
    continue;
}
```

**Test checks:**
- [ ] Re-running same days skips all
- [ ] No duplicate documents created
- [ ] Skipped status shown correctly
- [ ] No errors from re-running
- [ ] Performance still fast (no processing)

---

## 📍 Step 13: Responsive Design

### 13.1 Test Different Screen Sizes

**Desktop (1920x1080):**
- Store info: 2 columns
- Configuration: 3 columns (input, stats, button)
- Summary: 4 columns (all stats in row)
- Table: Full width

**Tablet (768x1024):**
- Store info: 2 columns
- Configuration: 2 columns (button moves down)
- Summary: 2 columns per row (2×2 grid)
- Table: Scrollable horizontally if needed

**Mobile (375x667):**
- Store info: 1 column (stacked)
- Configuration: 1 column (all stacked)
- Summary: 2 columns per row (2×2 grid)
- Table: Scrollable horizontally

**Test checks:**
- [ ] Layout adapts on desktop
- [ ] Layout adapts on tablet
- [ ] Layout adapts on mobile
- [ ] No horizontal scroll on mobile (except table)
- [ ] Buttons remain accessible
- [ ] Text readable on all sizes

---

## 📍 Step 14: Help Information

### 14.1 Initial State Help

**Visual (before any backfill):**
```
ℹ️ Need Help?

When to use this tool:
• Setting up analytics for first time with existing history
• Recovering from multiple days of failed aggregations
• Migrating data when adding a new store

What happens: The system reads all chat sessions for each day,
calculates statistics, and stores them in chatAnalytics collection.
Days that already have aggregates are automatically skipped.
```

**What to observe:**
- Blue info alert
- Two sections: "When to use" and "What happens"
- Clear explanation of purpose
- Mentions automatic skipping (idempotent)

**Test checks:**
- [ ] Help section visible initially
- [ ] Clear use cases listed
- [ ] Explains what happens during backfill
- [ ] Mentions idempotency

---

## ✅ Success Checklist

### Core Functionality
- [ ] Owner can access page
- [ ] Non-owners blocked with clear message
- [ ] Store information displays correctly
- [ ] Warning alerts visible and informative
- [ ] Days input works (1-90 range)
- [ ] Estimated time calculates correctly
- [ ] "Start Backfill" button shows confirmation modal
- [ ] Confirmation modal displays all required information
- [ ] Cancel button in modal works correctly
- [ ] Confirm button starts backfill process

### Processing & Results
- [ ] Progress bar shows during processing
- [ ] Summary statistics accurate
- [ ] Results table shows all days
- [ ] Status tags color-coded correctly
- [ ] Success notification on completion
- [ ] Warning notification if errors exist

### Data Integrity
- [ ] Firestore documents created correctly
- [ ] Document IDs follow format: `{tId}_{sId}_{date}`
- [ ] All statistics present in documents
- [ ] Idempotency works (re-run skips existing)
- [ ] No duplicate documents created

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Invalid session errors handled
- [ ] UI resets after errors
- [ ] Can retry after failure
- [ ] Error messages clear and helpful

### UX & Design
- [ ] Responsive on desktop, tablet, mobile
- [ ] All icons display correctly (Lucide)
- [ ] Loading states work properly
- [ ] Notifications dismiss automatically
- [ ] Help information useful

---

## 🆘 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Access Denied" for owner | Role check failing | Verify `loggedInSession.role` is lowercase 'owner' |
| "Tenant ID not found" | Session not loaded | Ensure logged in and session active |
| All days show "Skipped" | Ran backfill before | Expected behavior - documents already exist |
| API returns 404 | Wrong route or env | Check feature flag `USE_NEXTJS_ANALYTICS_ROUTES` |
| Progress stays at 0% | API not responding | Check console for errors, verify server running |
| No chat data aggregated | Store has no chats | Expected - table will show 0 chats |
| 401 Unauthorized | Session expired | Re-login and try again |
| Button stays disabled | Processing state stuck | Refresh page to reset state |
| Confirmation modal doesn't appear | Modal import issue | Check Modal is imported from 'antd' |
| Modal appears but no content | Content not rendering | Check console for React errors |

---

## 📝 What to Report

If you find issues, report:

### 1. Access Issues
- Your role (owner/admin/user)
- Whether page loaded or showed error
- Screenshot of access denied message

### 2. Processing Issues
- Number of days configured
- Error message (from notification or console)
- Console logs (filter for `[Backfill API]`)
- Network tab errors

### 3. Data Issues
- Firestore screenshot showing documents
- Document IDs that were created
- Expected vs actual statistics in documents
- Whether re-running caused duplicates

### 4. UI Issues
- Browser and version
- Screen size (desktop/tablet/mobile)
- Screenshot showing the problem
- Steps to reproduce

### 5. Performance Issues
- Number of days processed
- Actual time taken vs estimated
- Whether process hung or timed out
- Console performance logs

---

## 🔗 Related Documentation

- [Overview Tab Testing Guide](./01-overview-tab.md) - Manual refresh button (uses `triggerManualAggregation`)
- [Analytics Tab Testing Guide](./03-analytics-tab.md) - Viewing aggregated data
- [API Documentation](../../api/analytics-backfill.md) - Backend implementation details
- [Feature Documentation](../../features/ANALYTICS_BACKFILL.md) - When and why to use backfill

---

## 🔧 Technical Details

### Functions Used
```typescript
// Service: src/services/chatAnalytics/index.ts
backfillAggregates(tenantId, storeId, days)

// API Route: src/app/api/analytics/backfill/route.ts
POST /api/analytics/backfill

// Component: src/components/templates/platform/admin/AnalyticsBackfill.tsx
```

### Difference from triggerManualAggregation

| Feature | `backfillAggregates` | `triggerManualAggregation` |
|---------|---------------------|---------------------------|
| **Days Range** | 1-90 | 1-7 |
| **UI Location** | Admin page | Dashboard refresh button |
| **Updates Store Metadata** | ❌ No | ✅ Yes |
| **Use Case** | Historical backfill | Daily refresh |
| **Access** | Owner only | Owner + Admin |
| **Duplicate Prevention** | ❌ No (skips existing) | ✅ Yes (checks IN_PROGRESS) |

---

**Next:** Return to [Chat Management Testing Index](../README.md)
