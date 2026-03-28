# 🔒 Rate Limiting with Upstash

Complete guide for rate limiting in this project.

---

## ⚡ Quick Start

### **For New API Routes:**

**REST APIs (Most Common - Use Reusable Helper!):**
```typescript
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';

export async function POST(request: Request) {
    // 🔒 RATE LIMITING: Prevent API abuse
    const rateLimitResponse = await checkAIOperationLimit();
    if (rateLimitResponse) return rateLimitResponse;
    
    // Continue with your logic...
}
```

**That's it! Just 3 lines instead of 25!**

**Streaming (SSE - Manual):**
```typescript
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';

const rateLimitConfig = getRateLimitForFeature('AI_OPERATION');
const rateLimit = await checkRateLimit({
    key: `ai:${session.uId}:${session.tId}`,
    ...rateLimitConfig
});

if (!rateLimit.allowed) {
    await sendEvent('error', {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
    });
    await writer.close();
    return;
}
```

---

## 📁 Files

```
src/lib/
├── rateLimit.ts                    # Core implementation (Upstash)
└── rateLimit/
    ├── helpers.ts                  # ⭐ Reusable helpers (USE THIS!)
    ├── configs.ts                  # Feature-based configs
    └── tiers.ts                    # Subscription tiers (optional)

src/config/
└── features.ts                     # ENABLE_RATE_LIMITING flag
```

## 🎯 **Available Helpers**

Use these instead of manual implementation:

```typescript
// For fast AI operations (descriptions, translations, chat, embeddings)
// 20 req/min
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';

// For expensive AI operations (image processing, image generation)
// 5 req/min (operations take 20-40 seconds each)
import { checkExpensiveAILimit } from '@lib/rateLimit/helpers';

// For batch operations (batch image generation triggers)
// 3 per 5 minutes (prevents Cloud Task queue abuse)
import { checkBatchOperationLimit } from '@lib/rateLimit/helpers';

// For data write operations
import { checkDataWriteLimit } from '@lib/rateLimit/helpers';

// For file uploads
import { checkFileUploadLimit } from '@lib/rateLimit/helpers';

// Or custom:
import { checkAIRateLimit } from '@lib/rateLimit/helpers';
const response = await checkAIRateLimit('DATA_WRITE', 'custom-prefix');
```

---

## 🎛️ Configuration

### **Development:**
```typescript
// src/config/features.ts
ENABLE_RATE_LIMITING: false  // No limits, no Upstash needed
```

### **Production:**
```typescript
ENABLE_RATE_LIMITING: true   // Enforces limits via Upstash

// .env
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

---

## 🎯 Available Configs

**Location:** `src/lib/rateLimit/configs.ts`

```typescript
'AI_OPERATION'             // 20 req/min (Fast AI: text-based operations)
'AI_EXPENSIVE'             // 5 req/min (Slow AI: image processing, 20-40s each)
'BATCH_OPERATION'          // 3 per 5min (Batch jobs: very expensive)
'KB_SEARCH'                // 60 req/min
'AUTH_LOGIN'               // 5 per 5 minutes
'AUTH_PASSWORD_RESET'      // 3 per hour
'FILE_UPLOAD'              // 10 req/min
'DATA_WRITE'               // 50 req/min
'DATA_READ'                // 200 req/min
'WEBHOOK'                  // 1000 req/min
'PUBLIC_API'               // 100 req/min
```

---

## 🔧 How It Works

### **Algorithm:** Sliding Window (Upstash Sorted Sets)
1. Each request stored with timestamp
2. Old requests (outside window) auto-removed
3. Count remaining to check limit
4. Time complexity: O(log N)

### **Commands per request:** 4
- ZREMRANGEBYSCORE (cleanup)
- ZCARD (count)
- ZADD (add request)
- EXPIRE (auto-delete key)

---

## 💰 Cost

**Free tier:** 10,000 commands/day = 2,500 user requests/day

**Paid:** $0.20 per 100K commands

**Example:** 1,000 users × 20 req/day = **$4.80/month**

---

## 📝 Templates

### **REST API:**
```typescript
export async function POST(request: Request) {
    const session = await getActiveSession();
    
    const rateLimitConfig = getRateLimitForFeature('AI_CHAT');
    const rateLimit = await checkRateLimit({
        key: `chat:${session.uId}:${session.tId}`,
        ...rateLimitConfig
    });
    
    if (!rateLimit.allowed) {
        const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        return NextResponse.json(
            {
                error: `Too many requests. Wait ${waitSeconds}s.`,
                retryAfter: waitSeconds,
                resetAt: rateLimit.resetAt
            },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': String(rateLimitConfig.limit),
                    'X-RateLimit-Remaining': String(rateLimit.remaining),
                    'X-RateLimit-Reset': String(rateLimit.resetAt),
                    'Retry-After': String(waitSeconds)
                }
            }
        );
    }
    
    // Continue...
}
```

### **Streaming (SSE):**
```typescript
export async function POST(request: NextRequest) {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    (async () => {
        const session = await getActiveSession();
        
        const rateLimitConfig = getRateLimitForFeature('AI_CHAT');
        const rateLimit = await checkRateLimit({
            key: `chat:${session.uId}:${session.tId}`,
            ...rateLimitConfig
        });
        
        if (!rateLimit.allowed) {
            await sendEvent('error', {
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED'
            });
            await writer.close();
            return;
        }
        
        // Continue...
    })();
    
    return responseStream;
}
```

---

## ✅ Checklist for New Routes

- [ ] Rate limiting added
- [ ] Appropriate config chosen
- [ ] Checked BEFORE expensive operations
- [ ] Correct format (REST vs SSE)
- [ ] Helpful error message

---

## 🎯 Key Points

1. **Always include rate limiting** in new API routes
2. **REST vs SSE:** Different response formats (both correct)
3. **Development:** Set flag to `false` for unlimited testing
4. **Production:** Set flag to `true` and add Upstash env vars
5. **Cost:** Very affordable (~$5/month for 1K users)

---

## 🔗 References

- **Upstash Console:** https://console.upstash.com/
- **Core Implementation:** `src/lib/rateLimit.ts`
- **Configs:** `src/lib/rateLimit/configs.ts`
- **Feature Flag:** `src/config/features.ts`
