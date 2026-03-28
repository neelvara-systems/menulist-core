# 🧪 Rate Limiting Testing Guide

Complete guide for testing rate limiting functionality.

---

## ⚡ Quick Test (Browser)

### **Option 1: Test Route**
1. Start your dev server: `npm run dev`
2. Visit: `http://localhost:3000/api/test/rate-limit`
3. Keep refreshing the page (F5)
4. After 20 requests, you'll see a 429 error

### **Option 2: Using DevTools Console**
```javascript
// Test AI operations (20/min limit)
for (let i = 0; i < 30; i++) {
    fetch('/api/test/rate-limit?type=ai')
        .then(r => r.json())
        .then(d => console.log(`Request ${i+1}:`, d));
}

// Test expensive operations (5/min limit)
for (let i = 0; i < 10; i++) {
    fetch('/api/test/rate-limit?type=expensive')
        .then(r => r.json())
        .then(d => console.log(`Request ${i+1}:`, d));
}

// Test batch operations (3 per 5min limit)
for (let i = 0; i < 5; i++) {
    fetch('/api/test/rate-limit?type=batch')
        .then(r => r.json())
        .then(d => console.log(`Request ${i+1}:`, d));
}
```

---

## 🖥️ Terminal Testing

### **Run Test Script**
```bash
# Test AI operations (20/min)
node test-rate-limit.js ai

# Test expensive operations (5/min)
node test-rate-limit.js expensive

# Test batch operations (3 per 5min)
node test-rate-limit.js batch
```

### **Using curl**
```bash
# Make rapid requests
for i in {1..30}; do
  echo "Request $i:"
  curl -s http://localhost:3000/api/test/rate-limit?type=ai | jq
  sleep 0.1
done
```

---

## 📊 Rate Limit Configs

| Type | Limit | Window | Used By |
|------|-------|--------|---------|
| **AI_OPERATION** | 20/min | 60s | Descriptions, translations, metadata, chat |
| **AI_EXPENSIVE** | 5/min | 60s | Image gen, image editing, image processing |
| **BATCH_OPERATION** | 3 | 5 min | Batch image generation trigger |
| **DATA_WRITE** | 50/min | 60s | General data writes |
| **FILE_UPLOAD** | 10/min | 60s | File uploads |

---

## 🎯 Testing Real Endpoints

### **1. Test Fast AI Operations (20/min)**
```bash
# Descriptions
curl -X POST http://localhost:3000/api/descriptions \
  -H "Content-Type: application/json" \
  -d '{"itemsList":[...],"targetLang":"en","sourceLang":"en","action":"test"}'

# Expected: ✅ First 20 succeed, rest get 429
```

### **2. Test Expensive Operations (5/min)**
```bash
# Image Processing
curl -X POST http://localhost:3000/api/image-processor \
  -H "Content-Type: application/json" \
  -d '{"files":[...],"targetLanguages":[...]}'

# Expected: ✅ First 5 succeed, rest get 429
```

### **3. Test Batch Operations (3 per 5min)**
```bash
# Batch Trigger
curl -X POST http://localhost:3000/api/image-generation/batch-trigger \
  -H "Content-Type: application/json" \
  -d '{"generationConfig":{...},"projectId":"test","itemsList":[...],"jobId":"test"}'

# Expected: ✅ First 3 succeed, rest get 429 for 5 minutes
```

---

## 🔍 What to Verify

### **Expected Behavior:**
1. ✅ First N requests succeed (200 OK)
2. ✅ Subsequent requests blocked (429 Too Many Requests)
3. ✅ Error includes `retryAfter` seconds
4. ✅ Error includes `resetAt` timestamp
5. ✅ Headers include rate limit info

### **Response Headers:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1729750800000
Retry-After: 45
```

### **Error Response:**
```json
{
  "error": "Too many requests. Please wait 45 seconds before trying again.",
  "retryAfter": 45,
  "resetAt": 1729750800000
}
```

---

## 🐛 Troubleshooting

### **Rate limiting not working?**
1. Check `src/config/features.ts`:
   ```typescript
   ENABLE_RATE_LIMITING: true  // Must be true
   ```

2. Check environment variables:
   ```bash
   # .env.local
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

3. Verify Upstash connection:
   ```bash
   # Check logs for initialization
   [Rate Limit] Upstash Redis initialized successfully
   ```

### **Still getting unlimited requests?**
- Feature flag is OFF → Enable in `features.ts`
- Missing env vars → Add Upstash credentials
- Different user sessions → Rate limits are per user
- Cache issue → Clear Redis: `await upstash.flushdb()`

### **Getting 401 Unauthorized?**
- Test route requires authentication
- Add auth cookie to requests
- Or modify test route to skip auth (development only!)

---

## 📝 Development vs Production

### **Development (Feature Flag OFF)**
```typescript
// src/config/features.ts
ENABLE_RATE_LIMITING: false

// Behavior: All requests allowed, no Upstash needed
```

### **Production (Feature Flag ON)**
```typescript
ENABLE_RATE_LIMITING: true

// Behavior: Strict limits enforced via Upstash
```

---

## 🚀 After Testing

### **Remove Test Route (Production)**
Before deploying to production, delete:
- `src/app/api/test/rate-limit/route.ts`
- `test-rate-limit.js`

Or add authentication to test route for security.

---

## 💡 Tips

1. **Use separate Redis databases** for dev/prod
2. **Monitor rate limit hits** in logs
3. **Test with real user sessions** (different users have separate limits)
4. **Verify reset timing** (limits reset after window expires)
5. **Test concurrent requests** (multiple tabs/users)

---

## 📞 Support

If rate limiting isn't working:
1. Check Upstash dashboard for connection
2. Verify Redis commands are executing
3. Check application logs for errors
4. Ensure correct key format: `prefix:userId:tenantId`
