Excellent — thanks for insisting on clarity. Below I’ll show the **complete, production-ready pattern** for using **Google Secret Manager** (Firebase Secrets) so `GEMINI_API_KEY` is available inside **every** function type you listed (Firestore triggers, task workers, callables) — and how to test locally with `.env.local`.

I’ll give:

1. Short steps (CLI / one-time actions)
2. Local setup (.env.local + dotenv)
3. Exact, copy-pasteable **production-ready function code** (v2 functions) for each export you listed, with `secrets: ['GEMINI_API_KEY']` where required
4. Important notes about deploy / testing / troubleshooting

---

## 1) One-time CLI: store the secret in Google Secret Manager (Firebase)

Run **once** (or when rotating the key). This stores the secret in Secret Manager:

```bash
# interactive (recommended)
firebase functions:secrets:set GEMINI_API_KEY

# you'll be prompted to paste the key value (e.g. AIzaSyXXXXX)
```

Alternative (non-interactive, using stdin):

```bash
printf "AIzaSyXXXXX" | firebase functions:secrets:set GEMINI_API_KEY --data-file=-
```

You can list secrets with:

```bash
firebase functions:secrets:list
```

**Notes**

- Setting the secret stores it in Secret Manager and makes it available to functions, but **a function only receives it if that function declares the secret in its options** (see below) and you deploy that function.
- If you update the secret value later, you run the same `firebase functions:secrets:set GEMINI_API_KEY` command to rotate it — you do **not** redeploy functions just to rotate the secret value.

---

## 2) Local dev: use `.env.local` (emulator does not access Secret Manager)

Create `functions/.env.local` (in the `functions/` folder) with:

```
GEMINI_API_KEY=AIzaSyXXXXX
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
DATABASE_URL=https://<your-project>.firebaseio.com
PROJECT_ID=your-project-id
```

In code, load dotenv only when running in emulator:

```ts
// top of functions entrypoint (index.ts / firebaseAdmin.ts)
import dotenv from "dotenv";

if (process.env.FUNCTIONS_EMULATOR === "true") {
  dotenv.config({ path: ".env.local" });
  console.log("Loaded .env.local for emulator");
}
```

This makes `process.env.GEMINI_API_KEY` available locally for testing.

---

## 3) How secrets become available at runtime

- In **production** (deployed to Firebase) you must **declare** the secret in the function options (so IAM and injection are configured). In v2 this is the `secrets` option inside the function options object. When declared, Firebase injects the secret into `process.env.GEMINI_API_KEY` at runtime for that function.

- In **local emulator**, Firebase does **not** fetch secrets from Secret Manager — that’s why we rely on `.env.local`.

---

## 4) Production-ready code for each export (copy/paste)

> These are **v2** examples (`firebase-functions/v2/*`). They declare `secrets: ['GEMINI_API_KEY']` where the function needs it. Each function reads the key as `process.env.GEMINI_API_KEY`. For local testing the `.env.local` value will be used.

Put this in your `functions/src/index.ts` (or split across files, same shape):

```ts
// functions/src/index.ts
import * as admin from "firebase-admin";
import dotenv from "dotenv";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { onCall } from "firebase-functions/v2/https";
import { HttpsError } from "firebase-functions/v2/https"; // for throwing errors in callables

// -- load .env.local only in emulator --
if (process.env.FUNCTIONS_EMULATOR === "true") {
  dotenv.config({ path: ".env.local" });
  console.log("Loaded .env.local (EMULATOR)");
}

// -- initialize admin --
if (!admin.apps.length) admin.initializeApp();

// small helper to assert secret presence
function requireGeminiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key)
    throw new Error(
      "GEMINI_API_KEY missing — set .env.local for emulator or add secret and declare it in function options in prod"
    );
  return key;
}

// shared options for long-running functions
const longOpts = {
  region: "us-central1",
  timeoutSeconds: 540, // 9 minutes
  memory: "2GiB" as const,
  // secrets: ['GEMINI_API_KEY']   <--- set per function below
};

/**
 * 1) Firestore trigger: startGeneration — runs in prod (attach secret)
 *    (v2 onDocumentCreated supports 'secrets' in options)
 */
export const startGeneration = onDocumentCreated(
  {
    ...longOpts,
    document: "kb_generation_jobs/{jobId}",
    secrets: ["GEMINI_API_KEY"], // <-- declare secret here
  },
  async (event) => {
    const jobId = event.params.jobId;
    const geminiKey = process.env.GEMINI_API_KEY; // injected in prod, from .env.local in emulator
    if (!geminiKey) {
      console.error("[startGeneration] GEMINI_API_KEY missing");
      // optionally mark job failed or skip
      return;
    }
    console.log(
      `[startGeneration] jobId=${jobId} — running with GEMINI_KEY loaded`
    );
    // Your existing startGeneration logic here — make calls using geminiKey
  }
);

/**
 * 2) Firestore trigger: finalizePublish — runs in prod (attach secret)
 */
export const finalizePublish = onDocumentUpdated(
  {
    ...longOpts,
    document: "kb_generation_jobs/{jobId}",
    secrets: ["GEMINI_API_KEY"],
  },
  async (event) => {
    const jobId = event.params.jobId;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error("[finalizePublish] GEMINI_API_KEY missing");
      return;
    }
    console.log(`[finalizePublish] jobId=${jobId}`);
    // Your finalize logic...
  }
);

/**
 * 3) Task Queue worker: embedArticleWorker
 */
export const embedArticleWorker = onTaskDispatched(
  {
    ...longOpts,
    secrets: ["GEMINI_API_KEY"],
  },
  async (req) => {
    // req.data should contain { articleData, jobId } per your orchestrator
    const { article, jobId } = req.data as { article: any; jobId: string };
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error("[embedArticleWorker] GEMINI_API_KEY missing");
      return;
    }
    console.log("[embedArticleWorker] processing", {
      jobId,
      articleId: article?.id,
    });
    // Re-embed logic using geminiKey
  }
);

/**
 * 4) Callable: regenerateEmbedding
 */
export const regenerateEmbedding = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "2GiB",
    secrets: ["GEMINI_API_KEY"],
  },
  async (request) => {
    const { articleId } = request.data || {};
    if (!articleId)
      throw new HttpsError("invalid-argument", "Missing articleId");
    const geminiKey = process.env.GEMINI_API_KEY!;
    // regenerate embedding logic...
    return { success: true, articleId };
  }
);

/**
 * 5) Callable: publishApprovedJob (orchestrator)
 */
export const publishApprovedJob = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "2GiB",
    secrets: ["GEMINI_API_KEY"],
  },
  async (request) => {
    const { jobId, finalCategories } = request.data || {};
    if (!jobId || !finalCategories)
      throw new HttpsError(
        "invalid-argument",
        "Missing jobId or finalCategories"
      );
    const geminiKey = process.env.GEMINI_API_KEY!;
    // validation + update job doc + enqueue tasks using getFunctions().taskQueue(...)
    return { success: true, enqueuedCount: 0 };
  }
);

/**
 * 6) Dev-only callables (run only in emulator)
 *    - These are useful to simulate Firestore triggers while running local emulator and using .env.local
 */
export const dev_triggerStartGeneration =
  process.env.FUNCTIONS_EMULATOR === "true"
    ? onCall(async (request) => {
        const { jobId } = request.data || {};
        console.log("[dev_triggerStartGeneration] triggered", { jobId });
        // call the same handler code as startGeneration but invoked manually
        return { ok: true };
      })
    : undefined;

export const dev_triggerFinalizePublish =
  process.env.FUNCTIONS_EMULATOR === "true"
    ? onCall(async (request) => {
        const { jobId } = request.data || {};
        console.log("[dev_triggerFinalizePublish] triggered", { jobId });
        return { ok: true };
      })
    : undefined;
```

**Key points in code above**

- **`secrets: ['GEMINI_API_KEY']`** must be included in the options object for any function that needs the secret in production. That tells Firebase to grant that function access and inject the secret into `process.env`.
- Inside function handlers you read the secret with `process.env.GEMINI_API_KEY` — do **not** require `functions.config()` or other legacy APIs.
- For **local** testing the emulator uses `.env.local`; `dotenv` loads that file into `process.env`.
- You **must deploy** the functions after adding `secrets` in the options (the function must be updated/deployed so the secret binding is attached). Rotating secret values later does **not** require redeploy.

---

## 5) Deploy notes & workflow

- Add secret (one-time / when rotating):

  ```bash
  firebase functions:secrets:set GEMINI_API_KEY
  ```

- Add `secrets: ['GEMINI_API_KEY']` into the function options in code (as shown), then deploy the functions that reference it:

  ```bash
  firebase deploy --only functions:startGeneration,finalizePublish,embedArticleWorker,publishApprovedJob,regenerateEmbedding
  ```

  (or `firebase deploy --only functions`)

- If you **change the secret value** later, re-run the `firebase functions:secrets:set GEMINI_API_KEY` command — you **do not** need to redeploy functions to read the new secret value.

---

## 6) Local testing checklist

- Put `.env.local` under `functions/` with `GEMINI_API_KEY=...`.
- Run functions emulator from `functions/`:

  ```bash
  cd functions
  npm run build
  firebase emulators:start --only functions
  ```

- Use `dev_triggerStartGeneration` and `dev_triggerFinalizePublish` (callables) from your UI or Postman to simulate the trigger logic locally. The code will use `.env.local` value.

---

## 7) Troubleshooting tips

- If `process.env.GEMINI_API_KEY` is `undefined` in **production** after deployment:

  - Ensure the function was deployed **after** you added `secrets: ['GEMINI_API_KEY']` to its options.
  - Confirm secret exists: `firebase functions:secrets:list`.
  - Confirm function lists the secret: check the function details in the Firebase Console (or `gcloud functions describe <name>`).

- Do **not** log the full secret — use masked logs (`console.log("GEMINI key loaded:", !!process.env.GEMINI_API_KEY)`).
- If a deployed background function (Firestore trigger) must access the secret, it **must** be declared in its options (as shown). Background triggers support `secrets` in v2 options.

---

## 8) Quick FAQ

- **Do I need `.runWith(...)`?**
  For v2 you use `secrets` in the options object passed to the `on*` factory (shown above). For v1 you used `functions.runWith({ secrets: [...] })`. The intent is the same: declare the secret for the function.

- **Does setting the secret require redeploy?**
  Setting the secret itself does not require redeploy. But **attaching** it to a function (by adding `secrets: [...]` in code) _does_ require you to deploy that function so the binding is created.

- **Can all function types (Firestore triggers, tasks, callables) use secrets?**
  Yes — declare `secrets` in the options for v2 `onDocumentCreated`, `onDocumentUpdated`, `onTaskDispatched`, `onCall`, `onRequest`, etc. The runtime will inject the secret at `process.env.SECRET_NAME`.

---

If you want, I can now:

- Generate the **exact full files** for your project (index.ts + firebaseAdmin.ts) with the secret usage already wired in, or
- Produce a quick **checklist** you can run locally to verify `process.env.GEMINI_API_KEY` is present both in emulator and production (how to verify in logs and via `gcloud`).

Which would you prefer next?
