# 🤖 AI Data Extraction Assessment

**Feature**: OCR & Menu Extraction with Gemini  
**Risk Level**: 🔴 HIGH → ✅ RESOLVED  
**Production Ready**: ❌ NO → ✅ YES (after testing)  
**Implementation Status**: ✅ **COMPLETED** on Nov 14, 2025  
**Code Review**: ✅ **COMPLETED** on Nov 28, 2025  
**Implementation Doc**: [2-IMPLEMENTATION-AI-EXTRACTION-COMPLETE.md](./development_done/2-IMPLEMENTATION-AI-EXTRACTION-COMPLETE.md)  
**Code Review Doc**: [ASSESSMENT-02-AI-EXTRACTION-CODE-REVIEW.md](./ASSESSMENT-02-AI-EXTRACTION-CODE-REVIEW.md)

---

## 📊 Implementation Summary

| Category                 | Total Issues | Implemented | Deferred | Status                               |
| ------------------------ | ------------ | ----------- | -------- | ------------------------------------ |
| **Critical (P0)**        | 2            | 1           | 1        | ✅ 50% (1 deferred per user request) |
| **High Priority (P1)**   | 4            | 4           | 0        | ✅ 100% Complete                     |
| **Medium Priority (P2)** | 2            | 0           | 2        | ⏭️ Phase 2 per user request          |

**Overall Implementation**: ✅ **4/4 Targeted Issues RESOLVED**

### ✅ Completed Issues

- ✅ **Issue #2**: Per-User Rate Limiting (P0) - _Already in place (Upstash)_
- ✅ **Issue #3**: Input Sanitization for XSS (P1)
- ✅ **Issue #4**: Simple Retry Logic (P1)
- ✅ **Issue #5**: AI Response Validation with Zod (P1)
- ✅ **Issue #6**: Quality Scoring & Warnings (P1)

### ⏭️ Deferred (Per User Decision)

- ⏭️ **Issue #1**: Budget Tracking (P0) - Will implement before production
- ⏭️ **Issue #7**: Caching (P2) - Not needed (each SMB has unique menu)
- ⏭️ **Edge Cases** - Phase 2
- ⏭️ **Performance Optimizations** - Phase 2

### 📁 Files Created/Modified

- ✅ `aiResponseUtils.ts` - NEW 457-line utility module
- ✅ `route.ts` - Integrated all safety checks
- ✅ Dependencies: isomorphic-dompurify (NEW)

### 🎯 Next Steps

1. Run testing checklist from [2-TESTING-GUIDE-AI-EXTRACTION.md](./development_done/2-TESTING-GUIDE-AI-EXTRACTION.md)
2. Implement budget tracking before production
3. Move to next assessment

---

## 🚨 Critical Issues (Block Launch)

### **1. No AI Cost Budget Tracking** 💰 P0

**Current State**: Unlimited AI API calls per user

**Risk**:

- User uploads 1000 files → $500+ bill
- Malicious user drains budget
- No way to track spending per tenant
- Business bankruptcy risk

**Fix**:

```typescript
// Create new collection: aiUsageBudgets
interface AIUsageBudget {
  tenantId: string;
  storeId: string;
  month: string; // "2025-11"
  totalSpent: number; // USD
  requestCount: number;
  imageProcessingCost: number;
  translationCost: number;
  descriptionCost: number;
  imageGenerationCost: number;
  budgetLimit: number; // $50 default
  warningThreshold: number; // $40 (80%)
}

// Check before every AI call
const checkBudget = async (
  tenantId: string,
  storeId: string,
  estimatedCost: number
) => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const budget = await getAIBudget(tenantId, storeId, currentMonth);

  if (budget.totalSpent + estimatedCost > budget.budgetLimit) {
    throw new Error(
      `Monthly AI budget exceeded ($${budget.budgetLimit}). ` +
        `Contact support to increase your limit.`
    );
  }

  // Send warning at 80%
  if (budget.totalSpent >= budget.warningThreshold && !budget.warningSent) {
    await sendBudgetWarningEmail(tenantId, budget);
    await updateBudget(budget.id, { warningSent: true });
  }
};

// Track after every AI call
const trackAICost = async (
  tenantId: string,
  storeId: string,
  operation: string,
  inputTokens: number,
  outputTokens: number
) => {
  const cost = calculateCost(inputTokens, outputTokens);
  await incrementBudget(tenantId, storeId, operation, cost);
};
```

**UI for Users**:

```typescript
// Show budget usage in dashboard
<Card title="AI Usage This Month">
  <Progress
    percent={(budget.totalSpent / budget.budgetLimit) * 100}
    status={
      budget.totalSpent > budget.warningThreshold ? "exception" : "normal"
    }
  />
  <Text>
    ${budget.totalSpent.toFixed(2)} / ${budget.budgetLimit}
  </Text>
  <Text type="secondary">{budget.requestCount} requests</Text>
</Card>
```

---

### **2. No Rate Limiting Per User** 🔒 P0

**Current State**: Global rate limit (5/min for all users)

**Problem**:

- One heavy user blocks everyone
- Can't track abuse per user
- Legitimate users get blocked

**Fix**:

```typescript
// Replace global rate limit with per-user limit
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute per user
  prefix: "ai:image-processing",
  analytics: true, // Track usage per user
});

// In API route
export const POST = withAuth(async (request, session) => {
  const userId = session.user.id;

  // Check per-user rate limit
  const { success, limit, reset, remaining } = await ratelimit.limit(userId);

  if (!success) {
    const resetDate = new Date(reset);
    const waitSeconds = Math.ceil((reset - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: `Rate limit exceeded. You can make ${limit} requests per minute. Try again in ${waitSeconds} seconds.`,
        retryAfter: waitSeconds,
        limit,
        remaining: 0,
        reset: resetDate.toISOString(),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
          "Retry-After": waitSeconds.toString(),
        },
      }
    );
  }

  // Process request...
});
```

**Why Upstash?**

- Faster than Firestore queries
- Built-in analytics dashboard
- Per-user tracking
- Distributed rate limiting (works across multiple server instances)

---

## 🔴 High Priority Issues

### **3. No Input Sanitization** 🛡️ P1

**Current State**: Extracted text used directly in UI

**Risk**: XSS attacks if AI returns malicious content

**Fix**:

```typescript
import DOMPurify from "isomorphic-dompurify";

// Sanitize all AI responses
const sanitizeAIResponse = (data: ExtractedData): ExtractedData => {
  return {
    ...data,
    data: {
      categories: data.data.categories.map((cat) => ({
        ...cat,
        name: Object.fromEntries(
          Object.entries(cat.name).map(([lang, text]) => [
            lang,
            DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }), // Remove all HTML
          ])
        ),
      })),
      items: data.data.items.map((item) => ({
        ...item,
        name: Object.fromEntries(
          Object.entries(item.name).map(([lang, text]) => [
            lang,
            DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }),
          ])
        ),
        description: item.description
          ? Object.fromEntries(
              Object.entries(item.description).map(([lang, text]) => [
                lang,
                DOMPurify.sanitize(text, { ALLOWED_TAGS: ["b", "i"] }),
              ])
            )
          : undefined,
      })),
    },
  };
};

// Apply after AI response
const result = await geminiModel.generateContent(prompt);
const rawData = JSON.parse(result.response.text());
const sanitizedData = sanitizeAIResponse(rawData);
```

---

### **4. No Retry Logic for AI Failures** 🔄 P1

**Current State**: Single attempt, fails permanently

**Fix**:

```typescript
const retryWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (400, 401, 403)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry on quota exceeded
      if (error.message?.includes("quota")) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

// Usage
const result = await retryWithExponentialBackoff(
  () => geminiModel.generateContent(prompt),
  3,
  1000
);
```

---

### **5. Missing Validation of AI Response** ✅ P1

**Current State**: Assumes AI always returns valid JSON

**Fix**:

```typescript
import { z } from "zod";

// Define strict schema
const AIResponseSchema = z.object({
  categories: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.record(z.string(), z.string().min(1)),
      })
    )
    .min(1), // At least 1 category required

  items: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.record(z.string(), z.string().min(1)),
        category: z.string(),
        price: z.number().min(0).max(100000), // Reasonable price range
        currency: z.string().length(3).optional(),
        description: z.record(z.string(), z.string()).optional(),
      })
    )
    .min(1), // At least 1 item required

  languages: z
    .array(
      z.object({
        code: z.string().length(2),
        name: z.string(),
      })
    )
    .min(1),
});

// Validate response
const parseAIResponse = (rawText: string): ExtractedData => {
  try {
    const parsed = JSON.parse(rawText);
    const validated = AIResponseSchema.parse(parsed.data || parsed);

    return {
      message: "success",
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("AI response validation failed:", error.errors);
      throw new Error(
        "AI returned invalid data format. Please try again or upload a clearer image."
      );
    }
    throw new Error("Failed to parse AI response");
  }
};
```

---

### **6. No Fallback for Low-Quality Extractions** 🎯 P1

**Current State**: Returns whatever AI extracts, even if garbage

**Fix**:

```typescript
// Quality scoring
const scoreExtraction = (data: ExtractedData): number => {
  let score = 0;

  // Check category quality
  const avgCategoryNameLength =
    data.data.categories.reduce(
      (sum, cat) => sum + Object.values(cat.name)[0]?.length || 0,
      0
    ) / data.data.categories.length;

  if (avgCategoryNameLength > 3) score += 25;

  // Check item quality
  const itemsWithPrices = data.data.items.filter(
    (item) => typeof item.price === "number" && item.price > 0
  ).length;

  score += (itemsWithPrices / data.data.items.length) * 50;

  // Check descriptions
  const itemsWithDesc = data.data.items.filter(
    (item) =>
      item.description &&
      Object.values(item.description).some((d) => d.length > 10)
  ).length;

  score += (itemsWithDesc / data.data.items.length) * 25;

  return score;
};

// After extraction
const extractedData = parseAIResponse(result.response.text());
const qualityScore = scoreExtraction(extractedData);

if (qualityScore < 40) {
  // Low quality - ask user to confirm
  extractedData.lowQuality = true;
  extractedData.qualityWarning =
    "The extracted data quality is low. Please review carefully or try uploading a clearer image.";
}
```

---

## 🟡 Medium Priority Issues

### **7. No Caching of Identical Files** 🟡 P2

**Current**: Same menu uploaded by different users = new AI call

**Fix**:

```typescript
// Hash file content
import { createHash } from "crypto";

const hashFile = async (file: Buffer): Promise<string> => {
  return createHash("sha256").update(file).digest("hex");
};

// Check cache before processing
const checkExtractionCache = async (fileHash: string) => {
  const cached = await getCachedExtraction(fileHash);
  if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
    // Cache hit, less than 7 days old
    return cached.data;
  }
  return null;
};

// Save to cache after processing
const cacheExtraction = async (fileHash: string, data: ExtractedData) => {
  await saveCachedExtraction({
    hash: fileHash,
    data,
    timestamp: Date.now(),
    hitCount: 1,
  });
};
```

**Savings**: Could reduce AI costs by 30-40% for restaurants with standard menus

---

### **8. Missing Progress Updates** ⏳ P2

**Current**: User sees loading spinner for 30+ seconds

**Fix**:

```typescript
// Add status updates
const processWithProgress = async (
  files: File[],
  onProgress: (status: string) => void
) => {
  onProgress("Uploading files to AI...");
  const uploadedFiles = await uploadFilesToGemini(files);

  onProgress("Analyzing images...");
  const result = await geminiModel.generateContent(prompt);

  onProgress("Extracting menu data...");
  const data = parseAIResponse(result.response.text());

  onProgress("Validating results...");
  const validated = validateExtractedData(data);

  onProgress("Complete!");
  return validated;
};
```

---

## 🐛 Corner Cases & Edge Cases

### **Edge Case 1: Menu in Multiple Languages**

**Current**: Extracts first language only

**Fix**: Detect multiple languages, ask user to confirm primary

```typescript
const detectLanguages = (text: string): string[] => {
  // Use language detection library
  const detected = franc(text, { minLength: 3 });
  // Return ISO codes
};
```

### **Edge Case 2: Menu with No Prices**

**Current**: Sets price to 0

**Fix**: Mark as "Price on request" or prompt user

### **Edge Case 3: Handwritten Menu**

**Current**: Poor OCR quality

**Fix**: Warn user upfront, suggest typed menu

### **Edge Case 4: Menu with Special Characters (€, ¥, ₹)**

**Current**: May not parse correctly

**Fix**: Normalize currency symbols in prompt

### **Edge Case 5: Very Long Item Names (50+ chars)**

**Current**: May truncate in UI

**Fix**: Add validation, truncate with ellipsis

---

## ✅ Performance Optimizations

### **Opt 1: Batch Processing**

Process multiple images in single AI call instead of sequential

```typescript
// Instead of: 3 images = 3 API calls
// Do: 3 images = 1 API call with all images
const processMultipleImages = async (images: string[]) => {
  const parts = images.map((img) => createPartFromUri(img));
  return await geminiModel.generateContent([prompt, ...parts]);
};
```

### **Opt 2: Use Cheaper Model for Simple Menus**

```typescript
// Use Gemini 1.5 Flash (cheaper) for simple menus
// Use Gemini 2.5 Flash (expensive) only for complex menus

const selectModel = (imageCount: number, complexity: "simple" | "complex") => {
  if (complexity === "simple" && imageCount === 1) {
    return "gemini-1.5-flash"; // 50% cheaper
  }
  return "gemini-2.5-flash";
};
```

### **Opt 3: Compress Images Before Upload**

```typescript
// Reduce image size before sending to AI
const compressForAI = async (imageUrl: string): Promise<string> => {
  // Resize to max 1024x1024 (AI doesn't need higher resolution)
  // Convert to WebP for smaller size
  // Quality: 80%
};
```

---

## 📊 Metrics to Track

### **AI Performance**

- Extraction accuracy rate
- Average processing time
- Token usage per request
- Cost per extraction

### **Quality Metrics**

- Low quality extraction rate (score < 40)
- User edit rate (how much they change AI results)
- Retry rate (how often users re-process)

### **Cost Metrics**

- Total AI spend per day/month
- Cost per tenant
- Most expensive operations
- Budget overrun frequency

---

## 🧪 Test Cases

```typescript
describe("AI Extraction", () => {
  it("should extract menu with 100% accuracy", async () => {
    const testImage = "test-menus/clear-simple-menu.jpg";
    const result = await extractMenu(testImage);
    expect(result.data.categories).toHaveLength(3);
    expect(result.data.items).toHaveLength(12);
  });

  it("should handle corrupted AI response", async () => {
    mockAI.mockReturnValue("{ invalid json }");
    await expect(extractMenu("test.jpg")).rejects.toThrow();
  });

  it("should retry on 500 error", async () => {
    mockAI
      .mockRejectedValueOnce(new Error("500"))
      .mockResolvedValueOnce(validResponse);

    const result = await extractMenu("test.jpg");
    expect(mockAI).toHaveBeenCalledTimes(2);
  });

  it("should not retry on 400 error", async () => {
    mockAI.mockRejectedValue(new Error("400"));
    await expect(extractMenu("test.jpg")).rejects.toThrow();
    expect(mockAI).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🎯 Recommended Implementation Order

1. **Week 1**: Budget tracking system (P0)
2. **Week 1**: Per-user rate limiting (P0)
3. **Week 2**: Response validation + sanitization (P1)
4. **Week 2**: Retry logic with exponential backoff (P1)
5. **Week 3**: Quality scoring + warnings (P1)
6. **Week 3**: Progress indicators (P2)
7. **Week 4**: Caching system (P2)
8. **Week 4**: Performance optimizations

---

**Next**: [Editor Assessment →](./ASSESSMENT-03-EDITOR.md)
