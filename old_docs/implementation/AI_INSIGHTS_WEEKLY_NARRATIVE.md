# ✅ Weekly Narrative - AI Insights Implementation

**Feature:** AI-Powered Weekly Performance Digest  
**Part of:** AI Intelligence Layer (Phase 2)  
**Status:** 🟢 Deployed via Cloud Functions  
**Last Updated:** October 29, 2025

---

## 📋 **OVERVIEW**

The Weekly Narrative feature is part of the unified AI Intelligence Layer that automatically generates executive summaries of weekly performance using Gemini 2.5 Flash.

### **What It Does:**
- Automatically analyzes last 7 days of chat analytics data
- Generates AI-powered executive summaries
- Provides key highlights and actionable recommendations
- Compares current week vs previous week
- Runs automatically every Sunday at 2 AM UTC

---

## 🏗️ **ARCHITECTURE**

### **Backend (Cloud Functions)** ✅

**Location:** `functions/src/analytics/weeklyNarrative.ts`

**Main Functions:**
```typescript
generateWeeklyNarrativeForStore(tId, sId)
  ↓
  1. Gather weekly metrics from chatAnalytics
  2. Calculate week-over-week changes
  3. Call Gemini AI for analysis
  4. Save to Firestore
  
processWeeklyNarrativeForAllStores()
  ↓
  Called by masterScheduler every Sunday
  Loops through all tenants → all stores
```

**Gemini AI Service:**
- `functions/src/services/gemini/weeklyNarrative.ts`
- Uses Gemini 2.5 Flash
- Structured prompt for consistent output
- Returns: narrative, highlights, recommendations, key metrics

**Scheduled Execution:**
- Runs via `masterScheduler` every Sunday at 2 AM UTC
- Part of coordinated AI Intelligence batch processing
- File: `functions/src/schedulers/masterScheduler.ts`

---

### **Frontend (Read-Only UI)** ✅

**Component:** `src/components/templates/platform/chatManagement/WeeklyDigest.tsx`

**What It Does:**
- Reads from Firestore: `insights/{tId}/stores/{sId}/ai/weekly`
- Displays AI-generated summary
- Shows sentiment analysis
- Provides export functionality
- Manual regeneration button

**Manual Regeneration:**
- API: `/api/analytics/weekly-narrative/regenerate`
- Calls Cloud Function: `triggerSchedulerManually()`
- Triggers fresh generation on demand

---

## 📊 **FIRESTORE STRUCTURE**

### **Collection Path:**
```
insights/{tId}/stores/{sId}/ai/weekly
```

**Document Structure:**
```typescript
{
  tId: string;
  sId: string;
  weekStart: string;        // "2025-10-21"
  weekEnd: string;          // "2025-10-27"
  narrative: string;        // Executive summary (2-3 paragraphs)
  highlights: string[];     // 3-5 key highlights
  recommendations: string[];// 3-5 action items
  keyMetrics: {
    volumeChange: number;       // % change vs previous week
    satisfactionChange: number; // % change in satisfaction
    topCategory: string;        // Most common category
  };
  generatedAt: Timestamp;
  promptVersion: string;    // "v1"
}
```

---

## 🔄 **DATA FLOW**

### **Automatic Weekly Generation:**

```
Sunday 2:00 AM UTC
  ↓
masterScheduler runs
  ↓
processWeeklyNarrativeForAllStores()
  ↓
For each tenant:
  For each store:
    1. Query chatAnalytics (last 7 days)
    2. Aggregate metrics
    3. Compare to previous week
    4. Call Gemini AI
    5. Save to insights/{tId}/stores/{sId}/ai/weekly
```

### **Frontend Display:**

```
User navigates to Weekly Digest tab
  ↓
Component fetches doc from Firestore
  ↓
insights/{tId}/stores/{sId}/ai/weekly
  ↓
Display narrative, highlights, recommendations
```

### **Manual Regeneration:**

```
User clicks "Regenerate" button
  ↓
POST /api/analytics/weekly-narrative/regenerate
  ↓
Calls httpsCallable: triggerSchedulerManually
  ↓
Cloud Function regenerates for all stores
  ↓
UI waits 3 seconds, then refreshes
```

---

## 🎨 **UI FEATURES**

### **Components:**
1. **Header** - Week range, Export & Regenerate buttons
2. **Sentiment Alert** - Color-coded performance indicator
3. **Key Metrics** - Volume change, Satisfaction change, Top category
4. **Executive Summary** - AI-generated narrative
5. **Highlights** - Key wins/concerns
6. **Recommendations** - Actionable items
7. **Footer** - Generation timestamp, AI model info

### **Sentiment Analysis:**
- **Positive** (Green): Volume +5%, Satisfaction +2%
- **Neutral** (Blue): Stable metrics
- **Concerning** (Red): Volume -10%, Satisfaction -5%

---

## 🚀 **DEPLOYMENT STATUS**

### **Cloud Functions:** ✅ Deployed

Exported in `functions/src/index.ts`:
```typescript
export { masterScheduler, triggerSchedulerManually } 
from './schedulers/masterScheduler';
```

**Deployed Functions:**
- `masterScheduler` - Automatic (Sundays 2 AM UTC)
- `triggerSchedulerManually` - Manual trigger (owner only)

### **Frontend:** ✅ Integrated

- Component: `WeeklyDigest.tsx` (in Chat Management tabs)
- API endpoint: `/api/analytics/weekly-narrative/regenerate`
- Navigation: Platform → Chat Management → Weekly Digest

---

## 🧪 **TESTING GUIDE**

### **Test Automatic Generation:**

**Note:** Runs every Sunday at 2 AM UTC

1. Wait until next Sunday 2 AM UTC
2. Navigate to Chat Management → Weekly Digest
3. Should see newly generated summary

### **Test Manual Regeneration:**

1. Navigate to Chat Management → Weekly Digest
2. Click "Regenerate" button
3. Wait 3 seconds
4. UI should refresh with new data

### **Test Empty State:**

1. For a new store with no data
2. Navigate to Weekly Digest
3. Should see: "No weekly digest available yet"
4. Message explains it runs every Sunday

---

## 📝 **FILES INVOLVED**

### **Cloud Functions:**
- `functions/src/analytics/weeklyNarrative.ts` - Main logic
- `functions/src/services/gemini/weeklyNarrative.ts` - Gemini AI
- `functions/src/schedulers/masterScheduler.ts` - Scheduler
- `functions/src/telemetry/logger.ts` - Telemetry
- `functions/src/index.ts` - Exports

### **Frontend:**
- `src/components/templates/platform/chatManagement/WeeklyDigest.tsx` - UI
- `src/app/api/analytics/weekly-narrative/regenerate/route.ts` - Manual trigger
- `src/components/templates/platform/chatManagement/index.tsx` - Tab integration

---

## 💡 **KEY BENEFITS**

1. **Automatic:** Runs every Sunday, no manual work
2. **AI-Powered:** Uses Gemini 2.5 Flash for insights
3. **Consistent:** Part of unified AI Intelligence Layer
4. **Scalable:** Handles multiple tenants/stores
5. **Observable:** Telemetry logging for monitoring
6. **Flexible:** Manual regeneration available

---

## 🔗 **RELATED FEATURES**

Part of the AI Intelligence Layer:

1. **Weekly Narrative** (this feature) - Sunday automation
2. **Feedback Intelligence** - Daily negative feedback analysis
3. **KB Quality** - Article quality scoring
4. **System Health** - Proactive alerts (future)

All coordinated via `masterScheduler`:
- Daily tasks: Feedback Intelligence, KB Quality
- Weekly tasks: Weekly Narrative (Sundays)

---

## 📈 **COST & PERFORMANCE**

**Gemini AI Usage:**
- ~$0.0003 per store per week
- 100 stores = ~$0.03/week = ~$0.12/month
- Extremely cost-effective ✅

**Firestore:**
- 1 doc per store per week (overwrites same doc)
- Minimal storage cost

**Performance:**
- Cloud Functions: ~10-30 seconds per store
- UI Load: <1 second (direct Firestore read)

---

## 🎯 **NEXT STEPS**

Current implementation is **complete and deployed**. Future enhancements:

1. **Historical View** - Browse past weeks
2. **PDF Export** - Professional formatted reports
3. **Email Digest** - Auto-send to store owners
4. **Slack Integration** - Post to Slack channels
5. **Custom Date Ranges** - View any week

---

## ✅ **COMPLETION STATUS**

- ✅ Cloud Functions implemented
- ✅ Gemini AI integration
- ✅ Master scheduler coordination
- ✅ Firestore schema
- ✅ Frontend UI component
- ✅ Manual regeneration API
- ✅ Export functionality
- ✅ Sentiment analysis
- ✅ Documentation

**Status:** 🟢 Production Ready

---

**Last Updated:** October 29, 2025  
**Version:** 1.0  
**Part of:** AI Intelligence Layer (Phase 2)
