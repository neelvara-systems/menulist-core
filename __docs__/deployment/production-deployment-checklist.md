# Production Deployment Checklist

## 🚀 Pre-Deployment Steps

### **1. Environment Variables**

✅ **Vercel Dashboard → Settings → Environment Variables:**

```bash
# Required
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# Firebase Admin (for API routes)
FIREBASE_PROJECT_ID=ecomsai
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY=<service-account-private-key>

# Optional (if using custom Firebase)
FB_DATABASE_URL=https://ecomsai.firebaseio.com
```

---

### **2. Firebase Setup**

✅ **Deploy Firestore Indexes:**
```bash
cd ~/Projects/MenuListAi/dashboard
firebase deploy --only firestore:indexes --config firestore-indexes-auth.json
```

✅ **Update Firestore Security Rules:**
```javascript
// Add to firestore.rules
match /authSecurityEvents/{eventId} {
  allow read, write: if false;  // Server-side only
}
```

```bash
firebase deploy --only firestore:rules
```

✅ **Verify Firebase Functions (if using):**
```bash
cd functions
npm run build
firebase deploy --only functions
```

---

### **3. Test Locally First**

✅ **Run complete test suite:**
```bash
# 1. Start dev server
npm run dev

# 2. Test email/password login
# 3. Test Google OAuth login
# 4. Test account lockout (5 failed attempts)
# 5. Test logout
# 6. Test Cloud Functions with custom claims
```

---

## 📦 Deployment Commands

### **Option A: Deploy to Vercel (Recommended)**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project (first time only)
vercel link

# 3. Deploy to production
vercel --prod

# 4. Verify deployment
vercel inspect <deployment-url>
```

### **Option B: Deploy via Git (Auto-deploy)**

```bash
# 1. Commit all changes
git add .
git commit -m "Production-ready auth system with rate limiting"

# 2. Push to main branch (triggers Vercel auto-deploy)
git push origin main

# 3. Monitor deployment in Vercel dashboard
```

---

## ✅ Post-Deployment Verification

### **1. Test Authentication Flow**

```bash
# Visit production URL
https://your-app.vercel.app/signin

# Test scenarios:
✓ Email/password login
✓ Google OAuth login  
✓ Failed login (wrong password)
✓ Account lockout (5 failed attempts)
✓ Lockout message shows time remaining
✓ Logout works
```

### **2. Test Cloud Functions**

```bash
# Visit Analytics Backfill page
https://your-app.vercel.app/platform/admin/analytics-backfill

# Verify:
✓ Function loads
✓ request.auth is populated
✓ Custom claims present (role, tenantId, storeId)
✓ Function executes successfully
```

### **3. Check Firestore**

```bash
# Firebase Console → Firestore Database

# Verify collections exist:
✓ authSecurityEvents (created on first login)
✓ users
✓ chatSessions
✓ chatAnalytics

# Check indexes status:
✓ All indexes show "Enabled" (not "Building")
```

### **4. Monitor Errors**

```bash
# Vercel Dashboard → Your Project → Logs
# Filter: "errors only"

# Check for:
✓ No authentication errors
✓ No Firebase connection errors
✓ No missing environment variable errors
```

---

## 🔍 Smoke Tests

### **Test 1: New User Signup + Login**
1. Sign up new user
2. Login with credentials
3. Verify session created
4. Verify Firebase Auth token has custom claims

### **Test 2: Rate Limiting**
1. Attempt 5 failed logins
2. Verify lockout message on 6th attempt
3. Wait 15 minutes or manually unlock
4. Verify can login again

### **Test 3: Cloud Functions**
1. Login as platform owner
2. Navigate to analytics backfill
3. Trigger function
4. Verify execution in function logs

---

## 🛠️ Rollback Procedure (If Needed)

```bash
# 1. Revert to previous deployment
vercel rollback

# 2. Or deploy specific commit
git checkout <previous-commit-hash>
vercel --prod

# 3. Monitor for stability
```

---

## 📊 Monitoring Setup

### **1. Set Up Alerts**

**Vercel Alerts:**
- Error rate > 5%
- Function timeout rate > 1%
- Build failures

**Firebase Alerts:**
- Firestore usage > 80%
- Auth failures spike
- Function errors

### **2. Add Analytics**

```typescript
// Track auth events
import { logger } from '@lib/monitoring/logger';

// On successful login
logger.info('User logged in', { email: user.email });

// On failed login
logger.warn('Failed login attempt', { email, reason });
```

---

## 🔐 Security Hardening

### **Post-Deploy Security Checks**

✅ **1. Verify CORS settings**
```
Allowed origins: your-domain.com only
```

✅ **2. Check CSP headers**
```
Content-Security-Policy set correctly
```

✅ **3. Enable HTTPS only**
```
Force SSL redirect enabled
```

✅ **4. Review Firebase Security Rules**
```
No overly permissive allow rules
```

✅ **5. Rotate secrets if exposed**
```
NEXTAUTH_SECRET not in git history
API keys not in client code
```

---

## 📝 Documentation Updates

✅ **Update README.md:**
- New environment variables
- Auth security features
- Deployment instructions

✅ **Update API Documentation:**
- New endpoints (if any)
- Auth requirements
- Rate limiting info

---

## 🎯 Success Criteria

- [ ] All tests pass in production
- [ ] No errors in Vercel logs (first 24 hours)
- [ ] Auth flow works for all user types
- [ ] Rate limiting functioning correctly
- [ ] Cloud Functions accessible with auth
- [ ] Firestore indexes operational
- [ ] Monitoring/alerts configured
- [ ] Team notified of deployment
- [ ] Documentation updated

---

## 🆘 Emergency Contacts

**If deployment fails:**
1. Check Vercel deployment logs
2. Check Firebase Console for errors
3. Review recent commits for breaking changes
4. Rollback if critical issues found
5. Debug in staging before re-deploying

---

## 📅 Post-Deployment Tasks

### **Week 1:**
- [ ] Monitor error rates daily
- [ ] Check auth security events
- [ ] Verify no user complaints
- [ ] Review performance metrics

### **Week 2:**
- [ ] Add 2FA/MFA (optional)
- [ ] Implement CAPTCHA (if bot attacks detected)
- [ ] Optimize Firestore queries if slow
- [ ] Clean up old security events

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
