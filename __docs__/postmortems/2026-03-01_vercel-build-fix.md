# Vercel Build OOM & Compilation Fixes — Post-Mortem

**Date:** March 1, 2026 | **Duration:** ~20 failed deployments → 1 success
**Final Success:** Commit `d62f715` — 7m 16s on 2-core / 8GB Vercel machine

---

## Timeline (20 builds, bottom-up from Vercel dashboard)

| # | Error Type | Root Cause |
|---|-----------|------------|
| 1-10 | OOM / SIGKILL / 45min timeout | Webpack memory exhaustion |
| 11-15 | Module not found (5 packages) | Packages removed but imports remained |
| 16 | TypeScript type error (tippy.js) | tiptap/suggestion leaks tippy types |
| 17-19 | Firebase auth/invalid-api-key | Firebase client init crashes without env vars during SSR |
| **20** | **SUCCESS** | **All fixes applied + env vars set** |

---

## Phase 1: OOM Fixes (Builds 1-10)

**Problem:** 1.4GB node_modules + webpack in-memory cache = 8GB RAM exhausted.

### Fix 1: Disable webpack cache on Vercel (BIGGEST impact)
```js
// next.config.js
if (process.env.VERCEL === '1' && !dev) { config.cache = false; }
```
Webpack cache stores ALL compiled modules in RAM. On 1.4GB deps, this alone uses 4-6GB.

### Fix 2: `webpackBuildWorker: true` + `serverSourceMaps: false`
Isolates webpack in separate worker. Stops generating server source maps.

### Fix 3: `outputFileTracingExcludes` for heavy node_modules
Skips scanning @swc, esbuild, webpack, firebase-admin etc during build trace phase.

### Fix 4: `"use client"` on @ant-design/plots components
D3-based charts (~2MB) were being traced into server bundle without this directive.

### Fix 5: Dynamic imports for jspdf
Converted 3 files from `import { fn } from 'jspdf'` to `await import('jspdf')` inside handlers.

### Fix 6: Delete unused musl SWC binary via vercel.json buildCommand
`rm -rf node_modules/@next/swc-linux-x64-musl && next build`

---

## Phase 2: Missing Packages (Builds 11-15)

**Problem:** Previous cleanup removed packages from package.json but left imports in code.

| Package | Fix |
|---------|-----|
| `@google/generative-ai` | Replaced with shared `genAIClient` from `@lib/google/genAi` |
| `exceljs` | Added back (Excel export feature) |
| `tippy.js` | Added back (TiptapEditor slash commands) |
| `fabric` | NOT needed — local `src/scripts/fabric.min.js` exists |
| `dayjs` | Added back (used throughout codebase) |

---

## Phase 3: TypeScript Error (Build 16)

**Problem:** `@tiptap/suggestion` types reference `Props`/`GetReferenceClientRect` from tippy.js.
**Fix:** `// @ts-nocheck` on `SlashCommandsExtension.ts` (file already uses `any` types).

---

## Phase 4: Firebase SSR Crash (Builds 17-19)

**Problem:** `firebaseClient.ts` calls `initializeApp()` at module scope. During `next build` page pre-rendering, no env vars = crash.

**Fix:** Guard initialization:
```typescript
const hasConfig = !!firebaseConfig.apiKey;
const firebaseApp = hasConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const firebaseClient = firebaseApp ? getFirestore() : null as any;
```

---

## 5 Rules to Never Repeat This

1. **Before removing ANY package:** `grep -rn "package-name" src/ --include="*.ts" --include="*.tsx"`
2. **One infrastructure fix per commit.** Never batch OOM fixes — impossible to debug.
3. **Check for local scripts before adding npm packages:** `find src/ -name "*.min.js"`
4. **Guard all SDK inits that need env vars.** Module-scope code runs during `next build`.
5. **Set Vercel env vars BEFORE pushing builds.** `NEXT_PUBLIC_*` vars are inlined at build time.

---

## Env Vars Audit Result

**NOT needed on Vercel (dead code):** All 4 STRIPE vars, TRANSLATION_MODEL, DESCRIPTION_MODEL, IMAGE_PROCESSING_MODEL, GEMINI_EMBED_MODEL, GEMINI_CHAT_MODEL, GA_ID_TEST, NEXTAUTH_URL (auto-set by Vercel), NEXT_PUBLIC_BASE_URL.

**Required:** All NEXT_PUBLIC_FIREBASE_*, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY, GEMINI_AI_KEY, RAZORPAY_*, GA_CLIENT_EMAIL/PRIVATE_KEY/PROJECT_ID, UPSTASH_REDIS_*, BATCH_IMAGE_GENERATION_*.
