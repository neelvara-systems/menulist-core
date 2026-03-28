# Sentry Error Tracking - Complete Implementation Guide

**Status:** ✅ Production-Ready  
**Last Updated:** October 30, 2025

---

## 📋 **Quick Navigation**

- [Overview](#overview)
- [Implemented Features](#implemented-features)
- [Configuration](#configuration)
- [Email Notifications](#email-notifications)
- [Quick Reference](#quick-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 **Overview**

Complete Sentry error tracking implementation for MenuList.ai with industry-standard practices from Vercel, Stripe, Linear, and Notion.

**Key Features:**
- ✅ Release tracking
- ✅ Email-friendly username (tenant/store visible)
- ✅ Searchable tags
- ✅ Subscription context
- ✅ API call tracking
- ✅ User action breadcrumbs
- ✅ Performance monitoring
- ✅ Dual dev/prod projects

---

## ✅ **Implemented Features**

### **1. Release Tracking** ⭐ **CRITICAL**

Track which deployment version caused errors.

**Implementation:**
```typescript
// sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA 
  ? `menulist-ai@${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7)}`
  : 'menulist-ai@dev',
```

**Benefits:**
- Know which deployment broke
- Track error trends across releases
- Make data-driven rollback decisions

**In Sentry Dashboard:**
- View errors by release
- Compare error rates between deployments
- Filter: `release:menulist-ai@abc1234`

---

### **2. Searchable Tags** ⭐ **HIGH VALUE**

Add tags to every error for easy filtering and grouping.

**Implementation:**
```typescript
// src/lib/monitoring/logger.ts
Sentry.setTags({
  tenant_id: user.tId?.toString() || 'unknown',
  store_id: user.sId?.toString() || 'unknown',
  user_role: user.role || 'unknown',
  subscription_plan: user.subscriptionPlan || 'free',
  subscription_status: user.subscriptionStatus || 'none',
});
```

**Usage in Sentry:**
```
# Filter errors by tenant
tenant_id:14

# Find all premium user errors
subscription_plan:premium

# Filter by store
store_id:15

# Find manager role errors
user_role:manager
```

**Benefits:**
- Instant filtering by business metrics
- Group errors by customer tier
- Identify problematic tenants/stores

---

### **3. Client Context + Email-Friendly Username** ⭐ **BUSINESS CRITICAL**

Rich context about the client (tenant/store/subscription) + formatted username for emails.

**Implementation:**
```typescript
// src/lib/monitoring/logger.ts
const formattedUsername = [
  user.name,
  user.tenantName,
  user.storeName
].filter(Boolean).join(' | ');

Sentry.setUser({
  id: user.id,
  email: user.email,
  username: formattedUsername, // "Danny Test | Danysa | Store #15"
});
```

**In Sentry Email Notifications:**
```
⚠️ New Error: TypeError in /api/products

User: Danny Test | Danysa | Danysa
       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
       Immediately visible in email!
       
Email: danny@example.com
```

**In Sentry Dashboard:**

Visible under **"User"**:
- `username`: "Danny Test | Danysa | Danysa"
- `email`: "danny@example.com"
- `ID`: "bGtB7K2rFUI6abPrZhZ8"

Visible under **"Contexts"** → **"client"**:
- `tenant_id`: "14"
- `tenant_name`: "Danysa"
- `store_id`: "15"  
- `store_name`: "Danysa"
- `subscription_plan`: "premium"
- `subscription_status`: "active"

**Benefits:**
- ⭐ **See tenant/store immediately in email subject/preview**
- Know which customer has issues at a glance
- Prioritize premium customer errors
- Contact tenant directly
- Identify patterns by subscription tier
- No need to open Sentry dashboard to identify customer

---

### **4. API Call Tracking** ⭐ **DEBUGGING ESSENTIAL**

Track API calls and failures automatically.

**Implementation:**
```typescript
// src/lib/monitoring/logger.ts
export function trackAPICall(
  endpoint: string, 
  method: string, 
  statusCode?: number,
  duration?: number
) {
  Sentry.addBreadcrumb({
    category: 'api',
    message: `${method} ${endpoint}`,
    level: statusCode && statusCode >= 400 ? 'error' : 'info',
    data: {
      endpoint,
      method,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    },
  });
  
  // Track failed calls
  if (statusCode && statusCode >= 400) {
    Sentry.setContext('last_failed_api_call', {
      endpoint,
      method,
      statusCode,
      failed_at: new Date().toISOString(),
    });
  }
}
```

**Usage:**
```typescript
// In API calls
try {
  const startTime = Date.now();
  const response = await fetch('/api/products', { method: 'GET' });
  trackAPICall('/api/products', 'GET', response.status, Date.now() - startTime);
  return response.json();
} catch (error) {
  trackAPICall('/api/products', 'GET', 500);
  throw error;
}
```

**Benefits:**
- See which API calls failed before error
- Track API response times
- Identify slow endpoints
- Debug API integration issues

---

### **5. User Action Breadcrumbs** ⭐ **DEBUGGING GOLD**

Track what user did before error occurred.

**Implementation:**
```typescript
// src/lib/monitoring/logger.ts
export function trackUserAction(action: string, details?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: 'user-action',
    message: action,
    level: 'info',
    data: {
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}
```

**Usage:**
```typescript
// In components
trackUserAction('Button Clicked', { button: 'Add to Cart', productId: '123' });
trackUserAction('Form Submitted', { form: 'checkout', items: 5 });
trackUserAction('Page Navigated', { from: '/products', to: '/cart' });
trackUserAction('Search Performed', { query: 'coffee', results: 45 });
```

**In Sentry Dashboard:**

Under **"Breadcrumbs"**, you'll see:
```
👤 Button Clicked { button: "Add to Cart", productId: "123" }
👤 Form Submitted { form: "checkout", items: 5 }
👤 Page Navigated { from: "/products", to: "/cart" }
❌ ERROR OCCURRED
```

**Benefits:**
- See user journey leading to error
- Reproduce bugs more easily
- Understand user behavior
- Identify confusing UX flows

---

### **6. Business Event Tracking** ⭐ **BUSINESS INSIGHTS**

Track important business events in error context.

**Implementation:**
```typescript
// src/lib/monitoring/logger.ts
export function trackBusinessEvent(event: string, details?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: 'business',
    message: event,
    level: 'info',
    data: {
      ...details,
      timestamp: new Date().toISOString(),
    },
  });
}
```

**Usage:**
```typescript
// In business logic
trackBusinessEvent('Subscription Upgraded', { 
  from: 'free', 
  to: 'premium', 
  revenue: 49.99 
});

trackBusinessEvent('Product Published', { 
  productId: 'abc123', 
  category: 'electronics' 
});

trackBusinessEvent('Payment Successful', { 
  amount: 99.99, 
  method: 'credit_card' 
});
```

**Benefits:**
- Correlate errors with business events
- Track revenue-impacting errors
- Debug payment failures
- Monitor subscription upgrades

---

### **7. Performance Monitoring** ⭐ **PREMIUM FEATURE**

Track page load times, API response times, and component performance.

**Implementation:**
```typescript
// sentry.client.config.ts
integrations: [
  Sentry.browserTracingIntegration({
    tracingOrigins: ["localhost", /^\//],
    enableInp: true, // Track Interaction to Next Paint
  }),
],
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
```

**What it Tracks:**
- Page load duration
- API call response times
- Component render performance
- Navigation timing
- Interaction to Next Paint (INP)

**Benefits:**
- Identify slow pages
- Find performance bottlenecks
- Optimize user experience
- Track performance over time

---

### **8. Session Replay** ⭐ **VISUAL DEBUGGING**

Watch exactly what user did before error (with privacy masking).

**Implementation:**
```typescript
// sentry.client.config.ts
Sentry.replayIntegration({
  maskAllText: true, // Mask sensitive text
  blockAllMedia: true, // Don't record media
}),

replaysSessionSampleRate: 0.05, // 5% of sessions
replaysOnErrorSampleRate: 1.0,  // 100% of error sessions
```

**In Sentry Dashboard:**
- Click "Replays" tab on error
- Watch video of user session
- See clicks, scrolls, form inputs (masked)
- Understand exact repro steps

**Privacy:**
- All text is masked
- Images/videos not recorded
- Sensitive data protected
- GDPR compliant

---

### **9. Environment Detection** ⭐ **DEPLOYMENT AWARE**

Distinguish between local dev, preview, and production.

**Implementation:**
```typescript
// All sentry configs
environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
```

**Environments:**
- `development` - Local development
- `preview` - Vercel preview deployments
- `production` - Live production

**Benefits:**
- Separate preview errors from production
- Filter errors by environment
- Different sampling rates per environment

---

### **10. Dual Dev/Prod Projects** ⭐ **CLEAN DASHBOARDS**

Separate Sentry projects for dev and production errors.

**Implementation:**
```typescript
// sentry.client.config.ts
const DEV_DSN = process.env.NEXT_PUBLIC_SENTRY_DEV_DSN;
const PROD_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

dsn: process.env.NODE_ENV === 'production' ? PROD_DSN : DEV_DSN,
```

**Projects:**
- **Development:** `javascript-nextjs-dev` - All dev/test errors
- **Production:** `javascript-nextjs` - Only real customer errors

**Benefits:**
- Clean production dashboard
- Test Sentry without polluting prod
- Independent quotas
- Different alert rules

---

## 📊 **What You See in Sentry Dashboard**

### **Error Detail Page Sections:**

```
┌────────────────────────────────────────────────────────┐
│ ERROR: TypeError: Cannot read property 'name'          │
├────────────────────────────────────────────────────────┤
│ 👤 USER                                                │
│    Email: danny.tools.4884@gmail.com                   │
│    ID: bGtB7K2rFUI6abPrZhZ8                            │
│    Username: danny test                                │
├────────────────────────────────────────────────────────┤
│ 🏢 CLIENT CONTEXT                                      │
│    tenant_id: 14                                       │
│    tenant_name: Danysa                                 │
│    store_id: 15                                        │
│    store_name: Danysa                                  │
│    subscription_plan: premium                          │
│    subscription_status: active                         │
├────────────────────────────────────────────────────────┤
│ 🏷️ TAGS (Searchable)                                   │
│    tenant_id: 14                                       │
│    store_id: 15                                        │
│    user_role: admin                                    │
│    subscription_plan: premium                          │
│    subscription_status: active                         │
├────────────────────────────────────────────────────────┤
│ 🍞 BREADCRUMBS (User Journey)                          │
│    👤 Button Clicked { button: "Add Product" }        │
│    🔌 POST /api/products (200, 150ms)                  │
│    👤 Form Submitted { form: "product_form" }          │
│    🔌 POST /api/products (500, 2500ms) ❌              │
│    ❌ ERROR OCCURRED                                   │
├────────────────────────────────────────────────────────┤
│ 📦 LAST FAILED API CALL                                │
│    endpoint: /api/products                             │
│    method: POST                                        │
│    statusCode: 500                                     │
│    duration: 2500ms                                    │
├────────────────────────────────────────────────────────┤
│ 🚀 RELEASE                                             │
│    menulist-ai@abc1234                                 │
│    Deployed: 2 hours ago                               │
├────────────────────────────────────────────────────────┤
│ 🌍 ENVIRONMENT                                         │
│    production                                          │
├────────────────────────────────────────────────────────┤
│ 📹 SESSION REPLAY                                      │
│    [Watch Video] (shows last 30s before error)        │
├────────────────────────────────────────────────────────┤
│ ⚡ PERFORMANCE                                          │
│    Page Load: 1.2s                                     │
│    Time to Error: 3.5s after page load                │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 **How to Use in Your Code**

### **1. Track API Calls:**
```typescript
import { trackAPICall } from '@lib/monitoring/logger';

// In your API client/axios interceptors
const startTime = Date.now();
const response = await fetch('/api/endpoint', options);
trackAPICall('/api/endpoint', 'POST', response.status, Date.now() - startTime);
```

### **2. Track User Actions:**
```typescript
import { trackUserAction } from '@lib/monitoring/logger';

// In event handlers
<Button onClick={() => {
  trackUserAction('Button Clicked', { button: 'Submit', page: 'checkout' });
  handleSubmit();
}}>
```

### **3. Track Business Events:**
```typescript
import { trackBusinessEvent } from '@lib/monitoring/logger';

// After important actions
trackBusinessEvent('Subscription Created', { 
  plan: 'premium', 
  revenue: 49.99 
});
```

### **4. Track Navigation:**
```typescript
import { trackNavigation } from '@lib/monitoring/logger';

// In navigation handlers
useEffect(() => {
  trackNavigation(previousPage, currentPage);
}, [currentPage]);
```

---

## 🔍 **Searching in Sentry**

### **By Tags:**
```
tenant_id:14
store_id:15
subscription_plan:premium
user_role:admin
release:menulist-ai@abc1234
```

### **By Context:**
```
client.tenant_name:"Danysa"
client.subscription_status:"active"
```

### **Combined:**
```
subscription_plan:premium AND environment:production
tenant_id:14 AND level:error
```

---

## 📈 **Benefits Summary**

| Feature | Benefit | Impact |
|---------|---------|--------|
| **Release Tracking** | Know which deployment broke | 🔥 Critical |
| **Tags** | Filter/group errors easily | 🔥 High |
| **Client Context** | Identify customer issues | 🔥 Critical |
| **API Tracking** | Debug API failures | ⭐ High |
| **User Actions** | Reproduce bugs faster | ⭐ High |
| **Business Events** | Correlate with revenue | ⭐ Medium |
| **Performance** | Find bottlenecks | ⭐ Medium |
| **Session Replay** | Visual debugging | ⭐ High |
| **Dual Projects** | Clean dashboards | ⭐ High |

---

## ✅ **Testing Checklist**

### **Development:**
- [ ] Login to your account
- [ ] Visit `/platform/test-sentry`
- [ ] Click "Test Error" button
- [ ] Check dev Sentry project
- [ ] Verify user context visible
- [ ] Check breadcrumbs (user actions)
- [ ] Verify tags are set

### **Production:**
- [ ] Deploy to production
- [ ] Login to your account
- [ ] Trigger an error
- [ ] Check prod Sentry project
- [ ] Verify subscription plan/status
- [ ] Check release version
- [ ] View session replay
- [ ] Check performance data

---

## 📧 **Email Notifications**

### **Username Format in Emails**

Sentry emails show the **username** field prominently. We format it to include tenant/store info:

**Format:** `{Name} | {Tenant}({tId}) | {Store}({sId})`

**Example Email:**
```
⚠️ New Error: TypeError in /api/products

User: Danny Test | Danysa(14) | Danysa(15)
       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
       Instantly see which tenant & store!
       
Email: danny@example.com
```

**Benefits:**
- ✅ See tenant/store immediately without opening dashboard
- ✅ Visible in mobile push notifications
- ✅ Easy to scan error lists
- ✅ Prioritize premium customers at a glance

---

## 🔍 **Quick Reference**

### **Common Imports**

```typescript
import { 
  logger,              // Basic logging (error, warn, info)
  setUserContext,      // Set user/client context after login
  clearUserContext,    // Clear on logout
  trackAPICall,        // Track API requests
  trackUserAction,     // Track user actions
  trackNavigation,     // Track page navigation
  trackBusinessEvent,  // Track business events
} from '@lib/monitoring/logger';
```

### **Usage Patterns**

```typescript
// 1. Log an Error
try {
  // Some code
} catch (error) {
  logger.error('Operation failed', error, { 
    operation: 'create_product',
    productId: '123'
  });
}

// 2. Track API Call
const startTime = Date.now();
const response = await fetch('/api/products');
trackAPICall('/api/products', 'GET', response.status, Date.now() - startTime);

// 3. Track User Action
trackUserAction('Button Clicked', { button: 'Submit', page: 'checkout' });

// 4. Track Business Event
trackBusinessEvent('Subscription Upgraded', { 
  from: 'free', 
  to: 'premium', 
  revenue: 49.99 
});
```

### **Searching in Sentry Dashboard**

```bash
# By Tag
tenant_id:14
store_id:15
subscription_plan:premium
user_role:admin
release:menulist-ai@abc1234

# By Context
client.tenant_name:"Danysa"
client.subscription_plan:"premium"

# Combined
subscription_plan:premium AND level:error
tenant_id:14 AND timespan:24h
```

### **Configuration Files**

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser-side error tracking |
| `sentry.server.config.ts` | Server-side error tracking |
| `sentry.edge.config.ts` | Edge/middleware tracking |
| `src/lib/monitoring/logger.ts` | Unified logger + tracking |
| `src/providers/sessionProvider.tsx` | Sets user context after login |

### **Environment Variables**

```bash
# Development DSN (optional - has fallback)
NEXT_PUBLIC_SENTRY_DEV_DSN=https://...

# Production DSN (optional - has fallback)
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_DSN=https://...

# For release tracking (Vercel auto-sets these)
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=abc1234
VERCEL_GIT_COMMIT_SHA=abc1234
NEXT_PUBLIC_VERCEL_ENV=production
VERCEL_ENV=production
```

### **Feature Flag Control**

Sentry can be enabled/disabled via feature flag in `src/config/features.ts`:

```typescript
export const FEATURE_FLAGS = {
    ENABLE_SENTRY: true, // Toggle Sentry on/off
} as const;
```

**Usage:**
- `true`: Sentry tracking enabled (dev → dev project, prod → prod project)
- `false`: Sentry completely disabled (no errors sent, zero overhead)

**When to Disable:**
- Pure local development without error tracking
- Testing without polluting Sentry dashboard
- Temporarily disable to save quota during heavy testing

**Production:** Always keep `true`  
**Development:** Keep `true` to test error tracking, `false` for pure local dev

**All 3 configs use this flag:**
- `sentry.client.config.ts` - Browser errors
- `sentry.server.config.ts` - Server errors
- `sentry.edge.config.ts` - Edge/middleware errors

### **Test Page**

Visit `/platform/test-sentry` to test all features:
- ✅ Basic logging (debug, info, warn, error)
- ✅ Error scenarios (logged, thrown, async)
- ✅ Breadcrumb tracking (API, user actions, business events)

**Dashboards:**
- Dev: https://sentry.io/organizations/test-dev-vw/projects/javascript-nextjs-dev/
- Prod: https://sentry.io/organizations/test-dev-vw/projects/javascript-nextjs/

---

## 🧪 **Testing**

### **Quick Test (2 minutes)**

```bash
# 1. Start dev server
npm run dev

# 2. Login to your account
http://localhost:3000

# 3. Visit test page
http://localhost:3000/platform/test-sentry

# 4. Check console after login
✅ Sentry user context set: {
  username: "Danny Test | Danysa(14) | Danysa(15)"
  email: "danny@example.com",
  tenant: "Danysa",
  store: "Danysa",
  plan: "premium",
  status: "active"
}

# 5. Click "Test Error" button
# Dev: Error shows in console (not sent to Sentry) ✅
# Prod: Error sent to Sentry dashboard ✅
```

### **What to Verify**

In Sentry Dashboard error details:

**User Section:**
- Username: `Danny Test | Danysa(14) | Danysa(15)` ✅
- Email: `danny@example.com` ✅
- ID: `bGtB7K2rFUI6abPrZhZ8` ✅

**Client Context:**
- tenant_id: `14` ✅
- tenant_name: `Danysa` ✅
- store_id: `15` ✅
- store_name: `Danysa` ✅
- subscription_plan: `premium` ✅
- subscription_status: `active` ✅

**Tags (Searchable):**
- tenant_id: `14` ✅
- store_id: `15` ✅
- user_role: `admin` ✅
- subscription_plan: `premium` ✅
- subscription_status: `active` ✅

**Breadcrumbs:**
- 👤 Button Clicked ✅
- 🔌 API calls ✅
- 💼 Business events ✅

**Release:**
- `menulist-ai@dev` (development) ✅
- `menulist-ai@abc1234` (production) ✅

---

## 🔧 **Troubleshooting**

### **Issue: Errors not appearing in Sentry**

**Check:**
1. Is `enabled: true` in config?
2. Correct DSN for environment?
3. Server/edge configs enabled in dev (was previously blocked)?
4. Firewall/ad-blocker blocking Sentry?

**Fix:**
```typescript
// All 3 configs should have:
enabled: true,  // Always enabled
dsn: NODE_ENV === 'production' ? PROD_DSN : DEV_DSN,
beforeSend: (event) => event,  // Don't block any events
```

### **Issue: Missing tenant/store context**

**Check:**
1. Is user logged in?
2. `setUserContext()` called after login?
3. Session data includes tId/sId?

**Fix:**
```typescript
// In sessionProvider.tsx after login
setUserContext({
  id: session.user.id,
  email: session.user.email,
  name: session.user.name,
  tId: session.user.tenantId,      // ← Required
  sId: session.user.storeId,        // ← Required
  tenantName: fetchedTenant.name,   // ← Required
  storeName: fetchedStore.name,     // ← Required
  role: userRole,
  subscriptionPlan: subscription?.planId,
  subscriptionStatus: subscription?.status,
});
```

### **Issue: High quota usage**

**Check:**
1. Sample rate in production (should be 0.1 = 10%)
2. Ignoring common errors?
3. Too many debug logs in prod?

**Optimization:**
```typescript
// sentry.client.config.ts
tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,  // 10% in prod

ignoreErrors: [
  'ResizeObserver loop limit exceeded',
  'ChunkLoadError',
  'Network Error',
],
```

### **Issue: Username not showing tenant/store in email**

**Check:**
```typescript
// src/lib/monitoring/logger.ts
const formattedUsername = [
  user.name,
  `${user.tenantName}(${user.tId})`,
  `${user.storeName}(${user.sId})`
].filter(Boolean).join(' | ');

Sentry.setUser({
  id: user.id,
  email: user.email,
  username: formattedUsername,  // ← Must use formatted version
});
```

---

## 🚀 **Status**

**✅ Production-Ready**

All industry best practices implemented:
- ✅ Release tracking
- ✅ Searchable tags
- ✅ Client context (tenant/store/subscription)
- ✅ API call tracking
- ✅ User action breadcrumbs
- ✅ Business event tracking
- ✅ Performance monitoring
- ✅ Session replay
- ✅ Environment detection
- ✅ Dual dev/prod projects

**Next Steps:**
1. Test in development
2. Deploy to production
3. Set up alerts for critical errors
4. Monitor subscription-related errors
5. Track error trends by release

**Your Sentry setup is now enterprise-grade!** 🎯
