# 🧪 Upload Feature Testing Guide

**Feature**: File Upload & PDF Processing  
**Test Duration**: 30-45 minutes  
**Required**: Before production launch

---

## 🎯 Quick Test Scenarios

### **Test 1: File Size Validation** (5 min)

**Setup:**
1. Create test files:
   - `large-image.jpg` (15MB) - any large image
   - `large-pdf.pdf` (60MB) - any large PDF
   - `normal-image.jpg` (5MB)
   - `normal-pdf.pdf` (10MB)

**Steps:**
```bash
# Create test files (macOS/Linux)
dd if=/dev/zero of=test-large-image.jpg bs=1m count=15
dd if=/dev/zero of=test-large-pdf.pdf bs=1m count=60
```

**Test Cases:**
| # | Action | Expected Result | Status |
|---|--------|----------------|--------|
| 1.1 | Upload `large-image.jpg` (15MB) | ❌ Error: "too large. Max 10MB" | [ ] |
| 1.2 | Upload `large-pdf.pdf` (60MB) | ❌ Error: "too large. Max 50MB" | [ ] |
| 1.3 | Upload `normal-image.jpg` (5MB) | ✅ Success | [ ] |
| 1.4 | Upload `normal-pdf.pdf` (10MB) | ✅ Success | [ ] |
| 1.5 | Upload 10x 6MB images (60MB total) | ❌ After ~3 files: "exceeds 200MB limit" | [ ] |

**Pass Criteria:** All error messages show correct file names and size limits.

---

### **Test 2: File Type Validation** (5 min)

**Setup:**
1. Create test files with wrong extensions:
   ```bash
   # Create fake files
   echo "test" > virus.exe
   mv virus.exe fake-menu.pdf
   
   echo "test" > malware.zip
   mv malware.zip fake-image.jpg
   ```

**Test Cases:**
| # | Action | Expected Result | Status |
|---|--------|----------------|--------|
| 2.1 | Upload `.exe` file | ❌ Error: "Invalid file type" | [ ] |
| 2.2 | Upload fake-menu.pdf (actually .exe) | ❌ Error: "corrupted or not valid PDF" | [ ] |
| 2.3 | Upload fake-image.jpg (actually .zip) | ❌ Error: "corrupted or not valid JPG" | [ ] |
| 2.4 | Upload `.svg` file | ❌ Error: "Invalid file type" | [ ] |
| 2.5 | Upload real JPG file | ✅ Success | [ ] |

**Pass Criteria:** All malicious files are blocked with clear error messages.

---

### **Test 3: PDF Processing** (10 min)

**Setup:**
1. Prepare PDFs:
   - 5-page menu PDF
   - 35-page menu PDF
   - 55-page menu PDF
   - Corrupted PDF (open in text editor, delete some bytes, save)

**Test Cases:**
| # | Action | Expected Result | Status |
|---|--------|----------------|--------|
| 3.1 | Upload 5-page PDF | ✅ Success, converts to 5 images | [ ] |
| 3.2 | Upload 35-page PDF | ⚠️ Warning: "will take a few minutes", then success | [ ] |
| 3.3 | Upload 55-page PDF | ❌ Error: "Maximum 50 pages" | [ ] |
| 3.4 | Upload corrupted PDF | ❌ Error: "corrupted or invalid" | [ ] |
| 3.5 | Open browser DevTools console | 📊 See progress logs: "Processing 10/35 pages" | [ ] |

**Pass Criteria:** 
- PDFs convert correctly
- Page limits enforced
- Console shows progress
- Memory stays stable (check DevTools Memory tab)

---

### **Test 4: Duplicate Detection** (3 min)

**Test Cases:**
| # | Action | Expected Result | Status |
|---|--------|----------------|--------|
| 4.1 | Upload `menu.jpg` first time | ✅ Success | [ ] |
| 4.2 | Upload same `menu.jpg` again | 💬 Modal: "already exists...Upload anyway?" | [ ] |
| 4.3 | Click "Skip" | ❌ File not uploaded | [ ] |
| 4.4 | Upload same file again, click "Upload Anyway" | ✅ File uploaded | [ ] |

**Pass Criteria:** Modal appears, both options work correctly.

---

### **Test 5: Memory Leak Check** (10 min)

**Setup:**
1. Open Chrome DevTools → Performance Monitor
2. Watch "JS Heap Size" during PDF processing

**Steps:**
```
1. Note starting memory: ___ MB
2. Upload 30-page PDF
3. Wait for conversion to complete
4. Note ending memory: ___ MB
5. Upload another 30-page PDF
6. Note ending memory: ___ MB
```

**Pass Criteria:**
- Memory should return to ~baseline after each PDF
- No steady increase in memory usage
- Heap size doesn't grow indefinitely

**Example Good Result:**
```
Start: 50MB
After PDF 1: 85MB → drops to 52MB (✅ Good)
After PDF 2: 87MB → drops to 54MB (✅ Good)
```

**Example Bad Result:**
```
Start: 50MB
After PDF 1: 85MB → stays at 85MB (❌ Memory leak!)
After PDF 2: 120MB → stays at 120MB (❌ Memory leak!)
```

---

### **Test 6: Mobile Testing** (5 min)

**Test on:**
- iPhone (Safari)
- Android (Chrome)

**Test Cases:**
| # | Action | Expected Result | Status |
|---|--------|----------------|--------|
| 6.1 | Upload 10MB image | ✅ Success | [ ] |
| 6.2 | Upload 20-page PDF | ✅ Success, no crash | [ ] |
| 6.3 | Error messages readable | ✅ Text not cut off | [ ] |
| 6.4 | Upload from camera roll | ✅ Works | [ ] |

**Pass Criteria:** No crashes, UI looks good, performance acceptable.

---

### **Test 7: Error Messages** (3 min)

**Verify each error message is:**
- ✅ User-friendly (not technical jargon)
- ✅ Specific (mentions file name)
- ✅ Actionable (tells user what to do)

**Examples:**
```
❌ BAD: "Error: MIME validation failed"
✅ GOOD: "menu.pdf: Invalid file type. Please upload JPG, PNG, WebP, or PDF files."

❌ BAD: "File too large"
✅ GOOD: "restaurant-menu.pdf is too large. Maximum size for PDFs: 50MB"

❌ BAD: "Processing failed"
✅ GOOD: "menu-v2.pdf is corrupted or invalid. Please try a different PDF file."
```

---

## 🚨 Critical Bugs to Watch For

### **Bug 1: Memory Leak**
**Symptom:** Browser tab uses more memory after each PDF  
**How to Check:** DevTools → Memory → Take heap snapshot before/after  
**Expected:** Memory returns to baseline after processing

### **Bug 2: Race Condition**
**Symptom:** Uploading multiple files simultaneously causes errors  
**How to Check:** Drag 5 files at once  
**Expected:** Each file validated independently, no crashes

### **Bug 3: Validation Bypass**
**Symptom:** Malicious file gets through validation  
**How to Check:** Try various fake file extensions  
**Expected:** All non-JPG/PNG/PDF files blocked

### **Bug 4: Large PDF Crash**
**Symptom:** 40-page PDF crashes browser  
**How to Check:** Upload progressively larger PDFs  
**Expected:** Smooth processing up to 50 pages, blocked after

---

## 📊 Performance Benchmarks

**Targets:**
- 5MB image upload: < 2 seconds
- 10-page PDF conversion: < 10 seconds
- 30-page PDF conversion: < 30 seconds
- Memory overhead per PDF page: < 2MB

**Measure:**
```javascript
// In browser console during upload
console.time('upload');
// ... wait for upload to complete ...
console.timeEnd('upload');
```

---

## ✅ Pre-Launch Checklist

### **Functionality**
- [ ] File size limits work correctly
- [ ] File type validation blocks malicious files
- [ ] Magic bytes validation works
- [ ] Duplicate detection shows modal
- [ ] PDF page limit enforced (50 max)
- [ ] PDF processing doesn't leak memory
- [ ] Error messages are clear and helpful

### **User Experience**
- [ ] Upload works on Chrome
- [ ] Upload works on Safari
- [ ] Upload works on mobile (iOS + Android)
- [ ] Error messages display correctly
- [ ] Console logs show progress
- [ ] No crashes on large files

### **Edge Cases**
- [ ] Corrupted PDF handled gracefully
- [ ] Multiple file upload works
- [ ] Very large files rejected quickly
- [ ] Network errors handled
- [ ] Browser back button works

### **Security**
- [ ] .exe files blocked
- [ ] .zip files blocked
- [ ] .svg files blocked (XSS risk)
- [ ] Fake file extensions detected
- [ ] File content matches extension

---

## 🐛 How to Report Bugs

**Format:**
```
Title: [UPLOAD] Brief description

Environment:
- Browser: Chrome 119.0 / Safari 17.0
- OS: macOS 14.0 / Windows 11
- Device: Desktop / iPhone 15

Steps to Reproduce:
1. Go to Projects page
2. Upload [file name]
3. Click [action]

Expected:
[What should happen]

Actual:
[What actually happened]

Screenshots:
[Attach screenshots if applicable]

Console Errors:
[Copy any errors from browser console]
```

---

## 📝 Test Results Template

**Tester:** _______________  
**Date:** _______________  
**Browser:** _______________  
**OS:** _______________

| Test # | Test Name | Pass/Fail | Notes |
|--------|-----------|-----------|-------|
| 1.1 | Large image blocked | [ ] | |
| 1.2 | Large PDF blocked | [ ] | |
| 2.1 | Fake extensions blocked | [ ] | |
| 3.1 | PDF conversion works | [ ] | |
| 4.1 | Duplicate detection | [ ] | |
| 5.1 | No memory leaks | [ ] | |
| 6.1 | Mobile upload works | [ ] | |

**Overall Status:** 🟢 Pass / 🟡 Pass with issues / 🔴 Fail

**Critical Issues Found:** _______________

**Blocker Issues:** _______________

**Launch Certification Evidence:** This checklist is historical support only; not current launch certification. Record upload/browser/mobile/Storage results in the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../../production-readiness/external-certification-runbook.md).

---

## 🎯 Quick Smoke Test (5 min)

If you only have 5 minutes, run these critical tests:

1. ✅ Upload normal 5MB JPG → Should work
2. ❌ Upload 100MB file → Should block
3. ❌ Upload .exe file → Should block
4. ✅ Upload 10-page PDF → Should convert
5. ❌ Upload 60-page PDF → Should block

**Pass criteria:** All 5 tests behave as expected.

---

**Next:** After all tests pass → Move to [assessment-02-ai-extraction.md](../Assessments/assessment-02-ai-extraction.md)
