# AI Image Generation & Editing — Complete Documentation

**Feature:** AI-Powered Image Generation & Editing for Menu Items  
**Status:** ✅ Production Ready  
**Last Updated:** January 2025  
**Source of Truth:** Codebase Analysis

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Single Image Generation](#single-image-generation)
4. [Bulk/Batch Image Generation](#bulkbatch-image-generation)
5. [Image Editing](#image-editing)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [File Structure](#file-structure)
8. [Types & Interfaces](#types--interfaces)
9. [API Routes](#api-routes)
10. [Database Layer](#database-layer)
11. [Cloud Tasks Integration](#cloud-tasks-integration)
12. [Security Implementation](#security-implementation)
13. [UI Components](#ui-components)
14. [Prompt Engineering](#prompt-engineering)
15. [Improvements & Recommendations](#improvements--recommendations)

---

## Overview

The AI Image Generation feature provides two primary modes for generating images for menu items:

1. **Single Image Generation**: Real-time generation for individual items using Gemini 2.0 Flash or Imagen 3
2. **Bulk/Batch Image Generation**: Asynchronous generation for multiple items using Google Cloud Tasks

Additionally, there's an **Image Editing** capability that allows users to modify existing images using AI.

### Key Technologies

| Component         | Technology                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| AI Models         | Gemini 2.0 Flash (`gemini-2.0-flash-preview-image-generation`), Imagen 3 (`imagen-3.0-generate-002`) |
| Backend           | Next.js API Routes                                                                                   |
| Task Queue        | Google Cloud Tasks                                                                                   |
| Real-time Updates | Firebase Firestore `onSnapshot`                                                                      |
| Storage           | Firebase Storage                                                                                     |
| Frontend          | React, Ant Design, Redux Toolkit                                                                     |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI IMAGE GENERATION SYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SINGLE IMAGE GENERATION (Synchronous)                                │    │
│  │                                                                      │    │
│  │  ImageUploadModal → AiImageGenerator → generateImageViaApi          │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-generation                                         │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Gemini 2.0 Flash / Imagen 3                                        │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Base64 Image → Preview → Select → Upload to Storage                │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ BULK IMAGE GENERATION (Asynchronous)                                 │    │
│  │                                                                      │    │
│  │  ImageUploadModal → BatchSetupView → BatchImageGenerationView       │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  addImageBatchProcessingJob (Firestore)                             │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-generation/batch-trigger                           │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Google Cloud Tasks (one task per item)                             │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-generation/batch-generation (Worker)               │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  useImageBatchJobListener (Real-time Firestore updates)             │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  BatchImageGenerationResultView → Review → Upload/Discard           │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ IMAGE EDITING                                                        │    │
│  │                                                                      │    │
│  │  EditImageModal → editImageViaApi                                   │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-editing                                            │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Gemini 2.0 Flash (with reference image)                            │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Preview → Select → Upload                                          │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Single Image Generation

### Flow Description

1. **User Interface**: User opens `ImageUploadModal` and selects "Generate with AI" tab
2. **Configuration**: User configures generation options in `AiImageGenerator`:
   - Style category and specific styles
   - Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)
   - Environments, lighting, colors, moods, compositions
   - Background/foreground colors
   - Reference image (optional)
   - Custom prompt (optional)
   - Negative prompt (optional)
3. **Generation**: User clicks "Generate Image"
4. **API Call**: `generateImageViaApi` sends POST to `/api/image-generation`
5. **Backend Processing**:
   - Rate limiting check (5 req/min for expensive AI)
   - Input validation via Zod schema
   - Prompt construction via `getImagePrompts()`
   - Gemini/Imagen API call with safety settings
   - Token usage calculation and transaction logging
6. **Response**: Base64 images returned to frontend
7. **Selection**: User previews and selects images to upload
8. **Upload**: Selected images uploaded to Firebase Storage

### Key Files

| File                                                                               | Purpose                                       |
| ---------------------------------------------------------------------------------- | --------------------------------------------- |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx` | Main UI component for single image generation |
| `src/services/ai/image/generateImageViaApi.ts`                                     | Frontend service to call generation API       |
| `src/app/api/image-generation/route.ts`                                            | Backend API route handler                     |
| `src/app/api/image-generation/prompt.ts`                                           | Prompt construction logic                     |

### Code Flow

```typescript
// Frontend: AiImageGenerator/index.tsx
const onGenerateImage = async () => {
  dispatch(startLoader("Generating Image"));

  const generatedImages = await generateImageViaApi({
    itemDetails: {
      id: selectedItem.id,
      name: selectedItem.itemName,
      description: selectedItem.descriptionLine,
      attributes: selectedItem.attributesList,
      category: selectedItem.categoryName,
    },
    generationConfig: generationConfig,
    projectId: activeProject?.projectId,
    fileId: selectedItem?.fileId,
    businessType: storeDetails?.businessType,
  });

  // Update UI with generated images
  setGenerationConfig({ ...generationConfig, generatedImages });
  dispatch(stopLoader("Generating Image"));
};
```

```typescript
// Backend: /api/image-generation/route.ts
export const POST = withAuth(async (request, session) => {
  // Rate limiting
  const rateLimitResponse = await checkExpensiveAILimit();
  if (rateLimitResponse) return rateLimitResponse;

  // Input validation
  const validation = validateAPIInput(ImageGenerationRequestSchema, rawData);

  // Generate prompts
  const promptsToExecute = getImagePrompts(jsonData, AI_MODEL);

  // Call AI API
  const result = await generateGeminiImageViaFlash(prompt, generationConfig);

  return NextResponse.json({
    data: result.images,
    transaction: transactionObject,
  });
});
```

---

## Bulk/Batch Image Generation

### Flow Description

1. **Item Selection**: User opens `ImageUploadModal` and selects "For Multiple Items"
2. **Batch Setup**: `BatchSetupView` displays all items with filtering options:
   - Search by name
   - Filter: Show only items without images
   - Select/deselect by category or individual items
3. **Configuration**: `BatchImageGenerationView` for generation settings (same as single)
4. **Content Policy**: User must accept content policy agreement
5. **Job Creation**:
   - `addImageBatchProcessingJob` creates Firestore document with status `queued`
   - `triggerBatchImageGenerationApi` calls batch-trigger endpoint
6. **Task Enqueuing**:
   - `/api/image-generation/batch-trigger` creates one Cloud Task per item
   - Tasks are enqueued to Google Cloud Tasks queue
7. **Background Processing**:
   - Each task calls `/api/image-generation/batch-generation`
   - Images generated and uploaded to Firebase Storage
   - Firestore job document updated with progress
8. **Real-time Monitoring**:
   - `useImageBatchJobListener` listens to Firestore changes
   - `BatchImageGenerationResultView` shows live progress
9. **Review & Action**:
   - User can view generated images
   - Actions: Upload selected, Discard all, Retry failed, Cancel job

### Batch Job Status Lifecycle

```
┌─────────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
│ QUEUED  │ → │ PROCESSING │ → │ COMPLETED │ → │ FINISHED │
└─────────┘    └────────────┘    └───────────┘    └──────────┘
     │              │                  │
     │              │                  ▼
     │              │           ┌───────────┐
     │              │           │ DISCARDED │
     │              │           └───────────┘
     │              │
     ▼              ▼
┌───────────┐  ┌────────┐
│ CANCELLED │  │ FAILED │
└───────────┘  └────────┘
```

### Status Definitions

| Status       | Description                                      |
| ------------ | ------------------------------------------------ |
| `queued`     | Job created and added to Google Cloud Task queue |
| `processing` | Job is actively generating images                |
| `completed`  | All images generated successfully                |
| `failed`     | Job failed due to errors                         |
| `cancelled`  | User cancelled the job while processing/queued   |
| `finished`   | User uploaded the generated images               |
| `discarded`  | User discarded the completed job                 |

### Key Files

| File                                                                                                                             | Purpose                              |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx`                          | Item selection UI (`BatchSetupView`) |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx`       | Configuration UI                     |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx` | Results & actions UI                 |
| `src/hooks/useImageBatchJobListener.ts`                                                                                          | Firestore real-time listener         |
| `src/services/ai/image/triggerBatchImageGenerationApi.ts`                                                                        | API service to trigger batch         |
| `src/app/api/image-generation/batch-trigger/route.ts`                                                                            | Batch trigger endpoint               |
| `src/app/api/image-generation/batch-generation/route.ts`                                                                         | Worker endpoint for Cloud Tasks      |
| `src/lib/google/cloudTask/index.ts`                                                                                              | Cloud Task enqueue function          |
| `src/database/imageBatchProcessing/index.tsx`                                                                                    | Firestore DAL for batch jobs         |

### Batch Job Data Structure

```typescript
type BatchImageGenerationJobType = {
  id?: string;
  status: BatchImageGenerationJobStatusType;
  totalImages: number;
  generatedCount: number;
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  itemsList: {
    id: string;
    name: string;
    images: UserUploadedFileType[];
  }[];
  statusHistory: {
    status: BatchImageGenerationJobStatusType;
    reason?: string;
    createdOn: string | number | Date;
  }[];
  error?: string;
  modifiedOn?: string | number | Date;
  createdOn?: string | number | Date;
};
```

### Cloud Task Integration

```typescript
// src/lib/google/cloudTask/index.ts
export async function enqueueImageGenerationTask(
  data: GenerateImageViaApiPayloadBatchType,
): Promise<string | undefined> {
  const parent = client.queuePath(PROJECT_ID, QUEUE_LOCATION, QUEUE_ID);

  const task = {
    httpRequest: {
      httpMethod: "POST",
      url: IMAGE_GENERATION_WORKER_URL, // /api/image-generation/batch-generation
      headers: {
        "project-id": process.env.FIREBASE_PROJECT_ID,
        "Content-Type": "application/json",
      },
      body: Buffer.from(JSON.stringify(data)).toString("base64"),
    },
  };

  const [response] = await client.createTask({ parent, task });
  return response.name;
}
```

### Environment Variables Required

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PROJECT_LOCATION=us-central1
BATCH_IMAGE_GENERATION_QUEUE_ID=image-generation-queue
BATCH_IMAGE_GENERATION_WORKER_URL=https://your-domain.com/api/image-generation/batch-generation
```

---

## Image Editing

### Flow Description

1. **Access**: User clicks edit on an existing image or generated image
2. **Modal**: `EditImageModal` opens with source image
3. **Feature Selection**: User selects an editing feature:
   - **Platform Features**: Enhance Image, Replace Background, Remove Background, Object Placement, Hair Style, Clothing Try-On, Tattoo Try-On, Skin Treatment, Custom Prompt
   - **Business-Specific Features**: Based on business type (Restaurant, Cafe, Spa, Salon, etc.)
4. **Configuration**: User provides prompt and optional secondary image
5. **Generation**: API call to `/api/image-editing`
6. **Preview**: Edited images displayed for selection
7. **Upload**: User can upload selected edited images

### Editing Features

#### Platform-Wide Features

| Feature            | Description                        | Requires Prompt | Requires Image |
| ------------------ | ---------------------------------- | --------------- | -------------- |
| Enhance Image      | Improve clarity, color, resolution | Optional        | No             |
| Replace Background | Replace existing background        | Optional        | No             |
| Remove Background  | Remove background completely       | No              | No             |
| Object Placement   | Place objects in image             | Required        | Required       |
| Hair Style         | Change hair style                  | Required        | Optional       |
| Clothing Try-On    | Virtual clothes try-on             | Required        | Optional       |
| Tattoo Try-On      | Preview tattoo on skin             | Required        | Optional       |
| Skin Treatment     | Treat skin imperfections           | Required        | No             |
| Custom Prompt      | Freeform editing                   | Required        | Optional       |

#### Business-Specific Features (Example: Restaurant)

| Feature               | Description                          |
| --------------------- | ------------------------------------ |
| Enhance Food Vibrancy | Boost colors and freshness of dishes |
| Regenerate Background | Replace with restaurant setting      |
| Add Appetizing Steam  | Add steam to hot dishes              |

### Key Files

| File                                                                                        | Purpose                      |
| ------------------------------------------------------------------------------------------- | ---------------------------- |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx` | Main editing modal UI        |
| `src/services/ai/image/editImageViaApi.ts`                                                  | Frontend API service         |
| `src/app/api/image-editing/route.ts`                                                        | Backend API route            |
| `src/app/api/image-editing/promptsList/index.ts`                                            | Prompt router                |
| `src/app/api/image-editing/promptsList/*.ts`                                                | Individual prompt generators |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/imageViewType.ts`   | Feature definitions          |

### Prompt Generation

```typescript
// src/app/api/image-editing/promptsList/index.ts
export function generateImageEditingPrompt(
    businessType: string,
    generationConfig: {...},
    itemDetails: GenerateImageViaApiPayloadItemDetailsType
): string | null {
    switch (feature) {
        case "Remove Background":
            return getRemoveBackgroundPrompt();
        case "Replace Background":
            return getBackgroundReplacementPrompt(prompt);
        case "Enhance Image":
            return getImageEnhancementPrompt(prompt);
        case "Object Placement":
            return getObjectPlacementPrompt(prompt);
        case "Hair Style":
            return getHairStylePrompt(prompt);
        case "Clothing Try-On":
            return getClothingTryonPrompt(prompt, hasMultipleImages);
        case "Tattoo Try-On":
            return getTattooTryonPrompt(prompt, hasMultipleImages);
        case "Skin Treatment":
            return getSkinTreatmentPrompt(prompt);
        case "Generic Single-Image Edit":
            return getGenericSingleImagePrompt(prompt);
        case "Generic Two-Image Edit":
            return getGenericTwoImagePrompt(prompt);
        default:
            return getBusinessSpecificPrompt(businessType, feature, itemDetails);
    }
}
```

---

## Data Flow Diagrams

### Single Image Generation Flow

```
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ User clicks  │     │ generateImageViaApi│     │ /api/image-        │
│ "Generate"   │ ──► │ constructs payload │ ──► │ generation         │
└──────────────┘     └───────────────────┘     └────────────────────┘
                                                        │
                                                        ▼
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ Display in   │     │ Return base64     │     │ getImagePrompts()  │
│ UI preview   │ ◄── │ images            │ ◄── │ + Gemini API call  │
└──────────────┘     └───────────────────┘     └────────────────────┘
       │
       ▼
┌──────────────┐     ┌───────────────────┐
│ User selects │     │ uploadFile()      │
│ images       │ ──► │ to Firebase       │
└──────────────┘     └───────────────────┘
```

### Batch Image Generation Flow

```
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ User selects │     │ BatchSetupView    │     │ BatchImageGenera-  │
│ items        │ ──► │ item selection    │ ──► │ tionView config    │
└──────────────┘     └───────────────────┘     └────────────────────┘
                                                        │
                                                        ▼
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ Firestore    │     │ addImageBatch-    │     │ User clicks        │
│ job created  │ ◄── │ ProcessingJob()   │ ◄── │ "Generate"         │
└──────────────┘     └───────────────────┘     └────────────────────┘
       │
       ▼
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ Cloud Tasks  │     │ triggerBatchImage │     │ /api/image-gen/    │
│ created      │ ◄── │ GenerationApi()   │ ◄── │ batch-trigger      │
└──────────────┘     └───────────────────┘     └────────────────────┘
       │
       ▼ (for each item)
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ Image gen    │     │ /api/image-gen/   │     │ Update Firestore   │
│ + upload     │ ──► │ batch-generation  │ ──► │ job document       │
└──────────────┘     └───────────────────┘     └────────────────────┘
                                                        │
                                                        ▼
┌──────────────┐     ┌───────────────────┐     ┌────────────────────┐
│ UI updates   │     │ useImageBatchJob- │     │ Firestore          │
│ in real-time │ ◄── │ Listener hook     │ ◄── │ onSnapshot         │
└──────────────┘     └───────────────────┘     └────────────────────┘
```

---

## File Structure

```
src/
├── app/api/
│   ├── image-generation/
│   │   ├── route.ts                    # Single image generation API (300 lines)
│   │   ├── prompt.ts                   # Prompt construction (279 lines)
│   │   ├── batch-trigger/
│   │   │   └── route.ts                # Batch job trigger API (105 lines)
│   │   └── batch-generation/
│   │       └── route.ts                # Cloud Task worker API (358 lines)
│   │
│   └── image-editing/
│       ├── route.ts                    # Image editing API (162 lines)
│       └── promptsList/
│           ├── index.ts                # Prompt router (67 lines)
│           ├── getRemoveBackgroundPrompt.ts
│           ├── getBackgroundReplacementPrompt.ts
│           ├── getImageEnhancementPrompt.ts
│           ├── getGenericSingleImagePrompt.ts
│           ├── getGenericTwoImagePrompt.ts
│           ├── getObjectPlacementPrompt.ts
│           ├── getHairStylePrompt.ts
│           ├── getClothingTryonPrompt.ts
│           ├── getTattooTryonPrompt.ts
│           ├── getSkinTreatmentPrompt.ts
│           └── getBusinessSpecificPrompt.ts
│
├── components/templates/main-app/projects/
│   ├── editorView/
│   │   ├── ImageUploadModal.tsx        # Main modal container (619 lines)
│   │   └── AiImageGenerator/
│   │       ├── index.tsx               # Single generation UI (527 lines)
│   │       ├── EditImageModal.tsx      # Image editing UI (478 lines)
│   │       ├── StyleSelector.tsx       # Style selection modal (113 lines)
│   │       ├── AspectRatioSelector.tsx # Aspect ratio picker (70 lines)
│   │       ├── ChatWidgetUi.tsx        # Prompt input UI (130 lines)
│   │       ├── MultiSelectAttributeSelector.tsx # Attribute selection (73 lines)
│   │       ├── GenerationHistory.tsx   # History component [NOT INTEGRATED] (135 lines)
│   │       ├── PromptEnhancer.tsx      # Prompt enhancement [NOT INTEGRATED] (173 lines)
│   │       ├── imageViewType.ts        # Business-specific features (6723 lines)
│   │       └── batchImageGeneration/
│   │           ├── index.tsx           # BatchSetupView (255 lines)
│   │           ├── BatchImageGenerationView.tsx  # Config UI (265 lines)
│   │           └── BatchImageGenerationResultView.tsx # Results UI (520 lines)
│   │
│   └── types/
│       ├── index.ts                    # Type exports
│       ├── imageGeneration.types.ts    # Generation config types (98 lines)
│       └── batchJob.types.ts           # Batch job types (32 lines)
│
├── services/ai/image/
│   ├── generateImageViaApi.ts          # Single generation service (66 lines)
│   ├── triggerBatchImageGenerationApi.ts # Batch trigger service (26 lines)
│   └── editImageViaApi.ts              # Image editing service (35 lines)
│
├── hooks/
│   └── useImageBatchJobListener.ts     # Firestore listener (94 lines)
│
├── database/
│   └── imageBatchProcessing/
│       └── index.tsx                   # Batch job DAL (119 lines)
│
├── lib/google/
│   └── cloudTask/
│       └── index.ts                    # Cloud Task client (67 lines)
│
└── constants/
    └── AI/
        └── index.tsx                   # AI constants & styles (207 lines)
```

---

## Types & Interfaces

### Image Generation Config

```typescript
// src/components/templates/main-app/projects/types/imageGeneration.types.ts

interface ImageGenerationConfigType {
  prompt?: string;
  referanceImages?: any[];
  referanceImage?: UserUploadedFileType | null;
  loading?: boolean;
  generatedImages?: UserUploadedFileType[] | [];
  stylesCategory?: string;
  styles: string[];
  aspectRatio: string;
  environments?: string[];
  lighting?: string[];
  colors?: string[];
  moods?: string[];
  compositions?: string[];
  backgroundColor?: string;
  negativePrompt?: string;
  transparentBg?: boolean;
  foregroundColor?: string;
  selectedImageTypes?: string[];
  isMultiMode?: boolean;
  agreeToTerms?: boolean; // Content policy agreement
}

type GenerateImageViaApiPayloadType = {
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  fileId?: string;
  businessType: string;
  itemDetails: GenerateImageViaApiPayloadItemDetailsType;
};

type GenerateImageViaApiPayloadBatchType = {
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  businessType: string;
  itemsList?: GenerateImageViaApiPayloadItemDetailsType[];
  jobId: string;
  itemDetails?: GenerateImageViaApiPayloadItemDetailsType;
};

type EditImageViaApiPayloadType = {
  generationConfig: {
    prompt: string;
    referanceImage: any | null;
    feature?: string;
    promptImages?: UserUploadedFileType[] | null;
  };
  businessType: string;
  projectId: string;
  fileId: string;
  itemDetails: GenerateImageViaApiPayloadItemDetailsType;
};
```

### Batch Job Type

```typescript
// src/components/templates/main-app/projects/types/batchJob.types.ts

type BatchImageGenerationJobStatusType =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "finished"
  | "discarded";

type BatchImageGenerationJobType = {
  id?: string;
  status: BatchImageGenerationJobStatusType;
  totalImages: number;
  generatedCount: number;
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  itemsList: {
    id: string;
    name: string;
    images: UserUploadedFileType[];
  }[];
  statusHistory: {
    status: BatchImageGenerationJobStatusType;
    reason?: string;
    createdOn: string | number | Date;
  }[];
  error?: string;
  modifiedOn?: string | number | Date;
  createdOn?: string | number | Date;
};
```

### Image Editing Feature Type

```typescript
// src/components/templates/main-app/projects/editorView/AiImageGenerator/imageViewType.ts

type ImageEditingFeatureType = {
  featureName: string;
  description: string;
  prompt: string;
  userPrompt?: "required" | "optional" | "";
  promptImage?: "required" | "optional" | "";
};
```

---

## API Routes

### 1. Single Image Generation

**Endpoint:** `POST /api/image-generation`

**Request:**

```typescript
{
    generationConfig: {
        prompt?: string;
        referanceImage?: UserUploadedFileType | null;
        stylesCategory?: string;
        styles?: string[];
        aspectRatio?: string;
        environments?: string[];
        lighting?: string[];
        colors?: string[];
        moods?: string[];
        compositions?: string[];
        backgroundColor?: string;
        transparentBg?: boolean;
        negativePrompt?: string;
        foregroundColor?: string;
        selectedImageTypes?: string[];
        isMultiMode?: boolean;
    };
    projectId: string;
    fileId?: string;
    businessType: string;
    itemDetails: {
        id?: string;
        name?: string;
        description?: string;
        attributes?: string[];
        category?: string;
    };
}
```

**Response:**

```typescript
{
  data: Array<{
    base64: string;
    mimeType: string;
  }>;
  message: string;
  transaction: {
    totalCharge: number;
    totalCredits: number;
    processingTime: number;
    transactionId: string;
  }
}
```

### 2. Batch Trigger

**Endpoint:** `POST /api/image-generation/batch-trigger`

**Request:**

```typescript
{
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  businessType: string;
  itemsList: Array<{
    id: string;
    name: string;
    description?: string;
    attributes?: string[];
    category?: string;
  }>;
  jobId: string;
}
```

**Response:**

```typescript
{
  data: {
    jobId: string;
  }
  message: string;
}
```

### 3. Batch Generation Worker

**Endpoint:** `POST /api/image-generation/batch-generation`

Called by Google Cloud Tasks for each item.

**Request:** Same as batch trigger but with single `itemDetails` instead of `itemsList`

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

### 4. Image Editing

**Endpoint:** `POST /api/image-editing`

**Request:**

```typescript
{
    generationConfig: {
        prompt: string;
        referanceImage: UserUploadedFileType;
        feature?: string;
        promptImages?: UserUploadedFileType[];
    };
    businessType: string;
    projectId: string;
    fileId: string;
    itemDetails: {
        id?: string;
        name?: string;
        description?: string;
        attributes?: string[];
        category?: string;
    };
}
```

**Response:**

```typescript
{
  data: Array<{
    base64: string;
    mimeType: string;
  }>;
  message: string;
  transaction: {
    totalCharge: number;
    totalCredits: number;
    processingTime: number;
    transactionId: string;
  }
}
```

---

## Database Layer

### Firestore Collection Structure

```
IMAGE_BATCH_PROCESSING_JOBS/
└── {tenantId}/
    └── {storeId}/
        └── {jobId}
            ├── id: string
            ├── status: string
            ├── totalImages: number
            ├── generatedCount: number
            ├── generationConfig: object
            ├── projectId: string
            ├── itemsList: array
            ├── statusHistory: array
            ├── createdOn: timestamp
            └── modifiedOn: timestamp
```

### DAL Functions

```typescript
// src/database/imageBatchProcessing/index.tsx

// Get collection reference for a specific project
export const getBatchImageJobCollectionRef = (session: any, projectId: string) => {
    const collectionRef = collection(
        firebaseClient,
        `${COLLECTION}/${session.tId}/${session.sId}`
    );
    return query(
        collectionRef,
        where("projectId", "==", projectId),
        where("status", "in", ["queued", "processing", "completed", "failed"])
    );
}

// Get a specific job by ID
export const getImageBatchProcessingJobById = async (id: string, session: any)

// Add a new batch processing job
export const addImageBatchProcessingJob = async (data: BatchImageGenerationJobType)

// Update an existing job (handles statusHistory arrayUnion and generatedCount increment)
export const updateImageBatchProcessingJob = async (data: any, projectId: string)
```

### Real-time Listener Hook

```typescript
// src/hooks/useImageBatchJobListener.ts

export const useImageBatchJobListener = (projectId: string | undefined) => {
  const [activeBatchImageJob, setActiveBatchImageJob] =
    useState<BatchImageGenerationJobType | null>(null);

  useEffect(() => {
    if (!projectId || !session) return;

    const jobsCollectionRef = getBatchImageJobCollectionRef(session, projectId);

    const unsubscribe = onSnapshot(jobsCollectionRef, (querySnapshot) => {
      const jobsList: BatchImageGenerationJobType[] = [];
      querySnapshot.forEach((doc) => {
        jobsList.push({ id: doc.id, ...doc.data() });
      });

      if (jobsList.length > 0) {
        const updatedJob = jobsList[0];
        // Mark all images as selected by default
        updatedJob.itemsList.forEach((item) => {
          item.images.forEach((img) => {
            img.isSelected = true;
          });
        });
        setActiveBatchImageJob(updatedJob);
      } else {
        setActiveBatchImageJob(null);
      }
    });

    return () => unsubscribe();
  }, [projectId, session]);

  return activeBatchImageJob;
};
```

---

## Cloud Tasks Integration

### Configuration

```typescript
// src/lib/google/cloudTask/index.ts

const client = new CloudTasksClient();

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const QUEUE_LOCATION = process.env.FIREBASE_PROJECT_LOCATION;
const QUEUE_ID = process.env.BATCH_IMAGE_GENERATION_QUEUE_ID;
const IMAGE_GENERATION_WORKER_URL =
  process.env.BATCH_IMAGE_GENERATION_WORKER_URL;
```

### Task Creation

```typescript
export async function enqueueImageGenerationTask(
  data: GenerateImageViaApiPayloadBatchType,
): Promise<string | undefined> {
  const parent = client.queuePath(PROJECT_ID, QUEUE_LOCATION, QUEUE_ID);

  const task = {
    httpRequest: {
      httpMethod: "POST" as const,
      url: IMAGE_GENERATION_WORKER_URL,
      headers: {
        "project-id": process.env.FIREBASE_PROJECT_ID,
        "Content-Type": "application/json",
      },
      body: Buffer.from(JSON.stringify(data)).toString("base64"),
    },
  };

  const [response] = await client.createTask({ parent, task });
  return response.name;
}
```

### Worker Processing

The worker endpoint (`/api/image-generation/batch-generation`) handles:

1. **Job Status Check**: Skips if job is cancelled or failed
2. **Image Generation**: Calls Gemini/Imagen API
3. **Image Upload**: Uploads generated images to Firebase Storage
4. **Progress Update**: Updates Firestore job document with new images and count
5. **Status Transition**: Marks job as `completed` when `generatedCount >= totalImages`
6. **Error Handling**: Returns 200 even on failure to prevent Cloud Tasks retries

---

## Security Implementation

### Rate Limiting

```typescript
// Single generation: 5 requests per minute (expensive AI operation)
const rateLimitResponse = await checkExpensiveAILimit();
if (rateLimitResponse) return rateLimitResponse;

// Batch trigger: 3 per 5 minutes
const rateLimitResponse = await checkBatchOperationLimit();
if (rateLimitResponse) return rateLimitResponse;
```

### Input Validation

```typescript
// Zod schema validation
const validation = validateAPIInput(ImageGenerationRequestSchema, rawData);

if (!validation.success) {
  logger.security(
    "Input Validation Failed",
    {
      ...buildSecurityContext(session, request),
      endpoint: "/api/image-generation",
      error: errorMsg,
    },
    "high",
  );

  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}
```

### Prompt Injection Prevention

```typescript
// src/app/api/image-generation/prompt.ts

function sanitizeAIPromptInput(input: string, maxLength: number = 200): string {
  if (!input || typeof input !== "string") return "Subject";

  const dangerousPatterns = [
    /ignore\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?)/gi,
    /forget\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?)/gi,
    /disregard\s+(previous|above|all|prior)\s+(instructions?|prompts?)/gi,
    /override\s+(previous|above|all|prior)\s+(instructions?|prompts?)/gi,
    /new\s+(instructions?|prompts?|commands?|rules?|context)/gi,
    /system\s+(prompt|instruction|command|message)/gi,
    /you\s+are\s+(now|a|an)\s+/gi,
    /act\s+as\s+(a|an)?\s*/gi,
    /pretend\s+(you|to)\s+(are|be)/gi,
    /from\s+now\s+on/gi,
    /instead\s+of/gi,
  ];

  let sanitized = input;
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, " ");
  });

  // Remove special characters
  sanitized = sanitized.replace(/[<>{}\[\]\\|`~@#$%^&*()+=;:"]/g, "");
  sanitized = sanitized.replace(/\s+/g, " ").trim();
  sanitized = sanitized.substring(0, maxLength);

  return sanitized || "Subject";
}
```

### AI Safety Settings

```typescript
// Gemini safety configuration
config: {
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];
}
```

### System Instruction (Safety Guardrails)

```typescript
const systemInstruction = `You are a professional image generation assistant for businesses.

🔒 CRITICAL SAFETY RULES - YOU MUST NEVER:
1. Generate images containing explicit, violent, or disturbing content
2. Generate images with hate symbols, offensive gestures, or discriminatory content
3. Generate images depicting illegal activities or dangerous behavior
4. Generate images with text containing inappropriate, offensive, or vulgar language
5. Generate images that could be misleading, deceptive, or harmful

✅ YOU SHOULD:
1. Generate professional, high-quality images suitable for business use
2. Focus on food, products, services, ambiance, or professional contexts
3. Ensure images are appropriate for all audiences
4. Keep compositions clean, appealing, and brand-safe
5. Avoid including text in images unless specifically requested`;
```

---

## UI Components

### ImageUploadModal

Main container modal that manages:

- View switching (initialChoice, singleItemSetup, batchSetup, batchAIConfig, batchResult)
- Item selection
- Image upload from device
- AI generation integration
- Batch generation flow coordination

### AiImageGenerator

Single image generation UI with:

- Reference image selection
- Style selector modal
- Aspect ratio picker
- Multi-select attribute selectors (environments, lighting, colors, moods, compositions)
- Background/foreground color pickers
- Prompt input
- Generated image preview and selection
- Upload action

### BatchSetupView

Item selection UI with:

- Search functionality
- "Only items without images" filter
- Category-wise grouping
- Select all / deselect all per category
- Item count display
- Proceed to configuration action

### BatchImageGenerationView

Configuration UI (similar to AiImageGenerator) with:

- Same configuration options as single generation
- Content policy agreement checkbox (required)
- Start generation action

### BatchImageGenerationResultView

Results display UI with:

- Job status indicator (Queued, Processing, Completed, Failed)
- Progress tracking (X of Y images generated)
- Generated images preview per item
- Image selection checkboxes
- Actions: Upload Selected, Discard All, Retry, Cancel Job
- Confirmation modals for destructive actions

### EditImageModal

Image editing UI with:

- Source image display (original + selected edit)
- Generated edits thumbnail gallery
- Feature selection cards
- Prompt input (when required)
- Secondary image upload (when required)
- Generate and upload actions

### Helper Components

#### MultiSelectAttributeSelector

Reusable component for selecting configuration options (environments, lighting, colors, moods, compositions):

- Supports single-select (radio) or multi-select (checkbox) modes
- Two display modes: chips (buttons) or dropdown select
- Tooltip support for option descriptions

```typescript
// Usage example
<MultiSelectAttributeSelector
  label="Environments"
  tooltip="Select the environment for image generation"
  options={["Studio", "Outdoor", "Kitchen"]}
  selected={generationConfig.environments}
  onChange={(values) => setGenerationConfig({...config, environments: values})}
  multi={false}  // single-select
  displayMode="chips"
/>
```

#### GenerationHistory (Prepared - Not Yet Integrated)

Component for displaying and reusing previous generation configurations:

- Shows thumbnail, prompt, and timestamp for each generation
- "Regenerate" button to reuse settings
- "Clear History" functionality
- Popover-based UI

**Note:** This component exists but is not currently integrated into the main generation flow. Consider integrating for improved UX.

#### PromptEnhancer (Prepared - Not Yet Integrated)

Component for enhancing prompts with quality tags:

- Generates enhanced prompt suggestions (currently simulated, needs API integration)
- Predefined quality tags (photorealistic, high detail, professional lighting, etc.)
- Custom tag addition
- Click-to-add functionality

**Note:** This component exists but is not currently integrated. The enhancement logic is simulated and would need AI API integration for production use.

---

## Prompt Engineering

### Single/Batch Generation Prompt Construction

```typescript
// src/app/api/image-generation/prompt.ts

export function getImagePrompts(inputJson: GenerateImageViaApiPayloadType, model: string): string[] {
    const config = inputJson.generationConfig;
    const businessType = inputJson.businessType;
    const details = inputJson.itemDetails;

    // Sanitize all user inputs
    const itemName = sanitizeAIPromptInput(details.name ?? 'Subject');
    const styleCategory = sanitizeAIPromptInput(config.stylesCategory ?? 'Photorealistic', 50);
    const styles = (config.styles ?? []).map(s => sanitizeAIPromptInput(s, 50));
    const environments = (config.environments ?? []).map(e => sanitizeAIPromptInput(e, 50));
    const lightingOpts = (config.lighting ?? []).map(l => sanitizeAIPromptInput(l, 50));
    const foregroundColor = sanitizeAIPromptInput(config.foregroundColor ?? "", 30);
    const moods = (config.moods ?? []).map(m => sanitizeAIPromptInput(m, 50));
    const compositions = (config.compositions ?? []).map(c => sanitizeAIPromptInput(c, 50));

    let prompt = "";

    if (referanceImage) {
        // Reference image-based generation
        prompt = `Using the provided reference image as the primary visual foundation...`;
    } else {
        // Text-only generation
        prompt = `A ${styleCategory} image of a ${itemName}...`;
    }

    // Add styles, environments, lighting, colors, moods, compositions
    // Add background/transparency instructions
    // Add aspect ratio for Gemini model

    // Generate prompts for specific image types if selected
    if (config.selectedImageTypes?.length > 0) {
        for (const typeName of config.selectedImageTypes) {
            const imageTypeDefinition = IMAGE_VIEW_TYPES.find(...)
            generatedPrompts.push(specificPrompt);
        }
    } else {
        generatedPrompts.push(prompt);
    }

    return generatedPrompts;
}
```

### Image Editing Prompts

Each editing feature has a dedicated prompt generator:

- **Remove Background**: Clean isolation instructions
- **Replace Background**: Scene replacement with integration
- **Enhance Image**: Quality improvement without alteration
- **Object Placement**: Object insertion with realistic blending
- **Hair Style**: Hair transformation instructions
- **Clothing Try-On**: Virtual fitting instructions
- **Tattoo Try-On**: Tattoo preview with skin integration
- **Skin Treatment**: Skin improvement while preserving identity
- **Generic**: Flexible single/two-image editing

---

## Improvements & Recommendations

### Critical Issues Found

| Issue                                     | Location                                              | Impact                                    | Priority |
| ----------------------------------------- | ----------------------------------------------------- | ----------------------------------------- | -------- |
| **Transaction recording disabled**        | `/api/image-generation/route.ts:264`                  | Token usage not being tracked for billing | P0       |
| **Debugger statement in production code** | `/api/image-generation/batch-generation/route.ts:164` | Potential debugging issues                | P1       |
| **Console.log statements throughout**     | Multiple files                                        | Performance and security concern          | P2       |
| **Reference image spelling**              | Multiple files (`referanceImage`)                     | Code quality/consistency                  | P3       |

### Security Improvements Needed

| Improvement                   | Current State                       | Recommendation                    | Priority |
| ----------------------------- | ----------------------------------- | --------------------------------- | -------- |
| **Cloud Task Authentication** | Uses project-id header only         | Add OIDC token verification       | P1       |
| **Image Content Moderation**  | Relies on Gemini's built-in filters | Add post-generation content check | P2       |
| **Storage Path Validation**   | Basic validation                    | Add stricter path sanitization    | P2       |

### Scalability Improvements

| Improvement              | Current State                | Recommendation                   | Priority |
| ------------------------ | ---------------------------- | -------------------------------- | -------- |
| **Batch Size Limits**    | No explicit limit            | Add max 50 items per batch       | P1       |
| **Queue Concurrency**    | Default Cloud Tasks settings | Configure rate limiting in queue | P1       |
| **Image Caching**        | No caching                   | Cache identical prompt results   | P2       |
| **Progress Persistence** | Relies on Firestore listener | Add SSE/WebSocket fallback       | P3       |

### UX Improvements

| Improvement             | Current State               | Recommendation                                         | Priority |
| ----------------------- | --------------------------- | ------------------------------------------------------ | -------- |
| **Cost Estimation**     | Cost shown after generation | Show estimate before batch generation                  | P1       |
| **Generation Preview**  | Direct generation           | "This will use ~X credits. Continue?" modal            | P1       |
| **Partial Batch Retry** | Retry entire batch          | Allow retrying only failed items                       | P2       |
| **Image Variations**    | Single image per prompt     | Generate 2-3 variations, let user pick                 | P2       |
| **Style Presets**       | Manual configuration        | Pre-built presets (Food Blog, Menu Card, Social Media) | P2       |
| **Progress Detail**     | Overall percentage          | Show which item is being processed                     | P3       |

### Code Quality Improvements

| Improvement        | Current State                      | Recommendation                 | Priority |
| ------------------ | ---------------------------------- | ------------------------------ | -------- |
| **Typo fixes**     | `referanceImage`, `genratedImages` | Fix spelling consistency       | P2       |
| **Error handling** | Basic try/catch                    | Add structured error types     | P2       |
| **Logging**        | Console.log mixed with logger      | Standardize to use logger only | P2       |
| **Type safety**    | Some `any` types                   | Add proper typing throughout   | P3       |

### Technical Debt

| Item                | Description                              | Effort |
| ------------------- | ---------------------------------------- | ------ |
| Model configuration | Hardcoded model names                    | Low    |
| Prompt versioning   | No tracking of prompt versions           | Medium |
| Duplicate code      | Similar generation logic in single/batch | Medium |
| Test coverage       | No unit tests for prompt generation      | High   |

### Feature Enhancements

1. **Generation History**
   - Save generation configurations for reuse
   - Track successful generations per item

2. **Batch Templates**
   - Pre-configured batch settings for common use cases
   - "Generate all food items" quick action

3. **Image Quality Feedback**
   - Allow users to rate generated images
   - Use feedback to improve prompt templates

4. **Advanced Editing**
   - Inpainting for selective editing
   - Multiple edit layers support

5. **Integration**
   - Direct social media posting
   - Bulk export for print materials

---

## Validation Checklist

| Requirement                 | Implementation                               | Status |
| --------------------------- | -------------------------------------------- | ------ |
| Single image generation     | `/api/image-generation` + `AiImageGenerator` | ✅     |
| Batch image generation      | Cloud Tasks + Firestore listener             | ✅     |
| Real-time progress updates  | `useImageBatchJobListener` + `onSnapshot`    | ✅     |
| Preview/accept/reject flow  | `BatchImageGenerationResultView`             | ✅     |
| Image editing features      | `/api/image-editing` + `EditImageModal`      | ✅     |
| Rate limiting               | Upstash Redis                                | ✅     |
| Input validation            | Zod schemas                                  | ✅     |
| Prompt injection prevention | `sanitizeAIPromptInput`                      | ✅     |
| AI safety settings          | Gemini HarmCategory blocks                   | ✅     |
| Content policy agreement    | Checkbox in batch config                     | ✅     |
| Storage cleanup             | `deleteFileByUrl` on discard                 | ✅     |
| Multi-tenant isolation      | Collection path includes tId/sId             | ✅     |

---

_Document Status: ✅ COMPREHENSIVE - Generated from Codebase Analysis_  
_Last Updated: January 2025_
