# Multi-Tenant Architecture Guide

> Last Updated: December 21, 2025

## Executive Summary

MenuListAi uses a **domain-based multi-tenant architecture** that allows restaurant clients to access their digital menus via:

- **Subdomains**: `joespizza.menulist.online`
- **Custom Domains**: `joespizza.com`

This guide covers the complete implementation, UX recommendations, and setup instructions.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works](#how-it-works)
3. [Multiple Menus (Slug-Based Routing)](#multiple-menus-slug-based-routing)
4. [File Structure](#file-structure)
5. [UX Recommendations](#ux-recommendations)
6. [Setup Flow for End Users](#setup-flow-for-end-users)
7. [Database Schema](#database-schema)
8. [Vercel DNS Configuration](#vercel-dns-configuration)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INCOMING REQUEST                             │
│                                                                      │
│   menulist.ai    joespizza.menulist.online    joespizza.com             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE (Edge Runtime)                         │
│                    src/middleware.ts                                 │
│                                                                      │
│   1. Parse hostname via resolveDomain()                             │
│   2. Determine: platform | subdomain | custom | localhost           │
│   3. If client domain → rewrite to /client/*                       │
│   4. Sanitize + forward trusted x-tenant-* request headers          │
└─────────────────────────────────────────────────────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           ▼                                          ▼
┌─────────────────────────┐            ┌─────────────────────────────┐
│   PLATFORM ROUTES       │            │   CLIENT ROUTES              │
│   /app/(website)/*      │            │   /app/client/*             │
│                         │            │                              │
│   • Landing page        │            │   • Menu page                │
│   • About, Pricing      │            │   • Client sitemap.xml       │
│   • Blog                │            │   • Client robots.txt        │
│   • Platform sitemap    │            │                              │
│                         │            │   Integrity headers:         │
│   Domain:               │            │   • x-tenant-subdomain       │
│   menulist.ai           │            │   • x-tenant-custom-domain   │
│   www.menulist.ai       │            │   • x-tenant-type            │
└─────────────────────────┘            └─────────────────────────────┘
```

---

## How It Works

### 1. Domain Resolution (middleware.ts)

```typescript
import { resolveDomain } from "@lib/multiTenant/domainResolver";

const domainInfo = resolveDomain(hostname);
// Returns: { type, subdomain?, customDomain?, isPlatform, isClient }
```

### 2. Domain Types

| Domain                  | Type        | Routed To              |
| ----------------------- | ----------- | ---------------------- |
| `menulist.ai`           | `platform`  | `/app/(website)/*`     |
| `www.menulist.ai`       | `platform`  | `/app/(website)/*`     |
| `app.menulist.ai`       | `platform`  | Reserved for dashboard |
| `joespizza.menulist.online` | `subdomain` | `/app/client/*`       |
| `joespizza.com`         | `custom`    | `/app/client/*`       |
| `localhost:3000`        | `localhost` | Platform (dev)         |

### 3. Reserved Subdomains

These subdomains are reserved and NOT treated as client tenants:

```
www, app, api, admin, dashboard, mail, blog, help, support, status
```

### 4. Tenant Host and Header Flow

```
Request: joespizza.menulist.online
    ↓
Middleware deletes caller-supplied routing headers and forwards trusted claims:
    x-tenant-subdomain: "joespizza"
    x-tenant-type: "subdomain"
    ↓
Page derives identity from the original validated Host and checks claims:
    const { subdomain, tenantType } = getTenantFromHeaders()
    ↓
Database lookup:
    WHERE subdomain == "joespizza" AND active == true
    ↓
Render menu with store's primaryProjectId
```

---

## File Structure

```
src/
├── middleware.ts                          # Domain routing
├── lib/multiTenant/
│   ├── index.ts                          # Module exports
│   ├── domainResolver.ts                 # Domain type detection (Edge-safe)
│   └── domainLookup.ts                   # Firebase lookups (Server-only)
├── app/
│   ├── sitemap.ts                        # Platform sitemap
│   ├── (website)/                        # Platform routes
│   │   ├── page.tsx                      # Landing page
│   │   ├── about-us/
│   │   ├── pricing/
│   │   └── ...
│   └── client/                          # Client menu routes
│       ├── layout.tsx                    # Minimal layout
│       ├── sitemap.ts                    # Per-client sitemap
│       ├── robots.ts                     # Per-client robots
│       └── [[...slug]]/
│           └── page.tsx                  # Menu page with SEO
├── types/platform/
│   └── store.ts                          # StoreDataType with domain fields
└── components/templates/main-app/
    └── projects/b2cView/shareModal/
        └── index.tsx                     # Share URL generation
```

---

## UX Recommendations

### Where Should Domain Settings Live?

Based on industry research (Linktree, Carrd, Notion, etc.):

| Setting           | Location          | Reason                                    |
| ----------------- | ----------------- | ----------------------------------------- |
| **Subdomain**     | Business Settings | One-time setup, like choosing a username  |
| **Custom Domain** | Business Settings | Requires DNS setup, needs verification UI |
| **Share Modal**   | Read-only display | Just shows the resulting URL              |

### Recommended UI Flow

#### 1. Subdomain Setup (Simple - Instant)

```
┌─────────────────────────────────────────────────────────────┐
│  📍 Your Menu URL                                           │
│                                                             │
│  Choose your subdomain:                                     │
│  ┌──────────────────┐                                       │
│  │ joespizza        │ .menulist.online                     │
│  └──────────────────┘                                       │
│                                                             │
│  ✓ Available!                                               │
│                                                             │
│  Your menu will be live at:                                 │
│  https://joespizza.menulist.online                              │
│                                                             │
│  [Save Subdomain]                                           │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Custom Domain Setup (Advanced - DNS Required)

```
┌─────────────────────────────────────────────────────────────┐
│  🌐 Custom Domain (Pro Feature)                             │
│                                                             │
│  Enter your domain:                                         │
│  ┌──────────────────────────────────────────┐              │
│  │ menu.joespizza.com                        │              │
│  └──────────────────────────────────────────┘              │
│                                                             │
│  DNS Configuration Required:                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Type: CNAME                                          │   │
│  │ Name: menu                                           │   │
│  │ Value: cname.vercel-dns.com                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Status: ⏳ Waiting for DNS propagation...                  │
│                                                             │
│  [Verify Domain]                                            │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Share Modal (Read-Only)

```
┌─────────────────────────────────────────────────────────────┐
│  Share Your Menu                                            │
│                                                             │
│  🔗 https://joespizza.menulist.online                           │
│     [Copy] [Open]                                           │
│                                                             │
│  [QR Code]                                                  │
│                                                             │
│  💡 Want a custom domain? Go to Settings → Domain           │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup Flow for End Users

### Self-Service Subdomain (No Support Needed)

1. User goes to **Business Settings → Domain**
2. Enters desired subdomain (e.g., "joespizza")
3. System checks availability in real-time
4. User clicks "Save" → Instant activation
5. Menu is live at `joespizza.menulist.online`

### Self-Service Custom Domain

1. User goes to **Business Settings → Domain → Custom Domain**
2. Enters their domain (e.g., `menu.joespizza.com`)
3. System shows DNS instructions:
   - Type: `CNAME`
   - Name: `menu` (or `@` for root)
   - Value: `cname.vercel-dns.com`
4. User configures DNS at their domain provider
5. User clicks "Verify" → System checks DNS
6. A newly connected hostname starts with `domainVerified: false`; `/api/domain` invalidates public cache, and the custom domain can serve only after a current provider check confirms it.

---

## Database Schema

### StoreDataType Fields

```typescript
// src/types/platform/store.ts

interface StoreDataType {
  // ... existing fields ...

  // Multi-tenant Domain Settings
  subdomain?: string; // e.g., "joespizza"
  customDomain?: string; // e.g., "joespizza.com"
  domainVerified?: boolean; // DNS verification status
  primaryProjectId?: string; // Default menu to show on domain
}
```

### Firestore Indexes Required

```
Collection: stores
Index 1: subdomain ASC, active ASC
Index 2: customDomain ASC, domainVerified ASC, active ASC
```

---

## Vercel DNS Configuration

### For Subdomains (Automatic)

Subdomains like `*.menulist.online` are handled automatically via Vercel's wildcard DNS.

### For Custom Domains (Owner DNS + MenuList/Vercel API)

1. Client adds CNAME record at their DNS provider
2. `POST /api/domain` transactionally reserves a deterministic MenuList claim with a request UUID, adds or proves the domain in the configured Vercel project, rechecks the canonical tenant/store and reservation, then starts a new hostname unverified (an idempotent same-domain retry preserves or reconciles already-confirmed state)
3. `GET /api/domain` checks Vercel and reconciles `domainVerified` in both directions only for explicit configured/misconfigured responses; provider errors preserve the last confirmed value
4. Certificate provisioning is provider-managed after the domain is accepted and configured

`platformSummary/customDomainClaim_{domain}` is the ownership ledger. Active `reserved` and `releasing` leases block every other operation, including one from the same store; finalization requires the same reservation UUID. Replace/remove locks the old claim before provider deletion and releases it only after the awaited cleanup result. A Vercel `409` requires MenuList provenance plus current-project confirmation. Duplicate store rows, mismatched claim owners, and incompatible legacy claim states fail closed with `409`; malformed legacy hostnames may be cleared locally but are not sent to Vercel.

Public lookup returns store truth only, but a cold cache miss also reads the referenced tenant document to validate tenant existence, exact identity, and lifecycle/platform-block eligibility. Tenant fields do not cross into the public store payload.

### Vercel Domains API

```typescript
// Runtime path used by /api/domain.
await fetch("https://api.vercel.com/v10/projects/{projectId}/domains", {
  method: "POST",
  headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  body: JSON.stringify({ name: "menu.joespizza.com" }),
});
```

---

## Testing Guide

### Local Testing with /etc/hosts

1. Edit `/etc/hosts`:

   ```
   127.0.0.1 joespizza.menulist.local
   ```

2. Update `domainResolver.ts` temporarily:

   ```typescript
   if (normalizedHost.endsWith(".menulist.local")) {
     // Treat as subdomain for testing
   }
   ```

3. Visit `http://joespizza.menulist.local:3000`

### Production Testing

1. Set `subdomain` field in Firestore for a test store
2. Visit `https://{subdomain}.menulist.online`
3. Verify menu loads with correct SEO metadata

---

## Troubleshooting

### Menu Not Loading

| Symptom              | Cause                          | Fix                                  |
| -------------------- | ------------------------------ | ------------------------------------ |
| 404 on subdomain     | No store with that subdomain   | Check Firestore                      |
| 404 on custom domain | `domainVerified: false`        | Verify DNS, set flag                 |
| Wrong menu shown     | Wrong `primaryProjectId`       | Update store record                  |
| SSL error            | Vercel hasn't provisioned cert | Wait 5 mins, or add domain in Vercel |

### Debugging Tenant Resolution

Use the bounded resolver result rather than logging raw request headers:

```typescript
const tenant = await getTenantFromHeaders("ClientPage");
// Inspect only in an approved local debugger. Do not add raw header logging.
```

---

## Implementation Checklist

### ✅ Completed

- [x] Domain resolver utility (`domainResolver.ts`)
- [x] Domain lookup service (`domainLookup.ts`)
- [x] Middleware domain routing
- [x] Client route group (`/client`)
- [x] Client page with SEO metadata
- [x] Client sitemap.ts
- [x] Client robots.ts
- [x] StoreDataType domain fields
- [x] ShareModal subdomain/customDomain support
- [x] Platform sitemap (excludes client menus)

### 🔲 TODO (UI Implementation)

- [ ] Domain settings UI in Business Settings
- [ ] Subdomain availability checker API
- [ ] Custom domain DNS verification flow
- [ ] Vercel Domains API integration (automation)

---

## Related Documentation

- [SEO Implementation Guide](./seo-implementation-guide.md)
- [Vercel Platforms Documentation](https://vercel.com/platforms/docs)
- [Next.js Multi-Tenant Guide](https://nextjs.org/docs/app/guides/multi-tenant)

---

## Appendix: Share URL Generation

```typescript
// ShareModal generates URLs based on domain settings
const getShareUrl = () => {
  if (customDomain) return `https://${customDomain}`;
  if (subdomain) return `https://${subdomain}.menulist.online`;
  return `${window.location.origin}/menu/${projectId}`; // localhost fallback
};
```
