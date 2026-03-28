# ⚡ Quick Start - Automated Testing

**Goal:** Get Chrome DevTools MCP running and test your first feature in 10 minutes

---

## 🚀 Step-by-Step Setup

### Step 1: Install Chrome DevTools MCP (2 minutes)

Open your terminal:

```bash
npm install -g chrome-devtools-mcp
```

### Step 2: Configure Windsurf (1 minute)

The MCP configuration is already created at `.windsurf/mcp-config.json`.

**To activate it:**

1. Open Windsurf Settings: `Cmd + ,` (Mac) or `Ctrl + ,` (Windows/Linux)
2. Search for: "MCP" or "Model Context Protocol"
3. In the MCP Servers section, click **"Import Configuration"**
4. Select: `.windsurf/mcp-config.json` from your project root
5. Click **"Save"**

**Alternative (Manual):**

Add this to your Windsurf MCP settings:

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

### Step 3: ~~Install Chrome Extension~~ **NOT NEEDED** ✅

**Good news:** Chrome DevTools MCP works via the built-in **Chrome DevTools Protocol (CDP)**. No extension installation required!

**Why no extension needed:**
- Chrome DevTools Protocol is built into Chrome
- MCP connects directly via CDP (port 9222)
- Works out of the box with any modern Chrome

**Just make sure:**
- ✅ Chrome browser is installed (any version)
- ✅ No additional setup needed

### Step 4: Restart Windsurf (1 minute)

Close and reopen Windsurf IDE completely.

**Verify MCP Servers Running:**
- Look for MCP icon/panel in Windsurf
- Check status shows both servers active:
  - ✅ puppeteer
  - ✅ chrome-devtools

### Step 5: Start Your Dev Server (1 minute)

```bash
npm run dev
```

Wait for server to start on `http://localhost:3000`

### Step 6: Run Your First Test (3 minutes)

**In Windsurf, ask Cascade:**

```
Test help chat feature with monitoring:
1. Navigate to localhost:3000
2. Login with test user
3. Open help chat
4. Send message: "How do I reset my password?"
5. Monitor API calls
6. Check console logs
7. Take screenshots
8. Generate report
```

**Expected Output:**
- Browser opens automatically
- Cascade performs each step
- Network requests monitored
- Console logs captured
- Screenshots taken
- Test report generated

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `npm install -g chrome-devtools-mcp` completed
- [ ] `.windsurf/mcp-config.json` exists
- [ ] MCP servers configured in Windsurf settings
- [ ] Chrome extension installed and enabled
- [ ] Windsurf restarted
- [ ] MCP panel shows 2 servers active
- [ ] Dev server running (`npm run dev`)
- [ ] Test command executed successfully

---

## 🧪 Quick Test Commands

### Basic Commands

**Test Help Chat:**
```
"Test help chat with full monitoring"
```

**Test Admin Dashboard:**
```
"Test admin chat management with monitoring"
```

**Performance Test:**
```
"Profile performance of main app page"
```

**Security Test:**
```
"Test authentication and rate limiting"
```

### What Gets Monitored

1. **Network:**
   - All API calls
   - Response times
   - Status codes
   - Headers
   - Response bodies

2. **Console:**
   - Errors
   - Warnings
   - Info logs
   - Debug logs
   - Security events

3. **Performance:**
   - Page load time
   - API response time
   - Memory usage
   - Bundle size

4. **Screenshots:**
   - Each major step
   - Error states
   - Success states
   - Final result

---

## 🎯 Your First Real Test

Let's test the help chat feature completely:

**Command:**
```
Run comprehensive help chat test:
1. Start monitoring
2. Navigate to localhost:3000
3. Login as test user
4. Open help chat
5. Test QnA mode:
   - Send: "How do I reset my password?"
   - Verify AI response
   - Check references shown
   - Verify suggested questions
6. Test feedback:
   - Click thumbs up
   - Add comment
   - Verify saved to database
7. Test Assistant mode:
   - Switch modes
   - Send follow-up
   - Verify context maintained
8. Monitor throughout:
   - API: /api/helpCenter/search-kb
   - Response time < 3s
   - No console errors
   - Firestore writes correct
9. Generate detailed report
```

**Expected Report:**
```markdown
# Test Report - Help Chat

## Summary
- ✅ Tests Passed: 8/8
- ⏱️ Total Duration: 2.5 minutes
- 🌐 API Calls: 3
- 📝 Console Errors: 0

## Performance
- Page Load: 1.8s ✅
- API Response: 2.1s ✅
- Database Write: 250ms ✅

## Network Analysis
- /api/helpCenter/search-kb: 200 OK (2.1s)
- Firestore writes: 3 successful

## Screenshots
- [Initial state]
- [Question sent]
- [AI response]
- [Feedback submitted]

## Conclusion
✅ ALL TESTS PASSED - Ready for production
```

---

## 🐛 Troubleshooting

### Problem: MCP servers not showing in Windsurf

**Solution:**
1. Verify `.windsurf/mcp-config.json` exists
2. Check Windsurf settings → MCP Servers
3. Restart Windsurf completely
4. Check Windsurf logs for errors

### Problem: Chrome extension not working

**Solution:**
1. Go to `chrome://extensions/`
2. Enable "Developer Mode"
3. Check extension is enabled
4. Refresh the page
5. Restart Chrome

### Problem: Cannot navigate to localhost

**Solution:**
1. Verify dev server running: `npm run dev`
2. Check terminal shows: "ready on localhost:3000"
3. Test manually: Open `http://localhost:3000` in browser
4. Check firewall/antivirus not blocking

### Problem: Test hangs or fails

**Solution:**
1. Check browser console for errors
2. Verify test user exists in database
3. Check API endpoints are responding
4. Review terminal logs for errors
5. Try simpler test first: "Navigate to localhost:3000"

---

## 📚 Next Steps

After successful setup:

1. **Read Full Guide:**
   - `CHROME_DEVTOOLS_MCP_SETUP.md` - Complete setup details
   - `AUTOMATED_TESTING_WORKFLOW.md` - Testing patterns

2. **Test All Features:**
   - Help chat (QnA + Assistant modes)
   - Admin dashboard
   - Authentication
   - Payment flow
   - Security features

3. **Set Up Continuous Testing:**
   - Daily smoke tests
   - Pre-commit tests
   - Pre-deployment regression tests
   - Weekly deep testing

4. **Review Existing Guides:**
   - `MASTER_TESTING_GUIDE.md` - 5-step testing process
   - `STEP_1_USER_CHAT_FLOW.md` - User flow testing
   - `STEP_5_ADMIN_UI.md` - Admin UI testing

---

## 🎉 Success!

If you've completed all steps, you now have:

✅ Chrome DevTools MCP installed and configured  
✅ Puppeteer MCP for automation  
✅ Automated testing capability  
✅ Network monitoring  
✅ Console log capture  
✅ Performance profiling  
✅ Automated report generation  

**You're ready for production-grade testing!** 🚀

---

## 💡 Tips

1. **Start Simple:** Test one feature at a time
2. **Monitor Everything:** Always enable full monitoring
3. **Save Reports:** Keep test reports for comparison
4. **Test Regularly:** Daily smoke tests, pre-commit tests
5. **Learn Patterns:** Review reports to find optimization opportunities

---

**Need help?** Just ask Cascade:
```
"Help me test [feature name] with monitoring"
```

Cascade will guide you through the complete test! 🤖
