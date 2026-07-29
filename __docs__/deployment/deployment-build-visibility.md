# Deployment Build Visibility (Preview + Production)

> **Category:** Infrastructure  
> **Last Updated:** June 30, 2026

---

## Purpose

This document explains the deployment visibility layer added to remove ambiguity after Vercel deploys.

It answers one operational question:

`Is this URL serving the latest deployment or not?`

---

## What Was Added

1. On-demand build badge in UI (hidden by default)
- Shows `shortBuildId · env` (example: `a1b2c3d · preview`)
- Includes:
  - `Build: <date-time>` when `/api/version` returns a valid `buildCreatedAt`
  - Tenant/store identity when the owner shell has stored an exact bounded deployment identity context
- Visible when any of these triggers are used:
  - URL contains `?v=1` (or `?v=true`)
  - Long-press **More** tab in mobile nav
  - Long-press **Log Out** row in mobile More screen

2. Runtime verification endpoint
- `GET /api/version`
- Returns deployment/server truth: build ID, short build ID, env, deployment URL, and build-created value

3. Public env wiring for client visibility
- `NEXT_PUBLIC_BUILD_ID`
- `NEXT_PUBLIC_ENV`
- `NEXT_PUBLIC_DEPLOYMENT_URL`
- `NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE`

4. Shared browser request and response guard
- `src/lib/deployment/versionResponse.ts`
- Calls `/api/version` with no-store cache, same-origin credentials, and manual redirect handling
- Caps `/api/version` response JSON at 8KB before browser consumers parse it
- Accepts only string-shaped version fields when present
- Logs malformed/oversized responses as `deployment_version_response_parse_failed`
- Logs invalid successful envelopes as `deployment_version_response_invalid`
- Returns `null` so owner workflows, badges, and diagnostic-copy flows can fail quiet instead of interrupting work

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
- Owner update prompt: `src/components/common/OwnerAppUpdatePrompt.tsx`
- Failure diagnostics: `src/components/shared/debug/ErrorReportButton.tsx`
- Shared version request policy and response parser: `src/lib/deployment/versionResponse.ts`
- Version endpoint: `src/app/api/version/route.ts`
- Feature-flag record: `src/config/features.ts` (`ENABLE_DEPLOYMENT_BUILD_BADGE`)

---

## How To Use After Deployment

### 1) Quick check in preview/prod UI

Use any one trigger:

- `https://<your-url>?v=1`
- Long-press More tab (mobile)
- Long-press Log Out row (mobile More screen)

Expected:
- Top-center internal badge appears
- First line: `<shortBuildId> · <env>`
- Optional second line: `Build: <date-time>`
- Optional tenant/store lines appear only when deployment identity context exists in session storage
- The session identity DTO contains only projected tenant/store IDs and names. IDs are capped at 128 characters, names at 200 characters, control characters and non-finite numeric IDs are rejected, and malformed/corrupt values are removed before rendering.

### 2) Ground-truth server verification

Open:

- `https://<your-url>/api/version`

Expected JSON fields:
- `buildId`
- `shortBuildId`
- `env`
- `deploymentUrl`
- `buildCreatedAt`

### 3) Compare both signals

If badge build and `/api/version` build match, deployment is aligned.

If they do not match, you are seeing a stale client state (usually cache/service worker/browser tab state).

---

## Operational Notes

1. Badge is internal-only by trigger (`?v=1`), not shown to normal users.
2. `/api/version` is configured `no-store` to avoid cached verification responses.
3. Browser consumers call `/api/version` through the shared no-store, same-origin, manual-redirect request policy.
4. Browser consumers parse `/api/version` through the shared 8KB bounded response guard before trusting the payload.
5. Malformed, oversized, or shape-invalid version responses fail quiet and keep owner work uninterrupted.
6. Denied session storage never blocks the owner shell or badge; the badge falls back to build-only output and records bounded development diagnostics.
7. Badge can be disabled without code change by setting:
- `NEXT_PUBLIC_ENABLE_DEPLOYMENT_BUILD_BADGE=false`

---

## Troubleshooting Sequence

1. Confirm you are on the correct deployment URL.
2. Check `/api/version` first (server truth).
3. Check UI with `?v=1`.
4. If mismatch persists, hard refresh and re-open the URL in a new tab.

No action needed when both values match.
