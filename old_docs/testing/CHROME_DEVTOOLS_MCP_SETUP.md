# 🔧 Chrome DevTools MCP Setup & Testing Infrastructure

**Purpose:** Production-grade automated testing with network monitoring, performance profiling, and real-time debugging  
**Date:** November 5, 2025  
**Status:** Setup Guide

---

## 📋 Why Chrome DevTools MCP?

### Use Cases for Your Project:

1. **Network Monitoring:**
   - Monitor API calls during testing (`/api/helpCenter/search-kb`)
   - Verify rate limiting works (30 req/min)
   - Check Firebase calls and latency
   - Detect failed requests

2. **Performance Testing:**
   - Measure page load times
   - Profile AI response generation time
   - Detect memory leaks
   - Monitor bundle size impact

3. **Console Log Capture:**
   - Verify security logs work
   - Check error handling
   - Monitor Redux state changes
   - Capture API responses

4. **Automated Testing:**
   - Run complete user flows automatically
   - Take screenshots at each step
   - Generate test reports
   - Verify across different scenarios

---

## 🛠️ Step 1: Install Chrome DevTools MCP

### 1.1 Install the Package

```bash
npm install -g chrome-devtools-mcp
```

### 1.2 Configure in Windsurf

1. Open Windsurf Settings (Cmd/Ctrl + ,)
2. Search for "MCP" or "Model Context Protocol"
3. Add this configuration:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

### 1.3 ~~Install Chrome Extension~~ **NOT NEEDED** ✅

**No Chrome extension required!** Chrome DevTools MCP works via the built-in Chrome DevTools Protocol (CDP).

**How it works:**
- Chrome has CDP built-in (since 2011)
- MCP connects via CDP on port 9222
- No extension installation needed
- Works with any modern Chrome browser

### 1.4 Restart Windsurf

Close and reopen Windsurf IDE to load the new MCP server.

---

## 🧪 Step 2: Create Testing Workflow

### Test Automation Pattern

We'll combine:
- **Puppeteer MCP** → Browser automation (navigation, clicks, inputs)
- **Chrome DevTools MCP** → Monitoring (network, console, performance)
- **Your Testing Guides** → Test scenarios

### Example: Testing Help Chat Flow

```markdown
Test: User asks question in help chat
Flow:
1. [Puppeteer] Navigate to http://localhost:3000
2. [Puppeteer] Login as test user
3. [Chrome DevTools] Start network monitoring
4. [Chrome DevTools] Start console logging
5. [Puppeteer] Click help chat button
6. [Puppeteer] Type "How do I reset password?"
7. [Puppeteer] Click send
8. [Chrome DevTools] Verify API call to /api/helpCenter/search-kb
9. [Chrome DevTools] Check response time < 3 seconds
10. [Chrome DevTools] Verify no console errors
11. [Puppeteer] Take screenshot
12. [Puppeteer] Verify AI response appears
```

---

## 📊 Step 3: Test Scenarios by Feature

### Feature 1: Help Chat (QnA Mode)

**Test Files:**
- `docs/testing/STEP_1_USER_CHAT_FLOW.md` (your existing guide)
- `testing-guides/chat-management/01-overview-tab.md`

**Automated Tests:**

1. **Happy Path:**
   ```
   - Navigate to help chat
   - Ask question
   - Monitor: /api/helpCenter/search-kb
   - Verify: Response in < 3s
   - Verify: No console errors
   - Verify: AI answer displayed
   - Verify: References shown
   - Verify: Suggested questions appear
   ```

2. **Error Handling:**
   ```
   - Ask question with special characters
   - Monitor: Input validation
   - Verify: Proper error message
   - Verify: Security log created
   ```

3. **Rate Limiting:**
   ```
   - Send 31 requests in 1 minute
   - Monitor: 31st request
   - Verify: 429 status code
   - Verify: "Too many requests" message
   ```

### Feature 2: Admin Chat Management

**Test Files:**
- `docs/testing/STEP_5_ADMIN_UI.md`

**Automated Tests:**

1. **Conversations List:**
   ```
   - Navigate to /platform/chat-management
   - Monitor: Firestore queries
   - Verify: Data loads in < 2s
   - Test: Filters (mode, feedback, date)
   - Test: Search functionality
   - Test: Pagination
   - Verify: SWR caching works
   ```

2. **Conversation Drawer:**
   ```
   - Click "View Details"
   - Monitor: Session fetch
   - Verify: All messages displayed
   - Test: Internal notes save
   - Test: Export transcript
   - Verify: No data leaks
   ```

### Feature 3: Authentication & Security

**Automated Tests:**

1. **Login Rate Limiting:**
   ```
   - Attempt 6 failed logins
   - Monitor: authSecurityEvents collection
   - Verify: Account locked after 5 attempts
   - Verify: Lockout message displayed
   ```

2. **Multi-tenant Isolation:**
   ```
   - Login as User A (tenant 1)
   - Note: tId, sId
   - Try to access User B's data (tenant 2)
   - Verify: 403 Forbidden
   - Verify: Security log created
   ```

### Feature 4: Payment Flow

**Test File:**
- `docs/payments/razorpay/testing.md`

**Automated Tests:**

1. **Onboarding + Payment:**
   ```
   - Navigate to /pricing
   - Click "Get Started"
   - Fill onboarding form
   - Monitor: /api/razorpay/create-subscription
   - Complete test payment
   - Verify: Subscription created
   - Verify: Firestore updated
   ```

---

## 🔍 Step 4: Network Monitoring Patterns

### Monitor Critical APIs

```markdown
1. Help Chat APIs:
   - /api/helpCenter/search-kb
   - /api/helpCenter/search-kb-stream
   
   Monitor:
   - Response time
   - Status codes
   - Rate limit headers
   - Error responses

2. Database Operations:
   - Firestore reads/writes
   - Query performance
   - Document sizes

3. Authentication:
   - /api/auth/signin
   - /api/auth/session
   - Failed login attempts

4. Payment APIs:
   - /api/razorpay/create-subscription
   - /api/razorpay/webhook
   - Subscription updates
```

### Network Monitoring Commands

**Start Monitoring:**
```
Start network monitoring for localhost:3000
Filter: XHR and Fetch only
```

**Check Specific API:**
```
Monitor API calls to /api/helpCenter/search-kb
Show: Status, time, headers, response
```

**Verify Rate Limiting:**
```
Monitor rate limit headers in responses
Check: X-RateLimit-Remaining, Retry-After
```

---

## 📈 Step 5: Performance Testing

### Key Metrics to Track

1. **Page Load Time:**
   - Target: < 3 seconds
   - Measure: Initial load to interactive

2. **API Response Time:**
   - Help Chat: < 3 seconds
   - Database queries: < 500ms
   - Authentication: < 1 second

3. **Bundle Size:**
   - Main bundle: < 500KB
   - Vendor bundle: < 1MB

4. **Memory Usage:**
   - No leaks after 10 interactions
   - Heap size stable

### Performance Test Commands

**Measure Page Load:**
```
Navigate to http://localhost:3000
Start performance profiling
Wait for page load
Stop profiling
Show metrics: Load time, FCP, LCP
```

**Measure API Response:**
```
Navigate to help chat
Start network monitoring
Send message
Measure: Time from send to response displayed
```

---

## 🧪 Step 6: Console Log Testing

### What to Monitor

1. **Security Events:**
   ```
   - Authentication failures
   - Authorization failures
   - Input validation errors
   - Rate limit exceeded
   ```

2. **Performance Logs:**
   ```
   - [PERF] logs from your APIs
   - Query execution times
   - Cache hit/miss
   ```

3. **Error Tracking:**
   ```
   - Unhandled errors
   - API failures
   - Database errors
   ```

### Console Monitoring Commands

**Capture All Logs:**
```
Start console monitoring
Filter: errors and warnings
Duration: during test execution
```

**Verify Security Logging:**
```
Trigger: Failed login
Check console for: [SECURITY] log
Verify: Sentry capture (production)
```

---

## 📋 Step 7: Test Report Generation

### Test Report Format

```markdown
# Test Report - [Feature Name]

**Date:** [Date]
**Tested By:** Automated (Chrome DevTools MCP)
**Duration:** [X minutes]

## Summary
- ✅ Tests Passed: X
- ❌ Tests Failed: Y
- ⚠️ Warnings: Z

## Performance Metrics
- Page Load: Xs
- API Response: Xs
- Memory Usage: XMB

## Network Analysis
- Total Requests: X
- Failed Requests: Y
- Average Response Time: Xms

## Console Logs
- Errors: X
- Warnings: Y
- Security Events: Z

## Screenshots
[Attached]

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🔄 Step 8: Integration with Existing Tests

### Update Your Testing Guides

**STEP_1_USER_CHAT_FLOW.md:**
```markdown
## Automated Testing (Chrome DevTools MCP)

Run automated version:
1. Start dev server: npm run dev
2. Ask Cascade: "Run automated test for user chat flow"
3. Cascade will:
   - Navigate to chat
   - Execute test steps
   - Monitor network
   - Capture console logs
   - Take screenshots
   - Generate report
```

**STEP_5_ADMIN_UI.md:**
```markdown
## Automated Testing (Chrome DevTools MCP)

Run automated version:
1. Ask Cascade: "Test admin chat management UI"
2. Cascade will test:
   - Conversations list
   - Filters and search
   - Conversation drawer
   - ROI calculator
   - Weekly digest
   - Generate comprehensive report
```

---

## 🚀 Step 9: Production Testing Checklist

### Before Each Deploy

- [ ] Run automated tests for all features
- [ ] Monitor network performance
- [ ] Check console for errors
- [ ] Verify security logging
- [ ] Test rate limiting
- [ ] Verify multi-tenant isolation
- [ ] Check database queries
- [ ] Test error handling
- [ ] Verify responsive design
- [ ] Generate test report

### Continuous Monitoring

- [ ] Set up weekly automated testing
- [ ] Monitor Sentry for production errors
- [ ] Track performance metrics
- [ ] Review network logs
- [ ] Check security events

---

## 💡 Best Practices

### 1. Test in Clean State
- Use incognito mode
- Clear localStorage
- Fresh database state

### 2. Test All User Roles
- Platform admin
- Store owner
- Store manager
- End user

### 3. Test Edge Cases
- Empty states
- Max limits (rate limiting)
- Network failures
- Concurrent users

### 4. Monitor Everything
- Network requests
- Console logs
- Performance metrics
- Memory usage

### 5. Generate Reports
- Automated test results
- Performance benchmarks
- Error tracking
- Screenshots

---

## 🎯 Next Steps

1. **Complete this setup guide**
2. **Run first automated test** (help chat)
3. **Review test report**
4. **Expand to all features**
5. **Set up continuous testing**

---

## 📞 Support

If you encounter issues:
1. Check Chrome extension is enabled
2. Verify MCP server running (check Windsurf status)
3. Review browser console for errors
4. Check network tab for failed requests

**Ready to start?** Let's set up Chrome DevTools MCP and run your first automated test! 🚀
