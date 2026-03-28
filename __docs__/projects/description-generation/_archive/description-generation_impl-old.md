# Description Generation — Implementation

**Feature:** AI-Powered Menu Item Description Generation  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DescriptionGenerationModal.tsx                                  │
│       │                                                          │
│       ├── Content size selector (Small/Medium/Large)            │
│       ├── Tone selector (Professional/Casual/Elegant/Playful)   │
│       ├── Language selector                                     │
│       ├── Item count preview                                    │
│       └── Progress indicator                                    │
│                                                                  │
└───────┼─────────────────────────────────────────────────────────┘
        │
        │ POST /api/descriptions
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND API                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  /api/descriptions/route.ts                                     │
│       │                                                          │
│       ├── withAuth() middleware                                 │
│       ├── Rate limiting (checkExpensiveAILimit)                 │
│       ├── Input validation (Zod)                                │
│       ├── Gemini 2.5 Flash API call                             │
│       └── Safety filters (BLOCK_MEDIUM_AND_ABOVE)               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/
├── app/api/descriptions/
│   ├── route.ts              # API endpoint
│   └── prompt.ts             # Prompt templates
│
└── components/templates/main-app/projects/editorView/
    └── Modals/
        └── DescriptionGenerationModal.tsx
```

---

## API Route

### Request

```typescript
POST /api/descriptions

{
  itemName: string;           // Required
  category?: string;          // Optional context
  ingredients?: string[];     // Optional context
  price?: number;             // Optional context
  existingDescription?: string; // For rewrite
  contentSize: 'small' | 'medium' | 'large';
  targetLanguages: { name: string; code: string }[];
  tone?: 'professional' | 'casual' | 'elegant' | 'playful';
}
```

### Response

```typescript
{
  descriptions: {
    [languageCode: string]: string;
  };
  contentSize: 'small' | 'medium' | 'large';
  transaction: {
    totalCharge: number;
    totalCredits: number;
    processingTime: number;
    transactionId: string;
  };
}
```

---

## Key Implementation

### Route Handler

```typescript
// /api/descriptions/route.ts
export const POST = withAuth(async (request, session) => {
  // Rate limiting
  const rateLimit = await checkExpensiveAILimit(session.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Validate input
  const body = await request.json();
  const validation = DescriptionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  // Build prompt
  const prompt = buildDescriptionPrompt({
    itemName: body.itemName,
    category: body.category,
    contentSize: body.contentSize,
    tone: body.tone,
    targetLanguages: body.targetLanguages,
  });

  // Generate with Gemini
  const model = getGenerativeModel(gemini, {
    model: "gemini-2.5-flash",
    generationConfig: getGenerationConfig(body.tone),
    safetySettings: SAFETY_SETTINGS,
  });

  const result = await model.generateContent(prompt);
  const descriptions = parseDescriptionResponse(result.response.text());

  return NextResponse.json({
    descriptions,
    contentSize: body.contentSize,
    transaction: {
      /* ... */
    },
  });
});
```

### Prompt Building

```typescript
// prompt.ts
export const buildDescriptionPrompt = ({
  itemName,
  category,
  contentSize,
  tone,
  targetLanguages,
}: PromptParams): string => {
  const wordCount = WORD_COUNTS[contentSize];
  const toneGuidelines = TONE_GUIDELINES[tone];

  return `
You are a professional menu copywriter creating appetizing descriptions.

ITEM: ${itemName}
${category ? `CATEGORY: ${category}` : ""}

REQUIREMENTS:
- Word count: ${wordCount.min}-${wordCount.max} words
- Tone: ${toneGuidelines}
- Languages: ${targetLanguages.map((l) => l.name).join(", ")}

STRICT RULES:
- DO NOT include allergen information
- DO NOT make health claims (cures, prevents, etc.)
- DO NOT include medical advice
- Keep language professional and appropriate

OUTPUT FORMAT:
Return JSON with language codes as keys:
{
  "en": "English description...",
  "hi": "Hindi description..."
}
`;
};
```

### Safety Configuration

```typescript
// Safety settings for Gemini
const SAFETY_SETTINGS = [
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

### Tone-Aware Generation Config

```typescript
const getGenerationConfig = (tone: Tone) => {
  switch (tone) {
    case "professional":
      return { temperature: 0.7, topP: 0.9, topK: 40 };
    case "casual":
      return { temperature: 0.8, topP: 0.95, topK: 50 };
    case "elegant":
      return { temperature: 0.6, topP: 0.85, topK: 30 };
    case "playful":
      return { temperature: 0.9, topP: 0.95, topK: 60 };
    default:
      return { temperature: 0.7, topP: 0.9, topK: 40 };
  }
};
```

---

## Word Count Configuration

```typescript
const WORD_COUNTS = {
  small: { min: 20, max: 30 },
  medium: { min: 40, max: 60 },
  large: { min: 80, max: 120 },
};
```

---

## Frontend Modal

```typescript
// DescriptionGenerationModal.tsx
const DescriptionGenerationModal = ({ item, onComplete }) => {
  const [contentSize, setContentSize] = useState<ContentSize>("medium");
  const [tone, setTone] = useState<Tone>("professional");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: item.name[activeLang],
          category: item.category,
          contentSize,
          tone,
          targetLanguages: project.languages,
        }),
      });

      const data = await response.json();
      onComplete(data.descriptions);
    } catch (error) {
      message.error("Description generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal title="Generate Description" open={open}>
      {/* Size selector */}
      <Radio.Group value={contentSize} onChange={setContentSize}>
        <Radio.Button value="small">Small (20-30 words)</Radio.Button>
        <Radio.Button value="medium">Medium (40-60 words)</Radio.Button>
        <Radio.Button value="large">Large (80-120 words)</Radio.Button>
      </Radio.Group>

      {/* Tone selector */}
      <Select value={tone} onChange={setTone}>
        <Option value="professional">Professional</Option>
        <Option value="casual">Casual</Option>
        <Option value="elegant">Elegant</Option>
        <Option value="playful">Playful</Option>
      </Select>

      {/* Progress indicator */}
      {isGenerating && (
        <Progress
          percent={Math.round((progress.current / progress.total) * 100)}
        />
      )}

      <Button onClick={handleGenerate} loading={isGenerating}>
        Generate Description
      </Button>
    </Modal>
  );
};
```

---

## Validation Checklist

| Requirement        | Implementation        | Location                       | Status |
| ------------------ | --------------------- | ------------------------------ | ------ |
| Content sizes      | WORD_COUNTS config    | prompt.ts                      | ✅     |
| Tone selection     | getGenerationConfig() | route.ts                       | ✅     |
| Multi-language     | targetLanguages param | route.ts                       | ✅     |
| Safety filters     | SAFETY_SETTINGS       | route.ts                       | ✅     |
| Rate limiting      | checkExpensiveAILimit | route.ts                       | ✅     |
| Input validation   | Zod schema            | route.ts                       | ✅     |
| Progress indicator | Modal state           | DescriptionGenerationModal.tsx | ✅     |

---

## Related Documents

| Document                                                 | Purpose               |
| -------------------------------------------------------- | --------------------- |
| `_spec.md`                                               | Product specification |
| `_marketing.md`                                          | Sales collateral      |
| `../Assessments/ASSESSMENT-09-DESCRIPTION-GENERATION.md` | Original assessment   |
| `../07-DESCRIPTION-GENERATION.md`                        | Detailed API docs     |

---

## Recommendations & Future Improvements

### Code Quality Observations

| Finding               | Current State                                  | Recommendation                      | Priority |
| --------------------- | ---------------------------------------------- | ----------------------------------- | -------- |
| **Tone-aware Config** | Temperature/TopP adjusted per tone             | ✅ Follows Google AI best practices | -        |
| **Safety Filters**    | BLOCK_MEDIUM_AND_ABOVE for all harm categories | ✅ Proper content safety            | -        |
| **Rate Limiting**     | `checkAIOperationLimit()`                      | ✅ Prevents abuse                   | -        |
| **Input Validation**  | Zod schema with security logging               | ✅ OWASP compliant                  | -        |

### Suggested Improvements

1. **Preview Before Apply**

   - **Current**: Descriptions applied immediately
   - **Suggested**: Show preview modal with "Apply" / "Regenerate" / "Edit" options
   - **File**: `DescriptionGenerationModal.tsx`
   - **Priority**: P2

2. **Description History**

   - **Current**: Previous descriptions lost on regeneration
   - **Suggested**: Keep last 3 versions, allow revert
   - **Priority**: P3

3. **Custom Keywords**

   - **Current**: AI generates based on item name only
   - **Suggested**: Allow user to specify keywords to include (e.g., "organic", "gluten-free")
   - **File**: `prompt.ts`
   - **Priority**: P2

4. **Batch Progress Detail**
   - **Current**: "Processing X of Y files"
   - **Suggested**: Show item names being processed
   - **Priority**: P3

### Technical Debt

| Item                  | Description                               | Effort |
| --------------------- | ----------------------------------------- | ------ |
| Transaction recording | Currently uses timestamp as transactionId | Low    |
| Response caching      | Same item+config could cache result       | Medium |
| Prompt versioning     | Track prompt version for debugging        | Low    |

---

_Document Status: ✅ PRODUCTION READY_
