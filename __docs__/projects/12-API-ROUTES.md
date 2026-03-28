# 🔌 API Routes Documentation

**Complete API Reference for Projects Feature**  
**Base Path**: `/api/`  
**Auth**: All routes require `withAuth()` middleware  
**Rate Limiting**: Applied to all AI operations

---

## Table of Contents

1. [Image Processor](#image-processor)
2. [Image Generation](#image-generation)
3. [Image Editing](#image-editing)
4. [Descriptions](#descriptions)
5. [New Item Metadata](#new-item-metadata)
6. [Translation](#translation)

---

## Image Processor

### **OCR & Menu Extraction**

**Endpoint**: `POST /api/image-processor`  
**File**: `src/app/api/image-processor/route.ts`  
**AI Model**: Gemini 2.5 Flash  
**Purpose**: Extract menu data (categories, items, prices) from images

#### **Request**

```typescript
{
  files: ProjectFileType[];           // Images to process
  targetLanguages: LanguageType[];    // Languages to extract
  projectId: string;                  // Project ID
  fileId: string;                     // File ID
  action?: string;                    // AI_ACTIONS_TYPES.IMAGE_PROCESSING
}
```

#### **Response**

```typescript
{
  id: string;                         // Operation ID
  data: {
    message: string;
    data: {
      categories: ExtractedDataCategory[];
      items: ExtractedDataItem[];
      languages: ExtractedDataLanguage[];
    }
  };
  message: string;
}
```

#### **Security**

```typescript
// 1. Authentication (withAuth)
export const POST = withAuth(async (request, session) => {
  // Session guaranteed

  // 2. Rate Limiting (5 req/min)
  const rateLimitResponse = await checkExpensiveAILimit();
  if (rateLimitResponse) return rateLimitResponse;

  // 3. Input Validation (Zod)
  const validation = validateAPIInput(FileUploadRequestSchema, rawData);
  if (!validation.success) {
    logger.security('Input Validation Failed', {...}, 'high');
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // 4. Tenant Verification (implicit via session)
});
```

#### **Processing Flow**

```typescript
// 1. Upload to Gemini
const uploadedFiles = await Promise.all(
  files.map(file => uploadToGemini(file))
);

// 2. Build prompt
const prompt = getSystemPrompt({
  action,
  targetLanguages,
  businessType: session.businessType
});

// 3. Generate content
const response = await genAIClient.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    ...uploadedFiles.map(f => createPartFromUri(f)),
    createUserContent(prompt)
  ],
  config: {
    temperature: 1,
    responseMimeType: "application/json"
  }
});

// 4. Parse response
const extractedData = JSON.parse(response.text);

// 5. Log operation
await addAiOperation({
  action,
  inputToken: response.usageMetadata.promptTokenCount,
  outputToken: response.usageMetadata.candidatesTokenCount,
  totalToken: response.usageMetadata.totalTokenCount,
  charges: (totalToken / TOKENS_PER_CREDIT) * CHARGE_PER_CREDIT
});

// 6. Clean up Gemini files
await Promise.all(uploadedFiles.map(f => 
  genAIClient.files.delete(f.name)
));
```

#### **Prompt Structure**

```typescript
export default function getSystemPrompt({
  action,
  targetLanguages,
  businessType
}) {
  return `
You are a menu extraction expert.

Extract:
1. Categories (with names in ${targetLanguages.join(', ')})
2. Items (name, description, price, category)
3. Attributes (sizes, variations with prices)

Business Type: ${businessType}

Output Format: JSON
{
  "message": "success",
  "data": {
    "categories": [...],
    "items": [...],
    "languages": [...]
  }
}

Rules:
- Detect all languages in image
- Extract prices with currency symbol
- Group items by category
- Extract item variations as attributes
`;
}
```

#### **Error Handling**

```typescript
try {
  // Processing logic
} catch (error) {
  await writeErrorLogEntry(LOG_FILE, userId, projectId, fileId, error);
  
  logger.error('Image Processing Failed', {
    error: error.message,
    projectId,
    fileId,
    userId
  });
  
  return NextResponse.json({
    error: 'Processing failed',
    details: error.message
  }, { status: 500 });
}
```

---

## Image Generation

### **AI-Powered Food Image Generation**

**Endpoint**: `POST /api/image-generation`  
**File**: `src/app/api/image-generation/route.ts`  
**AI Model**: Gemini 2.0 Flash Preview (Image Gen) or Imagen 3  
**Purpose**: Generate food images based on prompts

#### **Request**

```typescript
{
  generationConfig: {
    prompt?: string;                    // Custom prompt
    referanceImage?: UserUploadedFileType | null;
    styles?: string[];                  // e.g., ["modern", "minimalist"]
    aspectRatio?: string;               // "1:1", "16:9", etc.
    environments?: string[];            // ["restaurant", "outdoor"]
    lighting?: string[];                // ["natural", "studio"]
    colors?: string[];                  // ["warm", "vibrant"]
    moods?: string[];                   // ["cozy", "elegant"]
    compositions?: string[];            // ["close-up", "overhead"]
    backgroundColor?: string;
    transparentBg?: boolean;
    negativePrompt?: string;
    selectedImageTypes?: string[];      // ["food", "drink"]
    numberOfImages?: number;            // 1-4
  };
  projectId: string;
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

#### **Response**

```typescript
{
  id: string;                           // Operation ID
  data: {
    message: string;
    images: {
      base64: string;
      mimeType: string;
    }[];
  };
}
```

#### **Generation Methods**

**Method 1: Gemini 2.0 Flash (Default)**

```typescript
async function generateGeminiImageViaFlash(prompt, config) {
  // With reference image
  if (config.referanceImage) {
    const { base64ImageData, mimeType } = await getImageAsBase64(config.referanceImage);
    
    contents = [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64ImageData
        }
      },
      { text: `Edit the image based on: ${prompt}` }
    ];
  } else {
    // Without reference
    contents = `Generate image: ${prompt}. Do not include text in image.`;
  }
  
  const response = await genAIClient.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents,
    config: {
      temperature: 1,
      responseModalities: [Modality.TEXT, Modality.IMAGE]
    }
  });
  
  // Extract images from response
  const images = [];
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      images.push({
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType
      });
    }
  }
  
  return { images, response };
}
```

**Method 2: Imagen 3 (Alternative)**

```typescript
async function generateGeminiImageViaImagen3(prompt, config) {
  const response = await genAIClient.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt: prompt,
    config: {
      aspectRatio: config?.aspectRatio || "1:1",
      numberOfImages: config?.numberOfImages || 1
    }
  });
  
  const images = response.generatedImages.map(img => ({
    base64: img.image.imageBytes,
    mimeType: img.image.mimeType
  }));
  
  return { images, response };
}
```

#### **Prompt Building**

```typescript
export function getImagePrompts({
  businessType,
  itemDetails,
  generationConfig
}) {
  // Base prompt
  let prompt = `Generate a professional ${businessType} food image`;
  
  // Item details
  if (itemDetails.name) {
    prompt += ` of ${itemDetails.name}`;
  }
  if (itemDetails.description) {
    prompt += `. ${itemDetails.description}`;
  }
  
  // Styles
  if (generationConfig.styles?.length) {
    prompt += `. Style: ${generationConfig.styles.join(', ')}`;
  }
  
  // Composition
  if (generationConfig.compositions?.length) {
    prompt += `. Composition: ${generationConfig.compositions.join(', ')}`;
  }
  
  // Lighting
  if (generationConfig.lighting?.length) {
    prompt += `. Lighting: ${generationConfig.lighting.join(', ')}`;
  }
  
  // Colors
  if (generationConfig.colors?.length) {
    prompt += `. Color palette: ${generationConfig.colors.join(', ')}`;
  }
  
  // Mood
  if (generationConfig.moods?.length) {
    prompt += `. Mood: ${generationConfig.moods.join(', ')}`;
  }
  
  // Environment
  if (generationConfig.environments?.length) {
    prompt += `. Environment: ${generationConfig.environments.join(', ')}`;
  }
  
  // Background
  if (generationConfig.transparentBg) {
    prompt += '. Transparent background';
  } else if (generationConfig.backgroundColor) {
    prompt += `. Background: ${generationConfig.backgroundColor}`;
  }
  
  // Negative prompt
  if (generationConfig.negativePrompt) {
    prompt += `. Avoid: ${generationConfig.negativePrompt}`;
  }
  
  return prompt;
}
```

#### **Batch Generation**

**Endpoint**: `POST /api/image-generation/batch-generation`

```typescript
{
  generationConfig: {...},
  projectId: string,
  businessType: string,
  itemsList: Array<{
    id: string;
    name: string;
    images: UserUploadedFileType[]
  }>,
  jobId: string
}
```

**Process**:
1. Create batch job document in Firestore
2. Process items sequentially
3. Update job status after each image
4. Save images to item
5. Mark job complete

---

## Image Editing

### **AI-Powered Image Editing**

**Endpoint**: `POST /api/image-editing`  
**File**: `src/app/api/image-editing/route.ts`  
**AI Model**: Gemini 2.0 Flash  
**Purpose**: Edit existing images using AI

#### **Request**

```typescript
{
  generationConfig: {
    prompt: string;                     // Edit instruction
    referanceImage: any;                // Original image
    feature?: string;                   // "background_remove", "enhance", etc.
    promptImages?: UserUploadedFileType[] | null;
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

#### **Editing Features**

```typescript
const EDITING_FEATURES = {
  BACKGROUND_REMOVE: 'Remove background, make transparent',
  ENHANCE_QUALITY: 'Enhance image quality, improve lighting',
  CHANGE_BACKGROUND: 'Change background to: [description]',
  RECOLOR: 'Change colors to: [color scheme]',
  ADD_GARNISH: 'Add garnish and decorations',
  PROFESSIONAL_STYLING: 'Apply professional food styling'
};
```

---

## Descriptions

### **AI-Generated Descriptions**

**Endpoint**: `POST /api/descriptions`  
**File**: `src/app/api/descriptions/route.ts`  
**AI Model**: Gemini 2.5 Flash  
**Purpose**: Generate/rewrite item descriptions

#### **Request**

```typescript
{
  itemsList: ExtractedDataItem[];
  targetLang: LanguageType[];
  sourceLang: LanguageType;
  action: "ADD_DESCRIPTION" | "REWRITE_DESCRIPTION";
  projectId: string;
  fileId: string;
  contentLength: "Small" | "Medium" | "Large";
}
```

#### **Response**

```typescript
{
  id: string;
  data: {
    message: string;
    items: Array<{
      id: string;
      description: {
        [langCode]: string
      }
    }>
  }
}
```

#### **Content Length Guide**

```typescript
const DESCRIPTION_LENGTHS = {
  Small: '20-30 words',   // Short and concise
  Medium: '40-60 words',  // Detailed
  Large: '80-100 words'   // Comprehensive
};
```

---

## Translation

### **Multi-Language Translation**

**Endpoint**: `POST /api/image-translations`  
**File**: `src/app/api/image-translations/route.ts`  
**AI Model**: Gemini 2.5 Flash  
**Purpose**: Translate menu content to new languages

#### **Request**

```typescript
{
  inputJson: any;                       // Data to translate
  targetLang: LanguageType;             // Target language
  sourceLang: LanguageType;             // Source language
  action: "IMAGE_TRANSLATION" | "LANGUAGE_ADDITION";
  projectId: string;
  fileId: string;
}
```

#### **Translation Process**

```typescript
// 1. Build prompt
const prompt = `
Translate the following menu data from ${sourceLang.name} to ${targetLang.name}.

Input JSON: ${JSON.stringify(inputJson)}

Rules:
- Preserve structure
- Translate: category names, item names, descriptions, attribute names
- Keep: IDs, prices, active status
- Maintain context (food/drink terminology)
`;

// 2. Generate translation
const response = await genAIClient.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [createUserContent(prompt)],
  config: {
    responseMimeType: "application/json"
  }
});

// 3. Parse and return
return JSON.parse(response.text);
```

---

## Rate Limiting

All AI operations use rate limiting:

```typescript
// Function: checkExpensiveAILimit()
// Limit: 5 requests per minute per user
// Key: `ai-expensive:${userId}:${tenantId}`

const rateLimit = await checkRateLimit({
  key: `ai-expensive:${session.uId}:${session.tId}`,
  ...getRateLimitForFeature('AI_OPERATION')
});

if (!rateLimit.allowed) {
  const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
  return NextResponse.json({
    error: `Too many requests. Please wait ${waitSeconds} seconds.`,
    retryAfter: waitSeconds
  }, {
    status: 429,
    headers: {
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetAt),
      'Retry-After': String(waitSeconds)
    }
  });
}
```

---

## Logging

All operations logged to:
- **Sentry** (security, errors)
- **Custom logs** (`logs/*.log`)
- **Firestore** (`aiOperations` collection)

```typescript
// Log file entries
await writeLogEntry({
  logFileName: LOG_FILE,
  logType: 'SUCCESS',
  data: { projectId, fileId, userId, prompt, response }
});

await writeErrorLogEntry(
  LOG_FILE,
  userId,
  projectId,
  fileId,
  error
);

// AI operation tracking
await addAiOperation({
  action: AI_ACTIONS_TYPES.IMAGE_PROCESSING,
  inputToken: promptTokenCount,
  outputToken: candidatesTokenCount,
  totalToken: totalTokenCount,
  charges: (totalToken / TOKENS_PER_CREDIT) * CHARGE_PER_CREDIT,
  userId,
  projectId
});
```

---

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Invalid input | Check request schema |
| 401 | Unauthorized | Re-authenticate |
| 403 | Forbidden | Check tenant access |
| 429 | Rate limit exceeded | Wait and retry |
| 500 | Server error | Check logs, retry |

---

## Testing

### **Development Mode**

```typescript
// Set in constants
export const isProdMode = process.env.NODE_ENV === 'production';

// All API routes check
if (!isProdMode) {
  // Return mock data
  return NextResponse.json({ data: mockData });
}
```

### **Postman Collection**

Example requests:

```bash
# Image Processor
POST http://localhost:3000/api/image-processor
Content-Type: application/json

{
  "files": [{"url": "...", "type": "image/jpeg", "uid": "..."}],
  "targetLanguages": [{"code": "en", "name": "English"}],
  "projectId": "123-abc-456",
  "fileId": "file-001"
}

# Image Generation
POST http://localhost:3000/api/image-generation
Content-Type: application/json

{
  "generationConfig": {
    "styles": ["modern"],
    "aspectRatio": "1:1",
    "numberOfImages": 1
  },
  "projectId": "123-abc-456",
  "businessType": "Restaurant",
  "itemDetails": {
    "name": "Margherita Pizza",
    "description": "Classic pizza with mozzarella and basil"
  }
}
```

---

**[← Back to Overview](./00-overview.md)** | **[Next: Types & Interfaces →](./13-types-interfaces.md)**
