# 🧪 Testing Guide: Conversations Tab

**Feature:** Chat Management Dashboard - Conversations Tab  
**Location:** `/platform/chat-management` → Conversations Tab  
**Last Updated:** January 24, 2025

---

## 📋 Quick Start

### Prerequisites
- ✅ Dev server running: `npm run dev`
- ✅ Logged in as owner/admin
- ✅ At least 1 store configured
- ✅ Some chat conversations exist (create a few via chat interface)

### Expected Duration
- Full testing: 20-25 minutes
- Quick smoke test: 5 minutes

---

## 📍 Step 1: Navigate to Conversations

### URL
```
http://localhost:3000/platform/chat-management
```

### What You'll See
```
┌────────────────────────────────────────────────┐
│ Chat Management                                 │
├────────────────────────────────────────────────┤
│ [Overview] [Conversations] [Analytics]         │
├────────────────────────────────────────────────┤
│ 🔍 Filters Card                                │
│ [Search] [Mode] [Feedback] [Date] [Export]    │
├────────────────────────────────────────────────┤
│ 📋 Conversations Table                         │
│ [Conversation] [User] [Mode] [Feedback] [Date] │
│ [View Details buttons for each row]           │
└────────────────────────────────────────────────┘
```

### Initial Checks
- [ ] Click on "Conversations" tab
- [ ] Page loads without errors
- [ ] No console errors (F12)
- [ ] Filters card appears
- [ ] Table shows conversations (if data exists)
- [ ] Loading spinner appears briefly during fetch

### Behind the Scenes
```typescript
// Component:
/src/components/templates/platform/chatManagement/ConversationsList.tsx

// Function call:
getConversationsPaginated(loggedInSession, 20, filters)

// Firestore query:
chatSessions
  .where('tId', '==', tenantId)
  .where('sId', '==', storeId)
  .orderBy('modifiedOn', 'desc')
  .limit(20)

// Console log:
[Expected] No errors
```

---

## 🔍 Step 2: Test Search Filter

### What to Test
**Search box** allows searching in:
- Conversation titles
- Message content

### Test Actions

#### Test 2.1: Search by Title
```
1. Type "password" in search box
2. Press Enter (or wait for debounce)
3. Verify: Only conversations with "password" in title show
4. Clear search (X button)
5. Verify: All conversations return
```

#### Test 2.2: Search by Message Content
```
1. Type "how do i" in search box
2. Press Enter
3. Verify: Conversations containing this phrase in messages appear
4. Check: Search is case-insensitive ✓
```

#### Test 2.3: No Results
```
1. Type "zzzznonexistent"
2. Verify: Table shows "No conversations found" empty state
3. Verify: Empty icon displayed
```

### Behind the Scenes
```typescript
// Client-side filtering:
const filteredSessions = sessions.filter(session => {
    const searchLower = searchQuery.toLowerCase();
    if (session.title?.toLowerCase().includes(searchLower)) return true;
    return session.messages.some(msg => {
        const content = msg.content || msg.craftedAnswer || '';
        return content.toLowerCase().includes(searchLower);
    });
});
```

---

## 🎯 Step 3: Test Mode Filter

### Available Options
```
[All Modes] (default)
[QnA Mode]
[Assistant Mode]
```

### Test Actions

#### Test 3.1: Filter by QnA Mode
```
1. Select "QnA Mode" from dropdown
2. Observe: Page reloads
3. Verify: All rows show blue "QnA" tag
4. Verify: No "Assistant" mode conversations visible
```

#### Test 3.2: Filter by Assistant Mode
```
1. Select "Assistant Mode" from dropdown
2. Observe: Page reloads
3. Verify: All rows show cyan "Assistant" tag with ✨ icon
4. Verify: No "QnA" conversations visible
```

#### Test 3.3: Reset to All Modes
```
1. Select "All Modes"
2. Verify: Both QnA and Assistant conversations show
```

### Behind the Scenes
```typescript
// Filter applied in query:
if (modeFilter !== 'all') {
    filters.mode = modeFilter; // 'qna' or 'assistant'
}

// Firestore query:
chatSessions
  .where('mode', '==', 'qna') // or 'assistant'
  .where('tId', '==', tenantId)
  .where('sId', '==', storeId)
```

---

## 👍 Step 4: Test Feedback Filter

### Available Options
```
[All Feedback] (default)
[Positive] - Shows conversations with 👍 feedback
[Negative] - Shows conversations with 👎 feedback
[No Feedback] - Shows conversations with no feedback
```

### Test Actions

#### Test 4.1: Filter Positive Feedback
```
1. Select "Positive" from feedback dropdown
2. Verify: Only conversations with green thumbs-up tags show
3. Check: Feedback column shows positive count
```

#### Test 4.2: Filter Negative Feedback
```
1. Select "Negative"
2. Verify: Only conversations with red thumbs-down tags show
3. Check: These are knowledge gaps/problem areas
```

#### Test 4.3: Filter No Feedback
```
1. Select "No Feedback"
2. Verify: Only rows showing "No feedback" text appear
3. Use case: Find conversations needing feedback
```

### Behind the Scenes
```typescript
// Client-side filtering (post-query):
if (feedbackFilter === 'positive') {
    filteredSessions = fetchedSessions.filter(session => 
        (session.messages || []).some(msg => msg.feedback?.isGood === true)
    );
} else if (feedbackFilter === 'negative') {
    filteredSessions = fetchedSessions.filter(session => 
        (session.messages || []).some(msg => msg.feedback?.isGood === false)
    );
} else if (feedbackFilter === 'none') {
    filteredSessions = fetchedSessions.filter(session => 
        !(session.messages || []).some(msg => msg.feedback)
    );
}

// Note: Feedback filter is client-side (not Firestore query)
```

---

## 📅 Step 5: Test Date Range Filter

### What to Test
Date picker allows filtering conversations by creation date range.

### Test Actions

#### Test 5.1: Select Last 7 Days
```
1. Click date range picker
2. Select: [7 days ago] to [Today]
3. Verify: Only conversations from last week show
4. Check: Older conversations are hidden
```

#### Test 5.2: Select Custom Range
```
1. Open date picker
2. Select: [Jan 1, 2025] to [Jan 10, 2025]
3. Verify: Only conversations in this range appear
4. Check: Date column matches selected range
```

#### Test 5.3: Clear Date Filter
```
1. Click X to clear date range
2. Verify: All conversations return (no date filter)
```

### Behind the Scenes
```typescript
// Filter applied in query:
if (dateRange && dateRange[0] && dateRange[1]) {
    filters.dateRange = {
        start: dateRange[0].toDate(),
        end: dateRange[1].toDate()
    };
}

// Firestore query:
chatSessions
  .where('createdOn', '>=', startDate)
  .where('createdOn', '<=', endDate)
  .where('tId', '==', tenantId)
  .where('sId', '==', storeId)
```

---

## 📊 Step 6: Test Table Display

### Table Columns
```
| Conversation | User | Mode | Feedback | Date | Actions |
```

### What to Verify

#### Test 6.1: Conversation Column
```
Shows:
- Title (or "Untitled Chat")
- Message count below ("5 messages")

Verify:
- [ ] Title is bold
- [ ] Message count is gray/secondary
- [ ] Text is readable
```

#### Test 6.2: User Column
```
Shows:
- "User {userId}" (truncated if long)

Verify:
- [ ] User ID displayed
- [ ] Text ellipsis if too long
```

#### Test 6.3: Mode Column
```
Shows:
- Blue "QnA" tag with 💬 icon
- Cyan "Assistant" tag with ✨ icon

Verify:
- [ ] Correct icon for mode
- [ ] Correct color (blue vs cyan)
```

#### Test 6.4: Feedback Column
```
Shows one of:
- Green tag "👍 3" (positive count)
- Red tag "👎 2" (negative count)
- Both tags if mixed feedback
- "No feedback" gray text

Verify:
- [ ] Icons render correctly
- [ ] Counts are accurate
- [ ] Colors match sentiment
```

#### Test 6.5: Date Column
```
Shows:
- Relative time ("2 hours ago", "3 days ago")

Verify:
- [ ] Uses DateTimeDisplay component
- [ ] Updates on page refresh
- [ ] Readable font size (12px)
```

#### Test 6.6: Actions Column
```
Shows:
- "View Details" link button

Verify:
- [ ] Button is clickable
- [ ] Hover effect works
- [ ] Opens drawer (test in Step 8)
```

---

## 📥 Step 7: Test Export CSV

### Export Button Location
```
Top-right of filters card: [Export] button with download icon
```

### Test Actions

#### Test 7.1: Export All Conversations
```
1. Reset all filters (All modes, All feedback, No date)
2. Click "Export" button
3. Verify: CSV file downloads
4. Check filename: conversations-export-YYYY-MM-DD.csv
5. Open CSV file
```

#### Test 7.2: Verify CSV Content
```
CSV should have columns:
- Conversation ID
- Title
- User ID
- Mode (QnA or Assistant)
- Messages Count
- Positive Feedback
- Negative Feedback
- Satisfaction %
- Created Date
- Modified Date

Verify:
- [ ] Headers are correct
- [ ] Data rows match table
- [ ] Special characters escaped (quotes, commas)
- [ ] Dates are formatted correctly
```

#### Test 7.3: Export Filtered Data
```
1. Apply filter: Mode = QnA, Feedback = Positive
2. Click "Export"
3. Verify: CSV only contains filtered conversations
4. Check: Count matches filtered table count
```

#### Test 7.4: Export Empty State
```
1. Search for "zzzznonexistent" (no results)
2. Click "Export"
3. Verify: Warning notification appears
4. Message: "No Data to Export"
5. No file downloaded
```

### Behind the Scenes
```typescript
// Export function:
const handleExport = () => {
    // Generate CSV rows
    const csvRows = [];
    csvRows.push('Conversation ID,Title,...'); // Header
    
    filteredSessions.forEach(session => {
        const row = [
            session.id,
            escapeCSV(session.title),
            session.mode,
            // ... other fields
        ];
        csvRows.push(row.join(','));
    });
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `conversations-export-${date}.csv`;
    link.click();
};

// Success notification:
notification.success({
    message: 'Export Successful',
    description: `Exported ${count} conversations to CSV.`
});
```

---

## 📖 Step 8: Test Conversation Details Drawer

### Opening the Drawer
```
1. Click "View Details" on any conversation row
2. Drawer slides in from right (720px width)
3. Shows full conversation details
```

### What You'll See
```
┌──────────────────────────────────────┐
│ Conversation Details            [X]  │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Title: "How do I reset password" │ │
│ │ [QnA Mode] [5 messages] [User123]│ │
│ │ Created: 2 hours ago             │ │
│ │ Feedback: 👍 2  👎 1  (67%)      │ │
│ │                    [Export] btn  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Conversation Thread:                 │
│ ┌──────────────────────────────────┐ │
│ │ 👤 User [2h ago]                 │ │
│ │ How do I reset my password?      │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ 🤖 AI Assistant [2h ago]         │ │
│ │ To reset your password...        │ │
│ │ 📚 Referenced 2 KB article(s)    │ │
│ │ 💡 Suggested: [3 questions]      │ │
│ │ ┌────────────────────────────┐   │ │
│ │ │ 👍 Positive Feedback       │   │ │
│ │ │ "Very helpful, thanks!"    │   │ │
│ │ └────────────────────────────┘   │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 📝 Internal Notes               │ │
│ │ (Team use only)                  │ │
│ │ [TextArea]                       │ │
│ │                    [Save Note]   │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Test Actions

#### Test 8.1: Verify Metadata Card
```
Check:
- [ ] Conversation title displays
- [ ] Mode tag (QnA or Assistant) shows
- [ ] Message count correct
- [ ] User ID displayed
- [ ] Created/Modified timestamps shown
- [ ] Feedback summary (if exists)
- [ ] Satisfaction % calculated correctly
- [ ] Export button present
```

#### Test 8.2: Verify Message Thread
```
For each message:
- [ ] Avatar icon (User 👤 or AI 🤖)
- [ ] Role label ("User" or "AI Assistant")
- [ ] Timestamp relative ("2h ago")
- [ ] Message content displays
- [ ] Images show (if uploaded)
- [ ] KB references count shows
- [ ] Suggested questions display (AI messages)
- [ ] Feedback cards show (if provided)
```

#### Test 8.3: Test Feedback Display
```
When message has feedback:
- [ ] Green tag "👍 Positive" OR Red tag "👎 Negative"
- [ ] User comment shows in quotes
- [ ] Improvement reasons show as tags
- [ ] Feedback timestamp displayed
- [ ] Card has gray background
```

#### Test 8.4: Test Internal Notes
```
1. Scroll to bottom of drawer
2. Find "Internal Notes" card
3. Type: "Follow up needed on password reset flow"
4. Click "Save Note" button
5. Verify: Success notification appears
6. Close drawer and reopen
7. Verify: Note persists
```

#### Test 8.5: Test Export Transcript
```
1. Click "Export" button in metadata card
2. Verify: Markdown file downloads
3. Filename: conversation-{id}-YYYY-MM-DD.md
4. Open file in text editor
5. Check content:
   - [ ] Header with metadata
   - [ ] All messages in order
   - [ ] Feedback included
   - [ ] KB references noted
   - [ ] Internal note at bottom
```

### Behind the Scenes
```typescript
// Component:
/src/components/templates/platform/chatManagement/ConversationDrawer.tsx

// Function calls:
getChatSessionById(sessionId) // Fetch full conversation
updateSessionInternalNote(sessionId, note) // Save note

// Firestore:
chatSessions/{sessionId} // Single document fetch

// Export function:
const generateTranscript = (session) => {
    const lines = [];
    lines.push(`# Chat Transcript`);
    lines.push(`**Conversation ID:** ${session.id}`);
    // ... format messages as markdown
    return lines.join('\n');
};
```

---

## 📄 Step 9: Test Pagination

### Pagination Controls
```
Bottom of table:
[< Prev]  Page 1 of 5  [Next >]
Showing 1-20 of 87 conversations
[10 | 20 | 50 | 100] per page
```

### Test Actions

#### Test 9.1: Navigate Pages
```
1. Note: Page 1 active by default
2. Click "Next" button
3. Verify: Page 2 loads, different conversations show
4. Check: URL doesn't change (client-side pagination)
5. Click "Prev" button
6. Verify: Returns to Page 1
```

#### Test 9.2: Change Page Size
```
1. Default: 20 per page
2. Select "50" from dropdown
3. Verify: More rows show (if available)
4. Check: "Showing 1-50 of 87" updates
5. Pagination controls adjust
```

#### Test 9.3: Total Count Display
```
Verify:
- [ ] "Total {count} conversations" shows correctly
- [ ] Count updates when filters applied
- [ ] Count matches actual visible rows
```

### Behind the Scenes
```typescript
// Pagination state:
const [pagination, setPagination] = useState({ 
    current: 1, 
    pageSize: 20 
});

// Table pagination:
pagination={{
    current: pagination.current,
    pageSize: pagination.pageSize,
    total: filteredSessions.length,
    showSizeChanger: true,
    onChange: (page, pageSize) => {
        setPagination({ current: page, pageSize });
    }
}}

// Note: Pagination is CLIENT-SIDE (all data loaded)
// For server-side pagination, see lastDocId cursor logic
```

---

## 🧪 Step 10: Test Edge Cases

### Test 10.1: Empty State
```
1. New store with no conversations
2. Navigate to Conversations tab
3. Verify: Empty state shows
   - [ ] Empty icon (simplified)
   - [ ] "No conversations found" message
   - [ ] No table rows
```

### Test 10.2: Loading State
```
1. Open Network tab (F12)
2. Throttle to "Slow 3G"
3. Refresh Conversations tab
4. Verify:
   - [ ] Table shows loading spinner
   - [ ] Rows are grayed/skeleton
   - [ ] Filters remain usable
```

### Test 10.3: Long Conversation Titles
```
1. Find conversation with very long title
2. Verify: Text doesn't overflow cell
3. Check: Title wraps or shows ellipsis
```

### Test 10.4: Many Messages (100+)
```
1. Open drawer for conversation with 100+ messages
2. Verify:
   - [ ] Drawer scrolls properly
   - [ ] All messages load
   - [ ] Performance is acceptable
   - [ ] No layout issues
```

### Test 10.5: Special Characters in Search
```
1. Search for: "@#$%"
2. Verify: No errors
3. Search for: "<script>alert('test')</script>"
4. Verify: Treated as literal text, no XSS
```

### Test 10.6: Concurrent Filters
```
1. Apply all filters:
   - Search: "password"
   - Mode: QnA
   - Feedback: Positive
   - Date: Last 7 days
2. Verify: All filters work together (AND logic)
3. Check: Results match ALL criteria
```

---

## ✅ Success Checklist

### Core Functionality
- [ ] Page loads without errors
- [ ] Conversations table displays
- [ ] All tabs navigate correctly
- [ ] No console errors

### Filters
- [ ] Search by title works
- [ ] Search by content works
- [ ] Mode filter (All/QnA/Assistant) works
- [ ] Feedback filter (All/Positive/Negative/None) works
- [ ] Date range picker works
- [ ] Filters can be cleared
- [ ] Multiple filters work together

### Table Display
- [ ] All columns render correctly
- [ ] Conversation titles show
- [ ] User IDs display
- [ ] Mode tags correct (blue QnA, cyan Assistant)
- [ ] Feedback counts accurate
- [ ] Dates show relative time
- [ ] "View Details" buttons work

### Export CSV
- [ ] Export button works
- [ ] CSV downloads correctly
- [ ] Filename includes date
- [ ] All columns present in CSV
- [ ] Data matches table
- [ ] Special characters escaped
- [ ] Empty state handled (warning shown)

### Conversation Drawer
- [ ] Drawer opens on "View Details"
- [ ] Metadata card shows correct info
- [ ] All messages display in order
- [ ] User/AI avatars correct
- [ ] Feedback cards render
- [ ] KB references show
- [ ] Suggested questions display
- [ ] Images show (if uploaded)
- [ ] Internal notes can be saved
- [ ] Export transcript works
- [ ] Drawer closes properly

### Pagination
- [ ] Page navigation works (Prev/Next)
- [ ] Page size selector works
- [ ] Total count displays correctly
- [ ] Pagination updates with filters

### Edge Cases
- [ ] Empty state displays correctly
- [ ] Loading state shows spinner
- [ ] Long titles handled
- [ ] Large conversations (100+ messages) work
- [ ] Special characters in search safe
- [ ] Concurrent filters work

---

## 🆘 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **Conversations not loading** | No data in Firestore | Create test conversations via chat interface |
| **"Unauthorized" error** | Not logged in as owner/admin | Login with correct role |
| **Filters not working** | JavaScript error | Check console (F12) for errors |
| **Export downloads empty CSV** | No conversations match filters | Reset filters or check data |
| **Drawer won't open** | Session ID is null | Check table data has valid IDs |
| **Internal note won't save** | Firestore permissions | Check security rules for chatSessions collection |
| **Pagination shows wrong count** | Filter mismatch | Verify filteredSessions array length |
| **Feedback not showing** | Messages lack feedback field | Add feedback via chat interface |
| **Date filter returns nothing** | Date range outside data range | Adjust date range or check conversation dates |
| **Search is slow** | Large dataset | Expected for client-side search (100+ conversations) |

---

## 📝 What to Report

If you find issues, report:

1. **Which step failed**: Step number and sub-test
2. **Expected behavior**: What should happen
3. **Actual behavior**: What actually happened
4. **Console errors**: Copy from browser console (F12)
5. **Screenshots**: Especially for UI issues
6. **Filters applied**: Which filters were active
7. **Data state**: Number of conversations, any special conditions
8. **Browser**: Chrome/Firefox/Safari version

### Example Report
```
Step: 8.4 (Internal Notes)
Expected: Note saves and persists
Actual: Save button does nothing, no notification
Console Error: 
  "Firestore permission denied: chatSessions/{id}"
Filters: None applied
Data: 15 conversations in database
Browser: Chrome 120
Screenshot: [attach]
```

---

**Next:** [03-analytics-tab.md](./03-analytics-tab.md)

**Previous:** [01-overview-tab.md](./01-overview-tab.md)