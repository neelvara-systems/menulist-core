# 🧪 Testing Guide: AI Extraction & OCR

**Feature**: AI Data Extraction  
**Implementation**: [2-IMPLEMENTATION-AI-EXTRACTION-COMPLETE.md](./2-IMPLEMENTATION-AI-EXTRACTION-COMPLETE.md)

---

## 📋 Quick Test Checklist (10 minutes)

Essential tests to verify basic functionality:

- [ ] **Test 1**: Upload clear menu image
- [ ] **Test 2**: Upload blurry/low-quality image
- [ ] **Test 3**: Check quality score in response
- [ ] **Test 4**: Verify no XSS in extracted data
- [ ] **Test 5**: Test rate limiting

---

## 🔬 Detailed Test Scenarios (30-45 minutes)

### **Test 1: Input Sanitization (XSS Protection)**

**Objective**: Verify AI responses are sanitized

**Steps**:
1. Open DevTools → Network tab
2. Upload a menu image
3. Find the `/api/image-processor` response
4. Check the response data for:
   - Category names
   - Item names
   - Descriptions
   - Tags

**Expected Result**:
- ✅ No `<script>` tags
- ✅ No `onclick` attributes
- ✅ No JavaScript code
- ✅ Descriptions may have `<b>` or `<i>` only

**Example Safe Response**:
```json
{
  "data": {
    "categories": [{
      "name": { "en": "Coffee & Tea" }  // No HTML
    }],
    "items": [{
      "name": { "en": "Espresso" },     // No HTML
      "description": {
        "en": "Strong <b>Italian</b> coffee"  // Only <b>, <i> allowed
      }
    }]
  }
}
```

**Pass Criteria**: ✅ No malicious HTML in any field

---

### **Test 2: AI Response Validation**

**Objective**: Verify Zod validation catches invalid responses

**Test 2a: Valid Response**
1. Upload valid menu image
2. Check that extraction succeeds
3. Verify all fields present

**Expected Result**:
```json
{
  "data": {
    "languages": [{"name": "English", "code": "en"}],
    "categories": [...],  // At least 1
    "items": [...]        // At least 1
  }
}
```

**Pass Criteria**: ✅ Extraction succeeds

**Test 2b: Invalid Response (Simulated)**

**Note**: This requires manually triggering an invalid AI response (for development testing)

**Expected Error**:
```
"AI returned invalid data format. Please try again with a clearer image."
```

**Pass Criteria**: ✅ App doesn't crash, shows user-friendly error

---

### **Test 3: Quality Scoring**

**Objective**: Verify quality scoring works correctly

**Test 3a: High Quality Menu**
1. Upload a **clear, professional** menu with:
   - Clear category names
   - All items have prices
   - Items have descriptions
2. Check quality score in response

**Expected Result**:
```json
{
  "qualityScore": 80-100,
  "qualityDetails": {
    "categoryQuality": 25,
    "itemQuality": 10,
    "priceQuality": 45-50,
    "descriptionQuality": 15-25
  },
  "message": ""  // No warning
}
```

**Pass Criteria**: ✅ Score > 70, no warning message

**Test 3b: Low Quality Menu**
1. Upload a **blurry or handwritten** menu
2. Check quality score

**Expected Result**:
```json
{
  "qualityScore": 0-40,
  "qualityDetails": { ... },
  "message": "The extracted data quality is low. Please review carefully or try uploading a clearer image."
}
```

**Pass Criteria**: ✅ Score < 40, warning message present

**Test 3c: Medium Quality Menu**
1. Upload menu with:
   - Clear text
   - Some items missing prices
   - No descriptions
2. Check quality score

**Expected Result**:
```json
{
  "qualityScore": 40-70,
  "qualityDetails": { ... },
  "message": ""  // May or may not have warning
}
```

**Pass Criteria**: ✅ Score between 40-70

---

### **Test 4: Retry Logic**

**Objective**: Verify retry logic works on failures

**Test 4a: Network Failure (Simulated)**

**Note**: This requires simulating network issues (dev testing only)

**Steps**:
1. Throttle network to "Slow 3G" in DevTools
2. Upload menu image
3. Watch console logs

**Expected Console Logs**:
```
[Retry] Attempt 1/3 failed - retrying in 2000ms
[Retry] Error: Network timeout
[Retry] Attempt 2/3 failed - retrying in 4000ms
[Retry] Success on attempt 3
```

**Pass Criteria**: ✅ Request succeeds after retries

**Test 4b: 4xx Error (Should NOT Retry)**

**Note**: Requires sending invalid request

**Expected Result**:
- ❌ No retry attempts
- Error returned immediately

**Pass Criteria**: ✅ No retries on 4xx errors

---

### **Test 5: Per-User Rate Limiting**

**Objective**: Verify rate limiting is per-user

**Steps**:
1. Login as User A
2. Make 10 AI extraction requests rapidly
3. Check if rate limited
4. Login as User B (different user)
5. Make AI extraction request

**Expected Result**:
- User A: 429 error after limit exceeded
- User B: ✅ Request succeeds (different user)

**Pass Criteria**: ✅ Rate limiting is per-user, not global

---

### **Test 6: End-to-End Upload Flow**

**Objective**: Test complete upload → extraction → display flow

**Steps**:
1. Go to Projects page
2. Upload menu image (JPEG or PDF)
3. Wait for extraction
4. Check extracted data in editor

**Expected Result**:
- ✅ Image uploads successfully
- ✅ Extraction completes within 30 seconds
- ✅ Categories appear in editor
- ✅ Items appear under categories
- ✅ Prices are correct
- ✅ Descriptions are present (if in image)

**Pass Criteria**: ✅ All data extracted correctly

---

## 🐛 Bug Reporting Format

If you find issues, report using this format:

```markdown
**Bug Title**: [Short description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:


**Actual Behavior**:


**Screenshots**:
[Attach screenshots]

**Environment**:
- Browser: 
- OS: 
- User ID: 

**Additional Context**:

```

---

## 📊 Test Results Tracking

Use this table to track test results:

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | XSS Protection | ⬜ | |
| 2a | Valid Response | ⬜ | |
| 2b | Invalid Response | ⬜ | |
| 3a | High Quality | ⬜ | |
| 3b | Low Quality | ⬜ | |
| 3c | Medium Quality | ⬜ | |
| 4a | Retry Success | ⬜ | |
| 4b | No Retry on 4xx | ⬜ | |
| 5 | Per-User Rate Limit | ⬜ | |
| 6 | End-to-End Flow | ⬜ | |

**Legend**: ✅ Pass | ❌ Fail | ⚠️ Partial | ⬜ Not Tested

---

## 🎯 Acceptance Criteria

**Must Pass ALL**:
- ✅ No XSS vulnerabilities
- ✅ Quality scoring works
- ✅ Retry logic works
- ✅ Rate limiting per-user
- ✅ End-to-end flow works

**Optional (Nice to Have)**:
- Quality score matches actual image quality
- Retry logs are clear
- Error messages are helpful

---

## 📝 Notes for Testers

### **Test Data**:
Use these sample menus:
1. **High Quality**: Professional printed menu (clear text, all prices)
2. **Medium Quality**: Phone photo of menu (decent lighting)
3. **Low Quality**: Blurry image or handwritten menu

### **Browser Console**:
Keep DevTools open to see:
- Retry attempts (console logs)
- Network errors
- Quality scores (in response)

### **Rate Limiting**:
- Expensive AI limit: 5 requests/minute
- Test with multiple uploads

---

## 🚀 Production Testing Checklist

Before marking as production-ready:

- [ ] All tests pass
- [ ] No XSS vulnerabilities found
- [ ] Quality scoring is accurate
- [ ] Retry logic works on real failures
- [ ] Rate limiting prevents abuse
- [ ] Error messages are user-friendly
- [ ] Performance is acceptable (<30s per extraction)
- [ ] Memory usage is stable (no leaks)

---

**Related**: [2-IMPLEMENTATION-AI-EXTRACTION-COMPLETE.md](./2-IMPLEMENTATION-AI-EXTRACTION-COMPLETE.md)
