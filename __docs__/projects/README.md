# 📚 Projects Feature Documentation

**Complete documentation for the MenuListAi Projects feature**  
**Last Updated**: January 2026  
**Status**: Complete source documentation; not current launch certification

---

**Launch boundary:** This hub links Projects feature documentation and historical assessments. Do not treat a green status in an older feature document as current MenuList production-launch approval. Current release readiness must be decided from the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [production-readiness checklist](../production-readiness/README.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, and `npm run verify:menu-project-editor-boundary` for the current editor/source boundary.

**Project editor boundary source gate:** `npm run verify:menu-project-editor-boundary` covers the `/projects` route, desktop project page mutations, desktop editor save/publish path, project DAL public-cache and Digital Screens invalidation, mobile menu persistence, mobile project selector acknowledgements, mobile bulk-action handoff, active docs, and sweep ledgers. It is not browser/mobile release certification.

---

## 📦 Consolidated Documentation (NEW)

Feature-specific documentation in standardized format (`_spec.md`, `_impl.md`, `_marketing.md`):

| Feature                        | Status          | Location                                                       |
| ------------------------------ | --------------- | -------------------------------------------------------------- |
| **Upload & File Processing**   | Implemented     | [`upload-file-processing/`](./upload-file-processing/)         |
| **AI Data Extraction**         | Implemented     | [`ai-data-extraction/`](./ai-data-extraction/)                 |
| **Data Editor**                | Implemented     | [`data-editor/`](./data-editor/)                               |
| **AI Image Generation**        | Implemented     | [`ai-image-generation/`](./ai-image-generation/)               |
| **Description Generation**     | Implemented     | [`description-generation/`](./description-generation/)         |
| **Multi-Language Translation** | Implemented     | [`multi-language-translation/`](./multi-language-translation/) |
| **B2C View**                   | Implemented     | [`b2c-view/`](./b2c-view/)                                     |
| **Image Editing**              | Implemented     | [`ai-image-generation/`](./ai-image-generation/)                |
| **B2B View**                   | ⚠️ Needs Review | [`b2b-view/`](./b2b-view/)                                     |
| **Project Management**         | Implemented     | [`project-management/`](./project-management/)                 |

**Each folder contains:**

- `README.md` — Quick reference and overview
- `_spec.md` — Product specification (for Product, Business)
- `_impl.md` — Implementation details (for Developers)
- `_marketing.md` — Sales and marketing collateral (where applicable)

---

## 🎯 Quick Start

**New to the Projects feature?**

1. Start with [00-overview.md](./00-overview.md) for architecture and concepts
2. Browse feature folders above for detailed spec/implementation/marketing docs
3. Review [assessments/](./assessments/) for production readiness evaluations
4. Reference [13-types-interfaces.md](./13-types-interfaces.md) for type definitions
5. Check [12-api-routes.md](./12-api-routes.md) for API contracts

---

## 📁 Documentation Structure

| Folder                                          | Purpose                                      | Contents                                |
| ----------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| **Feature folders** (e.g., `data-editor/`)      | Consolidated feature documentation           | `_spec.md`, `_impl.md`, `_marketing.md` |
| **[`/assessments/`](./assessments/)**           | Historical readiness assessments per feature | `assessment-01-upload.md`               |
| **[`/development_done/`](./development_done/)** | Completed development documentation          | Implementation completion logs          |
| **[`/editor/`](./editor/)**                     | Detailed editor sub-component docs           | Views, modals, hooks                    |
| **`/` (Root)**                                  | Cross-cutting technical documentation        | Database, API, Types, Utilities         |

---

## 📖 Documentation Index

### **Cross-Cutting Documentation** ✅

| File                                               | Description                                         | Status      |
| -------------------------------------------------- | --------------------------------------------------- | ----------- |
| [00-overview.md](./00-overview.md)                 | Complete feature overview, architecture, tech stack | ✅ Complete |
| [11-database-layer.md](./11-database-layer.md)     | Firestore DAL, CRUD operations, patterns            | ✅ Complete |
| [12-api-routes.md](./12-api-routes.md)             | Complete API reference, security, examples          | ✅ Complete |
| [13-types-interfaces.md](./13-types-interfaces.md) | TypeScript definitions, type guards, examples       | ✅ Complete |
| [14-utilities.md](./14-utilities.md)               | Helper functions, utilities                         | ✅ Complete |

### **Historical Readiness assessments**

#### **Phase 1: Core Infrastructure** ✅ COMPLETE

| File                                                                       | Focus Area                          | Priority     | Status                  |
| -------------------------------------------------------------------------- | ----------------------------------- | ------------ | ----------------------- |
| [production-readiness-assessment.md](./production-readiness-assessment.md) | **Historical Master Assessment & Action Plan** | Historical | Current launch approval requires active audit/runbook evidence |
| [assessment-01-upload.md](./assessments/assessment-01-upload.md)                       | File Upload & Processing Issues     | 🔴 Critical  | ✅ **COMPLETED** Nov 13 |
| [assessment-02-ai-extraction.md](./assessments/assessment-02-ai-extraction.md)         | AI Cost Control & Quality           | 🔴 Critical  | ✅ **COMPLETED** Nov 14 |
| [assessment-03-editor.md](./assessments/assessment-03-editor.md)                       | Data Editor UX & Safety             | 🔴 Critical  | ✅ **COMPLETED** Nov 14 |
| [assessment-04-performance.md](./assessments/assessment-04-performance.md)             | Performance Optimization            | 🟢 Optimized | ✅ **COMPLETED** Nov 19 |
| [assessment-05-security.md](./assessments/assessment-05-security.md)                   | Security Hardening                  | 🟢 Secure    | ✅ **COMPLETED** Nov 19 |
| [assessment-06-ux-usability.md](./assessments/assessment-06-ux-usability.md)           | User Experience & Interface         | 🟢 Polished  | ✅ **COMPLETED** Nov 19 |

#### **Phase 2: Core Features** ✅ 67% COMPLETE

| File                                                                                 | Focus Area                         | Priority    | Status                  |
| ------------------------------------------------------------------------------------ | ---------------------------------- | ----------- | ----------------------- |
| [assessment-07-ai-image-generation.md](./assessments/assessment-07-ai-image-generation.md)       | AI Image Generation & Cost Control | 🟡 Medium   | ✅ **COMPLETED** Nov 20 |
| [assessment-08-image-editing.md](./assessments/assessment-08-image-editing.md)                   | Image Upload, Editing & Management | 🟡 Medium   | ✅ **COMPLETED** Nov 20 |
| [assessment-09-description-generation.md](./assessments/assessment-09-description-generation.md) | AI Description Generation          | 🟡 Medium   | ✅ **COMPLETED** Nov 20 |
| [assessment-10-b2b-view.md](./assessments/assessment-10-b2b-view.md)                             | B2B API Integration & JSON Editor  | 🟡 Medium   | ⏳ **NEEDS REVIEW**     |
| [assessment-11-b2c-view.md](./assessments/assessment-11-b2c-view.md)                             | B2C Menu Builder & Customer UI     | 🔴 Critical | ⏳ **NEEDS REVIEW**     |
| [assessment-12-project-management.md](./assessments/assessment-12-project-management.md)         | Project CRUD & Multi-Tenant Safety | 🔴 Critical | ✅ **COMPLETED** Nov 20 |

**Latest Update**: Nov 20, 2025 - Phase 1 complete (100%). Phase 2 now 67% complete (4/6 assessments done). Remaining: B2B View and B2C View assessments. All critical AI security features implemented. 🎯

---

## 🗺️ Navigation by Role

### **For Frontend Developers**

```
Start Here:
├── 00-overview.md (architecture)
├── 01-UPLOAD-FILE-PROCESSING.md (UI flow)
├── 04-DATA-EDITOR.md (editing interface)
└── 13-types-interfaces.md (types reference)

Advanced:
├── 09-B2C-VIEW.md (visual builder)
└── 05-AI-IMAGE-GENERATION.md (image features)
```

### **For Backend Engineers**

```
Start Here:
├── 00-overview.md (architecture)
├── 11-database-layer.md (Firestore patterns)
├── 12-api-routes.md (API contracts)
└── 13-types-interfaces.md (type definitions)

Advanced:
├── 02-AI-DATA-EXTRACTION.md (AI processing)
├── 03-MULTI-LANGUAGE.md (translations)
└── 05-AI-IMAGE-GENERATION.md (image gen)
```

### **For Product/QA**

```
Start Here:
├── 00-overview.md (business overview)
├── 01-UPLOAD-FILE-PROCESSING.md (user flow)
└── 04-DATA-EDITOR.md (editing features)

User Flows:
├── 08-B2B-VIEW.md (API integration)
└── 09-B2C-VIEW.md (customer-facing)
```

---

## 🔍 Key Concepts

### **Multi-Tenant Architecture**

All data is isolated by:

- **tId** (Tenant ID) - Business/organization
- **sId** (Store ID) - Location/branch

```
Firestore:
├── projectsMetadata/{tId}/{sId}/{projectId}
└── projectsData/{tId}/{sId}/{projectId}
```

### **Project Lifecycle**

```
CREATE → UPLOAD → PROCESS → EDIT → TRANSLATE → GENERATE IMAGES → CUSTOMIZE → EXPORT
```

### **Data Model**

```
Project
├── Metadata (name, status)
└── Data
    ├── Files[]
    │   └── Extracted Data
    │       ├── Categories[]
    │       ├── Items[]
    │       └── Languages[]
    ├── Languages[]
    └── Config (theme)
```

---

## 🚀 Quick Reference

### **File Locations**

```
Frontend:
├── src/components/templates/main-app/projects/
│   ├── index.tsx                    # Main entry
│   ├── type.ts                      # Types
│   ├── utils.ts                     # Helpers
│   ├── editorView/                  # Editor
│   ├── b2bView.tsx                  # JSON view
│   └── b2cView/                     # Visual builder

Database:
└── src/database/projects/
    └── index.ts                     # DAL

APIs:
└── src/app/api/
    ├── image-processor/             # OCR
    ├── image-generation/            # AI images
    ├── image-editing/               # Edit images
    ├── descriptions/                # AI descriptions
    └── new-item-metadata/           # New items
```

### **Key Types**

```typescript
ProjectMetadata; // Lightweight project info
Project; // Full project data
ProjectFileType; // Individual file/page
ExtractedData; // AI extraction result
ThemeConfig; // B2C theme configuration
```

### **Key Functions**

```typescript
// Database
getMetadataProjectsList(); // List projects
getProjectData(id); // Load project
addProject(data); // Create project
updateProject(data); // Update project
deleteProject(id); // Soft delete

// Processing
getProcessedFile(); // AI OCR
uploadFile(); // Upload to Storage
convertPdfToImages(); // PDF conversion
```

---

## 🛠️ Development Guidelines

### **Before Making Changes**

1. **Read Documentation**: Review relevant docs before coding
2. **Follow Patterns**: Use existing patterns consistently
3. **Update Types**: Keep TypeScript definitions current
4. **Test Both Modes**: Dev mode (mock data) and prod mode (real APIs)
5. **Update Docs**: Document your changes

### **Code Standards**

```typescript
// ✅ CORRECT Patterns
- Use DB_COLLECTIONS constants
- Wrap DB calls in apiCallComposer
- Use requestBodyComposer for writes
- Multi-tenant paths: {collection}/{tId}/{sId}
- Type-safe with TypeScript
- withAuth() for all API routes

// ❌ WRONG Patterns
- Hardcoded collection names
- Direct try-catch without apiCallComposer
- Missing timestamps (createdOn/modifiedOn)
- Flat collection structure (no tenant isolation)
- Untyped data
- Unprotected API routes
```

### **Security Checklist**

- [ ] API routes use `withAuth()`
- [ ] Input validation with Zod
- [ ] Rate limiting configured
- [ ] Multi-tenant access verified
- [ ] No sensitive data in logs
- [ ] Generic error messages

---

## 📊 Feature Status

| Feature                  | Status        | Documentation                                     |
| ------------------------ | ------------- | ------------------------------------------------- |
| File Upload & Processing | Implemented | [Upload File Processing](./upload-file-processing/README.md) |
| AI Data Extraction       | Implemented | [AI Data Extraction](./ai-data-extraction/README.md) |
| Multi-Language           | Implemented | [Multi-Language Translation](./multi-language-translation/README.md) |
| Data Editor              | Implemented | [Data Editor](./data-editor/README.md) |
| AI Image Generation      | Implemented | [AI Image Generation](./ai-image-generation/README.md) |
| Image Management         | Implemented | [AI Image Generation](./ai-image-generation/README.md) |
| Description Generation   | Implemented | [Description Generation](./description-generation/README.md) |
| B2B View (JSON)          | Needs review | [B2B View](./b2b-view/README.md) |
| B2C View (Visual)        | Implemented | [B2C View](./b2c-view/README.md) |
| Project Management       | Implemented | [Project Management](./project-management/README.md) |
| Database Layer           | Implemented | [Database Layer](./11-database-layer.md) |
| API Routes               | Implemented | [API Routes](./12-api-routes.md) |
| Types & Interfaces       | Implemented | [Types](./13-types-interfaces.md) |
| Utilities                | Implemented | [14-UTILITIES](./14-utilities.md)                 |

---

## 🎓 Learning Path

### **Week 1: Foundations**

- Day 1-2: Read overview and architecture
- Day 3-4: Study types and database layer
- Day 5: Review API routes

### **Week 2: Features**

- Day 1: Upload & processing
- Day 2: AI extraction & translation
- Day 3: Data editor
- Day 4: Image generation
- Day 5: B2C builder

### **Week 3: Advanced**

- Day 1-2: Custom implementations
- Day 3-4: Performance optimization
- Day 5: Code review

---

## 🔧 Troubleshooting

### **Common Issues**

**Issue**: Files not uploading  
**Solution**: Check Firebase Storage rules, verify base64 conversion

**Issue**: AI processing fails  
**Solution**: Check Gemini API key, rate limits, network connectivity

**Issue**: Multi-language not working  
**Solution**: Verify language codes, check translation API

**Issue**: Theme not applying  
**Solution**: Check config structure, verify responsive styles

### **Debug Mode**

```typescript
// Enable dev mode for mock data
import { isProdMode } from "@constant/common";

if (!isProdMode) {
  // Use dummy data
  return DummyextractedDatas[0];
}
```

### **Logging**

```typescript
// Check console for:
- "Processing file: [fileId]"
- "AI extraction complete"
- "Upload successful: [url]"

// Check Network tab for:
- API calls to /api/image-processor
- Firebase Storage uploads
- Gemini API requests
```

---

## 📞 Support

### **For Questions**

1. Search this documentation
2. Check code comments
3. Review existing implementations
4. Ask team members

### **For Bugs**

1. Check console errors
2. Review network requests
3. Test in dev mode
4. Document reproduction steps

### **For Features**

1. Review architecture docs
2. Follow existing patterns
3. Update types first
4. Write tests
5. Update documentation

---

## 🔄 Maintenance

### **Regular Tasks**

- [ ] Update documentation when adding features
- [ ] Keep types synchronized with database
- [ ] Review and optimize queries
- [ ] Monitor AI costs
- [ ] Check error logs
- [ ] Update dependencies

### **Monthly Review**

- [ ] Review API usage
- [ ] Check storage costs
- [ ] Analyze performance metrics
- [ ] Update security patches
- [ ] Review user feedback

---

## 📝 Contributing

### **Documentation Updates**

1. Follow existing format
2. Use clear examples
3. Include code snippets
4. Add visual aids (diagrams)
5. Test all examples
6. Update index

### **Code Contributions**

1. Read relevant docs first
2. Follow code standards
3. Write TypeScript types
4. Add error handling
5. Update documentation
6. Test thoroughly

---

## 🎯 Next Steps

**For New Developers:**

1. Read [00-overview.md](./00-overview.md)
2. Study [13-types-interfaces.md](./13-types-interfaces.md)
3. Review [11-database-layer.md](./11-database-layer.md)
4. Explore [12-api-routes.md](./12-api-routes.md)

**For Feature Development:**

1. Review relevant feature doc
2. Check existing implementations
3. Update types if needed
4. Follow security checklist
5. Document your work

---

## 📚 Additional Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **Gemini AI Docs**: https://ai.google.dev/
- **Next.js Docs**: https://nextjs.org/docs
- **TypeScript Docs**: https://www.typescriptlang.org/docs
- **Ant Design**: https://ant.design/components/overview

---

**Last Updated**: November 13, 2025  
**Maintainer**: Development Team  
**Version**: 1.0.0
