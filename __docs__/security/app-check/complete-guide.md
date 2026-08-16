# 🤖 Firebase App Check - Complete Guide

**Last Updated**: August 16, 2026
**Status**: Code/setup guide; not current launch certification

---

## Current Launch Boundary

Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, current App Check environment setup verification, provider token smoke, Firebase deploy evidence where enforcement changes, and browser/device QA for the release target. This guide records code/setup requirements; it is not production-launch approval.

### Current Production Provider State

As of August 16, 2026, **MenuList Production Web** in `menulist-prod` is
registered with a company-owned reCAPTCHA v3 credential. The replacement
private secret is stored only by Firebase App Check. Its matching public site
key exists exactly once in Vercel and is scoped only to Production as
`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. Firebase's APIs view remains **Unenforced**;
the variable will affect only a future deployment, and no deployment was run
for this setup checkpoint.

The current client source uses `ReCaptchaV3Provider`. Firebase now recommends
reCAPTCHA Enterprise for new integrations, but changing provider type requires
an explicit source, configuration, and release migration; it must not be
silently mixed into this v3 setup.

### Current QA Provider State

As of August 16, 2026, **MenuList QA Web** in `menulist-qa` is registered with
a separate company-owned reCAPTCHA v3 credential restricted to the
`menulist.digital` QA domain family. Its private secret is stored only by
Firebase App Check. The matching public site key exists exactly once in
Vercel's custom `qa` environment as non-sensitive
`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. Firebase's APIs view remains **Unenforced**;
the variable will affect only a future QA deployment, and no deployment was
run for this setup checkpoint.

---

## 📖 What is Firebase App Check?

Firebase App Check protects your backend resources (Firestore, Storage, Cloud Functions) from abuse by **verifying requests come from legitimate app instances** - not bots, scrapers, or malicious scripts.

**Think of it as a bouncer for your Firebase services.**

---

## ⚠️ Why You NEED This

### Without App Check

```javascript
// ❌ ANYONE can do this from ANY script/bot:
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config is public (it's in your client bundle!)
const app = initializeApp(yourPublicConfig);
const db = getFirestore(app);

// Scrape your ENTIRE database
const allUsers = await db.collection('users').get();
const allOrders = await db.collection('orders').get();

// Spam your expensive Cloud Functions
for (let i = 0; i < 10000; i++) {
  await callFunction('generateImage'); // $$$$$ Your money!
}

// Download all your Storage files
const allImages = await storage.listAll();
```

###  With App Check Enabled

```
❌ 403 Forbidden: Invalid App Check token
✅ Only requests from YOUR verified app are allowed
✅ Bots and scrapers are blocked at Firebase edge
✅ Your costs are protected
```

---

## 📊 Attack Scenarios Prevented

| Attack Type | Without App Check | With App Check |
|-------------|-------------------|----------------|
| **Bot Database Scraping** | ❌ Can scrape entire DB | ✅ Blocked |
| **DDoS on Cloud Functions** | ❌ Unlimited expensive calls | ✅ Rate limited |
| **Storage File Theft** | ❌ Can download all files | ✅ Blocked |
| **Data Exfiltration** | ❌ Competitor can clone your DB | ✅ Blocked |
| **Bandwidth Abuse** | ❌ Costly attacks possible | ✅ Protected |
| **Credential Stuffing** | ❌ Unlimited login attempts | ✅ Throttled |

---

## ✅ Current Implementation Status

### Code Status: ✅ Complete

**Files Created**:
- `/src/lib/firebase/appCheck.ts` - App Check configuration
- `/src/lib/firebase/firebaseClient.ts` - Auto-initialization

**Implementation**:
```typescript
// src/lib/firebase/appCheck.ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

export function initializeFirebaseAppCheck(firebaseApp: FirebaseApp) {
  if (typeof window === 'undefined') return null;
  
  const key = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
  if (!key) {
    console.warn('[App Check] NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set');
    return null;
  }
  
  // Debug mode in development
  if (process.env.NODE_ENV === 'development') {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  
  const appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(key),
    isTokenAutoRefreshEnabled: true
  });
  
  console.log('✅ App Check: Initialized with reCAPTCHA v3');
  return appCheck;
}
```

---

## 🚀 Setup Guide (15 Minutes)

### Step 1: Get reCAPTCHA v3 Site Key (5 min)

1. Go to https://www.google.com/recaptcha/admin
2. Click **"+"** to register a new site
3. Fill form:
   - **Label**: "MenuList AI - App Check"
   - **reCAPTCHA type**: ✅ **Score based (v3)**  (NOT v2!)
   - **Domains**: Add these:
     - `localhost` (for development)
     - `yourdomain.com` (your production domain)
     - `*.vercel.app` (if using Vercel)
   - **Google Cloud Platform**: Select your Firebase project
     - Look for project ID matching Firebase
   - ✅ Accept reCAPTCHA Terms
4. Click **Submit**
5. **Copy the Site Key** (starts with `6L...`)

#### Finding Your Firebase Project in Dropdown

The dropdown might show:
- `menulist-qa` (MenuList QA/staging Firebase project)
- `menulist-prod` (MenuList production Firebase project)
- `MenuList Production` (production project display name)

**Verify**: Hover over project → Should show Project ID

---

### Step 2: Add Environment Variable

Add to `.env.local`:
```bash
# reCAPTCHA v3 for Firebase App Check
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**IMPORTANT**: 
- ✅ Must have `NEXT_PUBLIC_` prefix (client-side variable)
- ✅ Keep secret key safe (never commit)

---

### Step 3: Enable in Firebase Console (5 min)

1. Go to **Firebase Console** → Your Project
2. Navigate to **Project Settings** (⚙️) → **App Check** tab
3. Click **"Register app"** for your web app
4. **Provider**: Select **reCAPTCHA v3**
5. **Secret Key**: paste the private secret from the matching reCAPTCHA v3
   registration. Never put this value in Vercel, source control, chat, or a
   client-visible environment variable.
6. Click **Save**

---

### Step 4: Enable Enforcement (release-gated)

Do not enable enforcement during initial provider registration. First deploy
through the approved release path, confirm verified production traffic in the
App Check metrics window, and capture rollback evidence. Only then evaluate
the service-specific enforcement changes below.

In Firebase Console → App Check → Enable enforcement for:

| Service | Enforce? | Why |
|---------|----------|-----|
| **Cloud Firestore** | ✅ YES | Protect database |
| **Cloud Storage** | ✅ YES | Protect file access |
| **Cloud Functions** | ✅ YES | Protect API calls |
| **Authentication** | ❌ NO | Keep for NextAuth compatibility |

⚠️ **Don't enforce on Authentication** - It can break NextAuth flows!

---

### Step 5: Deploy to Vercel

Add environment variable in Vercel:

1. Go to Vercel Dashboard → Your Project
2. **Settings** → **Environment Variables**
3. Add the target-specific public site key:
   - **Name**: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - **Value**: The matching QA or production site key
   - **Environment**: custom `qa` for the QA key, or Production for the
     production key. Do not share one value across QA and production.
4. **Save**
5. Redeploy only through the approved release path. Saving the variable alone
   does not update an existing deployment.

---

### Step 6: Test (3 min)

```bash
# 1. Restart dev server with new env variable
npm run dev

# 2. Open browser console
# Should see: "✅ App Check: Initialized with reCAPTCHA v3"

# 3. Try any Firebase operation (Firestore read, Storage upload)
# Should work normally

# 4. Check Firebase Console → App Check → APIs
# Should see requests marked as "Verified"
```

---

## �� Development vs Production

### Development Mode

```typescript
// Automatically enables debug mode
if (process.env.NODE_ENV === 'development') {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}
```

**Behavior**:
- ✅ App Check active
- ✅ Uses debug tokens
- ✅ No reCAPTCHA challenges
- ✅ Full Firebase access
- ✅ Easy testing

---

### Production Mode

**Behavior**:
- ✅ Full reCAPTCHA v3 validation
- ✅ Background bot detection
- ✅ Automatic token refresh
- ✅ Violations blocked
- ❌ Bots get 403 Forbidden

---

## 💰 Cost Breakdown

### reCAPTCHA v3 Pricing

**Free Tier**: 10,000 assessments/month

**Paid Tier**: $1 per 1,000 assessments (above 10K)

### Estimating Your Usage

```
Average User Session:
  - Initial page load: 1 assessment
  - Token auto-refresh: 1 assessment/hour
  
Monthly for 1,000 users:
  - 1,000 users × 10 sessions/month × 2 hours avg
  - = ~20,000 assessments/month
  - = $10/month cost

For your current scale: Likely FREE first few months
```

**Monitoring**:
- Check Google Cloud Console → reCAPTCHA
- View monthly assessment count
- Set up billing alerts

---

## 🔧 Troubleshooting

### "App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set"

**Fix**:
1. Add variable to `.env.local`
2. Restart dev server: `npm run dev`

---

### "reCAPTCHA validation failed"

**Causes**:
1. Wrong site key
2. Domain not whitelisted in reCAPTCHA console
3. User has strict privacy settings (rare)

**Fix**:
1. Verify site key in `.env.local` matches reCAPTCHA console
2. Add your domain to reCAPTCHA console whitelist
3. Check Firebase Console → App Check for errors

---

### "Cloud Firestore: Missing or insufficient permissions"

**After enabling App Check enforcement**

**Cause**: Requests without valid App Check token are rejected

**Fix**: 
1. Verify App Check initialized (check console: "✅ App Check: Initialized")
2. Clear browser cache
3. Check Firestore rules don't conflict
4. Verify Firebase SDK version is compatible

---

### "App Check token missing in requests"

**Debug**:
```javascript
// In browser console
import { getToken } from 'firebase/app-check';

const token = await getToken(appCheck, /* forceRefresh */ true);
console.log('App Check Token:', token);
```

**Should return**:
```javascript
{
  token: "eyJhbGciOiJIUz...",
  expireTimeMillis: 1699564800000
}
```

---

## 📊 Monitoring

### Firebase Console

**App Check → APIs tab**:

```
Cloud Firestore:
  ✅ Verified requests: 95%
  ⚠️ Unverified requests: 5%   ← Investigate these

Cloud Functions:
  ✅ Verified requests: 98%
  ⚠️ Unverified requests: 2%   ← Likely bots (good they're blocked!)
```

**Alerts to Set**:
- ⚠️ If verified < 90% → Check your app deployment
- 🚨 If unverified suddenly spikes → You're under attack (and protected!)

---

### reCAPTCHA Console

**Google Admin Console → reCAPTCHA**:

View:
- Total assessments per day
- Score distribution (0.0 = bot, 1.0 = human)
- Top referrers
- Geographic distribution

**Expected Score Distribution**:
- 0.0-0.3: Bots (blocked) ✅
- 0.3-0.7: Suspicious (flagged)
- 0.7-1.0: Legitimate users ✅

---

## ⚙️ Advanced Configuration

### Custom Token TTL

```typescript
initializeAppCheck(firebaseApp, {
  provider: new ReCaptchaV3Provider(key),
  isTokenAutoRefreshEnabled: true,
  // Tokens auto-refresh before expiry (default: 5 min TTL)
});
```

---

### Handle Low reCAPTCHA Scores

```typescript
// Server-side Cloud Function
import { onCall } from 'firebase-functions/v2/https';

export const secureFunction = onCall(
  { enforceAppCheck: true },
  async (request) => {
    // reCAPTCHA score available
    const score = request.app?.appCheckToken?.score || 0;
    
    // 0 = definitely bot
    // 1 = definitely human
    if (score < 0.5) {
      throw new Error('Suspicious activity detected');
    }
    
    // Proceed with function logic
    return { success: true };
  }
);
```

---

## 🎯 Enforcement Strategy

### Recommended Rollout

**Week 1: Monitoring Mode**
```
✅ All services: Monitoring (no blocking)
→ Collect data on legitimate traffic
→ Check verification percentage
→ Identify false positives
```

**Week 2: Enforce Non-Critical**
```
✅ Cloud Storage: Enforced
✅ Cloud Functions (non-auth): Enforced
⚠️ Firestore: Still monitoring
❌ Authentication: Keep unenforced
```

**Week 3+: Full Enforcement**
```
✅ All services enforced
→ Monitor for false positives
→ Quick rollback plan ready
→ Support team informed
```

---

## 🚨 Important Notes

### 1. Don't Enforce on Firebase Authentication

❌ **Firebase Authentication**: Leave UNENFORCED

**Why?**
- NextAuth uses Firebase Auth
- App Check can interfere with OAuth flows
- Session management may break

---

### 2. Monitor False Positives

**Some legitimate users may be flagged**:
- VPN users
- Corporate firewalls
- Ad blocker users
- Privacy-focused browsers

**Solution**: 
- Monitor support tickets
- Provide feedback form
- Adjust reCAPTCHA threshold if needed

---

### 3. Emulator Compatibility

⚠️ App Check **does NOT work** with Firebase Emulators

**For local development**:
- Use debug mode (automatic)
- Or disable App Check locally
- Test in staging environment

---

## ✅ Deployment Checklist

This is a release checklist, not a statement that every target is currently
deployed or enforced. The current production provider-registration evidence is
recorded in
[MenuList Production Provider Setup](../../deployment/menulist-production-provider-setup.md#prod-b13-monitoring-and-enforcement-boundary).

- [ ] reCAPTCHA site key obtained
- [ ] `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` added to `.env.local`
- [ ] Environment variable added to Vercel
- [ ] App Check enabled in Firebase Console
- [ ] Enforcement enabled for Firestore, Storage, Functions
- [ ] Authentication enforcement left disabled
- [ ] Tested in development (see initialization log)
- [ ] Deployed to production
- [ ] Verified requests showing as "Verified" in Firebase
- [ ] Monitoring set up (Firebase Console + reCAPTCHA)
- [ ] No increase in user support tickets
- [ ] Verification rate > 90%

---

## 📚 Resources

- [Firebase App Check Docs](https://firebase.google.com/docs/app-check)
- [reCAPTCHA v3 Guide](https://developers.google.com/recaptcha/docs/v3)
- [App Check Best Practices](https://firebase.google.com/docs/app-check/web/recaptcha-provider#best-practices)

---

## Summary

✅ **App Check Implementation Complete**
- Code: ✅ Ready
- Setup: ⚠️ Needs environment configuration (15 min)
- Cost: $0-10/month (likely free initially)
- Security Impact: 🔴 **CRITICAL** (blocks bots, prevents abuse)

**Status**: Code ready -> environment setup required -> external launch gates required
**Priority**: HIGH (required before launch certification)

---

**Last Reviewed**: November 5, 2025  
**Next Review**: December 5, 2025  
**Action Required**: Complete environment setup before production launch
