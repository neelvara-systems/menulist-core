# 🛡️ CSP Allowlist Management Guide

**Quick & Easy Way to Manage External URLs**

---

## 🚀 **How It Works**

### **Step 1: See the Violation (In Dev Console)**

When you add a new external resource (CDN, API, etc.), you'll see a **BIG RED WARNING** in your browser console:

```
🚨 CSP BLOCKED URL - ADD TO ALLOWLIST!
📍 Directive: style-src
🔗 Blocked URL: https://example.com/style.css

✅ HOW TO FIX:
1. Open: src/config/csp-allowlist.ts
2. Add URL to appropriate array:
   styleSources: [
     "https://example.com", // Add this
   ]
3. Restart dev server: npm run dev
```

---

### **Step 2: Add to Allowlist**

Open: **`src/config/csp-allowlist.ts`**

Find the appropriate array and add your URL:

```typescript
export const CSP_ALLOWLIST = {
    // For JavaScript/Scripts
    scriptSources: [
        'https://cdnjs.cloudflare.com', // ← Add CDN URLs here
        'https://analytics.example.com',
    ],

    // For CSS/Stylesheets
    styleSources: [
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com', // ← Add stylesheet CDNs here
    ],

    // For fonts
    fontSources: [
        'https://fonts.gstatic.com',
    ],

    // For AJAX/API calls
    connectSources: [
        'https://api.example.com', // ← Add API endpoints here
    ],

    // For iframes
    frameSources: [
        'https://www.youtube.com', // ← Add iframe sources here
    ],
};
```

---

### **Step 3: Restart Dev Server**

```bash
# Stop current server (Ctrl+C)
npm run dev
```

**That's it!** ✅ The URL is now allowed.

---

## 📋 **Quick Reference**

### **What Goes Where?**

| Resource Type | Array | Example |
|---------------|-------|---------|
| **JavaScript libraries** | `scriptSources` | `https://cdnjs.cloudflare.com` |
| **CSS stylesheets** | `styleSources` | `https://fonts.googleapis.com` |
| **Web fonts** | `fontSources` | `https://fonts.gstatic.com` |
| **API calls** | `connectSources` | `https://api.stripe.com` |
| **Embedded videos/maps** | `frameSources` | `https://www.youtube.com` |
| **Generated image previews** | `imageSources` | `blob:` |
| **Images** | `imageSources` | Usually `https:` (allows all) |

---

## 🎯 **Common Examples**

### **Adding Google Fonts**

```typescript
styleSources: [
    'https://fonts.googleapis.com', // ✅
],
fontSources: [
    'https://fonts.gstatic.com', // ✅
],
```

### **Adding Analytics (Google Analytics, Mixpanel)**

```typescript
scriptSources: [
    'https://*.googletagmanager.com', // ✅ Wildcard for subdomains
    'https://cdn.mixpanel.com',
],
connectSources: [
    'https://*.google-analytics.com',
    'https://api.mixpanel.com',
],
```

### **Adding Video Embeds (YouTube, Vimeo)**

```typescript
frameSources: [
    'https://www.youtube.com',
    'https://player.vimeo.com',
],
```

### **Adding Generated Image Previews**

Client-generated printable previews use browser `Blob` URLs and render as images:

```typescript
imageSources: [
    'blob:', // Generated image previews
],
```

### **Adding Payment Gateway (Stripe)**

```typescript
scriptSources: [
    'https://js.stripe.com',
],
frameSources: [
    'https://js.stripe.com', // Stripe checkout iframe
],
connectSources: [
    'https://api.stripe.com',
],
```

---

## 🔍 **Console Warning Details**

### **In Development Mode:**

You'll see a **GROUPED, COLLAPSIBLE** red warning that shows:

1. **Directive** - What type of resource was blocked
2. **Blocked URL** - The exact URL that needs to be added
3. **How to Fix** - Step-by-step instructions
4. **Example Code** - Copy-paste ready code snippet

### **What It Looks Like:**

```
🚨 CSP BLOCKED URL - ADD TO ALLOWLIST! (click to expand)
  📍 Directive: script-src
  🔗 Blocked URL: https://cdn.example.com/lib.js
  
  ✅ HOW TO FIX:
  1. Open: src/config/csp-allowlist.ts
  2. Add URL to appropriate array:
     scriptSources: [
       "https://cdn.example.com", // Add this
     ]
  3. Restart dev server: npm run dev
  
  📄 Full details: { ... }
```

---

## 🚫 **What Gets Filtered Out**

The monitor **automatically ignores** Next.js development noise:

- ✅ Webpack hot-reload scripts
- ✅ `eval()` calls from Next.js dev mode
- ✅ Inline scripts from Next.js
- ✅ `/_next/` internal files

**You only see violations for YOUR external resources!**

---

## 💡 **Tips & Best Practices**

### **Use Wildcards for Subdomains**

```typescript
// ❌ Not ideal (too specific)
scriptSources: [
    'https://cdn1.example.com',
    'https://cdn2.example.com',
    'https://cdn3.example.com',
],

// ✅ Better (covers all subdomains)
scriptSources: [
    'https://*.example.com',
],
```

### **Be Specific When Possible**

```typescript
// ❌ Too permissive (security risk)
scriptSources: [
    'https:', // Allows ALL HTTPS scripts
],

// ✅ Better (only what you need)
scriptSources: [
    'https://cdnjs.cloudflare.com',
    'https://unpkg.com',
],
```

### **Group Related URLs**

```typescript
// ✅ Good organization (with comments)
connectSources: [
    // Firebase
    'https://*.firebaseio.com',
    'https://*.googleapis.com',
    'wss://*.firebaseio.com',
    
    // Analytics
    'https://*.google-analytics.com',
    'https://cdn.mixpanel.com',
    
    // Payment
    'https://api.stripe.com',
],
```

---

## 🔧 **Development vs Production**

### **Development Mode:**
- ✅ `unsafe-inline` and `unsafe-eval` allowed (for Next.js HMR)
- ✅ Console warnings enabled
- ✅ Report-only mode (nothing actually blocked in permissive policy)

### **Production Mode:**
- ❌ `unsafe-inline` and `unsafe-eval` disabled (stricter security)
- ❌ Console warnings disabled (logged to Sentry instead)
- ✅ Violations logged to monitoring

**Config location:** `src/config/csp-allowlist.ts` → `CSP_DEV_SETTINGS`

---

## 📁 **File Structure**

```
src/
├── config/
│   └── csp-allowlist.ts          ← Your allowlist (edit here!)
├── middleware.ts                  ← Uses the allowlist
└── app/
    ├── layout.tsx                 ← Client-side monitoring
    └── api/
        └── csp-report/
            └── route.ts           ← Handles violations
```

---

## 🎉 **Summary**

**Your Daily Workflow:**

1. **Develop** → See red CSP warning in console
2. **Copy** → Blocked URL
3. **Paste** → Into `src/config/csp-allowlist.ts`
4. **Restart** → `npm run dev`
5. **Done** → URL is now allowed!

**No more hunting through middleware code!** 🚀

---

**Need Help?**
- Check existing URLs in `csp-allowlist.ts` for examples
- Console warnings show you exactly what to add
- Follow the step-by-step instructions in the warning
