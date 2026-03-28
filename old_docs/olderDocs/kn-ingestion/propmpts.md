# CONTEXT FOR THE AI MODEL

You are a senior full-stack developer specializing in Next.js, Ant Design, and Firebase. Your task is to build a new feature page within an existing SaaS dashboard application.

## PROJECT BLUEPRINT: AI-POWERED KNOWLEDGE BASE (KB) GENERATOR

The overall project is to build an "AI-Powered KB Generator." This system allows an internal user to upload source files (PDFs, videos, etc.), and our AI pipeline (powered by Gemini 2.5 Flash) will automatically generate a structured, topic-based knowledge base. The final output is a set of "Categories" which contain "Atomic Sections" (like mini-articles), which will power both a public-facing documentation site and an internal chatbot.

The page you are building today is the very first step in this pipeline.

## ANALYSIS OF EXISTING CODE & UI

You must adhere to the coding patterns, technologies, and design language established in the project files I have provided. Key patterns to follow are:

1.  **UI/UX:** The application uses a three-pane layout for displaying knowledge base content, as seen in the provided screenshot of the `Knowledge Base` page. The new `KB Generation` page should feel like a natural part of this existing application, using the same Ant Design components and dark/light mode theme.
2.  **Firebase Interaction:** All interactions with Firestore are handled **directly on the client-side**. We do **NOT** use Next.js API routes for simple CRUD operations. All database calls are wrapped in a custom `apiCallComposer` utility for centralized error handling and logging. You MUST follow this pattern. refer this file for more details `src/database/knowledgeBase/articles.ts`
3.  **State Management:** The application uses Redux for managing global loading states. You MUST dispatch the `startLoader` and `stopLoader` actions for any asynchronous operations to provide consistent feedback to the user.

## YOUR TASK: GENERATE THE UI FOR STEP 1 - THE KB GENERATION DASHBOARD

Your task is to generate the complete frontend code for the **`KBGenerationPage`**. This is the screen the user lands on when they click "KB Generation" in the sidebar menu (as seen in the screenshot). It serves as the dashboard for all content generation jobs.

## TECHNICAL SPECIFICATIONS & REQUIREMENTS

- **Framework & Language:** Next.js 14+ (App Router), TypeScript.
- **UI Library:** Ant Design v5. Use Ant Design components exclusively (e.g., `<Typography.Text>`, `<Layout>`, `<Card>`, `<Modal>`, etc.).

### 1. The Main Page Component (`app/kb-generation/page.tsx`)

- **Initial (Empty) State:** When the component loads and finds no existing jobs, it must render an Ant Design `<Empty>` component. This component must have a descriptive message and a primary call-to-action `<Button>` to "Upload New Content."
- **Populated State:** If jobs exist, the page must render a header with a `<Typography.Title>` and the "Upload New Content" `<Button>`. Below this, it must render a responsive grid of `JobCard` components using `<Row>` and `<Col>`.

### 2. The Upload Modal Flow & Logic

- The "Upload New Content" button opens an Ant Design `<Modal>`.
- This modal will handle the entire file upload and job creation process **on the client-side**.
- **File Uploads:** Use the Firebase v9+ Client SDK for direct-to-storage uploads. You must show progress for each file.
- **Job Creation:** After uploads are complete, a "Start Generation" button will trigger the job creation logic. This logic must:
  1.  Dispatch a `startLoader` action.
  2.  Create a new document in the `ingestion_jobs` Firestore collection using the `addDoc` function, wrapped in our `apiCallComposer`.
  3.  Upon success, perform an "optimistic update" to the local state to instantly show the new job card.
  4.  Close the modal.
  5.  Dispatch a `stopLoader` action.

### 3. The `JobCard` Component

- This component displays a single job from the `ingestion_jobs` collection.
- It must use an Ant Design `<Card>` and be `hoverable` only if the job's status is `needs_review`.
- It must display the job's key information and a status `<Tag>` with colors/icons matching the job's status.
- It must be wrapped in a Next.js `<Link>` that navigates to `/review/[taskId]` only when clickable.

### 4. Data Models (Use these TypeScript interfaces)

````typescript
// Interface for the data stored in Firestore
export interface IngestionJob {
  id: string;
  uploaderUid: string;
  status: 'processing' | 'needs_review' | 'publishing' | 'published' | 'failed';
  sourceFiles: {
    storagePath: string;
    fileName: string;
    type: string;
  }[];
  createdOn: string; // ISO string
  taskId?: string;
}

Now, please generate the complete, production-ready code for this UI. Provide the code in separate, well-structured files as follows:
src/components/templates/platform/KBGeneration/index.tsx (The main dashboard page component).
src/components/templates/platform/KBGeneration/JobCard.tsx (The job card component).
src/components/templates/platform/KBGeneration/UploadModal.tsx (The upload modal component).
A new file, database/kb-generation/jobs.ts, for the client-side Firestore interaction logic for creating and fetching jobs, following the existing pattern of articles.ts and categories.ts.


step 2:

# CONTEXT FOR THE IMPLIMENTATION

You are a senior backend developer specializing in TypeScript, Google Cloud Functions, Firebase (Firestore, Cloud Storage), and the Vertex AI SDK. Your task is to build the core AI processing step for our "AI-Powered Knowledge Base (KB) Generator."

## PROJECT BLUEPRINT & ARCHITECTURE

The system you are working on allows users to upload source files (videos, PDFs, etc.). This triggers an asynchronous backend pipeline to generate a structured knowledge base. The architecture is **multi-tenant**, and all data must be strictly isolated using `sId`, `tId`, and `uId`.

The overall architecture is event-driven and Firebase-native. We are using **Firebase Functions** for our backend logic, triggered by Firestore events.

The core AI model is **Gemini 2.5 Pro**. We will leverage its native multimodal capabilities by passing `gs://` URIs of the source files directly in the prompt.

## ANALYSIS OF EXISTING CODE & PATTERNS

You must adhere to the coding patterns established in the project. The most relevant pattern is the `prompt.ts` file used for menu parsing. We will adopt this pattern of having a separate, highly-detailed prompt generation file. We will **NOT** use the Next.js API route pattern from `route.ts`, as this new task is long-running and asynchronous.

## YOUR TASK: IMPLEMENT STEP 2 - THE "ONE-SHOT GENERATION" FIREBASE FUNCTION

Your task is to generate the complete, production-ready code for the Firebase Function that executes Step 2 of our pipeline.

This function's responsibilities are:
1.  Trigger when a new `ingestion_job` is created.
2.  Call the Gemini 2.5 Pro model with a "mega-prompt" containing all source files.
3.  Create an audit trail for the AI call in an `ai_runs` collection.
4.  Parse the AI's JSON response and save the results to a `staging_sections` collection.

## TECHNICAL SPECIFICATIONS & REQUIREMENTS

-   **Environment:** Firebase Functions (2nd Gen, TypeScript).
-   **Trigger:** Firestore `onDocumentCreated` on the path `ingestion_jobs/{jobId}`.
-   **Timeout & Region:** Configure the function to run in `us-central1` with a **900-second (15-minute) timeout** and 1GB of memory to handle large jobs.
-   **AI Model:** Use `gemini-2.5-pro` via the `@google-cloud/vertex-ai` SDK.
-   **Multimodality:** Pass all source files to the model using `gs://` URIs.

## DETAILED IMPLEMENTATION REQUIREMENTS

### 1. Function Structure (Create two files)

-   **`functions/src/index.ts`:** The main file that defines the Cloud Function trigger and calls the core logic.
-   **`functions/src/prompts/kb-generation-prompt.ts`:** A separate file containing a function that constructs and returns the "mega-prompt".

### 2. The `startGeneration` Function (`index.ts`)

-   **Trigger:** Must be a Firestore trigger on `ingestion_jobs`.
-   **State Management:**
    -   Immediately upon triggering, it must update the job's `status` in Firestore to `processing`.
    -   Upon successful completion, it must update the `status` to `generation_complete` and add a `totalSectionsCount` field to the job document.
    -   It must include robust `try/catch` error handling. On failure, it must update the job's `status` to `failed` and log the error message.
-   **Provenance (`ai_runs`):**
    -   Before calling the Vertex AI SDK, it must create a new document in the `ai_runs` collection with the full prompt, `jobId`, and a `pending` status.
    -   After the call, it must update this document with the full raw response and a `success` or `failed` status.
-   **Staging Results:**
    -   It must parse the large JSON response from the AI.
    -   It will then loop through the generated content and create a new document in the `staging_sections` collection for each "atomic section".
    -   **Crucially, every document saved to `staging_sections` and `ai_runs` MUST be tagged with the `sId`, `tId`, and `uId` from the original job document.**

### 3. The `kb-generation-prompt.ts` File

-   This file should export a function, e.g., `constructKbGenerationPrompt(sourceFiles: {storagePath: string, type: string}[])`.
-   This function will return the final, multi-part prompt object required by the Vertex AI SDK.
-   The text part of the prompt must instruct the model to:
    -   Output a single JSON object: `{ "categories": [...] }`.
    -   Each category must contain an array of `atomicSections`.
    -   Each atomic section must have a `title` and `content` (as a Tiptap JSON object).
    -   **Every block-level node in the Tiptap JSON must have a `provenance` attribute** citing the `sourceFile` (`gs://` path) and `timestamp` (if applicable).

### 4. Data Models (Use these TypeScript interfaces)

```typescript
// From Step 1 - The data you will receive
export interface IngestionJob {
  id: string;
  status: 'pending' | 'processing' | 'needs_review' | 'published' | 'failed';
  sourceFiles: { storagePath: string; fileName: string; type: string; }[];
  taskId?: string;
  createdOn: string;
  modifiedOn: string;
  sId: string;
  tId: string;
  uId: string;
}

// For the audit trail
export interface AiRun {
  // id will be the doc ID
  jobId: string;
  status: 'pending' | 'success' | 'failed';
  model: 'gemini-2.5-pro';
  prompt: any; // The full request object sent to Vertex AI
  response?: any;
  error?: string;
  createdOn: string;
  sId: string;
  tId: string;
  uId: string;
}

// For the generated content
export interface StagingSection {
  // id will be the doc ID
  jobId: string;
  aiRunId: string;
  categoryTitle: string;
  title: string;
  content: any; // Tiptap JSON object
  createdOn: string;
  sId: string;
  tId: string;
  uId: string;
}
Now, please generate the complete, production-ready TypeScript code for the Firebase Function, structured into the two files as requested, and adhering to all specifications.

````
