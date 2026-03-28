# 🔍 Login Source Tracking

**Date:** November 6, 2025  
**Status:** ✅ Production Ready  
**Feature:** Track which authentication method users use to login

---

## 📋 Overview

We now track the **source/method** of every login attempt (success or failure) in Firestore. This provides valuable insights for:

- **Security Analysis**: Detect suspicious patterns (e.g., credential stuffing attacks)
- **User Behavior**: Understand which login method users prefer
- **Debugging**: Quickly identify which auth method is causing issues
- **Analytics**: Track OAuth vs password-based login trends

---

## 📊 What We Track

### **Login Sources**

| Source | Description | Example Use Case |
|--------|-------------|-----------------|
| `google` | OAuth login via Google | User clicks "Sign in with Google" |
| `credentials` | Username/password login | User enters email + password |
| `email-link` | Magic link login (future) | User clicks link from email |
| `unknown` | Fallback for missing source | Legacy logs or errors |

### **Event Types**

Each event in `authSecurityEvents` collection has:

```typescript
{
  email: string;           // User email (lowercase)
  eventType: 'login_success' | 'login_failed' | 'account_locked';
  timestamp: Timestamp;    // When it happened
  source: string;          // ✅ NEW: 'google' | 'credentials' | etc.
  reason?: string;         // For failures: why it failed
  ip?: string;             // IP address (null for OAuth - NextAuth limitation)
  userAgent?: string;      // Browser info
}
```

---

## 🔧 Implementation

### **1. Updated Functions**

#### **`logSuccessfulLogin()`** (`src/lib/auth/security.ts`)

```typescript
export async function logSuccessfulLogin(
    email: string,
    source?: 'google' | 'credentials' | 'email-link' | string,  // ✅ NEW
    metadata?: { ip?: string; userAgent?: string },
    request?: NextRequest
): Promise<void>
```

**Usage:**
```typescript
// OAuth login
await logSuccessfulLogin('user@example.com', 'google');

// Password-based login
await logSuccessfulLogin('user@example.com', 'credentials');
```

---

#### **`logFailedLogin()`** (`src/lib/auth/security.ts`)

```typescript
export async function logFailedLogin(
    email: string, 
    reason: string,
    source?: 'google' | 'credentials' | 'email-link' | string,  // ✅ NEW
    metadata?: { ip?: string; userAgent?: string },
    request?: NextRequest
): Promise<void>
```

**Usage:**
```typescript
// OAuth failure
await logFailedLogin('user@example.com', 'account_not_verified', 'google');

// Password failure
await logFailedLogin('user@example.com', 'invalid_password', 'credentials');
```

---

### **2. Where It's Used** (`src/lib/auth/index.ts`)

#### **OAuth (Google) Login:**

```typescript
// Success
if (account?.provider === 'google') {
    await logSuccessfulLogin(email, 'google');
}

// Failure (invalid email)
await logFailedLogin(email, `invalid_email: ${reason}`, 'google');

// Failure (not verified)
await logFailedLogin(email, 'account_not_verified_or_inactive', 'google');
```

#### **Credentials (Password) Login:**

```typescript
// Success
await logSuccessfulLogin(email, 'credentials');

// Failure (wrong password)
await logFailedLogin(email, 'invalid_password', 'credentials');

// Failure (invalid account)
await logFailedLogin(email, 'invalid_account', 'credentials');

// Failure (invalid email)
await logFailedLogin(email, `invalid_email: ${reason}`, 'credentials');
```

---

## 📁 Firestore Data Structure

### **Collection:** `authSecurityEvents`

### **Example Documents:**

#### **Successful Google Login:**
```json
{
  "email": "user@example.com",
  "eventType": "login_success",
  "timestamp": "2025-11-06T18:00:00Z",
  "source": "google",
  "ip": null,
  "userAgent": null
}
```

#### **Failed Password Login:**
```json
{
  "email": "user@example.com",
  "eventType": "login_failed",
  "timestamp": "2025-11-06T18:00:00Z",
  "source": "credentials",
  "reason": "invalid_password",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

#### **Account Locked:**
```json
{
  "email": "user@example.com",
  "eventType": "account_locked",
  "timestamp": "2025-11-06T18:00:00Z",
  "source": "credentials",
  "reason": "Account locked after 5 failed login attempts",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

## 📊 Analytics Queries

### **Count Logins by Source (Last 30 Days)**

```typescript
const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
    Date.now() - 30 * 24 * 60 * 60 * 1000
);

const snapshot = await db
    .collection('authSecurityEvents')
    .where('eventType', '==', 'login_success')
    .where('timestamp', '>', thirtyDaysAgo)
    .get();

const stats = {
    google: 0,
    credentials: 0,
    unknown: 0
};

snapshot.forEach(doc => {
    const source = doc.data().source || 'unknown';
    stats[source] = (stats[source] || 0) + 1;
});

console.log('Login methods:');
console.log(`  Google OAuth: ${stats.google}`);
console.log(`  Credentials: ${stats.credentials}`);
```

---

### **Find Failed Credential Logins (Potential Attacks)**

```typescript
const oneHourAgo = admin.firestore.Timestamp.fromMillis(
    Date.now() - 60 * 60 * 1000
);

const snapshot = await db
    .collection('authSecurityEvents')
    .where('eventType', '==', 'login_failed')
    .where('source', '==', 'credentials')
    .where('timestamp', '>', oneHourAgo)
    .get();

const attacks = {};
snapshot.forEach(doc => {
    const data = doc.data();
    const ip = data.ip || 'unknown';
    attacks[ip] = (attacks[ip] || 0) + 1;
});

// Find IPs with >5 failed attempts
const suspiciousIPs = Object.entries(attacks)
    .filter(([ip, count]) => count > 5)
    .sort((a, b) => b[1] - a[1]);

console.log('Suspicious IPs (>5 failed logins in last hour):');
suspiciousIPs.forEach(([ip, count]) => {
    console.log(`  ${ip}: ${count} attempts`);
});
```

---

### **Compare OAuth vs Credentials Success Rate**

```typescript
const snapshot = await db
    .collection('authSecurityEvents')
    .where('eventType', 'in', ['login_success', 'login_failed'])
    .get();

const stats = {
    google: { success: 0, failed: 0 },
    credentials: { success: 0, failed: 0 }
};

snapshot.forEach(doc => {
    const data = doc.data();
    const source = data.source || 'unknown';
    const type = data.eventType;
    
    if (stats[source]) {
        if (type === 'login_success') stats[source].success++;
        if (type === 'login_failed') stats[source].failed++;
    }
});

console.log('Success rates:');
Object.entries(stats).forEach(([source, counts]) => {
    const total = counts.success + counts.failed;
    const rate = total > 0 ? (counts.success / total * 100).toFixed(1) : 0;
    console.log(`  ${source}: ${rate}% (${counts.success}/${total})`);
});
```

---

## 🎯 Use Cases

### **1. Security Monitoring**

**Alert on credential stuffing attacks:**
```typescript
// If >10 failed credential logins from same IP in 5 minutes
// → Potential credential stuffing attack
// → Block IP or send alert
```

### **2. Product Analytics**

**Track which login method users prefer:**
```typescript
// Most users use Google OAuth → Simplify password reset flow
// Most users use credentials → Improve OAuth UX
```

### **3. Debugging**

**Find source of auth errors:**
```typescript
// Filter Firestore by source='credentials' and reason='invalid_password'
// → See if it's a user issue or system bug
```

### **4. Compliance**

**Audit trail for security reviews:**
```typescript
// Show auditors: "Here's every login attempt, with method, IP, and result"
```

---

## 🔍 Important Notes

### **Why OAuth IPs are Null**

For OAuth logins (Google), the `ip` and `userAgent` fields are **null**. This is because:

1. NextAuth callbacks (`signIn`, `jwt`, `session`) don't have access to the HTTP request object
2. The OAuth flow happens via redirects from Google
3. This is **normal** and **acceptable** for OAuth authentication

**Password-based logins** (`credentials`) DO capture IP and User-Agent because they go through API routes with full request context.

### **Source is Optional**

If `source` is not provided, it defaults to `'unknown'`. This ensures backward compatibility with any existing code that doesn't pass the source parameter.

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `/src/lib/auth/security.ts` | Login logging functions |
| `/src/lib/auth/index.ts` | NextAuth configuration (calls logging) |
| `/src/lib/security/ipExtractor.ts` | IP extraction utility |
| `/__docs__/security/ip-logging-simple-guide.md` | IP logging details |

---

## 🚀 Future Enhancements

### **Potential Additional Sources:**

1. **`email-link`**: Magic link authentication
2. **`phone`**: SMS-based login
3. **`biometric`**: Face ID / Touch ID
4. **`sso`**: Enterprise SSO (SAML, OIDC)
5. **`mfa`**: Multi-factor authentication

### **Additional Tracking:**

1. **Device type**: Mobile vs Desktop
2. **Browser**: Chrome, Safari, Firefox
3. **Location**: Country/city (from IP)
4. **Session ID**: Track session lifecycle

---

## ✅ Verification

### **Check Firestore Console:**

1. Go to Firebase Console → Firestore
2. Open `authSecurityEvents` collection
3. Recent documents should have `source` field
4. Values should be `'google'` or `'credentials'`

### **Query in Firebase Console:**

```javascript
// Filter by source
db.collection('authSecurityEvents').where('source', '==', 'google').get()

// Filter by event type and source
db.collection('authSecurityEvents')
  .where('eventType', '==', 'login_success')
  .where('source', '==', 'credentials')
  .get()
```

---

**Last Updated:** November 6, 2025  
**Maintainer:** Security Team  
**Status:** ✅ Production Active
