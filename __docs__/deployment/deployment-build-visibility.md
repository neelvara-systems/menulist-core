# Deployment Build Visibility (Preview + Production)

> **Category:** Infrastructure  
> **Last Updated:** April 17, 2026

---

## Purpose

This document explains the deployment visibility layer added to remove ambiguity after Vercel deploys.

It answers one operational question:

`Is this URL serving the latest deployment or not?`

---

## What Was Added

1. On-demand build badge in UI (hidden by default)
- Shows `shortBuildId · env` (example: `a1b2c3d · preview`)
- Visible only when URL contains `?v=1` (or `?v=true`)

2. Runtime verification endpoint
- `GET /api/version`
- Returns deployment/server truth: build ID, env, deployment URL, and current server timestamp

3. Public env wiring for client visibility
- `NEXT_PUBLIC_BUILD_ID`
- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_DEPLOYMENT_URL`
- `NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE`

---

## Why This Was Added

Without this, preview validation is unreliable when cache, service worker, or URL confusion is involved.

This setup gives two levels of confidence:

1. **UI signal** (`?v=1`) for quick visual confirmation
2. **Server truth** (`/api/version`) for deterministic verification

---

## Where It Was Added

- Env exposure: `next.config.js`
- Global mount: `src/app/layout.tsx`
- Badge component: `src/components/common/DeploymentBuildBadge.tsx`
- Version endpoint: `src/app/api/version/route.ts`
- Feature-flag record: `src/config/features.ts` (`ENABLE_DEPLOYMENT_BUILD_BADGE`)

---

## How To Use After Deployment

### 1) Quick check in preview/prod UI

Open any deployment URL with query param:

- `https://<your-url>?v=1`

Expected:
- Bottom-right internal badge appears
- Format: `<shortBuildId> · <env>`

### 2) Ground-truth server verification

Open:

- `https://<your-url>/api/version`

Expected JSON fields:
- `buildId`
- `shortBuildId`
- `env`
- `deploymentUrl`
- `timestamp`

### 3) Compare both signals

If badge build and `/api/version` build match, deployment is aligned.

If they do not match, you are seeing a stale client state (usually cache/service worker/browser tab state).

---

## Operational Notes

1. Badge is internal-only by trigger (`?v=1`), not shown to normal users.
2. `/api/version` is configured `no-store` to avoid cached verification responses.
3. Badge can be disabled without code change by setting:
- `NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE=false`

---

## Troubleshooting Sequence

1. Confirm you are on the correct deployment URL.
2. Check `/api/version` first (server truth).
3. Check UI with `?v=1`.
4. If mismatch persists, hard refresh and re-open the URL in a new tab.

No action needed when both values match.

