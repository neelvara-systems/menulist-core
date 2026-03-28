# 🧪 Testing Guides

**Purpose:** Step-by-step feature testing guides for MenuListAI Dashboard  
**Format:** Screen-by-screen flow testing + Automated testing with MCP  
**Last Updated:** November 5, 2025

---

## 🚀 Quick Start - Automated Testing

**NEW:** Production-grade automated testing with Chrome DevTools MCP!

- **[⚡ Quick Start Guide](./QUICK_START.md)** - Get automated testing running in 10 minutes
- **[🔧 Chrome DevTools MCP Setup](./CHROME_DEVTOOLS_MCP_SETUP.md)** - Complete setup & configuration
- **[🤖 Automated Testing Workflow](./AUTOMATED_TESTING_WORKFLOW.md)** - Testing patterns & best practices

### What You Get:
✅ Browser automation (Puppeteer MCP)  
✅ Network monitoring (Chrome DevTools MCP)  
✅ Console log capture  
✅ Performance profiling  
✅ Automated test reports  
✅ Screenshots at each step  

---

## 📚 Manual Testing Guides

### Master Guides
- **[Master Testing Guide](./MASTER_TESTING_GUIDE.md)** - Complete 5-step testing process
- [Step 1 - User Chat Flow](./STEP_1_USER_CHAT_FLOW.md)
- [Step 2 - Database Verification](./STEP_2_DATABASE_VERIFICATION.md)
- [Step 3 - Analytics Aggregation](./STEP_3_ANALYTICS_AGGREGATION.md)
- [Step 4 - AI Intelligence](./STEP_4_AI_INTELLIGENCE.md)
- [Step 5 - Admin UI](./STEP_5_ADMIN_UI.md)

### Feature-Specific Guides

#### Chat Management
- [01 - Overview Tab](./chat-management/01-overview-tab.md) ✅ Complete
- [02 - Conversations Tab](./chat-management/02-conversations-tab.md) ✅ Complete
- [03 - Analytics Tab](./chat-management/03-analytics-tab.md) ✅ Complete
- [04 - Analytics Backfill (Admin)](./chat-management/04-analytics-backfill.md) ✅ Complete

#### Knowledge Base
- Coming soon

#### Menu Management
- Coming soon

---

## 🎯 Guide Format

Each guide includes:
- ✅ Quick start prerequisites
- ✅ Step-by-step testing flow (10+ steps)
- ✅ Visual representations (ASCII art)
- ✅ "Behind the scenes" explanations
- ✅ Code snippets & database queries
- ✅ Expected console/terminal logs
- ✅ Success checklist (comprehensive)
- ✅ Common issues & solutions
- ✅ What to report if issues found

---

## 📝 How to Use

### For Testing
1. Pick the feature you want to test
2. Open the corresponding guide
3. Follow steps sequentially
4. Check off items in success checklist
5. Report issues using the template provided

### For Development
1. Use guides to understand feature flows
2. Verify implementation matches expected behavior
3. Add new guides when creating features
4. Keep guides updated with code changes

---

## 🏗️ Creating New Testing Guides

Use the pattern defined in memory: "Step-by-Step Testing Guide Pattern for Feature Testing"

### Required Sections
1. Header with metadata
2. Quick Start (prerequisites, duration)
3. 10+ numbered steps with:
   - Visual representations
   - What to observe
   - Behind the scenes code
   - Test actions
   - Expected results
4. Success checklist
5. Common issues table
6. What to report section

### Naming Convention
- Use kebab-case: `01-feature-name.md`
- Number sequentially: `01-`, `02-`, `03-`
- Group by feature: `chat-management/`, `knowledge-base/`

---

## 🔄 After Adding New Guides

Run the docs generator to update the main index:

```bash
npm run docs:generate
```

This will automatically include your new testing guides in `/docs/README.md`.

---

**Questions?** Check the main [Documentation Index](../README.md)
