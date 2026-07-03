# 📊 Security Monitoring - Complete Guide

**Last Updated**: November 5, 2025  
**Status**: Implementation guide; not current launch certification

---

## Current Launch Boundary

Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, current monitoring-source review, target Sentry/alert destination verification, security-event smoke, and confirmation that sensitive data is not logged. This guide records implementation evidence; it is not production-launch approval.

---

## 📖 Overview

MenuListAI has **enterprise-grade security monitoring** that automatically tracks, logs, and alerts on all security events across the platform.

### What's Monitored

| Event Category | Examples | Severity | Destination |
|----------------|----------|----------|-------------|
| **CSP Violations** | Inline scripts, eval() | Low-Critical | Sentry |
| **Authentication Failures** | Invalid credentials | Medium | Sentry |
| **Authorization Failures** | Wrong roles | High | Sentry + Email |
| **Input Validation** | Injection attempts | Medium-Critical | Sentry |
| **Rate Limiting** | API abuse | Medium | Sentry |
| **Privilege Escalation** | Cross-tenant access | **CRITICAL** | Sentry + Email + Slack |

---

## 🎯 How It Works

### Automatic Flow

```
User Action (Login, API call, etc.)
   ↓
Security Check (Auth, input validation, etc.)
   ↓
Violation Detected?
   ├─ NO → Process normally
   └─ YES → Log to security system
               ↓
         logger.security() called
               ↓
      ┌────────┴────────┐
      ↓                 ↓
  Development       Production
  (Terminal)        (Sentry)
      ↓                 ↓
   Console.log     Email/Slack Alert
```

**You never call this manually - it's automatic!**

---

## 🔐 Security Events Tracked

### 1. CSP Violations 🚨

**File**: `src/app/api/csp-report/route.ts`

**Triggers**:
- Inline scripts attempted
- eval() usage
- Unauthorized external scripts
- Style/font/image violations

**Severity**:
- 🔥 **Critical**: eval() or inline scripts
- 🔥 **High**: Unknown external scripts
- ⚠️ **Medium**: Style/font violations
- ℹ️ **Low**: Expected violations

**Example**:
```json
{
  "event": "CSP Violation Detected",
  "severity": "high",
  "blockedUriKind": "inline",
  "directiveCategory": "script-src",
  "blockedUriPresent": true,
  "blockedUriLength": 6,
  "sourceFilePresent": true,
  "sourceFileLength": 29,
  "lineNumber": 42
}
```

---

### 2. Input Validation Failures 🔶

**Files**: All API routes with input validation

**Triggers**:
- Malformed data
- SQL/NoSQL injection attempts
- XSS attempts
- Invalid types or formats
- Path traversal attempts

**Severity**:
- 🔶 **Medium**: Standard AI operations
- 🔥 **High**: Expensive AI operations
- 🚨 **Critical**: Payment operations

**Example**:
```json
{
  "event": "Input Validation Failed",
  "severity": "critical",
  "endpoint": "/api/razorpay/verify-topup",
  "userId": "user_123",
  "error": "razorpay_payment_id: Required",
  "attemptedData": {
    "hasPaymentId": false,
    "hasOrderId": true
  }
}
```

---

### 3. Authentication Failures 🚨

**File**: `src/middleware/auth.ts`

**Triggers**:
- No session token
- Expired session
- Invalid session
- Missing auth header

**Severity**: 🔶 **Medium**

**Example**:
```json
{
  "event": "Authentication Failed",
  "severity": "medium",
  "endpoint": "/api/descriptions",
  "method": "POST",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "error": "No valid session - authentication required"
}
```

---

### 4. Authorization Failures (Platform Role) 🔥

**File**: `src/middleware/auth.ts`

**Triggers**:
- User lacks required platform role
- USER trying to access ADMIN route
- USER trying to access PLATFORM route

**Severity**: 🔥 **High** (privilege escalation attempt!)

**Example**:
```json
{
  "event": "Authorization Failed - Platform Role",
  "severity": "high",
  "endpoint": "/api/admin/users",
  "userId": "user_123",
  "email": "john@restaurant.com",
  "required": "PLATFORM",
  "actual": "USER"
}
```

---

### 5. Authorization Failures (Store Role) 🔥

**File**: `src/middleware/auth.ts`

**Triggers**:
- User lacks required store role
- MANAGER trying OWNER-only route
- STAFF trying MANAGER route

**Severity**: 🔥 **High**

---

### 6. Horizontal Privilege Escalation 🚨

**File**: `src/middleware/auth.ts` → `verifyTenantAccess()`

**Triggers**:
- User accessing different tenant's data
- User accessing different store's data

**Severity**: 🚨 **CRITICAL** (most serious violation!)

**Example**:
```json
{
  "event": "Horizontal Privilege Escalation Attempt - Tenant",
  "severity": "critical",
  "userId": "user_123",
  "email": "john@burgerking.com",
  "sessionTenantId": "tenant_123",
  "attemptedTenantId": "tenant_456",
  "endpoint": "/api/menus",
  "ip": "203.0.113.42",
  "error": "User attempted to access different tenant data"
}
```

---

### 7. Rate Limit Violations 🔶

**Files**: `src/lib/rateLimit.ts`, `src/lib/rateLimit/helpers.ts`

**Triggers**:
- Too many API requests
- Potential bot activity
- Abuse attempts

**Severity**: 🔶 **Medium**

Provider setup failures, Upstash timeouts, provider errors, reset/stat failures, health-check failures, and helper fail-open errors use secure logging with normalized error text. Request checks intentionally fail open during provider trouble and temporarily use the existing local bypass window.

**Example**:
```json
{
  "event": "Rate Limit Exceeded",
  "severity": "medium",
  "feature": "AI_OPERATION",
  "userId": "user_123",
  "limit": 20,
  "window": 60,
  "waitSeconds": 45
}
```

---

## 📊 Sentry Dashboard

### Setup Filters

**View All Security Events**:
```
type:security
```

**By Category**:
```
category:csp_violation
category:input_validation
category:authentication
category:rate_limiting
```

**By Severity**:
```
severity:critical      # Immediate attention!
severity:high          # Review soon
severity:medium        # Monitor patterns
severity:low           # Informational
```

**Combined Filters**:
```
type:security severity:critical
category:authentication severity:high
type:security userId:user_123
```

---

### Dashboard Widgets

**Widget 1: Security Events Timeline**
```
Query: type:security
Type: Line chart
Time: Last 7 days
Group by: category
```

**Widget 2: Top Issues**
```
Query: type:security
Type: Table
Group by: event
Sort: Count (desc)
Limit: 10
```

**Widget 3: High-Severity Events**
```
Query: type:security severity:high OR severity:critical
Type: Big number
Label: Critical Security Events
```

**Widget 4: Authentication Failures by User**
```
Query: category:authentication
Type: Table
Group by: email
Show: Count, Last seen
```

---

## 🔔 Alert Configuration

### Email Alerts

**Setup** (Sentry):
1. Go to Sentry → Settings → Alerts
2. Create rule:
   - **Name**: "Critical Security Events"
   - **When**: `type:security AND severity:critical`
   - **Then**: Email to [your-email]
   - **Frequency**: Immediately

**You'll get**:
```
Subject: 🔥 CRITICAL: Security Event in production

Horizontal Privilege Escalation Attempt - Tenant

⚠️ MAJOR SECURITY VIOLATION ⚠️

User: john@burgerking.com
Attempted Tenant: tenant_789 (not theirs!)
IP: 203.0.113.42

IMMEDIATE ACTION:
1. Block IP
2. Review user account
3. Contact affected tenant

[View in Sentry →]
```

---

### Slack Alerts

**Setup**:
1. Sentry → Settings → Integrations → Slack
2. Connect workspace
3. Create alert:
   - **When**: `type:security severity:high OR severity:critical`
   - **Then**: Send to #security-alerts
   - **Frequency**: Immediately

**Slack Message**:
```
🚨 Security Alert in production

Authorization Failed - Platform Role
━━━━━━━━━━━━━━━━━━━━━━━━━━
User: john@restaurant.com
Endpoint: /api/admin/users
Required: PLATFORM | Actual: USER

12 similar events in last hour

[View in Sentry →]
```

---

## 🧪 Testing

### Test CSP Violation

```javascript
// In browser console
eval('console.log("test")');

// Check terminal (dev) or Sentry (prod) for:
// "CSP Violation Detected"
```

---

### Test Authentication Failure

```bash
curl -X POST http://localhost:3000/api/descriptions

# Expected: 401 Unauthorized
# Sentry: "Authentication Failed" (MEDIUM)
```

---

### Test Input Validation

```bash
curl -X POST http://localhost:3000/api/descriptions \
  -H "Cookie: session=VALID" \
  -d '{"invalid": "data"}'

# Expected: 400 Bad Request
# Sentry: "Input Validation Failed" (MEDIUM/HIGH/CRITICAL)
```

---

### Test Authorization Failure

```bash
# Normal user trying admin route
curl -X POST http://localhost:3000/api/admin/users \
  -H "Cookie: session=NORMAL_USER"

# Expected: 403 Forbidden
# Sentry: "Authorization Failed" (HIGH)
```

---

### Test Privilege Escalation

```typescript
// In API route
const { tenantId } = await request.json();

if (!verifyTenantAccess(session, tenantId, undefined, request)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// If user tries different tenant:
// Sentry: "Horizontal Privilege Escalation" (CRITICAL)
```

---

## 📈 Monitoring Best Practices

### Daily Routine (5 min)

1. Check Sentry dashboard
2. Review critical/high severity events
3. Mark resolved or investigate
4. Block suspicious IPs if needed

---

### Weekly Review (15 min)

1. Review security event trends
2. Look for patterns:
   - Same IP multiple violations?
   - New attack patterns?
   - Legitimate issues to fix?
3. Update security rules if needed

---

### Alert Response Procedures

**CRITICAL Alert** (Cross-Tenant Access):
```
1. Block IP immediately (Cloudflare/firewall)
2. Review user account
3. Check for additional attempts
4. Contact affected tenant
5. Document incident
```

**HIGH Alert** (Authorization Failure):
```
1. Check if legitimate user error
2. Look for pattern (repeated attempts?)
3. If attack: Block IP
4. If user confusion: Improve UI/messaging
```

**MEDIUM Alert** (Input Validation):
```
1. Review attempted data
2. Check for injection patterns
3. If attack: Block IP
4. If bug: Fix validation schema
```

---

## 🎯 Success Metrics

### Good Security Posture

✅ < 5 high-severity events per day  
✅ No critical events  
✅ Known violations only (expected behavior)  
✅ Fast response time (<1 hour for critical)

### Needs Attention

⚠️ 10+ high-severity events per day  
⚠️ Same IP triggering multiple events  
⚠️ New unknown attack patterns  
⚠️ Slow response time (>24 hours)

### Under Attack

🚨 100+ events per hour  
🚨 Multiple critical events  
🚨 Distributed attack (many IPs)  
🚨 New vulnerability exploited

**Action**: Enable DDoS protection, block IPs, investigate immediately

---

## Summary

✅ **Complete Security Monitoring** with:
- 7 event categories tracked
- Automatic logging (zero manual effort)
- Severity-based alerting
- Real-time notifications
- Full audit trail
- Pattern detection

**Coverage**: Security-critical paths documented here; reconfirm current route coverage before launch
**Integration**: Development (console) + Production (Sentry)  
**Alerting**: Email + Slack + Mobile, subject to target configuration evidence

---

**Last Reviewed**: November 5, 2025  
**Status**: Implementation evidence documented; not current launch certification
