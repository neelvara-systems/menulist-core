# 🧪 Testing Guides Index

Step-by-step feature testing guides for MenuListAI Dashboard.

---

## 📚 Available Guides

### Chat Management Testing
- [Overview Tab](./chat-management/01-overview-tab.md) - Dashboard metrics, data freshness, manual refresh testing
- [Conversations Tab](./chat-management/02-conversations-tab.md) - Filters, table display, drawer details, CSV export
- [Analytics Tab](./chat-management/03-analytics-tab.md) - Quality metrics, satisfaction breakdown, knowledge gaps
- [Analytics Backfill (Admin)](./chat-management/04-analytics-backfill.md) - Historical data backfill, owner-only admin page

### Knowledge Base Testing
- Coming soon

### Menu Management Testing
- Coming soon

---

## 🎯 Guide Format

Each guide includes:
- ✅ Quick start prerequisites  
- ✅ 10+ numbered steps with visual representations
- ✅ "Behind the scenes" code explanations
- ✅ Expected console/terminal logs
- ✅ Comprehensive success checklist
- ✅ Common issues & solutions

---

## 📝 How to Use

1. **For Testing:** Pick a guide → Follow steps sequentially → Check off items
2. **For Development:** Understand feature flows → Verify implementation
3. **After Changes:** Update guides → Run `npm run docs:generate`

---

## 🔄 Creating New Guides

Follow the "Step-by-Step Testing Guide Pattern" defined in memory.

**Required sections:**
- Header (metadata)
- Quick Start (prerequisites)
- 10+ Steps (visual + behind-the-scenes + tests)
- Success checklist
- Common issues table
- What to report

**Naming:** Use kebab-case: `01-feature-name.md`, `02-next-feature.md`

---

**Full details:** See [README.md](./README.md) in this folder.
