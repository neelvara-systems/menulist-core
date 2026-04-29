---
description: Debug Vercel build failures - OOM, module not found, type errors, SSR crashes
---

# Vercel Build Debug Workflow

Use when a Vercel build fails. Follow these steps in order based on the error type.

## Step 1: Identify the Error Phase

Read the build log and identify which phase failed:
- **"Creating an optimized production build"** → Webpack compilation (OOM or module errors)
- **"Linting and checking validity of types"** → TypeScript errors
- **"Collecting page data"** → SSR/SSG runtime errors (Firebase init, missing env vars)
- **"Generating static pages"** → Page-level runtime errors
- **"Collecting build traces"** → Timeout (outputFileTracingExcludes needed)

## Step 2: OOM / SIGKILL Fix Checklist

If build is killed with SIGKILL or times out at 45 minutes:

1. Verify `config.cache = false` on Vercel builds in next.config.js
2. Verify `webpackBuildWorker: true` in experimental
3. Verify `serverSourceMaps: false` in experimental
4. Verify `outputFileTracingExcludes` covers heavy node_modules
5. Check for `@ant-design/plots` or D3 components missing `"use client"`
6. Check for heavy libs (jspdf, exceljs, fabric) with static imports — convert to dynamic
7. Verify `vercel.json` removes unused SWC binary

## Step 3: Module Not Found Fix

If `Module not found: Can't resolve 'package-name'`:

1. Check if package is in `package.json` — if missing, add it back
2. BUT FIRST check if a local bundled version exists: `find src/ -name "*.min.js"`
3. If local version exists, do NOT add npm package — fix the import path instead
4. After adding package, run `npm install --package-lock-only` then commit both files
5. **Proactive scan:** Search for ALL other potentially missing packages before pushing

## Step 4: TypeScript Error Fix

If `TypeScript error in ...`:

1. Read the exact error and file
2. If error is in a type leak from node_modules (e.g., tiptap → tippy.js), use `// @ts-nocheck`
3. If error is in user code, fix the actual type issue
4. Always verify with `npx tsc --noEmit` locally before pushing

## Step 5: SSR Runtime Error Fix

If `Failed to collect page data` or Firebase/SDK errors:

1. Check if the error is a missing env var (`auth/invalid-api-key` = missing NEXT_PUBLIC_FIREBASE_API_KEY)
2. Guard SDK initialization: `const hasConfig = !!config.apiKey; const client = hasConfig ? init(config) : null;`
3. Remind user to set env vars on Vercel project settings
4. `NEXT_PUBLIC_*` vars are inlined at BUILD TIME — they must exist during `next build`

## Step 6: Before Every Push

// turbo
1. Run `npx tsc --noEmit` — must be zero errors
2. Run `npm install --package-lock-only` if package.json changed
3. Commit package.json AND package-lock.json together
4. ONE fix per commit for build infrastructure changes

## Package Removal Safety Protocol

**NEVER remove a package from package.json without:**
1. `grep -rn "package-name" src/ --include="*.ts" --include="*.tsx"`
2. `grep -rn "import('package-name')" src/`
3. `find src/ -name "*.min.js"` to check for local bundled versions
4. Removing/updating ALL import references first
5. Running `npx tsc --noEmit` after removal
