# 📝 Documentation Contributing Guide

This guide explains how to create and maintain documentation for the MenuListAI Dashboard project.

---

## 🎯 **Documentation Philosophy**

**Golden Rule:** ONE markdown file per feature. No exceptions.

✅ **Good:**
- `RATE_LIMITING.md` - Complete rate limiting guide
- `AUTHENTICATION.md` - All auth information
- `PAYMENT_INTEGRATION.md` - Payment docs

❌ **Bad:**
- `RATE_LIMITING_GUIDE.md`
- `RATE_LIMITING_QUICKSTART.md`
- `RATE_LIMITING_USAGE.md`
- ... (multiple files for same feature)

---

## 📁 **Folder Structure**

```
docs/
├── README.md              # Auto-generated index (don't edit manually!)
├── _TEMPLATE.md           # Template for new docs
├── CONTRIBUTING.md        # This file
│
├── features/              # Feature documentation (ONE file per feature)
├── api/                   # API endpoints and integrations
├── architecture/          # System design and patterns
├── implementation/        # Implementation guides
├── guides/                # How-to guides and tutorials
├── analytics/             # Analytics and tracking
├── payments/              # Payment integration
├── product/               # Product requirements
└── reviews/               # Code reviews and enhancements
```

---

## ✍️ **Creating New Documentation**

### Step 1: Choose the Right Folder

| Type | Folder | Example |
|------|--------|---------|
| New feature | `features/` | `RATE_LIMITING.md` |
| API endpoint | `api/` | `PAYMENT_API.md` |
| Architecture pattern | `architecture/` | `MICROSERVICES_PATTERN.md` |
| Implementation guide | `implementation/` | `MIGRATION_GUIDE.md` |
| How-to guide | `guides/` | `DEPLOYMENT_GUIDE.md` |

### Step 2: Copy the Template

```bash
cp docs/_TEMPLATE.md docs/features/YOUR_FEATURE.md
```

### Step 3: Fill Out the Sections

Use the template structure:
- 📋 Overview
- 🎯 Purpose
- 🏗️ Architecture
- 🔧 Implementation
- 📊 Usage
- ✅ Benefits
- 🚀 Future Enhancements

### Step 4: Regenerate the Index

```bash
npm run docs:generate
```

This automatically updates `docs/README.md` with your new file!

---

## 📝 **Naming Conventions**

### File Names

Use UPPERCASE with underscores:

```
✅ GOOD:
- RATE_LIMITING.md
- USER_AUTHENTICATION.md
- PAYMENT_INTEGRATION.md

❌ BAD:
- rate-limiting.md
- userAuthentication.md
- payment_integration_guide.md
```

### Document Titles

Use clear, descriptive titles:

```markdown
✅ GOOD:
# Rate Limiting Implementation Guide
# User Authentication System
# Payment Integration with Stripe

❌ BAD:
# Rate Limits
# Auth
# Payments
```

---

## 📖 **Required Sections**

Every documentation file MUST include:

1. **Overview** - What is this?
2. **Purpose** - Why does it exist?
3. **Implementation** - How does it work?
4. **Usage** - How do I use it?
5. **Examples** - Show me code!

Optional but recommended:
- Architecture diagrams
- Performance metrics
- Troubleshooting
- Future enhancements

---

## 💻 **Code Examples**

### Always Include Working Code

```typescript
✅ GOOD:
// Import statement
import { checkRateLimit } from '@lib/rateLimit';

// Full working example
export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit();
    if (rateLimitResponse) return rateLimitResponse;
    
    // ... rest of code
}

❌ BAD:
// Just fragments
checkRateLimit();
// ... (missing context)
```

### Use Syntax Highlighting

Always specify the language:

````markdown
```typescript
// Your code here
```

```bash
npm install package
```

```json
{
  "config": "value"
}
```
````

---

## 🎨 **Formatting Guidelines**

### Use Emojis for Sections

```markdown
## 📋 Overview
## 🎯 Purpose
## 🔧 Implementation
## ✅ Benefits
## 🚀 Future Enhancements
```

### Use Bold for Emphasis

```markdown
**Important:** This is critical information
**Note:** Pay attention to this
```

### Use Code Blocks for Paths

```markdown
Edit `src/lib/rateLimit/configs.ts`
Run `npm run docs:generate`
```

### Use Tables for Comparisons

```markdown
| Feature | Option A | Option B |
|---------|----------|----------|
| Speed | Fast | Slow |
| Cost | High | Low |
```

---

## 🔄 **Updating Documentation**

### When to Update

Update docs when:
- ✅ Adding new features
- ✅ Changing existing behavior
- ✅ Fixing bugs that affect usage
- ✅ Adding new best practices
- ✅ Deprecating features

### How to Update

1. **Edit the file** directly in its folder
2. **Keep the structure** - don't remove sections
3. **Update the "Last Updated" date**
4. **Add to changelog** if significant
5. **Regenerate index**: `npm run docs:generate`

---

## 🚫 **Common Mistakes**

### ❌ Don't Do This:

1. **Multiple files for same feature**
   ```
   ❌ RATE_LIMITING_GUIDE.md
   ❌ RATE_LIMITING_QUICKSTART.md
   ❌ RATE_LIMITING_USAGE.md
   
   ✅ RATE_LIMITING.md (all in one)
   ```

2. **Editing README.md manually**
   ```
   ❌ Edit docs/README.md
   ✅ Run npm run docs:generate
   ```

3. **Incomplete examples**
   ```
   ❌ // Some code...
   ✅ Complete, runnable code
   ```

4. **No context**
   ```
   ❌ "Do this thing"
   ✅ "To enable rate limiting, do this..."
   ```

---

## 🛠️ **Maintenance**

### Regular Tasks

**Weekly:**
- Review new docs for quality
- Update outdated examples
- Fix broken links

**Monthly:**
- Regenerate index
- Archive old/deprecated docs
- Update stats

**Quarterly:**
- Full docs review
- Consolidate duplicates
- Update templates

---

## 📊 **Documentation Metrics**

Track these metrics:
- Total documentation files
- Files per category
- Last update dates
- Broken links
- Missing examples

Run the index generator to see current stats:

```bash
npm run docs:generate
```

---

## 🆘 **Getting Help**

### Questions About Documentation?

1. Check this guide first
2. Review existing docs for examples
3. Use the template
4. Ask the team

### Template Not Working?

Copy `docs/_TEMPLATE.md` and customize it for your needs.

---

## ✅ **Checklist for New Docs**

Before submitting documentation:

- [ ] Used correct folder
- [ ] Followed naming convention
- [ ] Copied template structure
- [ ] Added complete code examples
- [ ] Included all required sections
- [ ] Used emojis for sections
- [ ] Regenerated index (`npm run docs:generate`)
- [ ] Tested all code examples
- [ ] No broken links
- [ ] Clear and concise writing

---

## 📚 **Resources**

- [Template File](./
_TEMPLATE.md)
- [Documentation Index](./README.md)
- [Markdown Guide](https://www.markdownguide.org/)

---

**Remember:** Good documentation is as important as good code! 🎯
