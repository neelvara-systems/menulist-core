# Description Generation — Technical Implementation

**Feature:** AI-Powered Menu Item Description Generation
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** July 5, 2026
**Version:** 2.1
**Source of Truth:** Codebase (`src/app/api/descriptions/`, `src/services/ai/description/`)

**Launch boundary:** This implementation note documents the description-generation feature. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, target feature-flag/provider review, AI accounting/source gates, provider smoke, browser/mobile editor QA, and deploy evidence for the target environment.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Editor.tsx                                                                  │
│       │                                                                      │
│       ├── EditorActionsPopover.tsx → "Generate Descriptions" action          │
│       │                                                                      │
│       └── DescriptionGenerationModal.tsx                                     │
│               │                                                              │
│               ├── Content length selector (Standard/Detailed)                │
│               ├── Tone selector (Professional/Casual/Elegant/Playful)        │
│               ├── Item count preview (useMemo calculation)                   │
│               ├── Progress indicator (processedCount/totalFiles)             │
│               ├── "Generate" button (ADD_DESCRIPTION action)                 │
│               └── "Rewrite All" button (REWRITE_DESCRIPTION action)          │
│                                                                              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ calls addDescription()
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ SERVICE LAYER (src/services/ai/description/)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  descriptionUtils.ts                                                         │
│       │                                                                      │
│       ├── prepareDescriptionPayload()                                        │
│       │       • Extracts items from file.extractedData.data.items            │
│       │       • For ADD_DESCRIPTION: filters items WITHOUT descriptions      │
│       │       • For REWRITE_DESCRIPTION: includes ALL items                  │
│       │       • Returns: { id, name, category, attributes, description }[]   │
│       │                                                                      │
│       ├── addDescription()                                                   │
│       │       • Main orchestrator function                                   │
│       │       • Calls prepareDescriptionPayload()                            │
│       │       • Calls getDescriptionsViaAPI()                                │
│       │       • Calls mergeDescription()                                     │
│       │       • Returns updated project with descriptions                    │
│       │                                                                      │
│       └── mergeDescription()                                                 │
│               • Merges generated descriptions into item.description          │
│               • Format: item.description[langCode] = "generated text"        │
│                                                                              │
│  generateDescriptionViaAPI.ts                                                │
│       │                                                                      │
│       └── getDescriptionsViaAPI()                                            │
│               • POST /api/descriptions                                       │
│               • Returns: { [itemId]: { [langCode]: "description" } }         │
│                                                                              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ POST /api/descriptions
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ BACKEND API (src/app/api/descriptions/)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  route.ts                                                                    │
│       │                                                                      │
│       ├── withAuth() middleware (authentication)                             │
│       ├── checkAIOperationLimit() (rate limiting: 20 req/min)                │
│       ├── validateAPIInput(DescriptionRequestSchema) (Zod validation)        │
│       ├── verifyTenantAccess() (tenant isolation)                            │
│       ├── Calculate temperature/topP based on length + tone                  │
│       ├── Build prompt via descriptionPrompt()                               │
│       ├── Call Gemini 2.5 Flash with safety settings                         │
│       ├── Parse JSON response                                                │
│       ├── Log transaction (processingTime, tokenCount, etc.)                 │
│       └── Return { data, transaction }                                       │
│                                                                              │
│  prompt.ts                                                                   │
│       │                                                                      │
│       ├── sanitizeDescriptionInput() (prompt injection prevention)           │
│       │       • Removes dangerous patterns: "ignore instructions", etc.      │
│       │       • Strips special characters: <>{}\[\]\\|`~@#$%^*()+=;:"        │
│       │       • Limits input length (configurable max)                       │
│       │                                                                      │
│       ├── descriptionPrompt() (user prompt builder)                          │
│       │       • Sanitizes all user inputs                                    │
│       │       • Includes length constraints                                  │
│       │       • Includes tone instructions                                   │
│       │       • Specifies JSON output format                                 │
│       │                                                                      │
│       └── descriptionPromptSystemInstruction (system prompt)                 │
│               • Role: "professional copywriter"                              │
│               • Safety rules: NO allergens, NO health claims                 │
│               • Output format: valid JSON only                               │
│                                                                              │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                │ generateContent()
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ GEMINI AI (gemini-2.5-flash)                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Configuration:                                                              │
│       • model: "gemini-2.5-flash"                                            │
│       • responseMimeType: "application/json"                                 │
│       • temperature: 0.5-1.0 (based on length + tone)                        │
│       • topP: 0.88-0.92 (based on length)                                    │
│       • topK: 40                                                             │
│       • safetySettings: BLOCK_MEDIUM_AND_ABOVE for all harm categories       │
│                                                                              │
│  Response Format:                                                            │
│       {                                                                      │
│           "item-id-1": { "en": "...", "hi": "...", "es": "..." },            │
│           "item-id-2": { "en": "...", "hi": "...", "es": "..." }             │
│       }                                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## June 29 Response Diagnostics

`src/services/ai/description/generateDescriptionViaAPI.ts` now parses successful `/api/descriptions` responses through `readAiServiceResponseJson()` with a 1MB cap. Malformed, oversized, empty, or non-object responses log `ai_description_response_parse_failed` / `ai_description_response_invalid` with bounded project/file/count metadata, then preserve the existing null fallback and owner-visible description failure behavior.

## July 5 Provider Response Parse Diagnostics

`src/app/api/descriptions/route.ts` now parses Gemini text through `parseDescriptionProviderResponse()`. The parser strips JSON fences, accepts extractable object-fragment JSON before failure, and logs capped `description_provider_response_parse_failed` diagnostics for empty responses, malformed object fragments, or responses with no parseable object. The fixed fallback policy is `return_description_generation_failed`, which preserves the existing owner-safe failure response and prevents AI accounting writes or credit consumption when the provider response is unusable.

The route no longer logs raw response previews on parse failure and no longer hands full provider response objects to the local `API_RESPONSE` log. Local response logging is limited to model/request metadata, response-text presence, response-text length, and usage metadata. Local success/error logs use bounded request, response, and transaction summaries, and the AI accounting input carries bounded item/language summaries instead of raw prompt item/language payloads. Raw provider response text, prompt/menu/item copy, generated descriptions, project/file/store/tenant/user IDs, response preview text, full provider response objects, raw prompt item/language payloads, and exception text are not logged.

`src/components/templates/main-app/projects/editorView/descriptionGeneration.shared.ts` logs returned-error results from the service layer through `menu_editor_description_generation_returned_error_message`. That diagnostic uses bounded menu-editor project, file, result-message, and message-type presence-length metadata only, and `npm run verify:public-business-truth` rejects the old raw `logger.warn()` branch, raw `resultMessage`, and raw `file.uid` fields.

## File Structure

```
src/
├── app/api/descriptions/
│   ├── route.ts                    # API endpoint (205 lines)
│   └── prompt.ts                   # Prompt templates + sanitization (172 lines)
│
├── services/ai/description/
│   ├── descriptionUtils.ts         # Service layer utilities (113 lines)
│   └── generateDescriptionViaAPI.ts # API client with bounded response parsing
│
├── components/templates/main-app/projects/
│   ├── editorView/
│   │   ├── Editor.tsx              # Main editor (integrates modal)
│   │   ├── DescriptionGenerationModal.tsx  # UI modal (284 lines)
│   │   └── EditorActionsPopover.tsx        # Actions menu (135 lines)
│   │
│   └── types/
│       └── api.types.ts            # DescriptionAPIParams interface
│
├── lib/
│   ├── validation/
│   │   └── apiSchemas.ts           # DescriptionRequestSchema (Zod)
│   │
│   ├── rateLimit/
│   │   ├── configs.ts              # AI_OPERATION: 20 req/min
│   │   └── helpers.ts              # checkAIOperationLimit()
│   │
│   └── google/genAi/
│       └── index.ts                # genAIClient initialization
│
└── constants/
    └── common.ts                   # AI_ACTIONS_TYPES constants
```

---

## Multi-Outlet Governance

Description generation follows the same multi-outlet governance rules as translations:

| Store Type     | Can Generate Descriptions For             |
| -------------- | ----------------------------------------- |
| **Standalone** | All items (whole menu)                    |
| **Master**     | All items (whole menu)                    |
| **Outlet**     | **ONLY local-only items** (`L_I_` prefix) |

### Implementation

**Files Modified:**

| File                                                                                  | Change                                                                                |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/services/ai/description/descriptionUtils.ts:8-42`                                | Add `DescriptionGovernanceOptions` interface and `shouldGenerateDescriptionForItem()` |
| `src/services/ai/description/descriptionUtils.ts:44-48,97-105`                        | Update `prepareDescriptionPayload()` and `addDescription()` to accept governance      |
| `src/components/.../DescriptionGenerationModal.tsx:29-40,52-55,77-79,107-109,142-143` | Accept governance props, filter item counts, pass to service                          |
| `src/components/.../editor.tsx:960-962`                                               | Pass `itemStates` and `isMasterLinked` to modal                                       |

**Governance Flow:**

```
Outlet triggers "Generate Descriptions" →
  ├── DescriptionGenerationModal receives itemStates + isMasterLinked
  ├── Item counts filtered (only local-only items shown)
  ├── addDescription() called with governance
  ├── prepareDescriptionPayload() filters:
  │   ├── inherited items → SKIP (descriptions from master)
  │   ├── overridden items → SKIP (descriptions from master)
  │   └── local-only items → INCLUDE ✓
  └── Only local items sent to AI for description generation
```

**Why Outlets Can't Generate for Inherited/Overridden Items:**

- `inherited` items: Master owns the item content, including descriptions
- `overridden` items: Outlet only overrides price/availability, not content
- `local-only` items: Outlet owns these entirely, can generate descriptions

---

## API Contract

### Request

```typescript
POST /api/descriptions
Content-Type: application/json
Authorization: Session cookie (via withAuth)

{
  "itemsList": [
    {
      "id": "item-123",
      "name": "Margherita Pizza",
      "category": "Pizza",
      "attributes": "12 inch, Thin crust",
      "description": ""  // Empty for ADD_DESCRIPTION, existing for REWRITE
    }
  ],
  "targetLang": [
    { "code": "en", "name": "English" },
    { "code": "hi", "name": "Hindi" }
  ],
  "sourceLang": { "code": "en", "name": "English" },
  "action": "add_description",  // or "rewrite_description"
  "projectId": "proj-abc123",
  "fileId": "file-xyz789",
  "contentLength": "Standard",  // "Standard" | "Detailed"
  "tone": "Professional"        // "Professional" | "Casual" | "Elegant" | "Playful"
}
```

### Response

```typescript
{
  "data": {
    "item-123": {
      "en": "Authentic Italian pizza with fresh mozzarella, tangy tomato sauce, and aromatic basil on a crispy thin crust.",
      "hi": "ताज़े मोज़ेरेला, तीखी टमाटर सॉस और सुगंधित तुलसी के साथ प्रामाणिक इतालवी पिज़्ज़ा।"
    }
  },
  "message": "",
  "transaction": {
    "totalCharge": 0.045,          // Cost in paise
    "totalCredits": 1.5,           // Token credits used
    "processingTime": 2340,        // Milliseconds
    "transactionId": "1706686234567"
  }
}
```

### Error Responses

| Status | Error                         | Cause                            |
| ------ | ----------------------------- | -------------------------------- |
| 400    | Invalid input                 | Zod validation failed            |
| 401    | Unauthorized                  | No valid session                 |
| 403    | Forbidden                     | Tenant access violation          |
| 429    | Too many requests             | Rate limit exceeded (20 req/min) |
| 500    | Description generation failed | Gemini API error                 |

---

## Validation Schema

```typescript
// src/lib/validation/apiSchemas.ts

const descriptionItemSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(500),
  category: z.string().max(200).optional(),
  attributes: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
});

const toneSchema = z.enum(["Professional", "Casual", "Elegant", "Playful"]);

export const DescriptionRequestSchema = z.object({
  itemsList: z.array(descriptionItemSchema).min(1).max(100),
  targetLang: z.array(languageObjectSchema).min(1).max(20),
  sourceLang: languageObjectSchema,
  action: z.enum(["add_description", "rewrite_description"]),
  projectId: z.string().max(100).optional(),
  fileId: z.string().max(100).optional(),
  contentLength: z.enum(["Standard", "Detailed"]),
  tone: toneSchema.optional().default("Professional"),
});
```

---

## Security Implementation

### 1. Authentication (`withAuth`)

```typescript
// route.ts:18
export const POST = withAuth(async (request, session) => {
  // Session guaranteed by middleware
  const userId = session.user.id;
  // ...
});
```

### 2. Rate Limiting

```typescript
// route.ts:24-26
const rateLimitResponse = await checkAIOperationLimit();
if (rateLimitResponse) return rateLimitResponse;

// Config: AI_OPERATION = 20 requests/minute per user
```

### 3. Input Validation (Zod)

```typescript
// route.ts:29-52
const rawData = await request.json();
const validation = validateAPIInput(DescriptionRequestSchema, rawData);

if (!validation.success) {
    // Log potential attack to Sentry
    logger.security('Input Validation Failed', { ... }, 'medium');
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}
```

### 4. Tenant Isolation

```typescript
// route.ts:58-73
if (projectId) {
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        logger.security('Tenant Access Violation - Description API', { ... }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
}
```

### 5. Prompt Injection Prevention

```typescript
// prompt.ts:17-53
function sanitizeDescriptionInput(
  input: string,
  maxLength: number = 200,
): string {
  const dangerousPatterns = [
    /ignore\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?)/gi,
    /forget\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?)/gi,
    /system\s+(prompt|instruction|command|message)/gi,
    /you\s+are\s+(now|a|an)\s+/gi,
    /act\s+as\s+(a|an)?\s*/gi,
    // ... more patterns
  ];

  let sanitized = input;
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, " ");
  });

  // Remove special characters
  sanitized = sanitized.replace(/[<>{}\[\]\\|`~@#$%^*()+=;:"]/g, "");

  return sanitized.substring(0, maxLength);
}
```

### 6. Gemini Safety Filters

```typescript
// route.ts:115-132
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
```

---

## AI Generation Configuration

### Temperature/TopP Matrix

```typescript
// route.ts:85-105

// Base settings by content length
const lengthSettings: Record<string, { temp: number; topP: number }> = {
  Standard: { temp: 0.75, topP: 0.9 }, // Balanced
  Detailed: { temp: 0.8, topP: 0.92 }, // Creative but controlled
};

// Tone adjustments (+/- to base temperature)
const toneAdjustment: Record<string, number> = {
  Professional: -0.05, // More focused
  Casual: 0, // Neutral
  Elegant: 0.05, // Slightly more creative
  Playful: 0.1, // Most creative
};

// Final calculation
const baseSetting = lengthSettings[contentLength] || lengthSettings.Standard;
const toneAdj = toneAdjustment[tone] || 0;
const temperature = Math.min(1.0, Math.max(0.5, baseSetting.temp + toneAdj));
```

### Full Configuration

```typescript
const generationConfig = {
  responseMimeType: "application/json",
  temperature, // 0.5-1.0 based on length + tone
  topP, // 0.88-0.92 based on length
  topK: 40,
  systemInstruction: descriptionPromptSystemInstruction,
  safetySettings: [
    /* 4 harm categories */
  ],
};
```

---

## Prompt Engineering

### System Instruction

```typescript
// prompt.ts:152-171
export const descriptionPromptSystemInstruction = `You are a professional copywriter specialized in creating appealing, accurate product/service descriptions for restaurants, spas, salons, and similar businesses.

Your task is to generate or rewrite descriptions in multiple languages based on JSON input.

🔒 CRITICAL SAFETY RULES - YOU MUST NEVER:
1. Include health claims about curing, treating, or preventing diseases
2. Generate allergen information (e.g., "gluten-free", "dairy-free", "nut-free") - this MUST be added manually for legal compliance
3. Use inappropriate, offensive, or vulgar language
4. Make false or misleading claims about products/services
5. Include medical advice or nutritional claims without verification

✅ YOU SHOULD:
1. Create appealing, professional descriptions that match the industry
2. Be concise, vivid, and engaging while staying accurate
3. Respect the cultural tone and style of each target language
4. Incorporate attributes naturally into descriptions
5. Preserve technical details when rewriting existing descriptions
6. Return ONLY valid JSON in the exact format specified`;
```

### User Prompt Template

```typescript
// prompt.ts:104-149
const descriptionPrompt = (contentLength, action, inputJson, tone) => `
You will be provided with the following JSON input:
${JSON.stringify(sanitizedInputJson, null, 2)}

The input JSON contains:
- "itemsList": An array of items with "id", "name", "category", "attributes", "description"
- "sourceLang": The language of the item "name" fields
- "targetLang": Array of target languages

Instructions:
1. Parse the provided "itemsList"
2. For each item:
   ${actionSpecificInstructions[action]}
3. ${lengthConstraints}
4. Incorporate any "attributes" naturally
5. **TONE: ${tone}** - ${TONE_INSTRUCTIONS[tone]}
6. Write in each language specified in "targetLang"
7. Output JSON format:
   {
     "ITEM_ID_1": {
       "LANG_CODE_1": "Description...",
       "LANG_CODE_2": "Description..."
     }
   }

Critical Requirements:
* Top-level keys MUST be exact "id" from input
* Include ALL items from input
* Return ONLY the JSON object
`;
```

---

## Data Flow: Single File Generation

```
1. User clicks "Generate Descriptions" in Editor
   └── Editor.tsx → setIsDescModalOpen({ active: true })

2. Modal opens with item count preview
   └── DescriptionGenerationModal.tsx
       └── useMemo calculates: itemsCount, itemsWithDescriptions, itemsWithoutDescriptions

3. User selects options and clicks "Generate"
   └── handleGenerateEmptyClick() → handleDescriptionRequest(ADD_DESCRIPTION, contentLength)

4. Service layer prepares payload
   └── descriptionUtils.ts → prepareDescriptionPayload()
       • Filters items: only those without descriptions (for ADD action)
       • Extracts: { id, name, category, attributes, description }

5. API client calls backend
   └── generateDescriptionViaAPI.ts → POST /api/descriptions

6. Backend processes request
   └── route.ts
       a. withAuth() → validates session
       b. checkAIOperationLimit() → rate limit check
       c. validateAPIInput() → Zod validation
       d. verifyTenantAccess() → tenant isolation
       e. Calculate temperature/topP
       f. Build prompt with sanitized inputs
       g. Call Gemini 2.5 Flash
       h. Parse JSON response
       i. Log transaction
       j. Return { data, transaction }

7. Response merged into project data
   └── descriptionUtils.ts → mergeDescription()
       • item.description = { ...existing, ...generated }

8. Project saved to Firestore
   └── updateProject({ ...prevData, projectId })

9. UI updates and modal closes
   └── setActiveProject(updatedProject)
   └── antdMessage.success('Descriptions generated and saved!')
   └── onClose()
```

---

## Data Flow: Batch (Multi-File) Generation

```
1. User clicks "Generate" with no specific file selected
   └── modalData.sourceFile is undefined

2. Modal processes ALL files sequentially
   └── DescriptionGenerationModal.tsx:97-115

   for (const file of prevData.files) {
       if (file.extractedData?.data) {
           setFileProcessingId(file.uid);  // Track progress

           const { updatedProject } = await addDescription(
               prevData, file, targetLanguages, sourceLanguage,
               action, contentLength, tone
           );

           prevData = updatedProject;  // Chain updates
           setActiveProject(updatedProject);
           setFileProcessingId(null);

           processedFiles++;
           setProcessedCount(processedFiles);  // Update progress UI
       }
   }

3. Progress shown: "Processing file X of Y..."
   └── Alert component when isProcessing && totalFiles > 1

4. All files processed → single save to Firestore
   └── await updateProject({ ...prevData, projectId })
```

---

## Frontend Component Details

### DescriptionGenerationModal.tsx

**State Management:**

```typescript
const [contentLength, setContentLength] = useState<ContentLength>("Standard");
const [tone, setTone] = useState<ToneType>("Professional");
const [isProcessing, setIsProcessing] = useState(false);
const [processedCount, setProcessedCount] = useState(0);
const [totalFiles, setTotalFiles] = useState(0);
```

**Item Count Calculation:**

```typescript
const { itemsCount, itemsWithDescriptions, itemsWithoutDescriptions } =
  useMemo(() => {
    let total = 0,
      withDesc = 0,
      withoutDesc = 0;

    const filesToCheck = modalData.sourceFile
      ? projectData.files?.filter((f) => f.uid === modalData.sourceFile.uid)
      : projectData.files;

    filesToCheck?.forEach((file) => {
      file.extractedData?.data?.items?.forEach((item) => {
        total++;
        const hasDescription =
          item.description &&
          Object.values(item.description).some(
            (desc) => desc && String(desc).trim().length > 0,
          );
        hasDescription ? withDesc++ : withoutDesc++;
      });
    });

    return {
      itemsCount: total,
      itemsWithDescriptions: withDesc,
      itemsWithoutDescriptions: withoutDesc,
    };
  }, [projectData, modalData.sourceFile]);
```

**Two Action Buttons:**

```typescript
// Generate Empty - only for items without descriptions
<Button onClick={handleGenerateEmptyClick} disabled={!canGenerateEmpty}>
    Generate ({itemsWithoutDescriptions})
</Button>

// Rewrite All - regenerates all descriptions
<Button onClick={handleRewriteAllClick} disabled={itemsCount === 0}>
    Rewrite All
</Button>
```

---

## Types Reference

### DescriptionAPIParams

```typescript
// src/components/templates/main-app/projects/types/api.types.ts
export interface DescriptionAPIParams {
  itemsList: ExtractedDataItem[];
  targetLang: LanguageType[];
  sourceLang: LanguageType;
  action: keyof typeof descriptionActionType; // 'ADD_DESCRIPTION' | 'REWRITE_DESCRIPTION'
  projectId: string;
  fileId: string;
  contentLength: "Standard" | "Detailed";
  tone?: "Professional" | "Casual" | "Elegant" | "Playful";
}
```

### Description Storage in Item

```typescript
// src/components/templates/main-app/projects/types/extractedData.types.ts
export interface ExtractedDataItem {
  id: string;
  name: { [key: string]: string }; // { "en": "Pizza", "hi": "पिज्जा" }
  description?: { [key: string]: string }; // { "en": "Delicious...", "hi": "स्वादिष्ट..." }
  // ... other fields
}
```

### Action Constants

```typescript
// src/constants/common.ts
export const AI_ACTIONS_TYPES = {
  ADD_DESCRIPTION: "add_description",
  REWRITE_DESCRIPTION: "rewrite_description",
  // ... other actions
};
```

---

## Rate Limiting Configuration

```typescript
// src/lib/rateLimit/configs.ts
AI_OPERATION: {
    limit: 20,
    window: 60,  // seconds
    description: 'Fast AI operations - 20 requests per minute'
}
```

**Key:** `ai:{userId}:{tenantId}`

---

## Logging & Monitoring

### Transaction Logging

```typescript
// route.ts:149-170
let transactionObject = {
  transactionId: new Date().getTime().toString(),
  contentLength,
  itemsList,
  targetLang,
  sourceLang,
  projectId,
  fileId,
  action,
  clientResponse: generatedData,
  geminiResponse: response,
  generationConfig,
  model: AI_MODEL,
  promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
  candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
  totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
  processingTime, // in ms
  tokenPerCredit: TOKENS_PER_CREDIT,
  chargePerCredit: CHARGE_PER_CREDIT,
  totalCredits: totalTokenCount / TOKENS_PER_CREDIT,
  totalCharge: CHARGE_PER_CREDIT * (totalTokenCount / TOKENS_PER_CREDIT),
};
```

### Log Files

```typescript
const LOG_FILE = "descriptions.log";

// Logged events:
await writeLogEntry({
  logFileName: LOG_FILE,
  userId,
  projectId,
  fileId,
  logType: 'API_RESPONSE',
  data: {
    model: AI_MODEL,
    requestId,
    responseTextPresent: Boolean(response.text),
    responseTextLength: response.text?.length || 0,
    responseUsage: response.usageMetadata || null,
  },
});
await writeLogEntry({ logFileName: LOG_FILE, ..., logType: 'SUCCESS_RESPONSE', data: { ... } });
await writeErrorLogEntry(LOG_FILE, error);
await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData);
```

### Security Logging (Sentry)

```typescript
// Input validation failures
logger.security('Input Validation Failed', { endpoint: '/api/descriptions', ... }, 'medium');

// Tenant access violations
logger.security('Tenant Access Violation - Description API', { ... }, 'critical');

// General errors
logger.error('Description API error', error, { userId });
```

---

## Testing Guide

### Manual Testing Checklist

| Test Case                   | Steps                                                      | Expected Result                   |
| --------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Generate empty descriptions | Open modal → Select Standard/Professional → Click Generate | Descriptions added to empty items |
| Rewrite all descriptions    | Open modal → Click "Rewrite All"                           | All descriptions regenerated      |
| Standard content size       | Select "Standard" → Generate                               | 25-35 word descriptions           |
| Detailed content size       | Select "Detailed" → Generate                               | 50+ word descriptions             |
| Playful tone                | Select "Playful" → Generate                                | Fun, energetic language           |
| Multi-language              | Project has en, hi, es → Generate                          | Descriptions in all 3 languages   |
| Per-file generation         | Click retry on specific file → Generate                    | Only that file's items processed  |
| Rate limit                  | Generate 21 times in 1 minute                              | 429 error on 21st request         |
| Progress indicator          | Generate with 3 files                                      | Shows "Processing file X of 3"    |

### API Testing (curl)

```bash
# Test with valid session cookie
curl -X POST http://localhost:3000/api/descriptions \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "itemsList": [{"id": "test-1", "name": "Test Item", "category": "Test"}],
    "targetLang": [{"code": "en", "name": "English"}],
    "sourceLang": {"code": "en", "name": "English"},
    "action": "add_description",
    "contentLength": "Standard",
    "tone": "Professional"
  }'
```

---

## Suggestions & Improvements

### Code Quality Observations ✅

| Finding               | Current State                                  | Assessment                          |
| --------------------- | ---------------------------------------------- | ----------------------------------- |
| **Tone-aware Config** | Temperature/TopP adjusted per tone             | ✅ Follows Google AI best practices |
| **Safety Filters**    | BLOCK_MEDIUM_AND_ABOVE for all harm categories | ✅ Proper content safety            |
| **Rate Limiting**     | `checkAIOperationLimit()` (20/min)             | ✅ Prevents abuse                   |
| **Input Validation**  | Zod schema with max lengths                    | ✅ OWASP compliant                  |
| **Prompt Injection**  | `sanitizeDescriptionInput()` with patterns     | ✅ Comprehensive protection         |
| **Tenant Isolation**  | `verifyTenantAccess()` check                   | ✅ Multi-tenant secure              |

---

### 🎯 Recommended Code Changes (Consolidated)

#### P1 — Doctrine-Aligned (ChatGPT Feedback)

| #   | Improvement              | Current State                     | Suggested Change                                                                                  | Files                                           | Rationale                                      |
| --- | ------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------- |
| 1   | **Simplify Options**     | 4 tones × 3 lengths = 12 configs  | Reduce to 2 lengths (Standard/Detailed), use "Professional" tone internally                       | `DescriptionGenerationModal.tsx`                | Authority-first: less user thinking            |
| 2   | **Rewrite All Safety**   | No warning, immediate action      | Add confirmation dialog, rename to "Refresh descriptions"                                         | `DescriptionGenerationModal.tsx`                | Prevent trust erosion from unwanted overwrites |
| 3   | **Silence as Outcome**   | Modal always shows action buttons | If all items have descriptions, show "Your menu descriptions are ready" + disable generate button | `DescriptionGenerationModal.tsx`                | "Silence = confidence"                         |
| 4   | **Protect Manual Edits** | Rewrite replaces ALL descriptions | Only rewrite AI-generated descriptions, never manually written ones                               | `descriptionUtils.ts`, add `isAIGenerated` flag | Never overwrite user's work                    |

#### P2 — UX Improvements (Cascade Analysis)

| #   | Improvement              | Current State                    | Suggested Change                                             | Files                            |
| --- | ------------------------ | -------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| 5   | **Preview Before Apply** | Descriptions applied immediately | Show preview modal: Apply / Regenerate / Edit                | `DescriptionGenerationModal.tsx` |
| 6   | **Custom Keywords**      | AI generates from item name only | Allow user to specify keywords (e.g., "organic", "homemade") | `prompt.ts`                      |

#### P3 — Nice-to-Have (Cascade Analysis)

| #   | Improvement               | Current State                | Suggested Change                       | Files                            |
| --- | ------------------------- | ---------------------------- | -------------------------------------- | -------------------------------- |
| 7   | **Description History**   | Previous descriptions lost   | Keep last 3 versions, allow revert     | New component + Firestore field  |
| 8   | **Batch Progress Detail** | "Processing X of Y files"    | Show item names being processed        | `DescriptionGenerationModal.tsx` |
| 9   | **Cancel Mid-Generation** | Must wait for completion     | Add cancel button with AbortController | `descriptionUtils.ts`            |
| 10  | **Response Caching**      | Same item+config regenerates | Cache results for 24h, skip if cached  | `route.ts` + Redis               |

---

### 🛠️ Technical Debt

| #   | Item                    | Description                                      | Effort | Priority |
| --- | ----------------------- | ------------------------------------------------ | ------ | -------- |
| 1   | **Transaction ID**      | Uses timestamp instead of UUID                   | Low    | P3       |
| 2   | **Prompt Versioning**   | No version tracking for debugging                | Low    | P3       |
| 3   | **Error Granularity**   | Generic "failed" message for all errors          | Medium | P2       |
| 4   | **Parallel Processing** | Sequential file processing could be parallelized | Medium | P3       |

---

### 📊 Performance Observations

| Metric                    | Current                       | Recommendation                       |
| ------------------------- | ----------------------------- | ------------------------------------ |
| **Items per request**     | Max 100 (via Zod)             | ✅ Good limit                        |
| **Sequential processing** | Files processed one at a time | Consider parallel with Promise.all   |
| **Token usage logging**   | Full response logged          | Consider sampling for cost reduction |

---

### 📋 Implementation Priority Summary

**Do First (P1 — Doctrine Alignment):** ✅ COMPLETED (Jan 31, 2026)

1. ✅ Simplify options (2 lengths: Standard/Detailed, tone locked to Professional internally)
2. ✅ Add Rewrite All confirmation (renamed to "Refresh descriptions")
3. ✅ Silence as outcome ("Your menu descriptions are ready." when complete)
4. ✅ Protect manual edits (`descriptionSource: 'ai' | 'manual'` field added)

**Do Next (P2 — UX):**

5. ⏸️ Preview before apply — DEFERRED (requires complex state management, conditionally approved as read-only only)
6. ❌ Custom keywords — **REJECTED** (reintroduces prompting behavior, breaks authority transfer per ChatGPT doctrine review)

**Do Later (P3 — Nice-to-Have):**
7-10. History, progress detail, cancel, caching

**Technical Debt (When Convenient):**

- UUID for transaction IDs
- Prompt versioning
- Better error messages
- Parallel processing
- Log whether overwrite was AI-only or mixed (for trust debugging)

---

### 🎨 Authority UX Copy (LOCKED — Jan 31, 2026)

The following copy is production-locked per ChatGPT doctrine review. Do not modify without founder approval.

**Modal Title:** "Menu descriptions"

**Header Line:** "Create clear, professional descriptions for your menu items."

**Status Line:** "{X} items • {Y} need descriptions"

**Length Options:**

- **Standard** — "One clear sentence suitable for most menus"
- **Detailed** — "Rich, expressive descriptions for premium items"

**Primary Button:** "Generate descriptions ({count})"

**Secondary Button:** "Refresh descriptions"

**Refresh Confirmation:**

- Title: "Refresh descriptions?"
- Body: "This will update descriptions created by MenuList. Your manual edits will not be changed."
- Actions: "Confirm refresh" / "Cancel"

**Silence State (all ready):**

- "Your menu descriptions are ready."
- "You can update them anytime."

**Processing:** "Working on your menu…" / "This may take a moment."

**Completion Toast:** "Descriptions updated."

**Footer:** "Descriptions are saved automatically."

**❌ FORBIDDEN WORDS:** AI, Prompt, Customize, Keywords, Fine-tune, Experiment, Adjust, Smart, Advanced

---

## Related Documents

| Document                                                 | Purpose                      |
| -------------------------------------------------------- | ---------------------------- |
| `description-generation_spec.md`                         | Product specification        |
| `README.md`                                              | Navigation hub               |
| `../assessments/assessment-09-description-generation.md` | Original security assessment |

---

_Document Status: Historical description-generation implementation evidence - not current launch certification_
_Source of Truth: Codebase (verified Jan 31, 2026)_
_Follows `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` standards._
